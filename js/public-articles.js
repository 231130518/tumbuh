/**
 * Satu modul untuk beranda, daftar artikel, dan halaman baca.
 * Elemen DOM yang tersedia menentukan fungsi halaman; client publik selalu memakai akses anon.
 */
/* Bacaan publik: hanya published dari Supabase; tidak membaca data demo/lokal. */
(() => {
  "use strict";
  const routes = window.TumbuhRoutes;
  const content = window.TumbuhArticleContent;
  const loading = window.TumbuhArticleLoading;
  const $ = (id) => document.getElementById(id);
  const LIST_FIELDS = "id::text,created_at,author_name,title,subtitle,cover_image_path,status";
  const PAGE_SIZE = 9;
  const home = $("home-articles");
  const list = $("article-list");
  const detail = $("article-detail");
  let page = 0;
  let search = "";
  /**
   * Versi pencarian/navigasi; request lama boleh selesai, tetapi hasilnya tidak boleh lagi mengganti tampilan.
   */
  let generation = 0;
  let timer;

  /**
   * Helper DOM yang mengisi teks secara aman tanpa innerHTML untuk metadata artikel.
   */
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = String(text);
    return element;
  }

  /**
   * Membuat tautan baca dengan ID database yang di-encode sebagai parameter URL.
   */
  function link(article, className, text) {
    const element = node("a", className, text);
    element.href = `${routes.article}?id=${encodeURIComponent(article.id)}`;
    return element;
  }

  /**
   * Memuat sampul yang lolos pemeriksaan URL, dengan teks pengganti jika gambar tidak tersedia.
   */
  function image(article, wrapper) {
    const placeholder = node("span", "article-cover-empty", "Gambar tidak tersedia");
    const source = content.imageUrl(article.cover_image_path);
    if (source) {
      const img = node("img");
      img.src = source;
      img.alt = `Gambar sampul ${article.title || "artikel"}`;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      placeholder.hidden = true;
      img.addEventListener("error", () => { img.hidden = true; placeholder.hidden = false; });
      wrapper.append(img);
    }
    wrapper.append(placeholder);
  }

  /**
   * Mengubah created_at menjadi tanggal yang mudah dibaca pengguna Indonesia.
   */
  function date(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" :
      new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(parsed);
  }

  /**
   * Menyusun kartu biasa atau kartu rekomendasi; isi menggunakan elemen DOM dan teks aman.
   */
  function card(article, recommendation = false) {
    const item = node("article", recommendation ? "latest-entry" : "article-card");
    const cover = link(article, recommendation ? "latest-cover" : "article-card-cover");
    image(article, cover);
    const body = node("div", recommendation ? "latest-text" : "article-body");
    const title = node("h3");
    title.append(link(article, "", article.title));
    body.append(title);
    if (recommendation) body.append(link(article, "latest-link", "Baca artikel ↗"));
    else {
      body.append(node("p", "", article.subtitle));
      const meta = node("div", "article-meta");
      meta.append(link(article, "", "Baca selengkapnya ↗"), node("span", "", date(article.created_at)));
      body.append(meta);
    }
    item.append(cover, body);
    return item;
  }

  /**
   * Mengganti area data dengan pesan kosong/gagal dan tombol mencoba lagi bila diperlukan.
   */
  function feedback(target, text, retry) {
    const box = node("div", "article-feedback");
    const message = node("p", "", text);
    message.setAttribute("role", retry ? "alert" : "status");
    box.append(message);
    if (retry) {
      const button = node("button", "btn outline", "Coba lagi");
      button.type = "button";
      button.addEventListener("click", refresh);
      box.append(button);
    }
    target.replaceChildren(box);
  }

  /**
   * Menyiapkan query dasar published dengan proyeksi kolom aman dan urutan terbaru.
   * Tidak meminta author_email, termasuk jika browser juga mempunyai sesi admin.
   */
  function query() {
    // Proyeksi eksplisit: author_email tidak pernah diminta, termasuk ketika
    // browser mempunyai sesi admin. RLS/column grants juga menegakkan ini.
    return window.TumbuhSupabase.getPublicClient().from("articles")
      .select(LIST_FIELDS, { count: "exact" })
      .eq("status", "published")
      .order("created_at", { ascending: false }).order("id", { ascending: false });
  }

  /**
   * Mengapit dan meng-escape nilai pencarian agar tanda kutip/koma tidak menjadi sintaks filter PostgREST.
   */
  function searchFilter(value) {
    // Nilai raw PostgREST harus diapit kutip; kutip/backslash/wildcard di input
    // diperlakukan sebagai karakter pencarian, bukan sintaks filter tambahan.
    const escaped = value.replace(/[\\%_]/g, "\\$&").replace(/"/g, '\\"');
    return `title.ilike."%${escaped}%",subtitle.ilike."%${escaped}%"`;
  }

  /**
   * Memuat tiga artikel di beranda atau sembilan per halaman daftar; skeleton diganti saat respons selesai.
   */
  async function loadList(version) {
    const target = home || list;
    loading.show(target, "cards", home ? 3 : 6);
    if ($("public-pagination")) $("public-pagination").hidden = true;
    try {
      let request = query();
      if (list && search) request = request.or(searchFilter(search));
      const size = home ? 3 : PAGE_SIZE;
      const offset = home ? 0 : page * size;
      const { data, error, count } = await request.range(offset, offset + size - 1);
      if (version !== generation) return;
      if (error) throw new Error("Artikel belum dapat dimuat. Coba lagi beberapa saat lagi.");
      const rows = (data || []).filter((article) => article.status === "published");
      if (list && page > 0 && !rows.length) { page -= 1; refresh(); return; }
      if (rows.length) target.replaceChildren(...rows.map((article) => card(article)));
      else feedback(target, search ? "Belum ada artikel dengan kata kunci tersebut." : "Belum ada artikel yang diterbitkan.");
      if (list) {
        const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
        $("public-page-label").textContent = `Halaman ${page + 1} dari ${pages} · ${count || 0} artikel`;
        $("public-prev").disabled = page === 0;
        $("public-next").disabled = page + 1 >= pages;
        $("public-pagination").hidden = pages <= 1;
      }
      window.TumbuhAOS?.refresh();
    } catch (error) {
      if (version === generation) feedback(target, error.message || "Artikel belum dapat dimuat.", true);
    } finally {
      if (version === generation) loading.finish(target);
    }
  }

  /**
   * Mengosongkan judul, gambar, isi, dan rekomendasi lama sebelum memuat artikel baru.
   */
  function resetDetail() {
    document.title = "Isi Artikel — TUMBUH";
    $("article-hero-title").textContent = "Memuat artikel…";
    $("article-hero-subtitle").textContent = "";
    $("article-hero-meta").textContent = "";
    $("article-cover-image").removeAttribute("src");
    document.querySelector(".article-cover-banner").hidden = true;
    document.querySelector(".article-latest").hidden = true;
    $("article-recommendations").replaceChildren();
    detail.replaceChildren();
  }

  /**
   * Memuat maksimal tiga artikel lain; kegagalannya tidak menghilangkan isi artikel utama.
   */
  async function loadRecommendations(id, version) {
    const target = $("article-recommendations");
    document.querySelector(".article-latest").hidden = false;
    loading.show(target, "recommendations", 3);
    try {
      const { data, error } = await query().neq("id", id).range(0, 2);
      if (version !== generation) return;
      if (error) throw error;
      const rows = (data || []).filter((article) => article.status === "published" && article.id !== id);
      $("article-recommendations").replaceChildren(...rows.map((article) => card(article, true)));
      document.querySelector(".article-latest").hidden = rows.length === 0;
      window.TumbuhAOS?.refresh();
    } catch {
      if (version === generation) document.querySelector(".article-latest").hidden = true;
    } finally {
      if (version === generation) loading.finish(target);
    }
  }

  /**
   * Memvalidasi ID, mengambil artikel published, lalu menampilkan isi yang sudah disanitasi.
   */
  async function loadDetail(version) {
    resetDetail();
    loading.show(detail, "detail", 1);
    try {
      let id;
      try { id = content.articleId(new URLSearchParams(location.search).get("id")); }
      catch { showUnavailable(); return; }
      const { data: article, error } = await window.TumbuhSupabase.getPublicClient().from("articles")
        .select(`${LIST_FIELDS},content`).eq("status", "published").eq("id", id).maybeSingle();
      if (version !== generation) return;
      if (error) throw new Error("Artikel belum dapat dimuat. Coba lagi beberapa saat lagi.");
      if (!article || article.status !== "published") { showUnavailable(); return; }
      const cleanBody = content.sanitize(article.content);
      document.title = `${article.title} — TUMBUH`;
      $("article-hero-title").textContent = article.title || "";
      $("article-hero-subtitle").textContent = article.subtitle || "";
      $("article-hero-meta").textContent = `${date(article.created_at).toUpperCase()}   •   ${String(article.author_name || "Penulis").toUpperCase()}`;
      const source = content.imageUrl(article.cover_image_path);
      const cover = $("article-cover-image");
      cover.alt = `Gambar utama: ${article.title || "artikel"}`;
      cover.referrerPolicy = "no-referrer";
      cover.onerror = () => { document.querySelector(".article-cover-banner").hidden = true; };
      if (source) cover.src = source;
      document.querySelector(".article-cover-banner").hidden = !source;
      const bar = node("span", "article-section-bar");
      bar.setAttribute("aria-hidden", "true");
      detail.replaceChildren(bar, cleanBody);
      loading.finish(detail);
      window.TumbuhAOS?.refresh();
      await loadRecommendations(id, version);
    } catch (error) {
      if (version !== generation) return;
      $("article-hero-title").textContent = "Artikel belum dapat dibuka.";
      feedback(detail, error.message || "Periksa koneksi lalu coba lagi.", true);
    } finally {
      if (version === generation) loading.finish(detail);
    }
  }

  /**
   * Menampilkan kondisi artikel tidak tersedia beserta jalan kembali ke daftar.
   */
  function showUnavailable() {
    $("article-hero-title").textContent = "Artikel tidak tersedia.";
    $("article-hero-subtitle").textContent = "Artikel belum diterbitkan atau sudah tidak tersedia.";
    const back = node("a", "btn", "Kembali ke daftar artikel ↗");
    back.href = routes.articles;
    detail.replaceChildren(back);
  }

  /**
   * Menaikkan versi request; respons versi sebelumnya tidak boleh menimpa hasil terbaru.
   */
  function refresh() {
    const version = ++generation;
    if (detail) loadDetail(version);
    else if (home || list) loadList(version);
  }

  /**
   * Memasang pencarian dengan debounce 250 ms, pagination, dan refresh ketika halaman aktif kembali.
   */
  function init() {
    $("article-search")?.addEventListener("input", (event) => {
      search = event.target.value.trim().slice(0, 100);
      page = 0;
      generation += 1;
      clearTimeout(timer);
      timer = setTimeout(refresh, 250);
    });
    $("public-prev")?.addEventListener("click", () => { if (page > 0) { page -= 1; refresh(); } });
    $("public-next")?.addEventListener("click", () => { page += 1; refresh(); });
    window.addEventListener("pageshow", (event) => { if (event.persisted) refresh(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
    refresh();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
