/* Placeholder artikel bersama; tidak menunda request atau menyimpan data. */
(() => {
  "use strict";
  function element(className) {
    const node = document.createElement("div");
    node.className = className;
    return node;
  }
  function line(width = "") { return element(`skeleton-block skeleton-line ${width}`); }
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
  function finish(target) {
    if (!target) return;
    target.querySelectorAll(":scope > .article-skeleton, :scope > .loading-sr-only").forEach((node) => node.remove());
    target.removeAttribute("aria-busy");
    target.classList.add("article-loaded");
  }
  window.TumbuhArticleLoading = Object.freeze({ show, finish });
})();
