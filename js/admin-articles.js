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

  async function get(id) {
    const safeId = articleId(id);
    await api.requireAdmin();
    const { data, error } = await api.getClient().from("articles").select(DETAIL_FIELDS).eq("id", safeId).maybeSingle();
    if (error) throw new Error("Artikel belum dapat dimuat. Periksa koneksi atau izin akses, lalu coba lagi.");
    return data;
  }

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

  window.TumbuhAdminArticles = Object.freeze({ list, get, setStatus, remove, imageUrl, sanitize, statuses: STATUSES });
})();
