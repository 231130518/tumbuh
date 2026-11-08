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
- `admin/peninjauan/index.html`, `admin/pratinjau/index.html`: peninjauan lengkap, edit, draf, terbit, tolak, dan hapus.
- `admin/index.html`: tampilan login saja, bukan autentikasi atau pelindung halaman admin.
- `js/main.js`: navigasi, tampilan publik, form pemeriksaan, ringkasan hasil, dan editor.
- `js/review.js`: satu sumber data artikel demo, validasi gambar, sanitasi isi, dan tindakan admin.
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

Alamat `/admin` membuka halaman login; alamat lama `/admin/login/` tetap dialihkan ke sana. Akses admin masih berupa demo tanpa autentikasi server.

Setiap URL folder memiliki `index.html` sendiri, sehingga bisa dibuka langsung dan di-refresh pada hosting statis. File `.html` lama menjadi pengalih melalui `js/redirect.js`, dengan query dan tujuan scroll tetap diteruskan. Ubah isi halaman pada file dalam folder baru, bukan pada file pengalih lama.

Navigasi bagian beranda tetap menggunakan anchor sebagai fallback; JavaScript menggulir ke tujuan dan membersihkan hash dari address bar. ID artikel tetap memakai query untuk memilih konten demo. Jalur aset dan navigasi mendukung domain sendiri maupun alamat proyek `/tumbuh/`, tanpa perubahan DNS atau framework.

## Batas demo

Data anak hanya disimpan sementara dalam `sessionStorage` dengan kunci `tumbuh-growth-input-v1`, bukan di database artikel. Usia dihitung dalam bulan penuh pada tanggal pemeriksaan. Format usia untuk model perlu disesuaikan dengan preprocessing final nanti. Halaman hasil tanpa input menampilkan kondisi kosong. Status TB/U, BB/U, dan BB/TB selalu belum tersedia sampai model sungguhan terintegrasi.

Artikel disimpan dalam `localStorage` dengan awalan `tumbuh-frontend-articles-v1`. Artikel baru berstatus `pending`, kecuali disimpan sebagai `draft`. Admin dapat menerbitkannya untuk ditampilkan di halaman publik pada browser yang sama. Status `pending`, `draft`, dan `rejected` tidak ditampilkan di halaman publik. Data ini tidak dikirim ke server atau disinkronkan antarperangkat. Akun admin, FastAPI, database, dataset, dan model belum disertakan.

## Acuan yang dipertahankan

Desain utama: [Figma Draft 4](https://www.figma.com/design/167KzjdOtNG2fEY8wGrC0f/tumbuh.?node-id=0-1). Hasil pemeriksaan memakai acuan Draft 4.7 (`231:9`) dengan data input nyata dan status klasifikasi kosong, bukan status contoh Normal.

Artikel tidak memiliki kategori. Gambar utama wajib tepat satu. Aset asli dipertahankan, termasuk SVG scroll-down. Font Inter disediakan lokal beserta lisensinya. AOS memakai fade-up 20 px, 740 ms, `cubic-bezier(.22,1,.36,1)`, sekali tampil; footer statis. Prioritas saat ini menyelesaikan UI sebelum integrasi backend dan DNN.

GitHub Pages memakai **Deploy from a branch**, dengan sumber `main` dan folder `/ (root)`, untuk publikasi otomatis saat push. Domain `www.ayotumbuh.my.id` dipertahankan melalui file `CNAME`. Workflow `.github/workflows/static.yml` hanya menjadi cadangan manual jika sumber Pages diubah kembali ke GitHub Actions.
