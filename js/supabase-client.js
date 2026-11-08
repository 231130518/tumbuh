/* SDK resmi; satu client per halaman. RLS adalah batas otorisasi di server. */
(() => {
  "use strict";
  let client;

  class AccessError extends Error {
    constructor(code, message) {
      super(message);
      this.name = "AccessError";
      this.code = code;
    }
  }

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

  window.TumbuhSupabase = Object.freeze({ getClient, getConfig, requireAdmin, AccessError });
})();
