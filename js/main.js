const articleData = [];
const rootPath = location.pathname.includes("/admin/") ? "../" : "./";
function header() {
  const el = document.querySelector("#site-header");
  if (!el) return;
  const home = document.body.dataset.page === "home";
  const isArticle = document.body.dataset.page === "article";
  el.innerHTML = `<header class="topbar ${home ? "" : "inner"}" id="topbar"><div class="wrap nav"><a href="${rootPath}index.html" class="brand"><img class="brand-logo" src="${rootPath}assets/logo-tumbuh.png" alt="" />tumbuh.</a><nav class="navlinks" id="navlinks"><a href="${rootPath}index.html">Beranda</a><a href="${rootPath}index.html#mengenal">${isArticle ? "Tentang Kami" : "Kenali Tumbuh"}</a><a href="${rootPath}articles.html">${isArticle ? "Edukasi" : "Artikel Edukasi"}</a>${isArticle ? "" : `<a href="${rootPath}submit.html">Kirim Artikel</a>`}</nav><a class="nav-cta" href="${rootPath}index.html#cek">Cek Pertumbuhan ↗</a><button class="menu-toggle" id="menu-toggle" aria-label="Buka navigasi" aria-expanded="false">☰</button></div></header>`;
  const bar = document.getElementById("topbar");
  const update = () => {
    if (home) bar.classList.toggle("scrolled", scrollY > 25);
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  const toggle = document.querySelector("#menu-toggle");
  toggle.addEventListener("click", () => {
    const open = document.querySelector("#navlinks").classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "✕" : "☰";
  });
  document
    .querySelectorAll("#navlinks a")
    .forEach((a) =>
      a.addEventListener("click", () =>
        document.querySelector("#navlinks").classList.remove("open"),
      ),
    );
}
function footer() {
  const el = document.querySelector("#site-footer");
  if (!el) return;
  el.innerHTML = `<footer class="footer"><div class="footer-glow" aria-hidden="true"></div><div class="wrap"><div class="footer-columns"><div><a class="brand" href="${rootPath}index.html"><img class="brand-logo" src="${rootPath}assets/logo-tumbuh.png" alt="" />tumbuh.</a><p style="max-width:350px;margin-top:23px">Menemani orang tua memahami setiap langkah kecil perjalanan pertumbuhan anak dengan informasi yang ramah dan mudah dipahami.</p></div><div><h4>Jelajahi</h4><div class="footer-links"><a href="${rootPath}index.html">Beranda</a><a href="${rootPath}index.html#mengenal">Kenali Pertumbuhan</a><a href="${rootPath}articles.html">Artikel Edukasi</a><a href="${rootPath}submit.html">Kirim Artikel</a></div></div><div><h4>Tentang TUMBUH</h4><p>Teman tumbuh kembang anak usia 0–60 bulan.</p><p>Materi edukasi bukan pengganti konsultasi tenaga kesehatan.</p></div></div><div class="footer-bottom"><span>© 2026 TUMBUH. Versi pratinjau frontend.</span><span>Dibuat dengan perhatian untuk perjalanan tumbuh anak.</span></div></div></footer>`;
}
function cards() {
  const card = (a, i) =>
    `<article class="article-card"><a href="article.html?id=${i}"><img src="${rootPath + a.image}" alt="Ilustrasi ${a.title}"></a><div class="article-body"><h3><a href="${rootPath}article.html?id=${i}">${a.title}</a></h3><p>${a.excerpt}</p><div class="article-meta"><a href="${rootPath}article.html?id=${i}">Baca selengkapnya ↗</a><span>${a.date}</span></div></div></article>`;
  const home = document.querySelector("#home-articles");
  if (home) home.innerHTML = articleData.slice(0, 3).map(card).join("");
  const list = document.querySelector("#article-list");
  if (list) {
    function render(query = "") {
      list.innerHTML =
        articleData
          .map((a, i) => ({ a, i }))
          .filter(({ a }) =>
            (a.title + a.excerpt).toLowerCase().includes(query.toLowerCase()),
          )
          .map(({ a, i }) => card(a, i))
          .join("") || "<p>Belum ada artikel dengan kata kunci tersebut.</p>";
    }
    render();
    document
      .querySelector("#article-search")
      ?.addEventListener("input", (e) => render(e.target.value));
  }
  const detail = document.querySelector("#article-detail");
  if (detail) {
    const q = new URLSearchParams(location.search);
    const maybe = Number(q.get("id") || 0);
    const idx =
      Number.isInteger(maybe) && maybe >= 0 && maybe < articleData.length
        ? maybe
        : 0;
    const a = articleData[idx];
    document.title = `${a.title} — TUMBUH`;
    const heroTitle = document.getElementById("article-hero-title");
    if (heroTitle) heroTitle.textContent = a.title;
    const heroSubtitle = document.getElementById("article-hero-subtitle");
    if (heroSubtitle) heroSubtitle.textContent = a.excerpt;
    const heroMeta = document.getElementById("article-hero-meta");
    if (heroMeta)
      heroMeta.textContent = `${a.date.toUpperCase()}   •   ${(a.author || "TIM EDUKASI TUMBUH").toUpperCase()}`;
    const cover = document.getElementById("article-cover-image");
    if (cover) {
      cover.src = rootPath + a.image;
      cover.alt = `Gambar pendukung: ${a.title}`;
    }
    const first = idx === 0;
    if (first) {
      detail.innerHTML = `<span class="article-section-bar" aria-hidden="true"></span>
      <h2>Membangun kebiasaan makan yang sehat</h2>
      <p>Masa balita adalah waktu penting untuk mengenalkan berbagai rasa, tekstur, dan jenis makanan. Menu yang beragam dapat membantu keluarga memenuhi kebutuhan gizi sekaligus membuat anak semakin tertarik mencoba makanan baru.</p>
      <p>Mulailah dari bahan yang mudah ditemukan: sumber karbohidrat, lauk berprotein, sayuran berwarna, buah, dan air minum yang cukup. Sajikan dalam porsi yang sesuai usia dan kemampuan makan anak.</p>
      <h3>Tiga hal sederhana yang bisa dicoba</h3>
      <ol class="article-step-list">
        <li><div class="article-step-num">01</div><div><strong>Variasikan warna dan bentuk</strong><p>Susun menu dari bahan berwarna berbeda agar makanan terlihat menarik.</p></div></li>
        <li><div class="article-step-num">02</div><div><strong>Bangun jadwal makan rutin</strong><p>Upayakan waktu makan yang konsisten dan suasana yang menyenangkan.</p></div></li>
        <li><div class="article-step-num">03</div><div><strong>Ajak anak mencoba</strong><p>Kenalkan makanan baru secara bertahap tanpa memaksa anak menghabiskannya.</p></div></li>
      </ol>
      <p class="article-disclaimer">Setiap anak berkembang dengan cara berbeda. Gunakan artikel sebagai inspirasi, bukan sebagai pengganti saran ahli gizi atau tenaga kesehatan.</p>`;
    } else {
      detail.innerHTML = `<span class="article-section-bar" aria-hidden="true"></span>
      <h2>${a.title}</h2>
      <p>${a.excerpt}</p>
      <p>Pertumbuhan anak berlangsung melalui banyak perubahan kecil yang saling berkaitan. Orang tua dapat mendukungnya dengan memperhatikan kebutuhan gizi dan melakukan pemantauan secara rutin.</p>
      <h3>Hal yang perlu diperhatikan</h3>
      <ol class="article-step-list">
      <li><div class="article-step-num">01</div><div><strong>Pantau secara berkala</strong><p>Catat perubahan pertumbuhan anak dengan cara pengukuran yang konsisten.</p></div></li>
      <li><div class="article-step-num">02</div><div><strong>Kenali kebutuhan anak</strong><p>Perhatikan asupan makan, aktivitas dan istirahat sesuai usianya.</p></div></li>
      <li><div class="article-step-num">03</div><div><strong>Konsultasikan bila perlu</strong><p>Hubungi tenaga kesehatan jika membutuhkan penjelasan lebih lanjut.</p></div></li>
      </ol>
      <p class="article-disclaimer">Contoh artikel pratinjau antarmuka. Konten final nantinya berasal dari artikel yang disetujui.</p>`;
    }
    const recommendations = document.querySelector("#article-recommendations");
    if (recommendations) {
      recommendations.innerHTML = articleData
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => i !== idx)
        .slice(0, 3)
        .map(
          ({ item, i }) => `<article class="latest-entry">
      <a class="latest-cover" href="${rootPath}article.html?id=${i}" aria-label="Baca ${item.title}"><img src="${rootPath + item.image}" alt="Ilustrasi ${item.title}" loading="lazy"></a>
      <div class="latest-text"><h3><a href="${rootPath}article.html?id=${i}">${item.title}</a></h3>
      <a class="latest-link" href="${rootPath}article.html?id=${i}">Baca artikel ↗</a></div>
    </article>`,
        )
        .join("");
    }
  }
}

function growthForm() {
  const form = document.querySelector("#growth-form");
  if (!form) return;
  document.getElementById("birthdate").max = new Date()
    .toISOString()
    .slice(0, 10);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dob = new Date(form.birthdate.value + "T00:00:00");
    const now = new Date();
    const age =
      (now.getFullYear() - dob.getFullYear()) * 12 +
      (now.getMonth() - dob.getMonth()) -
      (now.getDate() < dob.getDate() ? 1 : 0);
    const message = document.querySelector("#growth-message");
    if (Number.isNaN(age) || age < 0 || age > 60) {
      message.hidden = false;
      message.textContent =
        "TUMBUH dirancang untuk usia 0–60 bulan. Periksa kembali tanggal lahir.";
      return;
    }
    message.hidden = true;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      // Frontend-only. Nanti, ganti task demo dengan request API DNN sungguhan.
      // TumbuhLoader.run menjaga layar loading tetap tampil sampai task selesai.
      // Tidak pernah membuat klasifikasi prediksi palsu.
      await window.TumbuhLoader.run("prediction", () => Promise.resolve());
      location.href = "results.html?preview=1";
    } catch (error) {
      message.hidden = false;
      message.textContent = "Proses pemeriksaan tidak berhasil. Coba kembali.";
    } finally {
      submit.disabled = false;
    }
  });
}
function editor() {
  const zone = document.querySelector("#content-editor");
  if (!zone) return;
  document.querySelectorAll("[data-editor-action]").forEach((b) =>
    b.addEventListener("click", () => {
      zone.focus();
      document.execCommand(
        b.dataset.editorAction,
        false,
        b.dataset.editorValue || null,
      );
    }),
  );
  const file = document.querySelector("#cover-file");
  const preview = document.querySelector("#cover-preview");
  file?.addEventListener("change", () => {
    const f = file.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Pilih file gambar.");
      file.value = "";
      return;
    }
    preview.src = URL.createObjectURL(f);
    preview.hidden = false;
  });
  // Penyimpanan demo artikel lengkap diatur di js/review.js agar isi editor dan gambar tidak terpotong.
}
document.addEventListener("DOMContentLoaded", () => {
  header();
  footer();
  cards();
  growthForm();
  editor();
});

// Daftar peninjauan dan pratinjau lengkap ditangani js/review.js.
