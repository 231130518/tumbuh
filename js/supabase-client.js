/**
 * Pembungkus SDK resmi: konfigurasi, batas waktu request, dan verifikasi admin.
 * Dua client dipisahkan agar kiriman publik tidak memakai token admin yang sedang login.
 */
/* SDK resmi; satu client per halaman. RLS adalah batas otorisasi di server. */
(() => {
  "use strict";
  let client;
  let publicClient;

  /**
   * Error bertipe khusus agar UI dapat membedakan konfigurasi, verifikasi, sesi kosong, dan akses ditolak.
   */
  class AccessError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "AccessError";
      this.code = code;
    }
  }

  /**
   * Memastikan URL dasar HTTPS, key frontend publishable/anon, serta nama kolom UUID valid.
   */
  function getConfig() {
    const config = window.TumbuhSupabaseConfig || {};
    let url;
    try { url = new URL(config.url); } catch { /* Ditolak di bawah. */ }
    if (!url || url.protocol !== "https:" || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) {
      throw new AccessError("config", "Konfigurasi URL Supabase belum valid. Hubungi pengelola situs.");
    }
    const key = String(config.publishableKey || "");
    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!publicKey && key.split(".").length === 3) {
      try {
        const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        publicKey = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).role === "anon";
      } catch { /* Bukan legacy anon key. */ }
    }
    if (!publicKey) {
      throw new AccessError("config", "Konfigurasi publishable/anon key belum valid. Secret key tidak boleh digunakan di browser.");
    }
    if (!/^[a-z_][a-z0-9_]*$/.test(config.adminUserIdColumn || "")) {
      throw new AccessError("config", "Nama kolom UUID admin belum dikonfigurasi.");
    }
    return config;
  }

  /**
   * Membatasi request hingga 20 detik dan meneruskan pembatalan dari pemanggil.
   * Timer dan listener dibersihkan meskipun request gagal.
   */
  async function timedFetch(input, options = {}) {
    const controller = new AbortController();
    const parent = options.signal || (input instanceof Request ? input.signal : null);
    const abort = () => controller.abort();
    if (parent?.aborted) abort();
    parent?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      return await fetch(input, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      parent?.removeEventListener("abort", abort);
    }
  }

  /**
   * Membuat satu client admin per halaman; SDK menangani persistensi dan pembaruan token sesi.
   */
  function getClient() {
    if (client) return client;
    const config = getConfig();
    if (!window.supabase?.createClient) {
      throw new AccessError("config", "Layanan login gagal dimuat. Muat ulang halaman.");
    }
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: { fetch: timedFetch },
    });
    return client;
  }

  /**
   * Memeriksa keberadaan sesi, memvalidasi identitas melalui getUser, lalu membaca membership admin_users.
   * getSession saja tidak dijadikan bukti bahwa pengguna berhak mengelola artikel.
   */
  async function requireAdmin() {
    const db = getClient();
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new AccessError("session", "Silakan login untuk mengakses admin.");
    }
    // getSession hanya untuk keberadaan sesi; identitas diverifikasi oleh Auth server.
    const { data: userData, error: userError } = await db.auth.getUser();
    if (userError || !userData.user) {
      if (!userError || [401, 403].includes(userError.status) || userError.name === "AuthSessionMissingError") {
        throw new AccessError("session", "Sesi berakhir. Silakan login kembali.");
      }
      throw new AccessError("verification", "Sesi belum dapat diverifikasi. Periksa koneksi lalu coba lagi.");
    }
    const column = getConfig().adminUserIdColumn;
    const { data: member, error } = await db.from("admin_users")
      .select(column).eq(column, userData.user.id).maybeSingle();
    if (error) {
      throw new AccessError("verification", "Keanggotaan admin belum dapat diverifikasi. Hubungi pengelola atau coba lagi.");
    }
    if (!member || member[column] !== userData.user.id) {
      throw new AccessError("forbidden", "Akun ini tidak mempunyai akses admin.");
    }
    return userData.user;
  }

  /**
   * Membuat client anon tanpa persistensi sesi agar baca/kirim publik tidak memakai identitas admin.
   */
  function getPublicClient() {
    if (publicClient) return publicClient;
    const config = getConfig();
    if (!window.supabase?.createClient) {
      throw new AccessError("config", "Layanan pengiriman belum dimuat. Muat ulang halaman.");
    }
    // Pengiriman publik selalu memakai role anon, termasuk saat browser memiliki
    // sesi admin. Jangan meminjam atau mengganti sesi login admin.
    publicClient = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "tumbuh-public-submissions",
      },
      global: { fetch: timedFetch },
    });
    return publicClient;
  }

  window.TumbuhSupabase = Object.freeze({ getClient, getPublicClient, getConfig, requireAdmin, AccessError });
})();
