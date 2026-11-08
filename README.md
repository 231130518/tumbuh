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
- `hasil-pemeriksaan/index.html`: data anak dan tiga kartu hasil; belum ada klasifikasi DNN.
- `artikel/index.html`, `artikel/baca/index.html`: daftar, pencarian, dan isi artikel yang terbit pada demo.
- `kirim-artikel/index.html`: kirim artikel dan simpan draf; `?edit=ID` untuk mengedit artikel demo.
- `admin/peninjauan/index.html`, `admin/pratinjau/index.html`: dashboard dan pratinjau Supabase dengan verifikasi admin, publish/reject, dan Logout.
- `admin/index.html`: login email/password Supabase; hanya UUID yang terdaftar pada `admin_users` dapat masuk.
- `js/main.js`: navigasi, tampilan publik, form pemeriksaan, ringkasan hasil, dan editor.
- `js/review.js`: data demo halaman publik, validasi gambar, sanitasi isi, dan formulir lokal.
- `js/supabase-config.js`, `js/supabase-client.js`: konfigurasi publik, SDK client, dan verifikasi pengguna/keanggotaan admin.
- `js/admin.js`, `js/admin-articles.js`: sesi admin, guard halaman, query artikel Supabase, sanitasi DOMPurify, dan perubahan status.
- `docs/supabase-admin.md`, `supabase/`: panduan integrasi, audit baca-saja, SQL opsional, dan pengujian otorisasi.
- `js/loading.js`, `js/aos-tumbuh.js`: loading dan animasi konten.
- `css/style.css`: tampilan responsif dan animasi.

## URL halaman

| Halaman              | URL                                              |
| -------------------- | ------------------------------------------------ |
| Beranda              | `/`                                              |
| Daftar artikel       | `/artikel/`                                      |
| Isi artikel          | `/artikel/baca/?id=ID`                           |
| Kirim / edit artikel | `/kirim-artikel/` atau `/kirim-artikel/?edit=ID` |
| Hasil pemeriksaan    | `/hasil-pemeriksaan/`                            |
| Login admin          | `/admin/`                                  |
| Peninjauan artikel   | `/admin/peninjauan/`                             |
| Pratinjau admin      | `/admin/pratinjau/?id=ID`                        |

Alamat `/admin` membuka halaman login; alamat lama `/admin/login/` tetap dialihkan ke sana. Dashboard dan pratinjau memerlukan sesi Supabase terverifikasi serta keanggotaan `admin_users`. RLS tetap menjadi pengaman data di server.

Setiap URL folder memiliki `index.html` sendiri, sehingga bisa dibuka langsung dan di-refresh pada hosting statis. File `.html` lama menjadi pengalih melalui `js/redirect.js`, dengan query dan tujuan scroll tetap diteruskan. Ubah isi halaman pada file dalam folder baru, bukan pada file pengalih lama.

Navigasi bagian beranda tetap menggunakan anchor sebagai fallback; JavaScript menggulir ke tujuan dan membersihkan hash dari address bar. ID artikel tetap memakai query; pratinjau admin memilih ID database, halaman publik masih memilih ID demo. Jalur aset dan navigasi mendukung domain sendiri maupun alamat proyek `/tumbuh/`, tanpa perubahan DNS atau framework.

## Batas demo

Data anak hanya disimpan sementara dalam `sessionStorage` dengan kunci `tumbuh-growth-input-v1`, bukan di database artikel. Usia dihitung dalam bulan penuh pada tanggal pemeriksaan. Format usia untuk model perlu disesuaikan dengan preprocessing final nanti. Halaman hasil tanpa input menampilkan kondisi kosong. Status TB/U, BB/U, dan BB/TB selalu belum tersedia sampai model sungguhan terintegrasi.

Halaman publik dan form pengiriman masih memakai `localStorage` dengan awalan `tumbuh-frontend-articles-v1`. Data demo tidak dikirim ke Supabase dan tidak muncul di dashboard sungguhan. Admin memakai tabel `articles`, dengan status `pending`, `published`, dan `rejected`; publikasi di database belum mengubah feed publik demo. Fitur edit/draf/hapus admin dinonaktifkan. Dataset dan model pertumbuhan belum diintegrasikan.

## Konfigurasi admin Supabase

Konfigurasi publik proyek `ayotumbuh` sudah diisi pada `js/supabase-config.js` (URL dasar, publishable key, dan `adminUserIdColumn: "user_id"`). Jangan menaruh secret/service_role key atau password database di frontend. Tidak ada tabel/akun/bucket/policy produksi yang dibuat ulang.

Baca [panduan Supabase admin](docs/supabase-admin.md) untuk konfigurasi, audit RLS, sembilan pengujian manual, batas verifikasi, dan pekerjaan upload/form publik selanjutnya. Periksa RLS dengan akun non-admin asli sebelum publikasi. Pengujian otomatis: `npm install`, `npx playwright install chromium`, lalu `npm run test:admin`. Dependensi Node hanya untuk pengujian; situs tetap tanpa build/backend Node.

## Acuan yang dipertahankan

Desain utama: [Figma Draft 4](https://www.figma.com/design/167KzjdOtNG2fEY8wGrC0f/tumbuh.?node-id=0-1). Hasil pemeriksaan memakai acuan Draft 4.7 (`231:9`) dengan data input nyata dan status klasifikasi kosong, bukan status contoh Normal.

Artikel tidak memiliki kategori. Gambar utama wajib tepat satu. Aset asli dipertahankan, termasuk SVG scroll-down. Font Inter disediakan lokal beserta lisensinya. AOS memakai fade-up 20 px, 740 ms, `cubic-bezier(.22,1,.36,1)`, sekali tampil; footer statis. Prioritas saat ini menyelesaikan UI sebelum integrasi backend dan DNN.

GitHub Pages memakai **Deploy from a branch**, dengan sumber `main` dan folder `/ (root)`, untuk publikasi otomatis saat push. Domain `www.ayotumbuh.my.id` dipertahankan melalui file `CNAME`. Workflow `.github/workflows/static.yml` hanya menjadi cadangan manual jika sumber Pages diubah kembali ke GitHub Actions.
