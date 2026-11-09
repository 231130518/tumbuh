# Admin TUMBUH dengan Supabase

Implementasi tetap berupa HTML/CSS/JavaScript statis untuk GitHub Pages. Tidak ada backend baru, perubahan DNS, tabel, akun admin, bucket, atau policy produksi yang dibuat oleh integrasi ini.

## Konfigurasi yang dipakai

`js/supabase-config.js` sudah diisi berdasarkan informasi pemilik proyek:

- URL dasar: `https://fbvsuugeiagceijnioqw.supabase.co`.
- Publishable key proyek `ayotumbuh`.
- Kolom UUID pada `public.admin_users`: `user_id`.

SDK membutuhkan URL dasar, **bukan** URL yang diakhiri `/rest/v1/`. Key di file ini memang publik dan dapat dibaca pengunjung. Hak data tetap harus dibatasi oleh grants dan RLS; menyembunyikan key bukan pengamanan.

Untuk mengambil/mengganti konfigurasi di dashboard Supabase:

1. Buka proyek `ayotumbuh`, klik **Connect** untuk melihat Project URL dan key yang dipakai aplikasi. Project URL juga tersedia pada **Settings → Data API**.
2. Buka **Settings → API Keys**, salin **Publishable key** (`sb_publishable_...`). Legacy `anon` JWT juga didukung; key dengan role selain `anon` ditolak oleh konfigurasi frontend.
3. Isi `url`, `publishableKey`, dan `adminUserIdColumn` di `js/supabase-config.js`. Jangan isi service_role, secret key, atau password database.
4. Pertahankan RLS aktif. Verifikasi bahwa UUID akun Auth ada pada `admin_users.user_id` serta akun tersebut dapat membaca baris keanggotaannya sendiri.

**Secret key yang telah dibagikan di percakapan harus dicabut/dirotasi melalui API Keys.** Key itu tidak dipakai atau disimpan dalam implementasi ini. Menghapusnya dari kode saja tidak mencabut akses key yang sudah bocor.

Login menggunakan email/password (`signInWithPassword`), tanpa sign-up publik atau redirect OAuth. Tidak diperlukan perubahan DNS maupun Auth redirect URL untuk alur password ini. Jika nanti memakai reset password/magic link/OAuth, konfigurasi Site URL dan Redirect URLs perlu ditinjau terpisah.

## Rute dan perilaku

| Rute | Perilaku |
| --- | --- |
| `/admin/` | Form email/password. Sesi admin yang masih valid diarahkan ke dashboard. |
| `/admin/login/`, `/admin/login.html` | Alias login menuju `/admin/`. |
| `/admin/peninjauan/` | Dashboard Supabase; default filter `pending`, 20 artikel per halaman. |
| `/admin/dashboard.html` | Alias menuju dashboard yang dijaga sesi. |
| `/admin/pratinjau/?id=ID` | Detail artikel Supabase, gambar, keputusan publish/reject. |
| `/admin/preview.html?id=ID` | Alias menuju pratinjau yang dijaga sesi. |

Mount `/tumbuh/` tetap didukung oleh jalur relatif. Jangan mengubah semua rute menjadi `/admin/`; form login dan dashboard adalah dua halaman berbeda.

Semua data asli diambil dari `public.articles`. ID `int8` dipilih sebagai `id::text` agar ID besar tidak dibulatkan oleh JavaScript. List hanya mengambil kolom yang diperlukan, tidak mengambil email penulis atau seluruh isi artikel. Email hanya ditampilkan pada pratinjau admin setelah verifikasi. Gambar menggunakan bucket `articles-images`; `cover_image_path` sebaiknya berupa path objek, misalnya `covers/uuid-gambar.webp`. URL publik dari bucket/proyek yang sama juga diterima; URL eksternal, SVG, dan traversal path ditolak.

Tombol edit/draf tetap berada di UI, tetapi dinonaktifkan dan diberi keterangan belum tersedia. Kedua fitur itu tidak mengirim operasi Supabase; skema hanya mendukung `pending`, `published`, `rejected`. Approve/reject hanya mengirim kolom `status`, dengan syarat ID dan status sebelumnya masih sama. Jika artikel telah diubah tab/admin lain atau RLS menolak baris, aplikasi tidak melaporkan sukses; muat ulang artikel sebelum mengambil keputusan lagi.

## Lapisan keamanan

- SDK Supabase resmi disimpan lokal, versi tetap **2.119.0**, berikut lisensi dan hash sumber di `js/vendor/sources.json`. Tidak perlu bundler/CDN runtime untuk Auth. DOMPurify **3.4.17** membersihkan HTML pratinjau dengan daftar tag/atribut terbatas. Metadata menggunakan `textContent`; gambar hanya berasal dari Storage proyek.
- `getSession()` hanya memeriksa keberadaan sesi. Identitas diperiksa lewat Auth server dengan `getUser()`, lalu UUID dicocokkan dengan `admin_users.user_id`. Tidak ada flag `isAdmin`, password hardcode, atau role dari metadata pengguna sebagai bukti otorisasi.
- SDK boleh menyimpan token sesi menggunakan mekanisme persistensinya sendiri. Penyimpanan itu tidak dianggap bukti hak admin: pembacaan dan pembaruan artikel selalu memverifikasi pengguna/keanggotaan lagi, dan PostgREST tetap menerapkan RLS.
- HTML admin berupa kerangka publik, seperti lazim pada hosting statis. Data dan fungsi pengelolaan memerlukan sesi serta izin database. Menghapus atribut `hidden` lewat DevTools tidak memberikan hak API.
- Konten admin disembunyikan sampai verifikasi selesai. Logout, sesi yang hilang, dan perpindahan pengguna membersihkan data di DOM. Perubahan sesi dipantau melalui `onAuthStateChange`; request tidak ditunggu di dalam callback Auth untuk menghindari deadlock SDK. Kembali dari cache navigasi dan kembali ke tab memicu verifikasi.
- Logout memakai scope `local`: sesi pada browser ini (termasuk tab lain) diakhiri, tanpa memaksa logout perangkat lain. Seperti JWT pada umumnya, token akses yang telah disalin dapat tetap berlaku sampai kedaluwarsa; mencabut keanggotaan admin harus langsung menolak operasi melalui RLS.
- Path/parameter `next` hanya boleh menunjuk dashboard atau pratinjau internal. Tidak ada redirect ke domain yang diberikan pengguna.
- Public bucket berarti gambar dapat dibaca siapa pun yang mengetahui URL, termasuk gambar artikel pending. Tidak menyimpan data sensitif pada nama file/gambar; pembatasan gambar prapublikasi membutuhkan keputusan storage terpisah.

### Audit RLS sebelum publikasi

Kode frontend tidak dapat membuktikan bahwa semua policy produksi benar. **Uji non-admin terautentikasi masih wajib sebelum dipakai sungguhan.**

1. Periksa struktur, status RLS, grants, policy, dan konfigurasi bucket melalui dashboard Supabase sebelum mengubah izin produksi.
2. Pastikan `articles` dan `admin_users` memakai RLS; admin dapat SELECT/UPDATE artikel; UPDATE memiliki `USING` dan `WITH CHECK` berdasarkan keanggotaan admin. Tidak boleh ada policy permissive lain yang membuka UPDATE/DELETE untuk umum (policy permissive digabung menggunakan OR).
3. Admin yang login harus dapat SELECT `admin_users.user_id` miliknya sendiri. Jika ditolak, tinjau grants dan policy self-read yang sudah ada, termasuk policy restrictive, sebelum melakukan perubahan.
4. Pengguna frontend tidak boleh dapat menambah/mengubah/menghapus `admin_users` untuk mengangkat dirinya menjadi admin. Audit grants, RLS, fungsi RPC SECURITY DEFINER, dan view yang mengekspos tabel tersebut. Hindari UPDATE/DELETE untuk `anon`; jika hanya status yang dikelola, pertimbangkan grant kolom `UPDATE(status)` setelah memeriksa penggunaan lain.
5. Uji izin dengan akun admin dan akun biasa terhadap artikel uji. Pembatasan di tampilan tidak menggantikan RLS.

Script setup SQL dan pengujian otomatis telah dihapus dari proyek atas permintaan pemilik. Arsipnya tersedia di riwayat Git pada commit `058a45d`. Database dan policy yang sudah terpasang tetap berada di Supabase. Pemeriksaan manual berikut dapat digunakan tanpa dependensi Node.

## Sembilan pengujian pada proyek asli

Jalankan `python3 -m http.server 8000`, lalu buka `http://localhost:8000/admin/`. Masukkan password sendiri di browser; jangan kirim password melalui chat atau commit. Gunakan artikel dan akun uji, terutama untuk keputusan yang mengubah status.

| Uji | Langkah dan hasil yang diharapkan |
| --- | --- |
| 1. Admin valid | Login dengan email terverifikasi yang UUID-nya ada di `admin_users`; dashboard terbuka setelah verifikasi. |
| 2. Password salah | Login dengan password salah; pesan kesalahan terlihat, tombol kembali aktif, tidak ada request artikel. |
| 3. Akun biasa | Gunakan akun uji terverifikasi yang tidak ada di `admin_users`; akses ditolak dan sesi di-sign-out. |
| 4. Tanpa login | Buka `/admin/peninjauan/` dan pratinjau langsung di jendela privat; kembali ke login, tidak ada data/aksi admin. |
| 5. Refresh | Setelah admin login, refresh dashboard; sesi diverifikasi lagi dan artikel dimuat tanpa login berulang. |
| 6. Logout | Buka dua tab admin, logout dari satu; kedua tab terkunci. Membuka dashboard kembali dan Back tidak mengungkap data lama. |
| 7. Baca artikel | Cocokkan artikel `pending`, judul/subjudul/penulis/isi/gambar dengan Table Editor. Jangan mengharapkan artikel demo lokal muncul. |
| 8. Publish/reject | Ubah artikel uji menjadi `published`, refresh dan cocokkan database; ulangi menjadi `rejected`. Periksa hanya kolom status berubah. |
| 9. Lewati UI | Panggil REST API menggunakan sesi non-admin uji; UPDATE/DELETE harus ditolak atau menghasilkan nol baris, dan status di database tetap. Uji langsung ini wajib—redirect UI saja tidak cukup. |

Untuk uji API akun biasa tanpa membagikan token: login akun uji tersebut di klien pengujian terpisah yang kamu kendalikan (bukan halaman admin yang otomatis sign out). Jangan menempel access token ke chat/log/repository. Gunakan `Authorization: Bearer <access_token akun uji>` dan header `apikey` publishable key, lalu periksa respons serta baris database. HTTP 200 dengan `[]` dapat berarti RLS menolak semua baris; jangan menyimpulkan sukses dari kode HTTP saja. Jika anon/member bisa memperbarui satu baris pun, hentikan publikasi dan perbaiki policy setelah audit.

Pemeriksaan asli yang telah dilakukan hanya: SELECT terbatas/tanpa baris pada tabel dan PATCH anonim dengan filter `id IS NULL` (tidak mungkin cocok dengan primary key). Semua ditolak dengan `401 / permission denied`. Tidak ada pengujian login admin/non-admin asli atau perubahan artikel produksi yang diklaim berhasil.

## Integrasi publik dan pekerjaan tersisa

Form tanpa login, upload gambar maksimal 5 MB, retry, serta feed/detail `published` sudah terhubung pada kode. Kelola izin server melalui dashboard Supabase dan lakukan pemeriksaan sesuai [panduan pengiriman publik](supabase-submissions.md). Pengujian otomatis sebelum pembersihan memakai endpoint simulasi dan tidak membuktikan seluruh RLS produksi.

Pekerjaan operasional tersisa: verifikasi akun dan policy produksi, perlindungan spam melalui CAPTCHA yang diverifikasi server/rate limit, serta pembersihan gambar yatim menggunakan Storage API berizin. Tidak ada push/deploy otomatis. Model pertumbuhan DNN bukan bagian dari integrasi artikel ini.

## Hapus Artikel

Tombol Hapus Artikel pada pratinjau meminta konfirmasi permanen, memverifikasi ulang sesi dan keanggotaan admin, lalu DELETE berdasarkan ID dan status terakhir. Jika server tidak mengonfirmasi baris terhapus, halaman tetap terbuka dengan pesan gagal. Setelah berhasil, kembali ke dashboard. Data artikel dihapus permanen; file gambar Storage tetap ada untuk pembersihan terpisah agar tidak menghapus gambar yang mungkin dipakai artikel lain.

1. Pemilik sudah mengonfirmasi fitur hapus berfungsi. Policy DELETE tetap tersimpan di Supabase meskipun file setup lokal dihapus.
2. Jika fitur bermasalah lagi, periksa grants DELETE, policy DELETE/ALL, keanggotaan admin, dan policy SELECT melalui dashboard Supabase. Jangan membuka akses hapus untuk publik.
3. Pada versi situs yang memuat perubahan ini, login admin dan gunakan **artikel uji**: klik Hapus lalu Batal (artikel tetap ada); klik lagi lalu konfirmasi (kembali ke dashboard, artikel hilang dari daftar dan URL publik setelah dimuat ulang).
4. Uji request DELETE langsung memakai akun non-admin dan anon terhadap artikel uji: baris tidak boleh terhapus. Jangan menganggap HTTP 200 sebagai bukti berhasil; RLS bisa menghasilkan nol baris. Pengujian produksi ini belum dijalankan oleh implementasi.

Implementasi memakai [`delete()` SDK resmi](https://supabase.com/docs/reference/javascript/delete) dan meminta ID baris yang dihapus untuk memastikan hasilnya. Pengujian browser mencakup batal, berhasil, izin ditolak, nol baris, dan keanggotaan dicabut. Pengujian otomatis sebelumnya tidak menghapus data produksi.

## Sumber resmi

- [SDK JavaScript Supabase untuk browser](https://supabase.com/docs/reference/javascript/installing)
- [Login password](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [verifikasi pengguna](https://supabase.com/docs/reference/javascript/auth-getuser), [perubahan sesi](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys) dan [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [DOMPurify](https://github.com/cure53/DOMPurify)
