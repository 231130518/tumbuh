/**
 * Lapisan akses tabel articles khusus admin.
 * Fungsi mengembalikan data atau melempar Error; admin.js menentukan pesan dan tampilannya.
 * Filter/pemeriksaan browser membantu alur, sedangkan izin sebenarnya tetap ditegakkan oleh RLS.
 */
/* Hanya data Supabase. Tidak membaca seed atau localStorage artikel demo. */
(() => {
  "use strict";
  const api = window.TumbuhSupabase;
  const STATUSES = Object.freeze({ pending: "Menunggu tinjauan", published: "Terbit", rejected: "Ditolak" });
  // int8 dikirim sebagai text agar ID besar tidak dibulatkan oleh JavaScript.
  const LIST_FIELDS = "id::text,created_at,author_name,title,subtitle,cover_image_path,status";
  const DETAIL_FIELDS = `${LIST_FIELDS},author_email,content`;
  const PAGE_SIZE = 20;

  const { articleId, imageUrl, sanitize } = window.TumbuhArticleContent;

  /**
   * Memuat satu halaman artikel dan jumlah pending; halaman dihitung mulai dari 0.
   * Kolom isi lengkap/email tidak diperlukan untuk kartu daftar sehingga tidak diminta.
   */
  async function list(filter = "pending", page = 0) {
    if (filter !== "semua" && !STATUSES[filter]) throw new Error("Filter artikel tidak valid.");
    if (!Number.isSafeInteger(page) || page < 0) throw new Error("Halaman tidak valid.");
    await api.requireAdmin();
    const db = api.getClient();
    let query = db.from("articles").select(LIST_FIELDS, { count: "exact" })
      .order("created_at", { ascending: false }).order("id", { ascending: false });
    if (filter !== "semua") query = query.eq("status", filter);
    const { data, error, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error("Artikel belum dapat dimuat. Periksa koneksi atau izin akses, lalu coba lagi.");
    let pendingCount = count || 0;
    if (filter !== "pending") {
      const pending = await db.from("articles").select("id", { count: "exact", head: true }).eq("status", "pending");
      if (pending.error) throw new Error("Jumlah artikel belum dapat dimuat. Coba lagi.");
      pendingCount = pending.count || 0;
    }
    return { articles: data || [], count: count || 0, pendingCount, pageSize: PAGE_SIZE };
  }

  /**
   * Mengambil satu artikel dengan ID int8 yang diperlakukan sebagai string.
   * maybeSingle mengizinkan hasil kosong jika artikel hilang atau tidak terlihat oleh RLS.
   */
  async function get(id) {
    const safeId = articleId(id);
    await api.requireAdmin();
    const { data, error } = await api.getClient().from("articles").select(DETAIL_FIELDS).eq("id", safeId).maybeSingle();
    if (error) throw new Error("Artikel belum dapat dimuat. Periksa koneksi atau izin akses, lalu coba lagi.");
    return data;
  }

  /**
   * Menyimpan published/rejected hanya jika ID dan status sebelumnya masih cocok.
   * Baris hasil diminta kembali untuk memastikan perubahan benar-benar diterima server.
   */
  async function setStatus(id, before, status) {
    const safeId = articleId(id);
    if (!["published", "rejected"].includes(status) || !STATUSES[before]) throw new Error("Perubahan status tidak valid.");
    await api.requireAdmin();
    // Hanya status yang diubah. Kondisi status lama mencegah menimpa keputusan tab/admin lain.
    const { data, error } = await api.getClient().from("articles").update({ status })
      .eq("id", safeId).eq("status", before).select(DETAIL_FIELDS).maybeSingle();
    if (error) throw new Error("Status belum dapat disimpan. Periksa koneksi dan izin admin, lalu muat ulang artikel.");
    if (!data || data.status !== status) throw new Error("Artikel berubah atau akses telah dicabut. Muat ulang artikel sebelum mencoba lagi.");
    return data;
  }

  /**
   * Menghapus satu artikel setelah verifikasi admin; nol baris bukan bukti penghapusan berhasil.
   * Fungsi ini tidak menghapus gambar dari Storage.
   */
  async function remove(id, before) {
    const safeId = articleId(id);
    if (!STATUSES[before]) throw new Error("Status artikel tidak valid. Muat ulang artikel.");
    await api.requireAdmin();
    const { data, error } = await api.getClient().from("articles").delete()
      .eq("id", safeId).eq("status", before).select("id::text").maybeSingle();
    if (error) throw new Error("Artikel belum dapat dihapus. Periksa koneksi dan izin hapus admin, lalu muat ulang sebelum mencoba lagi.");
    // RLS dapat mengembalikan nol baris tanpa error; jangan mengaku berhasil.
    if (!data || data.id !== safeId) throw new Error("Penghapusan belum terkonfirmasi. Artikel mungkin berubah, sudah dihapus, atau izin hapus belum tersedia. Muat ulang artikel.");
  }

  /**
   * Memvalidasi dan membersihkan revisi, kemudian membaca ulang snapshot artikel.
   * Hanya title/subtitle/content dikirim; status dan identitas penulis dipertahankan.
   * Pemeriksaan snapshot bukan kunci transaksi: revisi yang benar-benar serentak masih bisa bertabrakan.
   */
  async function revise(before, fields) {
    const safeId = articleId(before?.id);
    if (!STATUSES[before.status]) throw new Error("Status artikel tidak valid. Muat ulang artikel.");
    const title = String(fields.title || "").trim();
    const subtitle = String(fields.subtitle || "").trim();
    const raw = String(fields.content || "");
    if (title.length < 5 || title.length > 150) throw new Error("Judul harus 5–150 karakter.");
    if (subtitle.length < 12 || subtitle.length > 500) throw new Error("Subjudul harus 12–500 karakter.");
    if (raw.length > 100000) throw new Error("Format isi terlalu panjang. Sederhanakan format tulisan.");
    const clean = window.TumbuhArticleContent.html(raw);
    if (clean.text.length < 25 || clean.text.length > 50000 || clean.html.length > 100000) {
      throw new Error("Isi artikel harus 25–50.000 karakter dengan format yang tidak berlebihan.");
    }
    // Baca ulang sebelum menyimpan agar editor lama tidak langsung menimpa revisi lain.
    const latest = await get(safeId);
    if (!latest || ["title", "subtitle", "content", "status"].some((key) => latest[key] !== before[key])) {
      throw new Error("Artikel sudah berubah sejak editor dibuka. Salin revisi Anda, lalu tutup editor dan muat ulang artikel.");
    }
    await api.requireAdmin();
    const { data, error } = await api.getClient().from("articles")
      .update({ title, subtitle, content: clean.html })
      .eq("id", safeId).eq("status", before.status).select(DETAIL_FIELDS).maybeSingle();
    if (error) {
      if (error.code === "42501") throw new Error("Izin menyunting artikel ditolak (42501). Pengelola perlu memeriksa izin UPDATE judul, subjudul, dan isi di Supabase. Revisi Anda masih ada di editor.");
      throw new Error("Revisi belum terkonfirmasi tersimpan. Periksa koneksi lalu coba lagi; isian Anda tetap ada di editor.");
    }
    if (!data || data.status !== before.status) throw new Error("Revisi belum tersimpan: status artikel berubah atau akses telah dicabut. Salin revisi Anda lalu muat ulang artikel.");
    return data;
  }

  window.TumbuhAdminArticles = Object.freeze({ list, get, setStatus, remove, revise, imageUrl, sanitize, statuses: STATUSES });
})();
