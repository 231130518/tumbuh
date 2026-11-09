/* TUMBUH — pratinjau artikel lengkap untuk DEMO frontend.
   Tidak ada autentikasi backend, server, atau publikasi sungguhan.
   Gunakan API dan database ketika tahap backend dimulai.
*/
(() => {
  "use strict";
  const STORAGE_KEY = "tumbuh-frontend-articles-v1";
  const STATUS = {
    pending: { label: "Menunggu tinjauan", css: "pending" },
    published: { label: "Disetujui (demo)", css: "published" },
    rejected: { label: "Ditolak (demo)", css: "rejected" },
    draft: { label: "Draf", css: "draft" },
  };
  const sampleArticles = [
    {
      id: "sample-gizi",
      status: "pending",
      title: "Pentingnya Gizi Seimbang untuk Si Kecil",
      subtitle: "Memahami kebutuhan nutrisi anak dalam masa tumbuh kembang.",
      author: "Rani Putri",
      date: "04 November 2026",
      email: "",
      cover: "../assets/artikel-1.jpg",
      content: `<h2>Pentingnya membangun pola makan yang beragam</h2>
        <p>Setiap anak memiliki kebutuhan makan yang berkembang seiring pertambahan usia. Orang tua dapat membantu dengan menyediakan makanan beragam dan membangun suasana makan yang nyaman.</p>
        <p>Menu sehari-hari sebaiknya mencakup sumber karbohidrat, lauk berprotein, sayur, dan buah sesuai usia anak. Variasi dapat membantu anak mengenal rasa dan tekstur sejak dini.</p>
        <h2>Langkah sederhana untuk keluarga</h2>
        <ol><li>Susun jadwal makan secara konsisten tanpa terburu-buru.</li><li>Kenalkan jenis makanan baru secara bertahap.</li><li>Libatkan anak saat memilih makanan yang sesuai usianya.</li></ol>
        <p>Tidak setiap anak langsung menyukai makanan baru. Berikan kesempatan mencoba kembali tanpa memaksa anak menghabiskan makanannya.</p>
        <h2>Kapan perlu berkonsultasi?</h2>
        <p>Jika anak mengalami kesulitan makan berkepanjangan atau orang tua mengkhawatirkan pertumbuhannya, berkonsultasilah dengan tenaga kesehatan untuk memperoleh saran yang sesuai.</p>
        <p><em>Artikel ini merupakan contoh konten untuk memeriksa tampilan peninjauan, bukan artikel yang benar-benar dikirim pengguna.</em></p>`,
    },
    {
      id: "sample-ukur",
      status: "pending",
      title: "Panduan Mengukur Berat dan Tinggi Badan Anak",
      subtitle: "Tips pengukuran dengan perlengkapan sederhana di rumah.",
      author: "Dewi Anggraini",
      date: "02 November 2026",
      email: "",
      cover: "../assets/artikel-3.jpg",
      content: `<h2>Persiapkan pengukuran sebelum memulai</h2>
        <p>Pemantauan pertumbuhan anak akan lebih mudah dibandingkan dari waktu ke waktu apabila pengukuran dilakukan dengan cara yang konsisten. Siapkan perlengkapan yang sesuai usia anak, dan pastikan alat dalam kondisi baik.</p>
        <p>Perhatikan bahwa panjang badan anak yang diukur berbaring berbeda dari tinggi badan anak yang diukur berdiri. Pilih metode sesuai usia dan petunjuk tenaga kesehatan.</p>
        <h2>Mengukur berat badan</h2>
        <ul><li>Tempatkan timbangan di permukaan yang stabil.</li><li>Pastikan anak dalam posisi aman.</li><li>Catat hasil pengukuran beserta tanggalnya.</li></ul>
        <h2>Mencatat panjang atau tinggi badan</h2>
        <p>Gunakan alat ukur yang sesuai. Untuk bayi dan anak yang belum dapat berdiri tegak, pengukuran panjang badan sebaiknya dilakukan dengan bantuan orang lain menggunakan alat yang dirancang untuk posisi berbaring.</p>
        <p>Hasil pengukuran perlu ditafsirkan berdasarkan usia dan jenis kelamin. Untuk penilaian status pertumbuhan, konsultasikan hasil pada tenaga kesehatan jika diperlukan.</p>
        <p><em>Artikel ini merupakan contoh konten untuk memeriksa tampilan peninjauan.</em></p>`,
    },
    {
      id: "sample-tahap",
      status: "published",
      title: "Memahami Tahapan Pertumbuhan Anak Usia Dini",
      subtitle: "Mengikuti perkembangan anak dari waktu ke waktu.",
      author: "Tim Edukasi TUMBUH",
      date: "05 November 2026",
      email: "",
      cover: "../assets/artikel-2.jpg",
      content: `<h2>Pertumbuhan setiap anak memiliki ritmenya sendiri</h2>
        <p>Pertumbuhan dapat dipantau dengan mencatat perubahan berat badan dan panjang atau tinggi badan secara berkala. Satu hasil pengukuran sebaiknya dibaca bersama riwayat pengukuran sebelumnya.</p>
        <h2>Mengenal tiga indeks pertumbuhan</h2>
        <ul><li><strong>TB/U:</strong> membandingkan panjang atau tinggi badan dengan umur.</li><li><strong>BB/U:</strong> membandingkan berat badan dengan umur.</li><li><strong>BB/TB:</strong> membandingkan berat badan dengan panjang atau tinggi badan.</li></ul>
        <p>Ketiga indeks ini memberikan informasi yang berbeda dan perlu dipahami sesuai standar yang digunakan dalam pemeriksaan.</p>
        <h2>Pemantauan dan pendampingan</h2>
        <p>Orang tua dapat menyimpan catatan pertumbuhan dan membawanya saat berkonsultasi. Petugas kesehatan dapat membantu menjelaskan arti hasil pengukuran dan tindak lanjut yang sesuai.</p>
        <p><em>Konten ini adalah contoh untuk menguji tampilan frontend, bukan publikasi sungguhan.</em></p>`,
    },
  ];

  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  function sanitizeArticleHtml(raw) {
    const doc = new DOMParser().parseFromString(
      `<div id="root">${String(raw || "")}</div>`,
      "text/html",
    );
    const root = doc.getElementById("root");
    const allowed = new Set([
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "UL",
      "OL",
      "LI",
      "STRONG",
      "B",
      "EM",
      "I",
      "U",
      "BR",
      "BLOCKQUOTE",
      "A",
    ]);
    const dangerous = new Set([
      "SCRIPT",
      "STYLE",
      "IFRAME",
      "OBJECT",
      "EMBED",
      "FORM",
      "INPUT",
      "BUTTON",
      "SVG",
      "MATH",
      "LINK",
      "META",
      "VIDEO",
      "AUDIO",
      "IMG",
    ]);
    function walk(el) {
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.COMMENT_NODE) {
          node.remove();
          continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (dangerous.has(node.tagName)) {
          node.remove();
          continue;
        }
        walk(node);
        if (!allowed.has(node.tagName)) {
          node.replaceWith(...Array.from(node.childNodes));
          continue;
        }
        const originalHref =
          node.tagName === "A" ? node.getAttribute("href") || "" : "";
        Array.from(node.attributes).forEach((attr) =>
          node.removeAttribute(attr.name),
        );
        if (
          node.tagName === "A" &&
          /^(https?:\/\/|mailto:)/i.test(originalHref)
        ) {
          node.setAttribute("href", originalHref);
          node.setAttribute("rel", "noopener noreferrer nofollow");
          node.setAttribute("target", "_blank");
        }
      }
    }
    walk(root);
    return root.innerHTML;
  }

  function readLocalArticles() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(
          (a) => a && typeof a.id === "string" && a.id.startsWith("local-"),
        )
        .map((a) => ({
          id: a.id,
          title: String(a.title || ""),
          subtitle: String(a.subtitle || ""),
          author: String(a.author || ""),
          email: String(a.email || ""),
          date: String(a.date || ""),
          status: STATUS[a.status] ? a.status : "pending",
          cover:
            typeof a.cover === "string" &&
            /^data:image\/jpeg;base64,/.test(a.cover)
              ? a.cover
              : "",
          content: sanitizeArticleHtml(a.content || ""),
        }));
    } catch {
      return [];
    }
  }
  function saveLocalArticle(article) {
    const list = readLocalArticles();
    list.push(article);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function setDemoStatus(id, status) {
    if (!STATUS[status]) return false;
    if (id.startsWith("sample-")) {
      // Status contoh disimpan tersendiri agar tetap dapat diuji.
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY + ":sample-status") || "{}",
      );
      stored[id] = status;
      localStorage.setItem(
        STORAGE_KEY + ":sample-status",
        JSON.stringify(stored),
      );
      return true;
    }
    const items = readLocalArticles();
    const target = items.find((a) => a.id === id);
    if (!target) return false;
    target.status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  }
  function applyDemoStatus(samples) {
    let overrides = {};
    try {
      overrides =
        JSON.parse(
          localStorage.getItem(STORAGE_KEY + ":sample-status") || "{}",
        ) || {};
    } catch {}
    return samples.map((a) => ({
      ...a,
      status: STATUS[overrides[a.id]] ? overrides[a.id] : a.status,
    }));
  }
  function all() {
    return [
      ...readLocalArticles().reverse(),
      ...applyDemoStatus(sampleArticles),
    ];
  }

  function safeImageSrc(a) {
    if (a.id.startsWith("sample-")) return a.cover;
    return a.cover && /^data:image\/jpeg;base64,/.test(a.cover) ? a.cover : "";
  }
  function formatStatus(status) {
    const entry = STATUS[status] || STATUS.pending;
    return `<span class="review-status ${entry.css}">● ${escapeHtml(entry.label)}</span>`;
  }

  function setupDashboard() {
    const list = document.getElementById("review-list");
    if (!list) return;
    const tabs = Array.from(document.querySelectorAll("[data-filter]"));
    const empty = document.getElementById("review-empty");
    let filter = "semua";
    function render() {
      const articles = all();
      const count = document.getElementById("pending-count");
      if (count)
        count.textContent = String(
          articles.filter((a) => a.status === "pending").length,
        );
      const visible =
        filter === "semua"
          ? articles
          : articles.filter((a) => a.status === filter);
      list.innerHTML = visible
        .map(
          (
            a,
          ) => `<article class="review-item" data-status="${escapeHtml(a.status)}">
        <div class="review-thumb">${safeImageSrc(a) ? `<img src="${safeImageSrc(a)}" alt="Gambar sampul ${escapeHtml(a.title)}">` : ""}</div>
        <div class="review-desc">${formatStatus(a.status)}
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.author)} · ${escapeHtml(a.date)}</p>
          <p>${escapeHtml(a.subtitle)}</p>
        </div>
        <a class="review-action" href="preview.html?id=${encodeURIComponent(a.id)}">Tinjau artikel lengkap ↗</a>
      </article>`,
        )
        .join("");
      if (empty) empty.hidden = visible.length !== 0;
    }
    tabs.forEach((button) =>
      button.addEventListener("click", () => {
        filter = button.dataset.filter;
        tabs.forEach((x) => x.classList.toggle("active", x === button));
        render();
      }),
    );
    render();
  }

  function setupPreview() {
    const wrap = document.getElementById("admin-preview-article");
    if (!wrap) return;
    const id = new URLSearchParams(location.search).get("id") || "sample-gizi";
    let article = all().find((a) => a.id === id);
    if (!article) {
      document.getElementById("preview-not-found").hidden = false;
      return;
    }
    const $ = (id) => document.getElementById(id);
    function render() {
      article = all().find((a) => a.id === id) || article;
      document.title = `Tinjau: ${article.title} — TUMBUH`;
      $("preview-title").textContent = article.title;
      $("preview-subtitle").textContent = article.subtitle;
      $("preview-meta").textContent =
        `${article.date.toUpperCase()}   •   ${article.author.toUpperCase()}`;
      const cover = $("preview-cover");
      cover.alt = `Gambar utama artikel: ${article.title}`;
      const source = safeImageSrc(article);
      cover.src = source;
      cover.hidden = !source;
      cover.closest(".admin-preview-image").hidden = !source;
      $("full-cover-img").src = source;
      $("show-full-cover").hidden = !source;
      $("preview-body").innerHTML = sanitizeArticleHtml(article.content);
      const entry = STATUS[article.status] || STATUS.pending;
      const status = $("preview-status");
      status.className = `review-status ${entry.css}`;
      status.textContent = `● ${entry.label}`;
      const buttons = $("preview-action-buttons");
      buttons.hidden = article.status !== "pending";
      wrap.hidden = false;
    }
    async function decide(status) {
      const label = status === "published" ? "menyetujui" : "menolak";
      if (
        !window.confirm(
          `Yakin ingin ${label} artikel ini pada DEMO lokal? Tindakan ini tidak mempublikasikan artikel di server.`,
        )
      )
        return;
      try {
        if (!setDemoStatus(article.id, status))
          throw new Error("Gagal menyimpan status");
        const feedback = $("preview-feedback");
        feedback.hidden = false;
        feedback.textContent =
          status === "published"
            ? "Status di pratinjau lokal berubah menjadi Disetujui. Artikel belum terbit secara online."
            : "Status di pratinjau lokal berubah menjadi Ditolak. Data belum dikirim ke server.";
        render();
        feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        alert("Perubahan status tidak dapat disimpan di browser ini.");
      }
    }
    $("show-full-cover").addEventListener("click", () =>
      $("full-cover-dialog").showModal(),
    );
    $("close-full-cover").addEventListener("click", () =>
      $("full-cover-dialog").close(),
    );
    $("full-cover-dialog").addEventListener("click", (e) => {
      if (e.target === $("full-cover-dialog")) e.target.close();
    });
    $("approve-article").addEventListener("click", () => decide("published"));
    $("reject-article").addEventListener("click", () => decide("rejected"));
    render();
  }

  function fileToJpegDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        return reject(new Error("Gambar harus JPG, PNG, atau WEBP."));
      if (file.size > 8 * 1024 * 1024)
        return reject(new Error("Ukuran gambar maksimal 8 MB."));
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const scale = Math.min(
            1,
            1200 / Math.max(img.naturalWidth, img.naturalHeight),
          );
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const result = canvas.toDataURL("image/jpeg", 0.78);
          URL.revokeObjectURL(url);
          if (result.length > 2 * 1024 * 1024)
            return reject(
              new Error("Gambar terlalu besar untuk penyimpanan pratinjau."),
            );
          resolve(result);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Gambar tidak dapat dibaca."));
      };
      img.src = url;
    });
  }

  function setupSubmit() {
    const form = document.getElementById("submit-article");
    if (!form) return;
    const note = document.getElementById("submit-message");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = document.getElementById("content-editor");
      const cover = document.getElementById("cover-file");
      note.hidden = false;
      if (!body || body.innerText.trim().length < 25) {
        note.textContent =
          "Isi artikel minimal 25 karakter agar dapat ditinjau lengkap.";
        return;
      }
      if (cover.files.length !== 1) {
        note.textContent = "Unggah tepat satu gambar sampul.";
        return;
      }
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      note.textContent = "Menyimpan pratinjau artikel ke browser...";
      try {
        const coverDataUrl = await fileToJpegDataUrl(cover.files[0]);
        const sanitized = sanitizeArticleHtml(body.innerHTML);
        const plain = new DOMParser()
          .parseFromString(sanitized, "text/html")
          .body.textContent.trim();
        if (plain.length < 25)
          throw new Error("Isi artikel terlalu pendek setelah diproses.");
        const article = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: "pending",
          author: form.author.value.trim(),
          email: form.email.value.trim(),
          title: form.title.value.trim(),
          subtitle: form.subtitle.value.trim(),
          date: new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date()),
          cover: coverDataUrl,
          content: sanitized,
        };
        saveLocalArticle(article);
        form.reset();
        body.innerHTML = "";
        const imagePreview = document.getElementById("cover-preview");
        if (imagePreview) {
          imagePreview.hidden = true;
          imagePreview.removeAttribute("src");
        }
        note.innerHTML =
          "<strong>Artikel tersimpan untuk pratinjau!</strong> Judul, gambar, dan seluruh isi artikel disimpan di browser ini. Kamu bisa memeriksanya dari halaman admin <em>Peninjauan Artikel</em>. Ini belum dikirim ke server atau admin sungguhan.";
      } catch (err) {
        note.textContent = `Belum berhasil menyimpan: ${err.message || "Penyimpanan browser tidak tersedia."}`;
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupDashboard();
    setupPreview();
    setupSubmit();
  });
})();
