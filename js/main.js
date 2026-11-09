// Lokasi script menjadi acuan: bekerja pada domain sendiri maupun /tumbuh/.
const rootPath = new URL("../", document.currentScript.src).pathname;
const routes = {
  home: rootPath,
  articles: `${rootPath}artikel/`,
  article: `${rootPath}artikel/baca/`,
  submit: `${rootPath}kirim-artikel/`,
  results: `${rootPath}hasil-pemeriksaan/`,
  login: `${rootPath}admin/`,
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
      // Inferensi dijalankan di halaman hasil, tanpa mengirim data anak ke server.
      sessionStorage.setItem(GROWTH_SESSION_KEY, JSON.stringify(input));
      location.href = routes.results;
    } catch {
      message.hidden = false;
      message.textContent =
        "Data pemeriksaan belum dapat diteruskan. Izinkan penyimpanan sesi browser, lalu coba kembali.";
    } finally {
      button.disabled = false;
    }
  });
}
let growthRunning = false;
async function growthResults() {
  const summary = document.getElementById("child-summary");
  if (!summary || growthRunning) return;
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
  empty.hidden = true;
  const section = document.getElementById("growth-classification");
  const message = document.getElementById("growth-result-message");
  const retry = document.getElementById("growth-result-retry");
  const cards = [...document.querySelectorAll("[data-growth-head]")];
  growthRunning = true;
  retry.hidden = true;
  retry.disabled = true;
  section.setAttribute("aria-busy", "true");
  section.classList.remove("article-loaded");
  message.setAttribute("role", "status");
  message.textContent = "Memuat model dan menganalisis data pemeriksaan…";
  for (const card of cards) {
    const status = card.querySelector(".result-status");
    status.textContent = "Memproses…";
    status.classList.add("skeleton-block");
    card.removeAttribute("data-result");
    card.querySelector(".result-description").textContent = "Menunggu hasil analisis model.";
  }
  try {
    const task = () => window.TumbuhGrowthModel.predict(input);
    const prediction = window.TumbuhLoader && !window.TumbuhLoader.isRunning()
      ? await window.TumbuhLoader.run("prediction", task, { minDurationMs: 350 })
      : await task();
    // Label asli dipertahankan agar makna kelas tidak diterjemahkan secara keliru.
    for (const card of cards) {
      const result = prediction.results[card.dataset.growthHead];
      card.querySelector(".result-status").textContent = result.label;
      card.dataset.result = ["Normal", "Not Stunted"].includes(result.label) ? "normal" : "review";
      card.querySelector(".result-description").textContent =
        "Kategori yang diperkirakan model berdasarkan data pemeriksaan. Konfirmasikan hasil dengan tenaga kesehatan.";
    }
    message.textContent = "Analisis selesai. Data pemeriksaan diproses di perangkat Anda.";
  } catch (error) {
    for (const card of cards) {
      card.querySelector(".result-status").textContent = "Belum tersedia";
      card.querySelector(".result-description").textContent = "Analisis belum berhasil. Tidak ada klasifikasi yang ditampilkan.";
    }
    message.setAttribute("role", "alert");
    message.textContent = error.message || "Model belum dapat dijalankan. Coba lagi.";
    retry.hidden = false;
  } finally {
    cards.forEach((card) => card.querySelector(".result-status").classList.remove("skeleton-block"));
    section.removeAttribute("aria-busy");
    section.classList.add("article-loaded");
    retry.disabled = false;
    growthRunning = false;
  }
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
  if (!file || !preview) return; // Editor revisi admin tidak mengganti gambar sampul.
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
      image.size > 5 * 1024 * 1024
    ) {
      alert("Pilih satu gambar JPG, PNG, atau WEBP berukuran maksimal 5 MB.");
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
  growthForm();
  growthResults();
  document.getElementById("growth-result-retry")?.addEventListener("click", growthResults);
  editor();

});
