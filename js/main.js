const articleData = [
  {
    title: "Inspirasi makanan sehat dan bergizi untuk si kecil.",
    excerpt:
      "Ide sederhana membuat waktu makan lebih menyenangkan, dengan pilihan menu beragam yang mudah dipahami keluarga.",
    image: "assets/artikel-1.jpg",
    date: "29 Oktober 2026",
    author: "FITRI NOVITASARI BR MANALU",
  },
  {
    title: "Kenali indikator pertumbuhan anak",
    excerpt:
      "Kenali tiga indeks yang membantu orang tua memahami pertumbuhan balita.",
    image: "assets/artikel-2.jpg",
    date: "05 November 2026",
    author: "Tim Edukasi TUMBUH",
  },
  {
    title: "Panduan menimbang berat badan balita",
    excerpt:
      "Pelajari langkah pengukuran agar hasil pemantauan lebih konsisten.",
    image: "assets/artikel-3.jpg",
    date: "02 November 2026",
    author: "Tim Edukasi TUMBUH",
  },
  {
    title: "Menu seimbang untuk hari-hari sibuk",
    excerpt:
      "Ide membuat variasi menu sederhana dari bahan yang mudah ditemukan.",
    image: "assets/artikel-1.jpg",
    date: "22 Oktober 2026",
    author: "Tim Edukasi TUMBUH",
  },
];
// Lokasi script menjadi acuan: bekerja pada domain sendiri maupun /tumbuh/.
const rootPath = new URL("../", document.currentScript.src).pathname;
const routes = {
  home: rootPath,
  articles: `${rootPath}artikel/`,
  article: `${rootPath}artikel/baca/`,
  submit: `${rootPath}kirim-artikel/`,
  results: `${rootPath}hasil-pemeriksaan/`,
  login: `${rootPath}admin/login/`,
  dashboard: `${rootPath}admin/peninjauan/`,
  preview: `${rootPath}admin/pratinjau/`,
};
window.TumbuhRoutes = routes;

// index.html tetap merupakan file fisik, tetapi address bar memakai alamat folder.
if (
  location.protocol !== "file:" &&
  location.pathname.endsWith("/index.html")
) {
  history.replaceState(
    history.state,
    "",
    location.pathname.slice(0, -10) + location.search + location.hash,
  );
}
function header() {
  const target = document.getElementById("site-header");
  if (!target) return;
  const home = document.body.dataset.page === "home";
  const compactLinks = ["article", "results"].includes(
    document.body.dataset.page,
  );
  target.innerHTML = `<header class="topbar ${home ? "" : "inner"}" id="topbar">
    <div class="wrap nav">
      <a href="${routes.home}" class="brand"><img class="brand-logo" src="${rootPath}assets/logo-tumbuh.png" alt="">tumbuh.</a>
      <nav class="navlinks" id="navlinks" aria-label="Navigasi utama">
        <a href="${routes.home}">Beranda</a>
        <a href="${routes.home}#mengenal">${compactLinks ? "Tentang Kami" : "Kenali Tumbuh"}</a>
        <a href="${routes.articles}">${compactLinks ? "Edukasi" : "Artikel Edukasi"}</a>
        ${compactLinks ? "" : `<a href="${routes.submit}">Kirim Artikel</a>`}
      </nav>
      <a class="nav-cta" href="${routes.home}#cek">Cek Pertumbuhan ↗</a>
      <button class="menu-toggle" id="menu-toggle" aria-label="Buka navigasi" aria-expanded="false" aria-controls="navlinks">☰</button>
    </div>
  </header>`;
  const bar = document.getElementById("topbar");
  const update = () => {
    if (home) bar.classList.toggle("scrolled", scrollY > 25);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  const toggle = document.getElementById("menu-toggle");
  const links = document.getElementById("navlinks");
  const setOpen = (open) => {
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Tutup navigasi" : "Buka navigasi",
    );
    toggle.textContent = open ? "✕" : "☰";
  };
  toggle.addEventListener("click", () =>
    setOpen(!links.classList.contains("open")),
  );
  links
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}
function footer() {
  const target = document.getElementById("site-footer");
  if (!target) return;
  target.innerHTML = `<footer class="footer">
    <div class="footer-glow" aria-hidden="true"></div>
    <div class="wrap"><div class="footer-columns">
      <div><a class="brand" href="${routes.home}"><img class="brand-logo" src="${rootPath}assets/logo-tumbuh.png" alt="">tumbuh.</a>
        <p class="footer-description">Menemani orang tua memahami setiap langkah kecil perjalanan pertumbuhan anak dengan informasi yang ramah dan mudah dipahami.</p></div>
      <div><h4>Jelajahi</h4><div class="footer-links">
        <a href="${routes.home}">Beranda</a><a href="${routes.home}#mengenal">Kenali Pertumbuhan</a>
        <a href="${routes.articles}">Artikel Edukasi</a><a href="${routes.submit}">Kirim Artikel</a>
      </div></div>
      <div><h4>Tentang TUMBUH</h4><p>Teman tumbuh kembang anak usia 0–60 bulan.</p>
        <p>Materi edukasi bukan pengganti konsultasi tenaga kesehatan.</p></div>
    </div><div class="footer-bottom"><span>© 2026 TUMBUH. Versi pratinjau frontend.</span>
      <span>Dibuat dengan perhatian untuk perjalanan tumbuh anak.</span></div></div>
  </footer>`;
}

function sectionNavigation() {
  const findTarget = (hash) => {
    try {
      return hash
        ? document.getElementById(decodeURIComponent(hash.slice(1)))
        : null;
    } catch {
      return null;
    }
  };
  const scrollTo = (target, behavior) => {
    target.scrollIntoView({ behavior, block: "start" });
    // Fokus keyboard mengikuti tujuan tanpa menambahkan fragmen ke URL.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
  };
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target.closest?.("a[href]");
    if (
      !link ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    )
      return;
    const destination = new URL(link.href);
    if (
      destination.origin !== location.origin ||
      destination.pathname !== location.pathname ||
      destination.search !== location.search
    )
      return;
    const target = findTarget(destination.hash);
    if (!target) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scrollTo(target, reducedMotion ? "instant" : "smooth");
  });

  // Tautan dari halaman lain tetap membawa tujuan scroll; hapus fragmen setelah tiba.
  const target = findTarget(location.hash);
  if (!target) return;
  let done = false;
  const reveal = () => {
    if (done) return;
    done = true;
    requestAnimationFrame(() => scrollTo(target, "instant"));
  };
  if (document.documentElement.matches(".tumbuh-is-loading, .tumbuh-preload")) {
    document.addEventListener("tumbuh:loader-dismissed", reveal, {
      once: true,
    });
    window.setTimeout(reveal, 6000);
  } else reveal();
}

// Artikel contoh lama dipertahankan dan dibagikan ke penyimpanan demo admin.
window.TumbuhSeedArticles = articleData.map((a, i) => ({
  id: String(i),
  status: "published",
  title: a.title,
  subtitle: a.excerpt,
  author: a.author,
  date: a.date,
  email: "",
  cover: a.image,
  content:
    i === 0
      ? `<span class="article-section-bar" aria-hidden="true"></span>
      <h2>Membangun kebiasaan makan yang sehat</h2>
      <p>Masa balita adalah waktu penting untuk mengenalkan berbagai rasa, tekstur, dan jenis makanan. Menu yang beragam dapat membantu keluarga memenuhi kebutuhan gizi sekaligus membuat anak semakin tertarik mencoba makanan baru.</p>
      <p>Mulailah dari bahan yang mudah ditemukan: sumber karbohidrat, lauk berprotein, sayuran berwarna, buah, dan air minum yang cukup. Sajikan dalam porsi yang sesuai usia dan kemampuan makan anak.</p>
      <h3>Tiga hal sederhana yang bisa dicoba</h3>
      <ol class="article-step-list">
        <li><div class="article-step-num">01</div><div><strong>Variasikan warna dan bentuk</strong><p>Susun menu dari bahan berwarna berbeda agar makanan terlihat menarik.</p></div></li>
        <li><div class="article-step-num">02</div><div><strong>Bangun jadwal makan rutin</strong><p>Upayakan waktu makan yang konsisten dan suasana yang menyenangkan.</p></div></li>
        <li><div class="article-step-num">03</div><div><strong>Ajak anak mencoba</strong><p>Kenalkan makanan baru secara bertahap tanpa memaksa anak menghabiskannya.</p></div></li>
      </ol>
      <p class="article-disclaimer">Setiap anak berkembang dengan cara berbeda. Gunakan artikel sebagai inspirasi, bukan sebagai pengganti saran ahli gizi atau tenaga kesehatan.</p>`
      : `<span class="article-section-bar" aria-hidden="true"></span>
      <h2>${a.title}</h2>
      <p>${a.excerpt}</p>
      <p>Pertumbuhan anak berlangsung melalui banyak perubahan kecil yang saling berkaitan. Orang tua dapat mendukungnya dengan memperhatikan kebutuhan gizi dan melakukan pemantauan secara rutin.</p>
      <h3>Hal yang perlu diperhatikan</h3>
      <ol class="article-step-list">
      <li><div class="article-step-num">01</div><div><strong>Pantau secara berkala</strong><p>Catat perubahan pertumbuhan anak dengan cara pengukuran yang konsisten.</p></div></li>
      <li><div class="article-step-num">02</div><div><strong>Kenali kebutuhan anak</strong><p>Perhatikan asupan makan, aktivitas dan istirahat sesuai usianya.</p></div></li>
      <li><div class="article-step-num">03</div><div><strong>Konsultasikan bila perlu</strong><p>Hubungi tenaga kesehatan jika membutuhkan penjelasan lebih lanjut.</p></div></li>
      </ol>
      <p class="article-disclaimer">Contoh artikel pratinjau antarmuka. Konten final nantinya berasal dari artikel yang disetujui.</p>`,
}));

function cards() {
  const store = window.TumbuhArticles;
  if (!store) return;
  const escape = store.escapeHtml;
  const articles = store.published();
  const url = (article) =>
    `${routes.article}?id=${encodeURIComponent(article.id)}`;
  const card = (article) => `<article class="article-card">
    <a href="${url(article)}"><img src="${escape(store.imageSrc(article))}" alt="${escape(article.title)}" loading="lazy"></a>
    <div class="article-body"><h3><a href="${url(article)}">${escape(article.title)}</a></h3>
      <p>${escape(article.subtitle)}</p><div class="article-meta">
      <a href="${url(article)}">Baca selengkapnya ↗</a><span>${escape(article.date)}</span></div></div>
    </article>`;
  const home = document.getElementById("home-articles");
  if (home) home.innerHTML = articles.slice(0, 3).map(card).join("");
  const list = document.getElementById("article-list");
  if (list) {
    const render = (query = "") => {
      const matching = articles.filter((a) =>
        `${a.title} ${a.subtitle}`.toLowerCase().includes(query.toLowerCase()),
      );
      list.innerHTML =
        matching.map(card).join("") ||
        "<p>Belum ada artikel dengan kata kunci tersebut.</p>";
    };
    render();
    document.getElementById("article-search").oninput = (e) =>
      render(e.target.value);
  }
  const detail = document.getElementById("article-detail");
  if (!detail) return;
  const id = new URLSearchParams(location.search).get("id") || "0";
  const article = articles.find((a) => a.id === id);
  if (!article) {
    document.getElementById("article-hero-title").textContent =
      "Artikel tidak tersedia.";
    document.getElementById("article-hero-subtitle").textContent =
      "Artikel belum diterbitkan atau sudah dihapus dari pratinjau ini.";
    document.getElementById("article-hero-meta").textContent = "";
    document.querySelector(".article-cover-banner").hidden = true;
    document.querySelector(".article-latest").hidden = true;
    detail.innerHTML = `<a class="btn" href="${routes.articles}">Kembali ke daftar artikel ↗</a>`;
    return;
  }
  document.title = `${article.title} — TUMBUH`;
  document.getElementById("article-hero-title").textContent = article.title;
  document.getElementById("article-hero-subtitle").textContent =
    article.subtitle;
  document.getElementById("article-hero-meta").textContent =
    `${article.date.toUpperCase()}   •   ${article.author.toUpperCase()}`;
  const cover = document.getElementById("article-cover-image");
  cover.src = store.imageSrc(article);
  cover.alt = `Gambar utama: ${article.title}`;
  detail.innerHTML = `<span class="article-section-bar" aria-hidden="true"></span>${store.sanitize(article.content)}`;
  const recommendations = document.getElementById("article-recommendations");
  recommendations.innerHTML = articles
    .filter((a) => a.id !== id)
    .slice(0, 3)
    .map(
      (a) => `<article class="latest-entry">
    <a class="latest-cover" href="${url(a)}"><img src="${escape(store.imageSrc(a))}" alt="${escape(a.title)}" loading="lazy"></a>
    <div class="latest-text"><h3><a href="${url(a)}">${escape(a.title)}</a></h3><a class="latest-link" href="${url(a)}">Baca artikel ↗</a></div>
  </article>`,
    )
    .join("");
}

// Data pemeriksaan hanya bertahan dalam sesi tab, terpisah dari artikel.
const GROWTH_SESSION_KEY = "tumbuh-growth-input-v1";
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function ageInMonths(birthdate, reference = localDate()) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birthdate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(reference)
  )
    return NaN;
  const birth = new Date(`${birthdate}T00:00:00`);
  const now = new Date(`${reference}T00:00:00`);
  if (
    !Number.isFinite(birth.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    localDate(birth) !== birthdate ||
    localDate(now) !== reference ||
    birth > now
  )
    return NaN;
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    now.getMonth() -
    birth.getMonth() -
    (now.getDate() < birth.getDate() ? 1 : 0)
  );
}
function readGrowthInput() {
  try {
    const data = JSON.parse(sessionStorage.getItem(GROWTH_SESSION_KEY));
    if (
      !data ||
      typeof data.birthdate !== "string" ||
      typeof data.measuredOn !== "string"
    )
      return null;
    const age = ageInMonths(data.birthdate, data.measuredOn);
    if (
      !Number.isInteger(age) ||
      age < 0 ||
      age > 60 ||
      data.measuredOn > localDate() ||
      !["male", "female"].includes(data.sex)
    )
      return null;
    if (
      !Number.isFinite(data.weight) ||
      data.weight < 1 ||
      data.weight > 45 ||
      !Number.isFinite(data.height) ||
      data.height < 35 ||
      data.height > 130
    )
      return null;
    return { ...data, age };
  } catch {
    return null;
  }
}
function growthForm() {
  const form = document.getElementById("growth-form");
  if (!form) return;
  form.elements.birthdate.max = localDate();
  const previous = readGrowthInput();
  if (previous) {
    for (const key of ["birthdate", "sex", "weight", "height"])
      form.elements[key].value = previous[key];
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const measuredOn = localDate();
    const age = ageInMonths(form.elements.birthdate.value, measuredOn);
    const message = document.getElementById("growth-message");
    if (!Number.isInteger(age) || age < 0 || age > 60) {
      message.hidden = false;
      message.textContent =
        "TUMBUH dirancang untuk usia 0–60 bulan. Periksa kembali tanggal lahir.";
      return;
    }
    message.hidden = true;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const input = {
        birthdate: form.elements.birthdate.value,
        measuredOn,
        sex: form.elements.sex.value,
        weight: Number(form.elements.weight.value),
        height: Number(form.elements.height.value),
      };
      // Belum memanggil model: hanya menyimpan input untuk ringkasan hasil demo.
      sessionStorage.setItem(GROWTH_SESSION_KEY, JSON.stringify(input));
      if (window.TumbuhLoader)
        await window.TumbuhLoader.run("prediction", () => Promise.resolve());
      location.href = `${routes.results}?preview=1`;
    } catch {
      message.hidden = false;
      message.textContent =
        "Data pemeriksaan belum dapat diteruskan. Izinkan penyimpanan sesi browser, lalu coba kembali.";
    } finally {
      button.disabled = false;
    }
  });
}
function growthResults() {
  const summary = document.getElementById("child-summary");
  if (!summary) return;
  const input = readGrowthInput();
  const empty = document.getElementById("results-empty");
  if (!input) {
    empty.hidden = false;
    document.getElementById("result-summary-note").textContent =
      "Isi form pemeriksaan untuk menampilkan data anak.";
    return;
  }
  const format = (value) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
  document.getElementById("child-age").textContent = `${input.age} bulan`;
  document.getElementById("child-sex").textContent =
    input.sex === "male" ? "Laki-laki" : "Perempuan";
  document.getElementById("child-weight").textContent =
    `${format(input.weight)} kg`;
  document.getElementById("child-height").textContent =
    `${format(input.height)} cm`;
  document.getElementById("result-summary-note").textContent =
    "Data sesuai isian Anda. Usia dihitung dalam bulan penuh pada tanggal pemeriksaan.";
}
function editor() {
  const zone = document.getElementById("content-editor");
  if (!zone) return;
  let savedRange = null;
  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (
      selection.rangeCount &&
      zone.contains(selection.anchorNode) &&
      zone.contains(selection.focusNode)
    )
      savedRange = selection.getRangeAt(0).cloneRange();
  });
  document.querySelectorAll("[data-editor-action]").forEach((button) => {
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      zone.focus();
      if (savedRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
      let value = button.dataset.editorValue || null;
      if (button.dataset.editorAction === "createLink") {
        value = window.prompt(
          "Alamat tautan (https:// atau mailto:):",
          "https://",
        );
        if (!value) return;
        value = value.trim();
        if (!/^(https?:\/\/|mailto:)/i.test(value)) {
          alert("Gunakan tautan http://, https://, atau mailto:.");
          return;
        }
      }
      document.execCommand(button.dataset.editorAction, false, value);
    });
  });
  const file = document.getElementById("cover-file");
  const preview = document.getElementById("cover-preview");
  let objectUrl = null;
  file.addEventListener("change", () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    preview.hidden = true;
    preview.removeAttribute("src");
    const image = file.files[0];
    if (!image) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
      image.size > 8 * 1024 * 1024
    ) {
      alert("Pilih satu gambar JPG, PNG, atau WEBP berukuran maksimal 8 MB.");
      file.value = "";
      return;
    }
    objectUrl = URL.createObjectURL(image);
    preview.src = objectUrl;
    preview.hidden = false;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  header();
  footer();
  sectionNavigation();
  cards();
  growthForm();
  growthResults();
  editor();
  document
    .getElementById("admin-login-preview")
    ?.addEventListener("click", () => {
      document.getElementById("login-note").hidden = false;
    });
});
// Sinkronkan daftar publik setelah status demo diubah dari tab lain.
window.addEventListener("storage", (event) => {
  if (event.key?.startsWith("tumbuh-frontend-articles-v1")) cards();
});
