/* Hanya data Supabase. Tidak membaca seed atau localStorage artikel demo. */
(() => {
  "use strict";
  const api = window.TumbuhSupabase;
  const STATUSES = Object.freeze({ pending: "Menunggu tinjauan", published: "Terbit", rejected: "Ditolak" });
  // int8 dikirim sebagai text agar ID besar tidak dibulatkan oleh JavaScript.
  const LIST_FIELDS = "id::text,created_at,author_name,title,subtitle,cover_image_path,status";
  const DETAIL_FIELDS = `${LIST_FIELDS},author_email,content`;
  const PAGE_SIZE = 20;

  function articleId(value) {
    const id = String(value || "");
    if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
      throw new Error("ID artikel tidak valid.");
    }
    return id;
  }

  function imageUrl(path) {
    if (typeof path !== "string" || !path.trim()) return "";
    let objectPath = path.trim();
    const prefix = "/storage/v1/object/public/articles-images/";
    if (/^https:\/\//i.test(objectPath)) {
      try {
        const url = new URL(objectPath);
        if (url.origin !== new URL(api.getConfig().url).origin || !url.pathname.startsWith(prefix) || url.search || url.hash) return "";
        objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
      } catch { return ""; }
    }
    objectPath = objectPath.replace(/^articles-images\//, "");
    if (!/\.(jpe?g|png|webp)$/i.test(objectPath) || /[\\%?#:\x00-\x1f]/.test(objectPath) ||
        objectPath.split("/").some((part) => !part || part === "." || part === "..")) return "";
    return api.getClient().storage.from("articles-images").getPublicUrl(objectPath).data.publicUrl;
  }

  function sanitize(raw) {
    if (!window.DOMPurify?.isSupported) throw new Error("Pembersih konten tidak tersedia. Pratinjau tidak dapat dibuka.");
    const fragment = window.DOMPurify.sanitize(String(raw || ""), {
      ALLOWED_TAGS: ["p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "u", "br", "blockquote", "a", "div", "span"],
      ALLOWED_ATTR: ["href", "title", "class"],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      RETURN_DOM_FRAGMENT: true,
    });
    for (const node of fragment.querySelectorAll("[class]")) {
      const safe = [...node.classList].filter((name) => ["article-step-list", "article-step-num", "article-disclaimer"].includes(name));
      node.removeAttribute("class");
      if (safe.length) node.classList.add(...safe);
    }
    for (const link of fragment.querySelectorAll("a")) {
      const href = link.getAttribute("href") || "";
      if (!/^(https?:\/\/|mailto:)/i.test(href)) link.removeAttribute("href");
      else {
        link.setAttribute("rel", "noopener noreferrer nofollow");
        link.setAttribute("target", "_blank");
      }
    }
    return fragment;
  }

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

  window.TumbuhAdminArticles = Object.freeze({ list, get, setStatus, imageUrl, sanitize, statuses: STATUSES });
})();
