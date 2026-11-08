# Admin TUMBUH dengan Supabase

Implementasi tetap berupa HTML/CSS/JavaScript statis untuk GitHub Pages. Tidak ada backend baru, perubahan DNS, tabel, akun admin, bucket, atau policy produksi yang dibuat oleh integrasi ini. Tidak ada git push/deploy otomatis.

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

Tombol edit/draf/hapus tetap berada di UI, tetapi dinonaktifkan dan diberi keterangan belum tersedia. Ketiga fitur itu tidak mengirim operasi Supabase; skema hanya mendukung `pending`, `published`, `rejected`. Approve/reject hanya mengirim kolom `status`, dengan syarat ID dan status sebelumnya masih sama. Jika artikel telah diubah tab/admin lain atau RLS menolak baris, aplikasi tidak melaporkan sukses; muat ulang artikel sebelum mengambil keputusan lagi.

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

1. Jalankan `supabase/01-audit-access.sql` di SQL Editor. File ini hanya membaca struktur, status RLS, grants, policy, dan konfigurasi bucket.
2. Pastikan `articles` dan `admin_users` memakai RLS; admin dapat SELECT/UPDATE artikel; UPDATE memiliki `USING` dan `WITH CHECK` berdasarkan keanggotaan admin. Tidak boleh ada policy permissive lain yang membuka UPDATE/DELETE untuk umum (policy permissive digabung menggunakan OR).
3. Admin yang login harus dapat SELECT `admin_users.user_id` miliknya sendiri. Jika ini belum diizinkan, tinjau `supabase/02-membership-select.optional.sql`. File opsional ini menambahkan izin baca kolom UUID dan policy self-read, tidak memberi izin tulis. **Jangan jalankan jika policy yang sesuai sudah ada**, dan periksa policy restrictive lain terlebih dahulu.
4. Pengguna frontend tidak boleh dapat menambah/mengubah/menghapus `admin_users` untuk mengangkat dirinya menjadi admin. Audit grants, RLS, fungsi RPC SECURITY DEFINER, dan view yang mengekspos tabel tersebut. Hindari UPDATE/DELETE untuk `anon`; jika hanya status yang dikelola, pertimbangkan grant kolom `UPDATE(status)` setelah memeriksa penggunaan lain.
5. `supabase/03-test-article-authorization.sql` menguji admin, akun biasa, dan anon pada satu artikel uji yang sudah ada, lalu melakukan ROLLBACK. Isi tiga placeholder dan baca catatannya. Gunakan staging/artikel uji; webhook/efek eksternal trigger mungkin tidak dapat di-rollback. Script ini **belum dijalankan** pada proyek asli.

## Pengujian lokal otomatis

`package.json` hanya berisi dependensi **pengembangan/pengujian**, bukan server produksi atau proses build website.

```sh
npm install
npx playwright install chromium
npm run test:admin
```

Alternatif browser yang sudah terpasang: set `TUMBUH_BROWSER_EXECUTABLE` ke executable Chrome. Lingkungan yang sudah menyediakan Playwright dapat mengisi `TUMBUH_PLAYWRIGHT_MODULE` dengan lokasi modul tersebut.

Suite memakai **SDK browser asli** dan endpoint Auth/PostgREST/Storage simulasi. Semua akun/password di fixture adalah data palsu. Tidak ada login, perubahan status, pembuatan akun, atau perubahan policy pada proyek asli dari suite ini. Hasil JSON dan screenshot tersimpan pada `test-results/` (diabaikan Git). Simulasi membuktikan perilaku aplikasi, **bukan keamanan RLS produksi**.

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
| 9. Lewati UI | Jalankan SQL otorisasi di staging atau panggil REST API menggunakan sesi non-admin uji; UPDATE/DELETE harus ditolak atau menghasilkan nol baris, dan status di database tetap. Uji langsung ini wajib—redirect UI saja tidak cukup. |

Untuk uji API akun biasa tanpa membagikan token: login akun uji tersebut di klien pengujian terpisah yang kamu kendalikan (bukan halaman admin yang otomatis sign out). Jangan menempel access token ke chat/log/repository. Gunakan `Authorization: Bearer <access_token akun uji>` dan header `apikey` publishable key, lalu periksa respons serta baris database. HTTP 200 dengan `[]` dapat berarti RLS menolak semua baris; jangan menyimpulkan sukses dari kode HTTP saja. Jika anon/member bisa memperbarui satu baris pun, hentikan publikasi dan perbaiki policy setelah audit.

Pemeriksaan asli yang telah dilakukan hanya: SELECT terbatas/tanpa baris pada tabel dan PATCH anonim dengan filter `id IS NULL` (tidak mungkin cocok dengan primary key). Semua ditolak dengan `401 / permission denied`. Tidak ada pengujian login admin/non-admin asli atau perubahan artikel produksi yang diklaim berhasil.

## Pekerjaan publik yang belum dihubungkan

Halaman beranda, daftar/baca artikel publik, form pengiriman, dan unggah gambar masih memakai demo lokal seperti sebelumnya. Status `published` di database belum otomatis muncul pada feed demo. Pesan setelah penyimpanan demo kini menjelaskan bahwa data belum dikirim ke admin; tidak ada tautan ID demo menuju pratinjau database.

Langkah berikutnya, tanpa membuka UPDATE/DELETE umum:

1. Tentukan apakah pengirim artikel wajib login atau boleh anonim. Buat alur INSERT terbatas dengan status paksa `pending`, validasi kolom, batas panjang, dan perlindungan spam/rate limit/CAPTCHA. Untuk pengiriman anonim, fungsi Supabase Edge Function dapat memvalidasi request tanpa menaruh secret di frontend; audit RLS/grants tetap diperlukan.
2. Hubungkan unggah ke `articles-images`, maksimal **5 MB** dengan MIME JPG/PNG/WebP. Form demo saat ini masih mengizinkan 8 MB untuk konversi lokal; ubah validasi client DAN kebijakan bucket/server saat integrasi upload dilakukan.
3. Gunakan nama objek acak dan folder kepemilikan yang diverifikasi server. Batasi INSERT objek dan cegah overwrite/delete objek milik orang lain. Simpan hanya path objek pada `cover_image_path`.
4. Tangani upload yang sukses tetapi INSERT artikel gagal (pembersihan objek yatim yang berizin), retry/idempotensi, dan validasi isi file; ekstensi/MIME dari browser saja tidak cukup.
5. Hubungkan feed publik ke artikel `published` dengan sanitasi yang sama dan proyeksi kolom aman. Jangan memberi SELECT seluruh baris publik jika `author_email` harus tetap privat: RLS membatasi baris, bukan kolom. Tinjau column grants atau endpoint/view yang aman dan benar-benar menerapkan RLS. Jangan sekadar tidak merender email di UI.
6. Migrasi demo `localStorage`, penyuntingan, draf (bila akan ditambahkan ke skema), dan penghapusan membutuhkan rancangan terpisah; jangan menyamakan ID demo dengan ID database.

## Sumber resmi

- [SDK JavaScript Supabase untuk browser](https://supabase.com/docs/reference/javascript/installing)
- [Login password](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [verifikasi pengguna](https://supabase.com/docs/reference/javascript/auth-getuser), [perubahan sesi](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [API keys](https://supabase.com/docs/guides/getting-started/api-keys) dan [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [DOMPurify](https://github.com/cure53/DOMPurify)
