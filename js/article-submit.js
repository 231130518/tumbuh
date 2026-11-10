/**
 * Alur formulir pengunjung: validasi → upload sampul → INSERT artikel pending.
 * Form baru dikosongkan setelah server mengonfirmasi penerimaan kiriman.
 */
/* Pengiriman nyata: Storage + INSERT pending. Draf lokal bukan kiriman admin. */
(() => {
  "use strict";
  const form = document.getElementById("submit-article");
  if (!form) return;
  const editor = document.getElementById("content-editor");
  const fileInput = document.getElementById("cover-file");
  const note = document.getElementById("submit-message");
  const sendButton = document.getElementById("submit-article-button");
  const draftButton = document.getElementById("save-article-draft");
  const restoreButton = document.getElementById("restore-article-draft");
  const DRAFT_KEY = "tumbuh-submission-draft-v1";
  const ATTEMPT_KEY = "tumbuh-submission-attempt-v1";
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  let busy = false;
  let attempt = null;

  /**
   * Menampilkan status pengiriman atau kesalahan tanpa menyisipkan HTML dari server.
   */
  function message(text, error = false) {
    note.hidden = false;
    note.textContent = text;
    note.setAttribute("role", error ? "alert" : "status");
    note.classList.toggle("is-error", error);
  }

  /**
   * Mengambil draf teks dari browser; JSON rusak atau penyimpanan ditolak dianggap tidak ada draf.
   */
  function readDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
  }

  /**
   * Mengambil isian, merapikan spasi tepi, dan menyiapkan HTML bersih beserta teks untuk validasi panjang.
   */
  function fields() {
    const sanitized = window.TumbuhArticleContent.html(editor.innerHTML);
    return {
      author_name: form.elements.author.value.trim(),
      author_email: form.elements.email.value.trim() || null,
      title: form.elements.title.value.trim(),
      subtitle: form.elements.subtitle.value.trim(),
      content: sanitized.html,
      text: sanitized.text,
    };
  }

  /**
   * Memeriksa batas isian sebelum upload; pembatasan database tetap diperlukan karena client bisa dilewati.
   */
  function validate(data) {
    if (data.author_name.length < 2 || data.author_name.length > 100) throw new Error("Nama penulis harus 2–100 karakter.");
    if (data.title.length < 5 || data.title.length > 150) throw new Error("Judul harus 5–150 karakter.");
    if (data.subtitle.length < 12 || data.subtitle.length > 500) throw new Error("Subjudul harus 12–500 karakter.");
    if (data.text.length < 25 || data.text.length > 50000 || data.content.length > 100000) throw new Error("Isi artikel harus 25–50.000 karakter dan formatnya tidak boleh terlalu besar.");
    if (data.author_email && (data.author_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.author_email))) throw new Error("Alamat email belum valid.");
  }

  /**
   * Memeriksa MIME, ukuran, signature file, dan hasil decode gambar.
   * Object URL sementara selalu dibebaskan setelah selesai agar memori tidak menumpuk.
   */
  async function validateImage(file) {
    if (!file || !extensions[file.type]) throw new Error("Pilih tepat satu gambar JPG, PNG, atau WebP.");
    if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error("Ukuran gambar maksimal 5 MB.");
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    const valid = file.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
      file.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte) :
      ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    if (!valid) throw new Error("Isi file tidak sesuai format gambar yang dipilih.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 40000000) {
        throw new Error("Resolusi gambar terlalu besar. Gunakan gambar di bawah 40 megapiksel.");
      }
    } catch (error) {
      if (error.message?.startsWith("Resolusi")) throw error;
      throw new Error("Gambar tidak dapat dibaca. Pilih file gambar lain.");
    } finally { URL.revokeObjectURL(url); }
  }

  /**
   * Menghitung SHA-256 dari isian dan bytes gambar untuk mengenali retry kiriman yang sama.
   */
  async function fingerprint(data, file) {
    const payload = new Blob([JSON.stringify(data), await file.arrayBuffer()]);
    const hash = await crypto.subtle.digest("SHA-256", await payload.arrayBuffer());
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Menyimpan metadata percobaan ke sessionStorage; kegagalan penyimpanan tidak membatalkan proses.
   */
  function remember() {
    // Metadata retry saja, bukan isi artikel, password, sesi, atau hak admin.
    try { sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)); } catch { /* Retry dalam tab masih berfungsi. */ }
  }

  /**
   * Menggunakan kembali path upload jika fingerprint cocok dan percobaan belum lebih dari 24 jam.
   * Kiriman berbeda mendapat UUID baru agar tidak menimpa gambar orang lain.
   */
  function getAttempt(hash, extension) {
    if (!attempt) {
      try { attempt = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY)); } catch { attempt = null; }
    }
    const valid = attempt?.fingerprint === hash &&
      /^submissions\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/cover\.(jpg|png|webp)$/.test(attempt.path) &&
      Date.now() - attempt.createdAt < 24 * 60 * 60 * 1000;
    if (!valid) {
      attempt = { fingerprint: hash, path: `submissions/${crypto.randomUUID()}/cover.${extension}`, uploaded: false, createdAt: Date.now() };
      remember();
    }
    return attempt;
  }

  /**
   * Mengubah error teknis upload menjadi pesan yang membedakan masalah izin dan koneksi.
   */
  function uploadError(error) {
    if (["400", "401", "403"].includes(String(error.statusCode)) || /row.level|permission|unauthorized/i.test(error.message || "")) {
      return new Error("Gambar belum dapat diunggah karena layanan belum mengizinkan pengiriman publik. Hubungi pengelola; artikel belum terkirim.");
    }
    return new Error("Unggah gambar belum berhasil. Periksa koneksi lalu kirim lagi; isian tetap tersedia.");
  }

  /**
   * Upload tanpa overwrite; pada respons duplikat, cocokkan hash gambar yang sudah ada sebelum melanjutkan.
   */
  async function upload(db, job, file) {
    if (job.uploaded) return;
    message("Mengunggah gambar sampul…");
    const { error } = await db.storage.from("articles-images").upload(job.path, file, {
      contentType: file.type, cacheControl: "3600", upsert: false,
    });
    if (error) {
      // Upload bisa sudah selesai ketika respons jaringan terputus. Pastikan
      // objek pada path retry benar-benar sama; jangan menerima 409 begitu saja.
      if (["409", "400"].includes(String(error.statusCode)) && /already exists|duplicate/i.test(error.message || "")) {
        const publicUrl = db.storage.from("articles-images").getPublicUrl(job.path).data.publicUrl;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(publicUrl, { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw uploadError(error);
          const data = await response.arrayBuffer();
          const original = await file.arrayBuffer();
          const hashes = await Promise.all([crypto.subtle.digest("SHA-256", data), crypto.subtle.digest("SHA-256", original)]);
          if (!new Uint8Array(hashes[0]).every((value, index) => value === new Uint8Array(hashes[1])[index])) throw uploadError(error);
        } finally { clearTimeout(timer); }
      } else throw uploadError(error);
    }
    job.uploaded = true;
    remember();
  }

  /**
   * Menonaktifkan isian dan tombol selama proses agar kiriman tidak berubah di tengah request.
   */
  function setBusy(value) {
    busy = value;
    form.setAttribute("aria-busy", String(value));
    form.querySelectorAll("input, textarea, button").forEach((el) => { el.disabled = value; });
    editor.contentEditable = String(!value);
    sendButton.textContent = value ? "Mengirim artikel…" : "Kirim Artikel untuk Ditinjau ↗";
  }

  /**
   * Mengurutkan validasi, upload, dan INSERT pending.
   * Retry dianggap sudah diterima hanya jika constraint unik khusus kiriman mengonfirmasinya.
   */
  async function submit(event) {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    setBusy(true);
    try {
      if (!crypto?.randomUUID || !crypto?.subtle) throw new Error("Buka situs melalui HTTPS atau localhost untuk mengirim artikel.");
      const data = fields();
      validate(data);
      if (fileInput.files.length !== 1) throw new Error("Unggah tepat satu gambar sampul.");
      const file = fileInput.files[0];
      await validateImage(file);
      const db = window.TumbuhSupabase.getPublicClient();
      const job = getAttempt(await fingerprint(data, file), extensions[file.type]);
      await upload(db, job, file);
      message("Mengirim artikel untuk ditinjau admin…");
      const { text, ...record } = data;
      // Jangan .select(): pengirim tidak diberi SELECT artikel pending/email.
      const { error } = await db.from("articles").insert({ ...record, cover_image_path: job.path, status: "pending" });
      if (error) {
        // Index unik khusus submission menjamin retry request yang responsnya
        // terputus tidak menggandakan kiriman. Constraint lain bukan bukti sukses.
        const delivered = error.code === "23505" && String(error.message).includes("tumbuh_submission_cover_unique");
        if (!delivered) {
          if (["42501", "PGRST301"].includes(error.code)) throw new Error("Gambar sudah diunggah, tetapi artikel belum diterima karena izin pengiriman belum aktif. Isian dipertahankan; coba lagi setelah pengelola memperbaiki akses.");
          throw new Error("Server belum mengonfirmasi pengiriman artikel. Isian dipertahankan. Tekan Kirim lagi untuk mencoba ulang tanpa menggandakan kiriman yang sama.");
        }
      }
      form.reset();
      editor.replaceChildren();
      fileInput.dispatchEvent(new Event("change"));
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* Tidak memengaruhi konfirmasi server. */ }
      restoreButton.hidden = true;
      message("Artikel berhasil dikirim dan menunggu peninjauan admin. Artikel belum diterbitkan.");
    } catch (error) {
      message(error.message || "Artikel belum berhasil dikirim. Periksa koneksi lalu coba lagi.", true);
    } finally { setBusy(false); }
  }

  /**
   * Draf publik hanya menyimpan teks di browser; tidak mengunggah gambar atau membuat baris artikel.
   */
  draftButton.addEventListener("click", () => {
    if (busy) return;
    try {
      const data = fields();
      if (data.content.length > 100000) throw new Error("Isi draf terlalu besar.");
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
      restoreButton.hidden = false;
      message("Draf teks disimpan di browser ini, belum dikirim ke admin. Pilih gambar kembali saat melanjutkan draf.");
    } catch (error) { message(error.message || "Draf tidak dapat disimpan di browser ini.", true); }
  });

  /**
   * Pulihkan isian setelah konfirmasi agar tulisan yang sedang dikerjakan tidak tertimpa tanpa sengaja.
   */
  restoreButton.addEventListener("click", () => {
    if (busy) return;
    const draft = readDraft();
    if (!draft || typeof draft !== "object") { message("Draf lokal tidak tersedia.", true); return; }
    const hasChanges = ["author", "email", "title", "subtitle"].some((name) => form.elements[name].value) || editor.textContent.trim();
    if (hasChanges && !confirm("Ganti isian saat ini dengan draf terakhir?")) return;
    try {
      for (const [name, key] of Object.entries({ author: "author_name", email: "author_email", title: "title", subtitle: "subtitle" })) {
        form.elements[name].value = typeof draft[key] === "string" ? draft[key] : "";
      }
      editor.replaceChildren(window.TumbuhArticleContent.sanitize(draft.content));
      fileInput.value = "";
      fileInput.dispatchEvent(new Event("change"));
      message("Draf lokal dipulihkan. Pilih gambar sampul, lalu tekan Kirim untuk mengirim ke admin.");
    } catch { message("Draf belum dapat dipulihkan.", true); }
  });

  form.addEventListener("submit", submit);
  /**
   * Sanitasi HTML clipboard sebelum masuk ke contenteditable, bukan hanya setelah tombol Kirim ditekan.
   */
  editor.addEventListener("paste", (event) => {
    if (!event.clipboardData) return;
    event.preventDefault();
    try {
      const rich = event.clipboardData.getData("text/html");
      if (rich) document.execCommand("insertHTML", false, window.TumbuhArticleContent.html(rich).html);
      else document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    } catch { message("Teks belum dapat ditempel dengan aman. Coba tempel sebagai teks biasa.", true); }
  });
  restoreButton.hidden = !readDraft();
  if (new URLSearchParams(location.search).has("edit")) {
    // ID demo lama tidak boleh disamakan dengan ID database untuk update publik.
    message("Form ini untuk kiriman baru. Penyuntingan artikel yang sudah dikirim hanya tersedia melalui pengelola.");
  }
  try {
    window.TumbuhSupabase.getPublicClient();
    window.TumbuhArticleContent.html("");
    sendButton.disabled = false;
  } catch (error) { message(error.message, true); }
})();
