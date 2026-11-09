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
- `artikel/index.html`, `artikel/baca/index.html`: daftar, pencarian, dan isi artikel berstatus `published` dari Supabase.
- `kirim-artikel/index.html`: pengiriman publik ke Supabase berstatus `pending`; draf teks tetap lokal.
- `admin/peninjauan/index.html`, `admin/pratinjau/index.html`: dashboard dan pratinjau Supabase dengan verifikasi admin, publish/reject, dan Logout.
- `admin/index.html`: login email/password Supabase; hanya UUID yang terdaftar pada `admin_users` dapat masuk.
- `js/main.js`: navigasi, tampilan publik, form pemeriksaan, ringkasan hasil, dan editor.
- `js/public-articles.js`: beranda, pencarian, pagination, dan detail artikel Supabase tanpa email penulis.
- `js/article-loading.js`: skeleton shimmer bersama untuk artikel publik dan admin, fade-in saat respons selesai, serta dukungan reduced motion.
- `js/article-submit.js`, `js/article-content.js`: pengiriman ke Storage/`articles`, draf lokal, dan sanitasi bersama.
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
| Kirim artikel        | `/kirim-artikel/` |
| Hasil pemeriksaan    | `/hasil-pemeriksaan/`                            |
| Login admin          | `/admin/`                                  |
| Peninjauan artikel   | `/admin/peninjauan/`                             |
| Pratinjau admin      | `/admin/pratinjau/?id=ID`                        |

Alamat `/admin` membuka halaman login; alamat lama `/admin/login/` tetap dialihkan ke sana. Dashboard dan pratinjau memerlukan sesi Supabase terverifikasi serta keanggotaan `admin_users`. RLS tetap menjadi pengaman data di server.

Setiap URL folder memiliki `index.html` sendiri, sehingga bisa dibuka langsung dan di-refresh pada hosting statis. File `.html` lama menjadi pengalih melalui `js/redirect.js`, dengan query dan tujuan scroll tetap diteruskan. Ubah isi halaman pada file dalam folder baru, bukan pada file pengalih lama.

Navigasi bagian beranda tetap menggunakan anchor sebagai fallback; JavaScript menggulir ke tujuan dan membersihkan hash dari address bar. ID artikel tetap memakai query; pratinjau admin dan halaman publik memakai ID database. Jalur aset dan navigasi mendukung domain sendiri maupun alamat proyek `/tumbuh/`, tanpa perubahan DNS atau framework.

## Status fitur

Data anak hanya disimpan sementara dalam `sessionStorage` dengan kunci `tumbuh-growth-input-v1`, bukan di database artikel. Usia dihitung dalam bulan penuh pada tanggal pemeriksaan. Format usia untuk model perlu disesuaikan dengan preprocessing final nanti. Halaman hasil tanpa input menampilkan kondisi kosong. Status TB/U, BB/U, dan BB/TB selalu belum tersedia sampai model sungguhan terintegrasi.

Beranda, daftar, pencarian, dan detail artikel mengambil data Supabase `published`. Kiriman tanpa login masuk sebagai `pending` untuk ditinjau admin; artikel `rejected` tidak muncul di publik. Draf formulir hanya disimpan lokal. Fitur edit/draf admin dinonaktifkan. Hapus permanen tersedia dengan konfirmasi dan izin khusus admin; aktivasi melalui `supabase/05-admin-delete.sql`. Dataset dan model pertumbuhan belum diintegrasikan.

## Konfigurasi admin Supabase

Konfigurasi publik proyek `ayotumbuh` sudah diisi pada `js/supabase-config.js` (URL dasar, publishable key, dan `adminUserIdColumn: "user_id"`). Jangan menaruh secret/service_role key atau password database di frontend. Tidak ada tabel/akun/bucket/policy produksi yang dibuat ulang.

Baca [panduan Supabase admin](docs/supabase-admin.md) untuk konfigurasi, audit RLS, sembilan pengujian manual, batas verifikasi, dan pemeriksaan keamanan. Periksa RLS dengan akun non-admin asli sebelum publikasi. Pengujian otomatis: `npm install`, `npx playwright install chromium`, lalu `npm run test:admin`. Dependensi Node hanya untuk pengujian; situs tetap tanpa build/backend Node.

## Pengiriman artikel publik

Form `/kirim-artikel/` mengunggah satu gambar JPG/PNG/WebP maksimal 5 MB lalu INSERT `pending`, tanpa login pengunjung. Client publik terpisah dari sesi admin. Isian dipertahankan saat gagal dan pesan sukses hanya muncul setelah konfirmasi server.

**Aktivasi server masih diperlukan:** pemeriksaan API terakhir menolak INSERT anonim (`401 / 42501`). Tinjau audit lalu SQL `supabase/04-public-articles.sql`; belum ada policy produksi yang diubah. Lihat [panduan pengiriman](docs/supabase-submissions.md) untuk aktivasi, retry, pengujian nyata, dan batas antispam. SQL tersebut juga membatasi bacaan publik ke artikel `published` tanpa akses kolom email penulis.

## Acuan yang dipertahankan

Desain utama: [Figma Draft 4](https://www.figma.com/design/167KzjdOtNG2fEY8wGrC0f/tumbuh.?node-id=0-1). Hasil pemeriksaan memakai acuan Draft 4.7 (`231:9`) dengan data input nyata dan status klasifikasi kosong, bukan status contoh Normal.

Artikel tidak memiliki kategori. Gambar utama wajib tepat satu. Aset asli dipertahankan, termasuk SVG scroll-down. Font Inter disediakan lokal beserta lisensinya. AOS memakai fade-up 20 px, 740 ms, `cubic-bezier(.22,1,.36,1)`, sekali tampil; footer statis. Integrasi artikel tersedia; model DNN masih terpisah.

GitHub Pages memakai **Deploy from a branch**, dengan sumber `main` dan folder `/ (root)`, untuk publikasi otomatis saat push. Domain `www.ayotumbuh.my.id` dipertahankan melalui file `CNAME`.
