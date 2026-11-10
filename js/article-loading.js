/**
 * Komponen skeleton berupa DOM: CSS mengatur shimmer dan fade-in.
 * Pemanggil mengatur kapan show/finish dijalankan sesuai siklus request-nya.
 */
/* Placeholder artikel bersama; tidak menunda request atau menyimpan data. */
(() => {
  "use strict";
  /**
   * Membuat bagian skeleton sebagai div dengan kelas yang diatur CSS.
   */
  function element(className) {
    const node = document.createElement("div");
    node.className = className;
    return node;
  }
  /**
   * Membuat garis pengganti teks; kelas tambahan mengatur panjang atau tinggi baris.
   */
  function line(width = "") { return element(`skeleton-block skeleton-line ${width}`); }
  /**
   * Mengganti isi target dengan placeholder gambar/teks dan menandai aria-busy.
   * Skeleton bersifat dekoratif; pembaca layar mendapat satu pesan pemuatan.
   */
  function show(target, kind = "cards", count = 3) {
    if (!target) return;
    target.classList.remove("article-loaded");
    target.dataset.asyncContent = "true";
    target.setAttribute("aria-busy", "true");
    const status = document.createElement("span");
    status.className = "loading-sr-only";
    status.setAttribute("role", "status");
    status.textContent = "Memuat artikel…";
    const nodes = [status];
    for (let i = 0; i < count; i += 1) {
      const shell = element(`article-skeleton skeleton-${kind}`);
      shell.setAttribute("aria-hidden", "true");
      const cover = element("skeleton-block skeleton-cover");
      const body = element("skeleton-body");
      body.append(line("skeleton-title"), line("skeleton-medium"), line(), line("skeleton-short"));
      if (kind === "detail") body.append(line(), line(), line("skeleton-medium"), line(), line("skeleton-short"));
      else body.append(element("skeleton-divider"), line("skeleton-short"));
      shell.append(cover, body);
      nodes.push(shell);
    }
    target.replaceChildren(...nodes);
  }
  /**
   * Membersihkan sisa skeleton, melepas aria-busy, dan memicu fade-in tanpa menghapus konten asli.
   */
  function finish(target) {
    if (!target) return;
    target.querySelectorAll(":scope > .article-skeleton, :scope > .loading-sr-only").forEach((node) => node.remove());
    target.removeAttribute("aria-busy");
    target.classList.add("article-loaded");
  }
  window.TumbuhArticleLoading = Object.freeze({ show, finish });
})();
