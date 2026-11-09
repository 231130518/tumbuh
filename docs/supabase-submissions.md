# Pengiriman artikel publik

Form `/kirim-artikel/` sekarang mengirim melalui SDK Supabase. Pengunjung tidak perlu login. Alur:

1. Validasi nama, judul, subjudul, email opsional, isi, serta satu gambar maksimal 5 MB (JPG/PNG/WebP).
2. Sanitasi HTML dengan DOMPurify; pemeriksaan signature dan decode gambar di browser.
3. Upload ke bucket `articles-images`, path acak `submissions/<uuid>/cover.<ext>`, tanpa overwrite.
4. INSERT `author_name`, `author_email`, `title`, `subtitle`, `content`, `cover_image_path`, dan `status: pending` ke `articles`.
5. Pesan berhasil hanya muncul setelah konfirmasi server. Form dibersihkan setelah berhasil; kegagalan mempertahankan isian.

Client khusus publik tidak membaca atau menimpa sesi admin. INSERT menggunakan `return=minimal`, tanpa SELECT artikel pending/email. Dashboard yang sudah terhubung Supabase dapat membaca kiriman yang berhasil diterima dan mengambil keputusan. Tidak ada kredensial admin/secret key dalam alur pengiriman.

## Status aktivasi

**Kode frontend sudah terhubung, tetapi izin server belum aktif.** Pada pemeriksaan 9 November 2026, POST batch kosong ke `articles` menggunakan publishable key ditolak `401`, kode PostgreSQL `42501`, `permission denied for table articles`. Batch kosong tidak membuat artikel. Pengujian ini tidak menguji unggah gambar produksi.

Tidak ada policy, bucket, tabel, akun, atau data produksi yang diubah oleh implementasi ini. Tidak ada git push/deploy otomatis. Mengubah file lokal belum mengubah website yang sedang di-host.

## Mengaktifkan pengiriman

1. Buka proyek `ayotumbuh` di Supabase. Jalankan **audit baca-saja** `supabase/01-audit-access.sql` dan tinjau policy/grants yang ada.
2. Pastikan bucket **yang sudah ada** `articles-images` bersifat public, `file_size_limit` maksimal `5242880`, dengan MIME `image/jpeg`, `image/png`, `image/webp`. File SQL berhenti jika konfigurasi ini belum cocok; tidak membuat ulang bucket.
3. Tinjau lalu jalankan `supabase/04-public-articles.sql` melalui SQL Editor. Alternatif: hubungkan plugin Supabase agar konfigurasi bisa diperiksa dan diterapkan setelah ditinjau.
4. Jalankan situs lokal (`python3 -m http.server 8000`) dan buka `http://localhost:8000/kirim-artikel/`. Kirim satu **artikel uji** dan satu gambar, kemudian cek Storage serta Table Editor. Baris harus `pending`.
5. Login admin pada `/admin/`, buka `/admin/peninjauan/`, baca kiriman baru, lalu uji publish/reject pada artikel uji. Setelah publish, periksa kemunculannya di beranda, daftar, dan detail publik; setelah reject, pastikan tidak dapat dibaca lagi. Pastikan role anon tetap tidak dapat UPDATE/DELETE atau membaca email/pending melalui API.
6. Setelah pengujian asli selesai, publikasi perubahan website dilakukan terpisah sesuai persetujuan pemilik. Periksa cache browser ketika membandingkan versi lokal dan versi online.

### Isi SQL 04

- Memberi role `anon` hanya INSERT pada tujuh kolom kiriman. Tidak memberi akses mengisi `id`/`created_at`, UPDATE, atau DELETE. SELECT dibatasi ke kolom aman dan baris `published`; email penulis tidak diberikan kepada anon. Transaksi berhenti jika akses email masih diwarisi dari role lain.
- Policy INSERT mengharuskan `pending`; policy **restrictive** tambahan tetap memeriksa status, panjang teks, email, path gambar, dan keberadaan objek Storage walaupun ada policy INSERT permissive lain.
- Membuat helper `tumbuh_submission_cover_exists(text)` yang hanya mengembalikan boolean. Helper ini `SECURITY DEFINER` dengan `search_path` kosong dan nama schema eksplisit, sehingga anon tidak perlu SELECT `storage.objects`. Helper tidak memberi akses tulis atau daftar file.
- Membuka INSERT objek hanya di `articles-images/submissions/<uuid>/cover.jpg|png|webp`. Bucket menegakkan MIME dan maksimum 5 MB. Anon tetap tidak mendapat overwrite/delete pada bucket ini. Policy bucket lain dan policy admin tidak diganti.
- Menambahkan index unik parsial `tumbuh_submission_cover_unique` pada path kiriman. Retry dengan path yang sama tidak menambah artikel ganda. Bila path `submissions/` sudah dipakai dan mempunyai duplikat, pembuatan index gagal dan transaksi dibatalkan; audit duplikat terlebih dahulu, jangan menghapus data sembarangan.
- Hanya policy bernama `tumbuh_public_*` milik integrasi ini yang diganti ketika file dijalankan ulang. Tetap periksa grants kolom/role turunan dan RPC/view lain pada audit.

Konten HTML dari client tetap dianggap tidak tepercaya; pemeriksaan frontend bisa dilewati. Pratinjau admin selalu melakukan sanitasi ulang. Renderer publik juga menyaring HTML dengan sanitizer yang sama. Pemeriksaan MIME/signature browser bukan pemindai keamanan file server.

## Retry, draf, dan gambar yatim

- Tombol **Simpan Draf** menyimpan teks secara lokal, tidak upload/INSERT. **Lanjutkan Draf** memulihkan teks setelah konfirmasi bila ada isian baru; gambar harus dipilih ulang. Draf tidak muncul pada dashboard admin dan bukan status `draft` di database.
- Pengiriman memakai fingerprint isi+file. Metadata path/fingerprint disimpan sementara di `sessionStorage` tanpa isi/email penulis, supaya retry dalam sesi tab menggunakan objek yang sama. Jika respons INSERT hilang, index unik mengonfirmasi bahwa pengiriman yang sama sudah diterima.
- Jangan menganggap seluruh error duplikat sebagai berhasil: kode hanya mengenali nama index khusus kiriman. Jika upload memberi duplikat setelah gangguan jaringan, bytes gambar yang sudah terunggah dicocokkan terlebih dahulu.
- Jika upload berhasil tetapi INSERT gagal, gambar dipertahankan untuk retry. Tidak diberikan izin DELETE anonim untuk pembersihan. Pengelola perlu membersihkan objek `submissions/` yang sudah cukup lama (misalnya >48 jam) dan tidak direferensikan `articles.cover_image_path`, menggunakan Storage API berizin, bukan menghapus metadata SQL langsung. Jangan menghapus upload yang masih mungkin dipakai retry.
- Draf lokal lama dari demo tidak otomatis dianggap artikel database dan ID `local-*` tidak dipakai untuk UPDATE. Query `?edit=` pada form publik diberi keterangan bahwa form hanya menerima kiriman baru.

## Batas keamanan publik yang masih perlu dikerjakan

Pengiriman tanpa login berarti endpoint INSERT/upload memang terbuka untuk menerima kiriman. Batas ukuran/panjang/status melindungi struktur data, **tidak menghentikan spam berulang atau penghabisan kuota**. Sebelum trafik besar, pasang rate limit dan CAPTCHA yang diverifikasi server (misalnya gateway Supabase Edge Function), lalu tutup jalur langsung yang bisa melewatinya. Jangan menaruh CAPTCHA secret maupun Supabase secret di browser. Penguncian tombol di UI bukan rate limit server.

Bucket public membuat URL gambar dapat dibaca walaupun artikel masih pending; jangan mengunggah materi rahasia. Beranda/daftar/baca artikel menggunakan Supabase dengan filter `published`, sanitasi HTML, dan proyeksi tanpa `author_email`. SQL 04 menambahkan pembatasan SELECT di server; kode frontend saja tidak cukup.

## Pengujian yang tersedia

`npm run test:admin` menjalankan SDK asli dengan endpoint Supabase simulasi, termasuk:

- Draf lokal/restore tanpa request jaringan.
- Upload + INSERT pending + sanitasi + pengosongan form setelah sukses.
- Pengiriman publik pada browser yang juga mempunyai sesi admin, lalu kiriman muncul dan dapat ditinjau admin.
- Upload ditolak, INSERT ditolak, retry tanpa upload ganda, respons INSERT hilang, dan penolakan file palsu/>5 MB.
- Login/guard/refresh/logout/non-admin, sanitasi pratinjau, dan publish/reject dari suite admin.
- Feed published, detail, pagination, pencarian dengan karakter khusus, hasil kosong, dan kegagalan API tanpa fallback demo.
- Jalur domain sendiri dan `/tumbuh/`, serta tampilan mobile tanpa overflow horizontal.

Laporan: `test-results/admin-supabase.json`. Suite simulasi tidak membuktikan grants/RLS produksi. Pengiriman nyata belum dinyatakan berhasil sebelum SQL ditinjau/diaktifkan dan artikel uji diperiksa pada proyek asli.

Referensi resmi: [upload Storage](https://supabase.com/docs/reference/javascript/storage-from-upload), [INSERT](https://supabase.com/docs/reference/javascript/insert), dan [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
