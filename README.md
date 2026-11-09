# TUMBUH — Teman Tumbuh Kembang Anak

Frontend Tugas Akhir untuk pemantauan anak usia 0–60 bulan dan artikel edukasi. Menggunakan HTML, CSS, dan JavaScript biasa, tanpa framework atau proses build.

## Menjalankan lokal

Buka folder ini melalui Live Server di VS Code, atau jalankan:

```sh
python3 -m http.server 8000
```

Buka `http://localhost:8000/`. Gunakan alamat dan port yang sama selama menguji alur artikel karena penyimpanan browser terikat pada asal situs.

## Halaman dan kode

- `index.html`: beranda dan form pemeriksaan.
- `hasil-pemeriksaan/index.html`: ringkasan data anak dan klasifikasi DNN untuk TB/U, BB/U, serta BB/TB.
- `artikel/index.html`, `artikel/baca/index.html`: daftar, pencarian, dan isi artikel berstatus `published` dari Supabase.
- `kirim-artikel/index.html`: pengiriman publik ke Supabase berstatus `pending`; draf teks tetap lokal.
- `admin/peninjauan/index.html`, `admin/pratinjau/index.html`: dashboard dan pratinjau Supabase dengan verifikasi admin, publish/reject, dan Logout.
- `admin/index.html`: login email/password Supabase; hanya UUID yang terdaftar pada `admin_users` dapat masuk.
- `js/main.js`: navigasi, form pemeriksaan, hasil klasifikasi, dan editor.
- `js/growth-model.js`, `model/browser-model.json`, `model/weights-*.bin`: inferensi model Keras di browser; preprocessing dan pembaruan model dijelaskan di [panduan model](model/README.md).
- `js/public-articles.js`: beranda, pencarian, pagination, dan detail artikel Supabase tanpa email penulis.
- `js/article-loading.js`: skeleton shimmer bersama untuk artikel publik dan admin, fade-in saat respons selesai, serta dukungan reduced motion.
- `js/article-submit.js`, `js/article-content.js`: pengiriman ke Storage/`articles`, draf lokal, dan sanitasi bersama.
- `js/supabase-config.js`, `js/supabase-client.js`: konfigurasi publik, SDK client, dan verifikasi pengguna/keanggotaan admin.
- `js/admin.js`, `js/admin-articles.js`: sesi admin, guard halaman, query artikel Supabase, sanitasi DOMPurify, dan perubahan status.
- `docs/supabase-admin.md`, `docs/supabase-submissions.md`: konfigurasi dan panduan pemeliharaan integrasi Supabase.
- `js/loading.js`, `js/aos-tumbuh.js`: loading dan animasi konten.
- `css/style.css`: tampilan responsif dan animasi.

## URL halaman

| Halaman              | URL                                              |
| -------------------- | ------------------------------------------------ |
| Beranda              | `/`                                              |
| Daftar artikel       | `/artikel/`                                      |
| Isi artikel          | `/artikel/baca/?id=ID`                           |
| Kirim artikel        | `/kirim-artikel/` |
| Hasil pemeriksaan    | `/hasil-pemeriksaan/`                            |
| Login admin          | `/admin/`                                  |
| Peninjauan artikel   | `/admin/peninjauan/`                             |
| Pratinjau admin      | `/admin/pratinjau/?id=ID`                        |

Alamat `/admin` membuka halaman login; alamat lama `/admin/login/` tetap dialihkan ke sana. Dashboard dan pratinjau memerlukan sesi Supabase terverifikasi serta keanggotaan `admin_users`. RLS tetap menjadi pengaman data di server.

Setiap URL folder memiliki `index.html` sendiri, sehingga bisa dibuka langsung dan di-refresh pada hosting statis. Navigasi situs langsung menuju URL folder. File `.html` lama hanya menyimpan pengalihan inline tanpa unduhan JS tambahan atau tampilan perantara; query dan tujuan scroll tetap diteruskan. Tautan manual hanya tampil jika JavaScript dimatikan. Ubah isi halaman pada file dalam folder baru, bukan pada file pengalih lama.

Navigasi bagian beranda tetap menggunakan anchor sebagai fallback; JavaScript menggulir ke tujuan dan membersihkan hash dari address bar. ID artikel tetap memakai query; pratinjau admin dan halaman publik memakai ID database. Jalur aset dan navigasi mendukung domain sendiri maupun alamat proyek `/tumbuh/`, tanpa perubahan DNS atau framework.

## Status fitur

Data anak hanya disimpan sementara dalam `sessionStorage` dengan kunci `tumbuh-growth-input-v1`, bukan di database artikel. Usia dihitung dalam bulan penuh pada tanggal pemeriksaan. Model memakai urutan Gender, usia dalam bulan penuh, berat dalam kg, dan tinggi dalam cm. Pemetaan Gender dan StandardScaler mengikuti notebook pelatihan. Inferensi berlangsung di browser tanpa mengirim data anak ke server. Halaman tanpa input menampilkan kondisi kosong; kegagalan memuat model tidak menghasilkan klasifikasi pengganti.

Beranda, daftar, pencarian, dan detail artikel mengambil data Supabase `published`. Kiriman tanpa login masuk sebagai `pending` untuk ditinjau admin; artikel `rejected` tidak muncul di publik. Draf formulir hanya disimpan lokal. Fitur edit/draf admin dinonaktifkan. Hapus permanen tersedia dengan konfirmasi dan izin khusus admin. Model pertumbuhan sudah terhubung; dataset pelatihan tidak diperlukan saat website berjalan.

## Konfigurasi admin Supabase

Konfigurasi publik proyek `ayotumbuh` sudah diisi pada `js/supabase-config.js` (URL dasar, publishable key, dan `adminUserIdColumn: "user_id"`). Jangan menaruh secret/service_role key atau password database di frontend. Tidak ada tabel/akun/bucket/policy produksi yang dibuat ulang.

Baca [panduan Supabase admin](docs/supabase-admin.md) untuk konfigurasi, RLS, dan pemeriksaan manual. Situs berjalan tanpa instalasi npm atau proses build. Script pengujian dan SQL setup telah dihapus dari proyek atas permintaan pemilik; arsipnya tetap tersedia pada riwayat Git, commit `058a45d`. Penghapusan file lokal tidak mengubah database, akun, bucket, atau policy yang sudah terpasang di Supabase.

## Pengiriman artikel publik

Form `/kirim-artikel/` mengunggah satu gambar JPG/PNG/WebP maksimal 5 MB lalu INSERT `pending`, tanpa login pengunjung. Client publik terpisah dari sesi admin. Isian dipertahankan saat gagal dan pesan sukses hanya muncul setelah konfirmasi server.

Artikel publik dan penghapusan admin sudah dikonfirmasi berfungsi oleh pemilik. Lihat [panduan pengiriman](docs/supabase-submissions.md) untuk alur, retry, dan pemeliharaan. Izin akses tetap dikelola di Supabase; bacaan publik hanya `published` tanpa kolom email penulis.

## Acuan yang dipertahankan

Desain utama: [Figma Draft 4](https://www.figma.com/design/167KzjdOtNG2fEY8wGrC0f/tumbuh.?node-id=0-1). Hasil pemeriksaan memakai acuan Draft 4.7 (`231:9`) dengan data input nyata dan status klasifikasi kosong, bukan status contoh Normal.

Artikel tidak memiliki kategori. Gambar utama wajib tepat satu. Aset asli dipertahankan, termasuk SVG scroll-down. Font Inter disediakan lokal beserta lisensinya. AOS memakai fade-up 20 px, 740 ms, `cubic-bezier(.22,1,.36,1)`, sekali tampil; footer statis. Artikel memakai Supabase; model DNN memakai bobot asli yang dikonversi untuk browser.

GitHub Pages memakai **Deploy from a branch**, dengan sumber `main` dan folder `/ (root)`, untuk publikasi otomatis saat push. Domain `www.ayotumbuh.my.id` dipertahankan melalui file `CNAME`.
