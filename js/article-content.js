/* Sanitasi yang sama untuk pengiriman publik dan pratinjau admin. */
(() => {
  "use strict";
  function sanitize(raw) {
    if (!window.DOMPurify?.isSupported) throw new Error("Pembersih konten tidak tersedia. Artikel belum dapat diproses.");
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

  function html(raw) {
    const container = document.createElement("div");
    container.append(sanitize(raw));
    return { html: container.innerHTML, text: container.textContent.trim() };
  }
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
        if (url.origin !== new URL(window.TumbuhSupabase.getConfig().url).origin || !url.pathname.startsWith(prefix) || url.search || url.hash) return "";
        objectPath = decodeURIComponent(url.pathname.slice(prefix.length));
      } catch { return ""; }
    }
    objectPath = objectPath.replace(/^articles-images\//, "");
    if (!/\.(jpe?g|png|webp)$/i.test(objectPath) || /[\\%?#:\x00-\x1f]/.test(objectPath) ||
        objectPath.split("/").some((part) => !part || part === "." || part === "..")) return "";
    return window.TumbuhSupabase.getPublicClient().storage.from("articles-images").getPublicUrl(objectPath).data.publicUrl;
  }

  window.TumbuhArticleContent = Object.freeze({ sanitize, html, articleId, imageUrl });
})();
