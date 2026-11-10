/**
 * Konfigurasi browser yang memang dapat dibaca pengunjung website.
 * Object.freeze mencegah perubahan properti secara tidak sengaja, bukan menyembunyikan key.
 */
/* Konfigurasi PUBLIK untuk browser. Jangan isi secret/service_role/password database. */
window.TumbuhSupabaseConfig = Object.freeze({
  /**
   * URL dasar proyek, tanpa /rest/v1; SDK menyusun endpoint Auth/Database/Storage.
   */
  url: "https://fbvsuugeiagceijnioqw.supabase.co",
  /**
   * Key publik untuk browser; pembatasan akses data tetap berada pada RLS server.
   */
  publishableKey: "sb_publishable_n0HPMp0-qmMoE-lCNPL2dg_f-jdE1eF",
  /**
   * Nama kolom UUID akun Auth pada tabel public.admin_users.
   */
  adminUserIdColumn: "user_id",
});
