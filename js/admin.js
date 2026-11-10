/**
 * Pengendali tampilan admin, bukan sumber kewenangan database.
 * Alur: verifikasi sesi → muat artikel → tinjau/revisi → simpan keputusan.
 * TumbuhSupabase memverifikasi akun, TumbuhAdminArticles menangani request data.
 */
/* Alur admin Supabase: guard UX + verifikasi server; operasi tetap tunduk pada RLS. */
(() => {
  "use strict";
  const api = window.TumbuhSupabase;
  const articles = window.TumbuhAdminArticles;
  const loading = window.TumbuhArticleLoading;
  const routes = window.TumbuhRoutes;
  const $ = (id) => document.getElementById(id);
  const loginPage = document.body.dataset.page === "admin-login";
  const previewPage = document.body.dataset.page === "admin-preview";
  const content = $("admin-content");
  let db;
  let verified = false;
  /**
   * Token versi UI: nilainya berubah ketika halaman dikunci; callback async wajib membandingkan versi sebelum merender.
   */
  let generation = 0;
  let requestNumber = 0;
  let checking = null;
  let signingIn = false;
  let loggingOut = false;
  let lastToken = null;
  let authTimer;
  let filter = "pending";
  let page = 0;
  let currentArticle = null;
  /**
   * Mencegah klik aksi ganda; editSnapshot menyimpan artikel awal hanya dalam memori halaman.
   */
  let actionBusy = false;
  let verifiedUserId = null;
  let editSnapshot = null;
  let editInitial = "";

  /**
   * Mengambil isian editor saat ini; HTML akan disanitasi kembali sebelum disimpan.
   */
  function editValues() {
    return { title: $("edit-title").value, subtitle: $("edit-subtitle").value, content: $("content-editor").innerHTML };
  }

  /**
   * Membandingkan isian dengan kondisi awal untuk menentukan apakah pembatalan perlu konfirmasi.
   */
  function hasUnsavedEdit() {
    return !!editSnapshot && JSON.stringify(editValues()) !== editInitial;
  }

  /**
   * Menutup dialog dan membuang isian dari DOM/memori saat batal, selesai, atau sesi tidak sah.
   */
  function clearEditor() {
    editSnapshot = null;
    editInitial = "";
    if ($("article-edit-dialog")?.open) $("article-edit-dialog").close();
    $("admin-edit-form")?.reset();
    $("content-editor")?.replaceChildren();
    notice($("edit-feedback"), "");
  }

  /**
   * Mengisi editor dari artikel atau revisi yang sementara disimpan selama verifikasi sesi ulang.
   */
  function openEditor(draft) {
    if (!verified || !currentArticle || actionBusy) return;
    try {
      editSnapshot = draft?.before || { ...currentArticle };
      const values = draft?.fields || editSnapshot;
      $("edit-title").value = values.title || "";
      $("edit-subtitle").value = values.subtitle || "";
      $("content-editor").replaceChildren(articles.sanitize(values.content));
      editInitial = draft?.initial || JSON.stringify(editValues());
      $("article-edit-note").textContent = editSnapshot.status === "published"
        ? "Artikel ini sudah terbit. Revisi yang disimpan akan langsung tampil pada halaman publik."
        : "Perbaiki tulisan dan formatnya. Simpan Revisi mempertahankan status artikel; penerbitan dilakukan melalui tombol Setujui.";
      notice($("edit-feedback"), "");
      $("article-edit-dialog").showModal();
    } catch (error) {
      clearEditor();
      notice($("preview-feedback"), error.message, true);
    }
  }

  /**
   * Membatalkan revisi setelah konfirmasi bila ada perubahan; database tidak disentuh.
   */
  function cancelEdit() {
    if (actionBusy) return;
    if (hasUnsavedEdit() && !confirm("Buang revisi yang belum disimpan?")) return;
    clearEditor();
    $("edit-article")?.focus();
  }

  /**
   * Mengunci kontrol selama penyimpanan dan memperbarui pratinjau dari respons server.
   * Error biasa mempertahankan isian; error akses diteruskan ke penguncian sesi.
   */
  async function saveEdit(event) {
    event.preventDefault();
    if (!verified || !editSnapshot || actionBusy || !$("admin-edit-form").reportValidity()) return;
    const before = editSnapshot;
    const fields = editValues();
    const version = generation;
    actionBusy = true;
    $("article-edit-fields").disabled = true;
    $("content-editor").contentEditable = "false";
    $("save-article-edit").disabled = true;
    $("cancel-article-edit").disabled = true;
    $("save-article-edit").textContent = "Menyimpan…";
    $("admin-edit-form").setAttribute("aria-busy", "true");
    notice($("edit-feedback"), "Menyimpan revisi…");
    try {
      const saved = await articles.revise(before, fields);
      if (!verified || version !== generation) return;
      clearEditor();
      renderPreview(saved);
      notice($("preview-feedback"), `Revisi tersimpan. Status artikel: ${articles.statuses[saved.status]}.`);
      $("edit-article").focus();
    } catch (error) {
      if (version === generation) await dataFailure(error, $("edit-feedback"));
    } finally {
      actionBusy = false;
      $("article-edit-fields").disabled = false;
      $("content-editor").contentEditable = "true";
      $("save-article-edit").disabled = false;
      $("cancel-article-edit").disabled = false;
      $("save-article-edit").textContent = "Simpan Revisi";
      $("admin-edit-form").removeAttribute("aria-busy");
    }
  }

  /**
   * Menulis pesan sebagai teks, mengatur visibilitas, dan membedakan role status dengan alert.
   */
  function notice(element, message, error = false) {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
    element.setAttribute("role", error ? "alert" : "status");
    element.classList.toggle("is-error", error);
  }

  /**
   * Menampilkan informasi login/verifikasi; tombol retry hanya dibuka ketika diperlukan.
   */
  function gate(message, retry = false) {
    if (loginPage) { notice($("login-note"), message, retry); return; }
    $("admin-access").hidden = false;
    notice($("admin-access-message"), message, retry);
    $("admin-access-retry").hidden = !retry;
  }

  /**
   * Menyembunyikan halaman dan menghapus data sensitif dari DOM.
   * Nomor generation/requestNumber dinaikkan supaya respons request lama tidak dapat merender data kembali.
   */
  function lock() {
    verified = false;
    verifiedUserId = null;
    clearEditor();
    generation += 1;
    requestNumber += 1;
    currentArticle = null;
    if (content) { content.hidden = true; content.inert = true; }
    if ($("review-list")) $("review-list").replaceChildren();
    loading?.finish($("review-list"));
    loading?.finish($("preview-skeleton"));
    if ($("pending-count")) $("pending-count").textContent = "0";
    for (const id of ["preview-title", "preview-subtitle", "preview-meta", "preview-email", "preview-body", "preview-feedback"]) {
      $(id)?.replaceChildren();
    }
    for (const id of ["preview-cover", "full-cover-img"]) $(id)?.removeAttribute("src");
    if ($("full-cover-dialog")?.open) $("full-cover-dialog").close();
    if ($("admin-preview-article")) $("admin-preview-article").hidden = true;
    document.querySelectorAll("[data-admin-logout]").forEach((button) => { button.hidden = true; });
    if (previewPage) document.title = "Pratinjau Artikel Lengkap — Admin TUMBUH";
  }

  /**
   * Menyusun tujuan login dan parameter next untuk kembali ke halaman admin yang diminta.
   */
  function loginUrl(reason) {
    const url = new URL(routes.login, location.origin);
    if (reason) url.searchParams.set("reason", reason);
    if (!loginPage) url.searchParams.set("next", location.pathname + location.search);
    return url.href;
  }

  /**
   * Memvalidasi next dengan daftar rute internal; URL luar tidak boleh menjadi tujuan setelah login.
   */
  function loginDestination() {
    const next = new URLSearchParams(location.search).get("next");
    const fallback = new URL(routes.dashboard, location.origin).href;
    if (!next) return fallback;
    try {
      const url = new URL(next, location.origin);
      if (url.origin !== location.origin || url.username || url.password) return fallback;
      if (url.pathname === routes.dashboard) return fallback;
      if (url.pathname === routes.preview && /^[1-9][0-9]{0,18}$/.test(url.searchParams.get("id") || "")) {
        return new URL(`${routes.preview}?id=${encodeURIComponent(url.searchParams.get("id"))}`, location.origin).href;
      }
    } catch { /* Jangan mengikuti next eksternal atau rute login berulang. */ }
    return fallback;
  }

  /**
   * Mengunci data dan menangani sesi kosong atau akun non-admin; kegagalan jaringan memberi opsi retry.
   */
  async function accessFailure(error) {
    lock();
    if (error.code === "forbidden") {
      loggingOut = true;
      try { await db.auth.signOut({ scope: "local" }); } finally { loggingOut = false; }
      if (!loginPage) { location.replace(loginUrl("forbidden")); return; }
    }
    if (error.code === "session" && !loginPage) {
      location.replace(loginUrl("session"));
      return;
    }
    if (error.code === "session" && loginPage) return;
    gate(error.message || "Akses admin belum dapat diverifikasi. Coba lagi.", true);
  }

  /**
   * Memformat tanggal database untuk tampilan Indonesia dan menangani tanggal yang tidak valid.
   */
  function dateLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" :
      new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  /**
   * Membuat elemen dengan textContent agar judul/subjudul tidak diperlakukan sebagai kode HTML.
   */
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    return el;
  }

  /**
   * Membuat badge status dari daftar status yang dikenal, bukan nama kelas CSS dari input bebas.
   */
  function statusNode(status) {
    const safe = articles.statuses[status] ? status : "pending";
    return node("span", `review-status ${safe}`, `● ${articles.statuses[status] || "Status tidak dikenal"}`);
  }

  /**
   * Menyusun kartu peninjauan beserta sampul, penulis, tanggal, dan tautan pratinjau.
   */
  function card(article) {
    const item = node("article", "review-item");
    const thumb = node("div", "review-thumb");
    const source = articles.imageUrl(article.cover_image_path);
    if (source) {
      const image = node("img");
      image.src = source;
      image.alt = `Gambar sampul ${article.title || "artikel"}`;
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      thumb.append(image);
    }
    const description = node("div", "review-desc");
    description.append(statusNode(article.status), node("h3", "", article.title),
      node("p", "", `${article.author_name || "Penulis"} · ${dateLabel(article.created_at)}`),
      node("p", "", article.subtitle));
    const link = node("a", "review-action", "Tinjau artikel lengkap ↗");
    link.href = `${routes.preview}?id=${encodeURIComponent(article.id)}`;
    item.append(thumb, description, link);
    return item;
  }

  /**
   * Memisahkan masalah hak akses dari masalah pemuatan data agar penanganannya sesuai.
   */
  async function dataFailure(error, target) {
    if (error instanceof api.AccessError) await accessFailure(error);
    else notice(target, error.message || "Data belum dapat dimuat. Coba lagi.", true);
  }

  /**
   * Menampilkan skeleton, memuat filter/halaman aktif, dan mengabaikan respons yang sudah kedaluwarsa.
   */
  async function loadList() {
    if (!verified) return;
    const version = generation;
    const request = ++requestNumber;
    const list = $("review-list");
    loading.show(list, "review", 3);
    $("review-empty").hidden = true;
    $("review-pagination").hidden = true;
    notice($("review-feedback"), "Memuat artikel…");
    try {
      const result = await articles.list(filter, page);
      if (!verified || version !== generation || request !== requestNumber) return;
      if (page > 0 && !result.articles.length) { page -= 1; return loadList(); }
      list.replaceChildren(...result.articles.map(card));
      $("pending-count").textContent = String(result.pendingCount);
      $("review-empty").hidden = result.articles.length !== 0;
      const pages = Math.max(1, Math.ceil(result.count / result.pageSize));
      $("review-page-label").textContent = `Halaman ${page + 1} dari ${pages} · ${result.count} artikel`;
      $("review-prev").disabled = page === 0;
      $("review-next").disabled = page + 1 >= pages;
      $("review-pagination").hidden = pages <= 1;
      notice($("review-feedback"), "");
      window.TumbuhAOS?.refresh();
    } catch (error) {
      if (version === generation && request === requestNumber) await dataFailure(error, $("review-feedback"));
    } finally {
      if (request === requestNumber) loading.finish(list);
    }
  }

  /**
   * Merender satu artikel setelah HTML isinya dibersihkan; tombol mengikuti status yang tersimpan.
   */
  function renderPreview(article) {
    // Sanitasi sebelum menampilkan bagian artikel; kegagalan sanitizer menutup pratinjau.
    const cleanBody = articles.sanitize(article.content);
    currentArticle = article;
    document.title = `Tinjau: ${article.title} — TUMBUH`;
    $("preview-title").textContent = article.title || "";
    $("preview-subtitle").textContent = article.subtitle || "";
    $("preview-meta").textContent = `${dateLabel(article.created_at).toUpperCase()}   •   ${String(article.author_name || "Penulis").toUpperCase()}`;
    $("preview-email").textContent = article.author_email ? `Email penulis: ${article.author_email}` : "";
    $("preview-email").hidden = !article.author_email;
    const source = articles.imageUrl(article.cover_image_path);
    for (const id of ["preview-cover", "full-cover-img"]) {
      if (source) $(id).src = source;
      else $(id).removeAttribute("src");
      $(id).alt = `Gambar sampul ${article.title || "artikel"}`;
      $(id).referrerPolicy = "no-referrer";
    }
    $("preview-cover").closest(".admin-preview-image").hidden = !source;
    $("show-full-cover").hidden = !source;
    $("preview-body").replaceChildren(cleanBody);
    const status = statusNode(article.status);
    $("preview-status").className = status.className;
    $("preview-status").textContent = status.textContent;
    $("approve-article").hidden = article.status === "published";
    $("reject-article").hidden = article.status === "rejected";
    $("approve-article").disabled = !articles.statuses[article.status];
    $("reject-article").disabled = !articles.statuses[article.status];
    $("delete-article").disabled = !articles.statuses[article.status];
    $("edit-article").disabled = !articles.statuses[article.status];
    $("admin-preview-article").hidden = false;
    window.TumbuhAOS?.refresh();
  }

  /**
   * Memuat ID dari query URL; kondisi kosong berbeda dari kondisi server gagal.
   */
  async function loadPreview() {
    if (!verified) return;
    const version = generation;
    const request = ++requestNumber;
    currentArticle = null;
    $("admin-preview-article").hidden = true;
    $("admin-preview-article").classList.remove("article-loaded");
    $("preview-not-found").hidden = true;
    $("preview-email").hidden = true;
    $("preview-status").textContent = "";
    notice($("preview-load-message"), "Memuat artikel…");
    loading.show($("preview-skeleton"), "detail", 1);
    try {
      const article = await articles.get(new URLSearchParams(location.search).get("id"));
      if (!verified || version !== generation || request !== requestNumber) return;
      notice($("preview-load-message"), "");
      if (!article) { $("preview-not-found").hidden = false; return; }
      renderPreview(article);
      loading.finish($("admin-preview-article"));
    } catch (error) {
      if (version === generation && request === requestNumber) await dataFailure(error, $("preview-load-message"));
    } finally {
      if (version === generation && request === requestNumber) loading.finish($("preview-skeleton"));
    }
  }

  /**
   * Meminta konfirmasi terbit/tolak, menonaktifkan aksi ganda, dan menampilkan status dari server.
   */
  async function decide(status) {
    if (!verified || !currentArticle || actionBusy) return;
    if (!confirm(`Yakin ingin ${status === "published" ? "menerbitkan" : "menolak"} artikel ini? Status akan disimpan di database.`)) return;
    const version = generation;
    const article = currentArticle;
    actionBusy = true;
    const buttons = [$("approve-article"), $("reject-article"), $("delete-article"), $("preview-reload"), $("edit-article")];
    buttons.forEach((button) => { button.disabled = true; });
    notice($("preview-feedback"), "Menyimpan keputusan…");
    try {
      const saved = await articles.setStatus(article.id, article.status, status);
      if (!verified || version !== generation) return;
      renderPreview(saved);
      notice($("preview-feedback"), `Status berhasil disimpan: ${articles.statuses[saved.status]}.`);
    } catch (error) {
      if (version === generation) await dataFailure(error, $("preview-feedback"));
    } finally {
      actionBusy = false;
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  /**
   * Meminta konfirmasi hapus permanen, lalu kembali ke daftar hanya setelah penghapusan terkonfirmasi.
   */
  async function deleteArticle() {
    if (!verified || !currentArticle || actionBusy) return;
    const article = currentArticle;
    if (!confirm(`Hapus artikel “${article.title}” secara permanen? Artikel akan hilang dari dashboard dan halaman publik. Tindakan ini tidak dapat dibatalkan.`)) return;
    const version = generation;
    actionBusy = true;
    const buttons = [$("approve-article"), $("reject-article"), $("delete-article"), $("preview-reload"), $("edit-article")];
    buttons.forEach((button) => { button.disabled = true; });
    $("delete-article").textContent = "Menghapus…";
    notice($("preview-feedback"), "Menghapus artikel…");
    try {
      await articles.remove(article.id, article.status);
      if (!verified || version !== generation) return;
      currentArticle = null;
      location.replace(routes.dashboard);
    } catch (error) {
      if (version === generation) await dataFailure(error, $("preview-feedback"));
    } finally {
      actionBusy = false;
      $("delete-article").textContent = "Hapus Artikel";
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  /**
   * Memverifikasi identitas dan membership lagi sebelum menampilkan halaman.
   * Revisi sementara dipulihkan hanya jika UUID hasil verifikasi sama dengan pemilik editor sebelumnya.
   */
  function refreshAccess() {
    if (checking) return checking;
    if (signingIn || loggingOut) return Promise.resolve();
    if (editSnapshot && actionBusy) return Promise.resolve();
    // Simpan hanya di memori selama verifikasi ulang; pulihkan hanya untuk UUID sama.
    const draft = editSnapshot && $("article-edit-dialog").open
      ? { before: editSnapshot, fields: editValues(), initial: editInitial, userId: verifiedUserId }
      : null;
    lock();
    const version = generation;
    gate("Memeriksa sesi dan akses admin…");
    checking = (async () => {
      try {
        const user = await api.requireAdmin();
        if (version !== generation) return;
        verified = true;
        verifiedUserId = user.id;
        if (loginPage) { location.replace(loginDestination()); return; }
        $("admin-access").hidden = true;
        content.hidden = false;
        content.inert = false;
        document.querySelectorAll("[data-admin-logout]").forEach((button) => { button.hidden = false; });
        if (draft && user.id === draft.userId) {
          renderPreview(draft.before);
          openEditor(draft);
        } else if (previewPage) await loadPreview();
        else await loadList();
      } catch (error) {
        if (version === generation) {
          if (loginPage && error.code === "session") {
            const reason = new URLSearchParams(location.search).get("reason");
            const messages = { forbidden: "Akun ini tidak mempunyai akses admin.", session: "Silakan login untuk melanjutkan.", logout: "Kamu sudah keluar dari akun admin." };
            notice($("login-note"), messages[reason] || "", reason === "forbidden");
          } else await accessFailure(error);
        }
      } finally {
        checking = null;
        if (loginPage) $("admin-login-submit").disabled = false;
      }
    })();
    return checking;
  }

  /**
   * Mengirim email/password ke Supabase Auth, lalu memeriksa admin_users sebelum mengarahkan pengguna.
   */
  async function login(event) {
    event.preventDefault();
    if (signingIn || !$("admin-login-form").reportValidity()) return;
    signingIn = true;
    const button = $("admin-login-submit");
    button.disabled = true;
    button.textContent = "Memeriksa akun…";
    $("admin-login-form").setAttribute("aria-busy", "true");
    notice($("login-note"), "");
    try {
      const { error } = await db.auth.signInWithPassword({
        email: $("admin-email").value.trim(), password: $("admin-password").value,
      });
      if (error) {
        const message = error.code === "invalid_credentials" || error.message === "Invalid login credentials" ? "Email atau password salah." :
          error.code === "email_not_confirmed" ? "Email akun belum diverifikasi." :
          error.status === 429 ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." :
          "Login belum berhasil. Periksa koneksi dan data akun, lalu coba lagi.";
        throw new Error(message);
      }
      await api.requireAdmin();
      location.replace(loginDestination());
    } catch (error) {
      if (error instanceof api.AccessError) await accessFailure(error);
      else notice($("login-note"), error.message, true);
    } finally {
      $("admin-password").value = "";
      signingIn = false;
      button.disabled = false;
      button.textContent = "Masuk ke Dashboard ↗";
      $("admin-login-form").removeAttribute("aria-busy");
    }
  }

  /**
   * Menghapus sesi browser ini melalui SDK dan membersihkan tampilan sebelum navigasi ke login.
   */
  async function logout() {
    if (loggingOut) return;
    loggingOut = true;
    lock();
    gate("Mengakhiri sesi…");
    try {
      const { error } = await db.auth.signOut({ scope: "local" });
      if (error) throw error;
      location.replace(new URL(`${routes.login}?reason=logout`, location.origin).href);
    } catch {
      gate("Logout belum selesai. Periksa koneksi dan tekan Logout lagi.");
      document.querySelectorAll("[data-admin-logout]").forEach((button) => { button.hidden = false; });
    } finally { loggingOut = false; }
  }

  /**
   * Memasang listener login, editor, filter, sesi, dan navigasi.
   * Callback onAuthStateChange tetap sinkron; request lanjutan dijadwalkan di luar callback.
   */
  function init() {
    try { db = api.getClient(); }
    catch (error) {
      lock();
      gate(error.message, true);
      $("admin-access-retry")?.addEventListener("click", () => location.reload());
      return;
    }
    // Callback harus sinkron. Jangan menunggu request Supabase di dalam auth callback.
    db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        lastToken = null;
        lock();
        if (!loginPage && !loggingOut) location.replace(loginUrl("session"));
      } else if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        const changed = lastToken !== session?.access_token || event === "USER_UPDATED";
        lastToken = session?.access_token || null;
        if (changed && !signingIn && !loggingOut) {
          if (!editSnapshot || session?.user?.id !== verifiedUserId) lock();
          clearTimeout(authTimer);
          authTimer = setTimeout(() => {
            if (checking) checking.then(refreshAccess);
            else refreshAccess();
          }, 0);
        }
      } else if (event === "INITIAL_SESSION") lastToken = session?.access_token || null;
    });
    $("admin-login-form")?.addEventListener("submit", login);
    document.querySelectorAll("[data-admin-logout]").forEach((button) => button.addEventListener("click", logout));
    $("admin-access-retry")?.addEventListener("click", refreshAccess);
    $("review-reload")?.addEventListener("click", loadList);
    $("preview-reload")?.addEventListener("click", loadPreview);
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      filter = button.dataset.filter;
      page = 0;
      document.querySelectorAll("[data-filter]").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
        tab.setAttribute("aria-pressed", String(tab === button));
      });
      loadList();
    }));
    $("review-prev")?.addEventListener("click", () => { if (page > 0) { page -= 1; loadList(); } });
    $("review-next")?.addEventListener("click", () => { page += 1; loadList(); });
    $("approve-article")?.addEventListener("click", () => decide("published"));
    $("reject-article")?.addEventListener("click", () => decide("rejected"));
    $("delete-article")?.addEventListener("click", deleteArticle);
    $("edit-article")?.addEventListener("click", () => openEditor());
    $("admin-edit-form")?.addEventListener("submit", saveEdit);
    $("cancel-article-edit")?.addEventListener("click", cancelEdit);
    $("article-edit-dialog")?.addEventListener("cancel", (event) => { event.preventDefault(); cancelEdit(); });
    $("content-editor")?.addEventListener("paste", (event) => {
      if (!editSnapshot || !event.clipboardData) return;
      event.preventDefault();
      try {
        const rich = event.clipboardData.getData("text/html");
        if (rich) document.execCommand("insertHTML", false, window.TumbuhArticleContent.html(rich).html);
        else document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      } catch { notice($("edit-feedback"), "Teks belum dapat ditempel dengan aman. Coba tempel sebagai teks biasa.", true); }
    });
    $("content-editor")?.addEventListener("drop", (event) => event.preventDefault());
    window.addEventListener("beforeunload", (event) => {
      if (hasUnsavedEdit()) { event.preventDefault(); event.returnValue = ""; }
    });
    $("show-full-cover")?.addEventListener("click", () => { if (verified && currentArticle) $("full-cover-dialog").showModal(); });
    $("close-full-cover")?.addEventListener("click", () => $("full-cover-dialog").close());
    $("full-cover-dialog")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
    // Hapus data sebelum cache navigasi; verifikasi ulang ketika kembali.
    window.addEventListener("pagehide", lock);
    window.addEventListener("pageshow", (event) => { if (event.persisted) refreshAccess(); });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !signingIn && !loggingOut) refreshAccess();
    });
    refreshAccess();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
