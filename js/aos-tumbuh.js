/* TUMBUH — seluruh AOS memakai gerakan HERO: fade-up 20px, 740ms,
   cubic-bezier(.22,1,.36,1); sekali muncul, footer statis.
   AOS tetap mendeteksi elemen; CSS yang mengatur animasi agar seragam.
   Jika CDN gagal, IntersectionObserver menjalankan kelas .aos-animate.
*/
(() => {
  "use strict";

  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Elemen dikelompokkan per bagian supaya teks masuk sebelum kartu.
  // Semua memakai fade-up sama seperti hero; hanya jedanya yang berbeda.
  const groups = [
    {
      selector:
        ".section-head .eyebrow, .section > .wrap > .eyebrow, .page-hero .eyebrow, .article-breadcrumb, .review-head .eyebrow",
      delay: 0,
    },
    {
      selector:
        ".section-title, .section-head h2, .impact h2, .page-hero h1, .article-hero h1, .admin-review-hero h1, .admin-preview-hero h1, .review-head h2, .admin-preview-intro h2",
      delay: 105,
    },
    {
      selector:
        ".section-head > p, .page-hero .wrap > p, .article-hero-subtitle, .article-hero-meta, .admin-review-hero .wrap > p, .admin-preview-intro .wrap > div > p, .review-head p",
      delay: 225,
    },
    { selector: ".section-head > a, .section-head .btn", delay: 340 },

    { selector: ".index-grid > .index-card", delay: 0, stagger: 105 },
    { selector: ".steps > .step", delay: 0, stagger: 105 },
    { selector: ".check-layout > .form-card", delay: 120 },
    { selector: ".impact-inner .eyebrow", delay: 0 },
    { selector: ".impact-inner > div:first-child > p", delay: 225 },
    { selector: ".big-number", delay: 340 },

    { selector: ".articles-grid > .article-card", delay: 0, stagger: 105 },
    { selector: ".article-cover-banner", delay: 0 },
    {
      selector:
        ".article-detail > h2, .article-detail > h3, .article-detail > p, .article-detail > ol, .article-detail > ul, .article-detail > blockquote",
      delay: 0,
      stagger: 55,
    },
    {
      selector:
        ".article-latest-title, .article-latest-subtitle, .article-latest-cta",
      delay: 0,
      stagger: 105,
    },
    { selector: ".latest-entry", delay: 0, stagger: 105 },
    { selector: ".faq-list > details", delay: 0, stagger: 105 },

    { selector: ".cta .eyebrow, .cta h2, .cta p", delay: 0, stagger: 105 },
    { selector: ".cta > a", delay: 225 },
    {
      selector:
        ".form-page > .form-card, .helper-card, .searchbar, .login-card",
      delay: 105,
    },
    { selector: ".result-grid > .result-tile", delay: 0, stagger: 105 },
    { selector: ".review-tabs, .review-item", delay: 0, stagger: 105 },
    {
      selector:
        ".admin-preview-intro-inner > a, .admin-preview-hero-inner > p, .admin-preview-hero-inner > h1",
      delay: 105,
    },
    { selector: ".admin-preview-image", delay: 0 },
    {
      selector:
        "#preview-body > h1, #preview-body > h2, #preview-body > h3, #preview-body > p, #preview-body > ul, #preview-body > ol, #preview-body > blockquote",
      delay: 0,
      stagger: 55,
    },

    { selector: ".results-hero .eyebrow", delay: 0 },
    { selector: ".results-hero h1", delay: 105 },
    { selector: ".results-hero p", delay: 225 },
    {
      selector:
        ".child-summary, .results-classification > h2, .results-disclaimer, .results-actions, .admin-tail > .wrap > *, .admin-preview-buttons",
      delay: 0,
    },

    // Bagian tersisa: headings/teks/tombol utama di area konten.
    {
      selector:
        "main .inner-page > .wrap > h2, main .inner-page > .wrap > p, main .form-page > h2, main .form-page > p, main .article-main > h2, main .article-main > p, main .admin-preview-actions-inner > div > h2, main .admin-preview-actions-inner > div > p",
      delay: 105,
    },
  ];

  // Hero pertama: animasi sekali saat halaman benar-benar terbuka,
  // bukan ketika AOS mendeteksi hero yang tertutup layar loading.
  function introHeroOnce() {
    if (document.body.dataset.page !== "home") return;
    const html = document.documentElement;
    const hero = document.querySelector(".hero-content");
    if (!hero || html.classList.contains("tumbuh-hero-shown")) return;
    if (reduceMotion()) {
      html.classList.add("tumbuh-hero-shown");
      return;
    }
    html.classList.add("tumbuh-hero-prepared");
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      window.requestAnimationFrame(() => {
        html.classList.add("tumbuh-hero-shown");
      });
    };
    const splashIsVisible =
      html.classList.contains("tumbuh-is-loading") ||
      html.classList.contains("tumbuh-preload");
    if (splashIsVisible) {
      document.addEventListener("tumbuh:loader-dismissed", reveal, {
        once: true,
      });
      // Jika loader gagal ditutup, teks jangan tersembunyi terus.
      window.setTimeout(reveal, 6000);
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
    }
  }

  const observed = new WeakSet();
  let offlineObserver = null;
  let refreshQueued = false;
  let aosActive = false;
  let ready = false;

  function markAll() {
    const newlyMarked = [];
    for (const g of groups) {
      const nodes = document.querySelectorAll(g.selector);
      nodes.forEach((el, i) => {
        if (
          el.hasAttribute("data-aos") ||
          el.closest("[data-async-content], .article-skeleton") ||
          el.closest("#site-footer") ||
          el.closest(".hero-content") ||
          el.closest(".hero-visual")
        )
          return;
        // Hindari gerakan ganda ketika induk dan isinya sama-sama dianimasikan.
        if (
          el.parentElement.closest("[data-aos]") ||
          el.querySelector("[data-aos]")
        )
          return;
        const delay = Math.min(
          350,
          (g.delay || 0) + (g.stagger || 0) * (i % 4),
        );
        const duration = 740;
        el.dataset.aos = "fade-up";
        el.dataset.aosOnce = "true"; // setiap elemen hanya masuk sekali
        el.dataset.aosDuration = String(duration);
        el.dataset.aosDelay = String(delay);
        el.dataset.aosOffset = "45";
        el.style.setProperty("--tumbuh-aos-delay", `${delay}ms`);
        el.style.setProperty("--tumbuh-aos-duration", `${duration}ms`);
        newlyMarked.push(el);
      });
    }
    return newlyMarked;
  }

  function offlineFallback(elements) {
    if (reduceMotion()) return;
    if (!offlineObserver) {
      offlineObserver = new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("aos-animate");
              observer.unobserve(entry.target); // jangan reset saat scroll balik
            }
          }
        },
        { rootMargin: "0px 0px -20px 0px", threshold: 0.01 },
      );
    }
    for (const el of elements) {
      if (observed.has(el) || el.classList.contains("aos-animate")) continue;
      observed.add(el);
      offlineObserver.observe(el);
    }
  }

  function refresh() {
    const newlyMarked = markAll();
    if (!ready) return;
    if (reduceMotion()) {
      newlyMarked.forEach((el) => el.classList.add("aos-animate"));
      return;
    }
    if (aosActive && window.AOS) {
      // Hanya perbarui AOS saat ada elemen baru, bukan setiap scroll/mutasi.
      if (newlyMarked.length) window.AOS.refreshHard();
    } else {
      offlineFallback(newlyMarked);
    }
  }

  function init() {
    introHeroOnce();
    if (reduceMotion())
      document.documentElement.classList.add("tumbuh-reduced-motion");
    if (!window.AOS && !reduceMotion())
      document.documentElement.classList.add("tumbuh-aos-fallback");
    markAll();

    const start = () => {
      if (ready) return;
      ready = true;
      const initial = document.querySelectorAll("main [data-aos]");
      if (reduceMotion()) {
        initial.forEach((el) => el.classList.add("aos-animate"));
      } else if (window.AOS) {
        aosActive = true;
        window.AOS.init({
          duration: 740,
          easing: "ease-out-cubic",
          offset: 45,
          delay: 0,
          once: true, // tidak dianimasikan ulang setelah pertama terlihat
          mirror: false,
          anchorPlacement: "top-bottom",
          disable: reduceMotion,
        });
      } else {
        offlineFallback(initial);
      }
    };
    // Semua halaman menunggu loading selesai agar animasi awal terlihat.
    const html = document.documentElement;
    if (
      html.classList.contains("tumbuh-is-loading") ||
      html.classList.contains("tumbuh-preload")
    ) {
      document.addEventListener("tumbuh:loader-dismissed", start, {
        once: true,
      });
      window.setTimeout(start, 6000);
    } else start();

    // Artikel dan konten admin dapat bertambah secara dinamis.
    // Refresh secukupnya hanya jika DOM menambah/menghapus elemen.
    const mutationWatcher = new MutationObserver((records) => {
      if (
        !records.some(
          (record) => record.addedNodes.length || record.removedNodes.length,
        )
      )
        return;
      if (refreshQueued) return;
      refreshQueued = true;
      window.requestAnimationFrame(() => {
        refreshQueued = false;
        refresh();
      });
    });
    for (const root of [document.querySelector("main")]) {
      if (root)
        mutationWatcher.observe(root, { childList: true, subtree: true });
    }

    window.TumbuhAOS = { refresh };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else init();
})();
