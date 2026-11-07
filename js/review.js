/* TUMBUH — pratinjau artikel lengkap untuk DEMO frontend.
   Tidak ada autentikasi backend, server, atau publikasi sungguhan.
   Gunakan API dan database ketika tahap backend dimulai.
*/
(() => {
  "use strict";
  const routes = window.TumbuhRoutes;
  const STORAGE_KEY = "tumbuh-frontend-articles-v1";
  const STATUS = {
    pending: { label: "Menunggu tinjauan", css: "pending" },
    published: { label: "Terbit (demo lokal)", css: "published" },
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
    const doc = new DOMParser().parseFromString(String(raw || ""), "text/html");
    const root = doc.body;
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
      "DIV",
      "SPAN",
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
        const safeClasses = (node.getAttribute("class") || "")
          .split(/\s+/)
          .filter((name) =>
            [
              "article-step-list",
              "article-step-num",
              "article-disclaimer",
            ].includes(name),
          );
        const originalHref =
          node.tagName === "A" ? node.getAttribute("href") || "" : "";
        Array.from(node.attributes).forEach((attr) =>
          node.removeAttribute(attr.name),
        );
        if (safeClasses.length) node.className = safeClasses.join(" ");
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

  // Satu sumber data untuk halaman publik dan admin; semua perubahan masih lokal.
  const seeds = [...(window.TumbuhSeedArticles || []), ...sampleArticles];
  const assetBase = new URL("../", document.currentScript.src);
  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }
  function normalise(article) {
    const text = (key) => String(article[key] || "");
    const cover = text("cover");
    return {
      id: text("id"),
      title: text("title"),
      subtitle: text("subtitle"),
      author: text("author"),
      email: text("email"),
      date: text("date"),
      status: STATUS[article.status] ? article.status : "pending",
      cover:
        /^data:image\/jpeg;base64,/.test(cover) ||
        /^(?:\.\.\/)?assets\/artikel-[123]\.jpg$/.test(cover)
          ? cover
          : "",
      content: sanitizeArticleHtml(article.content),
    };
  }
  function readLocalArticles() {
    const raw = readJson(STORAGE_KEY, []);
    return Array.isArray(raw)
      ? raw
          .filter(
            (a) => a && typeof a.id === "string" && a.id.startsWith("local-"),
          )
          .map(normalise)
      : [];
  }
  function readOverrides() {
    const raw = readJson(STORAGE_KEY + ":edits", {});
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  }
  function all() {
    const overrides = readOverrides();
    const legacyStatuses = readJson(STORAGE_KEY + ":sample-status", {});
    const samples = seeds
      .filter((a) => !overrides[a.id]?.deleted)
      .map((a) =>
        normalise({
          ...a,
          status: legacyStatuses?.[a.id] || a.status,
          ...overrides[a.id],
          id: a.id,
        }),
      );
    return [...readLocalArticles().reverse(), ...samples];
  }
  function saveLocalArticle(article) {
    const clean = normalise(article);
    if (seeds.some((a) => a.id === clean.id)) {
      const overrides = readOverrides();
      overrides[clean.id] = clean;
      localStorage.setItem(STORAGE_KEY + ":edits", JSON.stringify(overrides));
    } else {
      const list = readLocalArticles();
      const index = list.findIndex((a) => a.id === clean.id);
      if (index >= 0) list[index] = clean;
      else list.push(clean);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }
  function setDemoStatus(id, status) {
    const article = all().find((a) => a.id === id);
    if (!article || !STATUS[status]) return false;
    saveLocalArticle({ ...article, status });
    return true;
  }
  function deleteArticle(id) {
    if (seeds.some((a) => a.id === id)) {
      const overrides = readOverrides();
      overrides[id] = { deleted: true };
      localStorage.setItem(STORAGE_KEY + ":edits", JSON.stringify(overrides));
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(readLocalArticles().filter((a) => a.id !== id)),
      );
    }
  }
  function safeImageSrc(article) {
    if (article.cover.startsWith("data:image/jpeg;base64,"))
      return article.cover;
    return article.cover
      ? new URL(article.cover.replace(/^\.\.\//, ""), assetBase).href
      : "";
  }
  window.TumbuhArticles = {
    all,
    published: () => all().filter((a) => a.status === "published"),
    imageSrc: safeImageSrc,
    sanitize: sanitizeArticleHtml,
    escapeHtml,
  };

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
        <a class="review-action" href="${routes.preview}?id=${encodeURIComponent(a.id)}">Tinjau artikel lengkap ↗</a>
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
    const $ = (id) => document.getElementById(id);
    if (!article) {
      $("preview-not-found").hidden = false;
      return;
    }
    function render() {
      article = all().find((a) => a.id === id) || article;
      document.title = `Tinjau: ${article.title} — TUMBUH`;
      $("preview-title").textContent = article.title;
      $("preview-subtitle").textContent = article.subtitle;
      $("preview-meta").textContent =
        `${article.date.toUpperCase()}   •   ${article.author.toUpperCase()}`;
      $("preview-email").textContent = article.email
        ? `Email penulis: ${article.email}`
        : "";
      $("preview-email").hidden = !article.email;
      const source = safeImageSrc(article);
      $("preview-cover").src = source;
      $("preview-cover").alt = `Gambar utama artikel: ${article.title}`;
      $("preview-cover").closest(".admin-preview-image").hidden = !source;
      $("full-cover-img").src = source;
      $("show-full-cover").hidden = !source;
      $("preview-body").innerHTML = sanitizeArticleHtml(article.content);
      $("preview-status").className = `review-status ${article.status}`;
      $("preview-status").textContent = `● ${STATUS[article.status].label}`;
      $("approve-article").hidden = article.status === "published";
      $("approve-article").textContent =
        article.status === "pending"
          ? "✓ Setujui Artikel"
          : "Terbitkan Artikel ↗";
      $("reject-article").hidden = article.status !== "pending";
      $("draft-article").hidden = article.status === "draft";
      $("edit-article").href =
        `${routes.submit}?edit=${encodeURIComponent(id)}`;
      wrap.hidden = false;
    }
    function decide(status) {
      const labels = {
        published: "menerbitkan",
        rejected: "menolak",
        draft: "menyimpan sebagai draf",
      };
      if (
        !window.confirm(
          `Yakin ingin ${labels[status]} artikel ini? Perubahan hanya berlaku pada demo di browser ini.`,
        )
      )
        return;
      try {
        if (!setDemoStatus(id, status))
          throw new Error("Artikel tidak ditemukan");
        $("preview-feedback").hidden = false;
        $("preview-feedback").textContent =
          status === "published"
            ? "Artikel tampil di daftar publik pada browser ini. Belum diterbitkan ke server."
            : `Status berubah menjadi ${STATUS[status].label}. Artikel tidak tampil di daftar publik.`;
        render();
      } catch {
        alert("Perubahan belum tersimpan. Periksa ruang penyimpanan browser.");
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
    $("draft-article").addEventListener("click", () => decide("draft"));
    $("delete-article").addEventListener("click", () => {
      if (
        !window.confirm(
          "Hapus artikel ini dari demo browser? Artikel yang dihapus tidak bisa dipulihkan dari halaman ini.",
        )
      )
        return;
      try {
        deleteArticle(id);
        location.href = routes.dashboard;
      } catch {
        alert("Artikel belum berhasil dihapus dari penyimpanan browser.");
      }
    });
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
    const body = document.getElementById("content-editor");
    const cover = document.getElementById("cover-file");
    const editId = new URLSearchParams(location.search).get("edit");
    const existing = editId ? all().find((a) => a.id === editId) : null;
    if (editId && !existing) {
      note.hidden = false;
      note.textContent =
        "Artikel tidak ditemukan. Kembali ke halaman Peninjauan Artikel.";
      form.querySelectorAll("input, textarea, button").forEach((el) => {
        el.disabled = true;
      });
      body.contentEditable = "false";
      return;
    }
    if (existing) {
      document.title = "Edit Artikel — TUMBUH (Demo)";
      document.querySelector(".page-hero h1").textContent =
        "Sempurnakan artikel sebelum dibagikan.";
      document.querySelector(".form-card h3").textContent = "Edit artikel";
      document.getElementById("submit-article-button").textContent =
        "Simpan Perubahan ↗";
      document.getElementById("article-edit-back").hidden = false;
      document.getElementById("article-edit-back").href =
        `${routes.preview}?id=${encodeURIComponent(editId)}`;
      document.getElementById("article-form-intro").textContent =
        "Perubahan tersimpan pada demo browser ini. Status artikel dipertahankan saat memilih Simpan Perubahan.";
      for (const key of ["author", "email", "title", "subtitle"])
        form.elements[key].value = existing[key];
      body.innerHTML = sanitizeArticleHtml(existing.content);
      cover.required = false;
      document.getElementById("cover-help").textContent =
        "Gambar utama sudah tersedia. Unggah satu gambar baru hanya jika ingin menggantinya.";
      document.getElementById("cover-preview").src = safeImageSrc(existing);
      document.getElementById("cover-preview").hidden = false;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      note.hidden = false;
      if (!body || body.innerText.trim().length < 25) {
        note.textContent =
          "Isi artikel minimal 25 karakter agar dapat ditinjau lengkap.";
        return;
      }
      if (cover.files.length > 1 || (!existing && cover.files.length !== 1)) {
        note.textContent = "Unggah tepat satu gambar sampul.";
        return;
      }
      if (
        !form.elements.author.value.trim() ||
        !form.elements.title.value.trim() ||
        form.elements.subtitle.value.trim().length < 12
      ) {
        note.textContent =
          "Nama dan judul wajib diisi. Subjudul minimal 12 karakter.";
        return;
      }
      const status =
        event.submitter?.value === "draft"
          ? "draft"
          : existing?.status || "pending";
      const submitButtons = form.querySelectorAll('button[type="submit"]');
      submitButtons.forEach((button) => {
        button.disabled = true;
      });
      note.textContent = "Menyimpan artikel ke pratinjau browser...";
      try {
        // Hindari membuat ulang artikel yang sudah dihapus dari tab admin lain.
        if (existing && !all().some((a) => a.id === editId))
          throw new Error(
            "Artikel sudah dihapus. Kembali ke halaman peninjauan.",
          );
        const coverData = cover.files.length
          ? await fileToJpegDataUrl(cover.files[0])
          : existing.cover;
        const sanitized = sanitizeArticleHtml(body.innerHTML);
        const plain = new DOMParser()
          .parseFromString(sanitized, "text/html")
          .body.textContent.trim();
        if (plain.length < 25)
          throw new Error("Isi artikel terlalu pendek setelah diproses.");
        const article = {
          id:
            existing?.id ||
            `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status,
          author: form.elements.author.value.trim(),
          email: form.elements.email.value.trim(),
          title: form.elements.title.value.trim(),
          subtitle: form.elements.subtitle.value.trim(),
          date:
            existing?.date ||
            new Intl.DateTimeFormat("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            }).format(new Date()),
          cover: coverData,
          content: sanitized,
        };
        saveLocalArticle(article);
        if (existing) {
          location.href = `${routes.preview}?id=${encodeURIComponent(article.id)}`;
          return;
        }
        form.reset();
        body.innerHTML = "";
        document.getElementById("cover-preview").hidden = true;
        document.getElementById("cover-preview").removeAttribute("src");
        note.innerHTML = `<strong>${status === "draft" ? "Draf tersimpan!" : "Artikel menunggu tinjauan!"}</strong> Data tersimpan di browser ini, belum dikirim ke server. <a href="${routes.preview}?id=${encodeURIComponent(article.id)}">Lihat artikel lengkap ↗</a>`;
      } catch (error) {
        note.textContent = `Belum berhasil menyimpan: ${error.message || "Penyimpanan browser tidak tersedia."}`;
      } finally {
        submitButtons.forEach((button) => {
          button.disabled = false;
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupDashboard();
    setupPreview();
    setupSubmit();
  });
})();
