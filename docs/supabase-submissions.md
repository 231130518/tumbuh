# Pengiriman artikel publik

Form `/kirim-artikel/` sekarang mengirim melalui SDK Supabase. Pengunjung tidak perlu login. Alur:

1. Validasi nama, judul, subjudul, email opsional, isi, serta satu gambar maksimal 5 MB (JPG/PNG/WebP).
2. Sanitasi HTML dengan DOMPurify; pemeriksaan signature dan decode gambar di browser.
3. Upload ke bucket `articles-images`, path acak `submissions/<uuid>/cover.<ext>`, tanpa overwrite.
4. INSERT `author_name`, `author_email`, `title`, `subtitle`, `content`, `cover_image_path`, dan `status: pending` ke `articles`.
5. Pesan berhasil hanya muncul setelah konfirmasi server. Form dibersihkan setelah berhasil; kegagalan mempertahankan isian.

Client khusus publik tidak membaca atau menimpa sesi admin. INSERT menggunakan `return=minimal`, tanpa SELECT artikel pending/email. Dashboard yang sudah terhubung Supabase dapat membaca kiriman yang berhasil diterima dan mengambil keputusan. Tidak ada kredensial admin/secret key dalam alur pengiriman.

## Konfigurasi server dan pemeriksaan

Artikel publik dan penghapusan admin sudah dikonfirmasi berfungsi oleh pemilik. File SQL setup dan script pengujian lokal telah dihapus atas permintaan pemilik; database, akun, bucket, dan policy yang sudah diterapkan tidak ikut terhapus. Arsip setup tersedia di riwayat Git pada commit `058a45d`.

Konfigurasi yang perlu dipertahankan di Supabase:

- Bucket `articles-images` public, maksimal 5 MB, MIME JPG/PNG/WebP; path unggahan acak tanpa overwrite atau DELETE anonim.
- INSERT publik dibatasi ke kolom kiriman, status `pending`, panjang teks dan path gambar yang valid. Helper `tumbuh_submission_cover_exists` memeriksa keberadaan objek Storage.
- SELECT publik hanya kolom aman pada artikel `published`, tanpa `author_email`. UPDATE/DELETE artikel memerlukan keanggotaan admin.
- Index unik `tumbuh_submission_cover_unique` pada path kiriman mencegah duplikasi saat retry.

Untuk pemeriksaan manual, kirim artikel uji tanpa login, pastikan statusnya pending, lalu tinjau melalui `/admin/peninjauan/`. Setelah publish, artikel harus muncul di halaman publik; setelah reject atau hapus, artikel tidak dapat dibaca lagi setelah halaman dimuat ulang. Periksa juga akun non-admin tidak bisa mengubah atau menghapus artikel lewat API.

Konten HTML dari client tetap dianggap tidak tepercaya; pemeriksaan frontend bisa dilewati. Pratinjau admin selalu melakukan sanitasi ulang. Renderer publik juga menyaring HTML dengan sanitizer yang sama. Pemeriksaan MIME/signature browser bukan pemindai keamanan file server.

## Retry, draf, dan gambar yatim

- Tombol **Simpan Draf** menyimpan teks secara lokal, tidak upload/INSERT. **Lanjutkan Draf** memulihkan teks setelah konfirmasi bila ada isian baru; gambar harus dipilih ulang. Draf tidak muncul pada dashboard admin dan bukan status `draft` di database.
- Pengiriman memakai fingerprint isi+file. Metadata path/fingerprint disimpan sementara di `sessionStorage` tanpa isi/email penulis, supaya retry dalam sesi tab menggunakan objek yang sama. Jika respons INSERT hilang, index unik mengonfirmasi bahwa pengiriman yang sama sudah diterima.
- Jangan menganggap seluruh error duplikat sebagai berhasil: kode hanya mengenali nama index khusus kiriman. Jika upload memberi duplikat setelah gangguan jaringan, bytes gambar yang sudah terunggah dicocokkan terlebih dahulu.
- Jika upload berhasil tetapi INSERT gagal, gambar dipertahankan untuk retry. Tidak diberikan izin DELETE anonim untuk pembersihan. Pengelola perlu membersihkan objek `submissions/` yang sudah cukup lama (misalnya >48 jam) dan tidak direferensikan `articles.cover_image_path`, menggunakan Storage API berizin, bukan menghapus metadata SQL langsung. Jangan menghapus upload yang masih mungkin dipakai retry.
- Draf lokal lama dari demo tidak otomatis dianggap artikel database dan ID `local-*` tidak dipakai untuk UPDATE. Query `?edit=` pada form publik diberi keterangan bahwa form hanya menerima kiriman baru.

## Batas keamanan publik yang masih perlu dikerjakan

Pengiriman tanpa login berarti endpoint INSERT/upload memang terbuka untuk menerima kiriman. Batas ukuran/panjang/status melindungi struktur data, **tidak menghentikan spam berulang atau penghabisan kuota**. Sebelum trafik besar, pasang rate limit dan CAPTCHA yang diverifikasi server (misalnya gateway Supabase Edge Function), lalu tutup jalur langsung yang bisa melewatinya. Jangan menaruh CAPTCHA secret maupun Supabase secret di browser. Penguncian tombol di UI bukan rate limit server.

Bucket public membuat URL gambar dapat dibaca walaupun artikel masih pending; jangan mengunggah materi rahasia. Beranda/daftar/baca artikel menggunakan Supabase dengan filter `published`, sanitasi HTML, dan proyeksi tanpa `author_email`. Pembatasan SELECT tetap harus ditegakkan di server; kode frontend saja tidak cukup.

Referensi resmi: [upload Storage](https://supabase.com/docs/reference/javascript/storage-from-upload), [INSERT](https://supabase.com/docs/reference/javascript/insert), dan [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
