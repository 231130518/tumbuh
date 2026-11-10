# TUMBUH — Teman Tumbuh Kembang Anak

TUMBUH adalah website untuk membantu orang tua memahami pertumbuhan anak usia **0–60 bulan** melalui estimasi model DNN dan artikel edukasi yang ditinjau admin.

**Website aktif:** [www.ayotumbuh.my.id](https://www.ayotumbuh.my.id)

**Repository:** [231130518/tumbuh](https://github.com/231130518/tumbuh)

Website menggunakan HTML, CSS, dan JavaScript biasa, di-host melalui **GitHub Pages**. Supabase menangani artikel, akun admin, dan gambar sampul. Model pertumbuhan dijalankan pada perangkat pengunjung melalui browser. Hasil model merupakan informasi pendamping, bukan diagnosis medis.

## Daftar isi

- [Fitur dan halaman website](#fitur-dan-halaman-website)
- [Arsitektur dan alur kerja](#arsitektur-dan-alur-kerja)
- [Struktur folder](#struktur-folder)
- [Panduan membaca kode](#panduan-membaca-kode)
- [Pemeriksaan pertumbuhan dan model DNN](#pemeriksaan-pertumbuhan-dan-model-dnn)
- [Pengiriman dan publikasi artikel](#pengiriman-dan-publikasi-artikel)
- [Penggunaan admin](#penggunaan-admin)
- [Konfigurasi dan keamanan Supabase](#konfigurasi-dan-keamanan-supabase)
- [Penyimpanan browser dan privasi](#penyimpanan-browser-dan-privasi)
- [Tampilan, loading, dan navigasi](#tampilan-loading-dan-navigasi)
- [Pemeliharaan dan publikasi perubahan](#pemeliharaan-dan-publikasi-perubahan)
- [Pemeriksaan dan pemecahan masalah](#pemeriksaan-dan-pemecahan-masalah)
- [Batasan dan dokumentasi lanjutan](#batasan-dan-dokumentasi-lanjutan)

## Fitur dan halaman website

| Fitur | Fungsi | Alamat |
| --- | --- | --- |
| Beranda | Pengenalan TUMBUH, formulir pemeriksaan, artikel terbaru, FAQ | [Beranda](https://www.ayotumbuh.my.id/) |
| Pemeriksaan | Memasukkan tanggal lahir, jenis kelamin, berat, dan tinggi anak | [Form pemeriksaan](https://www.ayotumbuh.my.id/#cek) |
| Hasil | Ringkasan input dan hasil TB/U, BB/U, BB/TB dari model | [Hasil pemeriksaan](https://www.ayotumbuh.my.id/hasil-pemeriksaan/) |
| Artikel edukasi | Daftar artikel terbit dengan pencarian dan pagination | [Daftar artikel](https://www.ayotumbuh.my.id/artikel/) |
| Baca artikel | Isi artikel sesuai ID pada `?id=ID` | `/artikel/baca/?id=ID` |
| Kirim artikel | Pengiriman tanpa login, dilengkapi satu gambar sampul | [Kirim artikel](https://www.ayotumbuh.my.id/kirim-artikel/) |
| Login admin | Masuk menggunakan akun Supabase Auth yang terdaftar sebagai admin | [Login admin](https://www.ayotumbuh.my.id/admin/) |
| Peninjauan | Filter, pembacaan, dan pengelolaan artikel | [Dashboard admin](https://www.ayotumbuh.my.id/admin/peninjauan/) |
| Pratinjau admin | Membaca lengkap, merevisi, menerbitkan, menolak, atau menghapus | `/admin/pratinjau/?id=ID` |

Halaman hasil membutuhkan input pemeriksaan dari sesi browser. Membukanya tanpa mengisi formulir akan menampilkan kondisi kosong. Alamat admin dapat diketahui publik, tetapi data dan tindakan pengelola memerlukan sesi serta izin database yang sesuai.

## Arsitektur dan alur kerja

| Bagian | Tanggung jawab |
| --- | --- |
| GitHub Pages | Menyajikan HTML, CSS, JavaScript, gambar, font, dan berkas model |
| Browser pengunjung | Menampilkan UI, memvalidasi input, membersihkan HTML, dan menjalankan prediksi |
| Supabase Auth | Memverifikasi email/password dan mengelola sesi admin |
| Supabase Database | Menyimpan artikel dan daftar UUID admin; RLS membatasi akses data |
| Supabase Storage | Menyimpan gambar pada bucket `articles-images` |

Alur pemeriksaan:

```text
Form anak → validasi → sessionStorage → halaman hasil
         → muat manifest/bobot → preprocessing → inferensi DNN → tiga kategori
```

Alur artikel:

```text
Pengunjung → isi form + gambar → upload Storage → INSERT pending
Admin → login + verifikasi membership → baca/revisi → terbit atau tolak
Artikel published → beranda, daftar, pencarian, dan halaman baca
```

Browser mengambil data artikel melalui request Supabase. Data dimuat ulang saat halaman dibuka, filter/pencarian/pagination digunakan, tombol muat ulang ditekan, atau halaman diaktifkan kembali sesuai listener pada modulnya. Website tidak membutuhkan backend Node.js, PHP, atau server Python untuk melayani pengunjung.

## Struktur folder

```text
tumbuh/
├── index.html                     # Beranda dan form pemeriksaan
├── artikel/
│   ├── index.html                 # Daftar dan pencarian artikel
│   └── baca/index.html            # Detail artikel published
├── kirim-artikel/index.html        # Form pengiriman publik
├── hasil-pemeriksaan/index.html    # Ringkasan dan hasil model
├── admin/
│   ├── index.html                 # Login
│   ├── peninjauan/index.html      # Dashboard artikel
│   ├── pratinjau/index.html        # Pratinjau dan editor revisi
│   └── ...                        # Alias URL admin lama
├── js/                            # Logika aplikasi
│   └── vendor/                    # SDK Supabase, DOMPurify, lisensi, hash sumber
├── css/style.css                  # Gaya, layout responsif, dan animasi
├── assets/                        # Logo, ilustrasi, ornamen SVG, font dan lisensi
├── model/                         # Sumber model, hasil konversi, dan exporter
├── docs/                          # Panduan operasional Supabase
├── article.html, articles.html,
│   submit.html, results.html      # Alias URL publik lama
├── favicon.ico, favicon.png,
│   apple-touch-icon.png           # Ikon situs dan perangkat Apple
├── CNAME                          # Custom domain GitHub Pages
└── .gitignore                     # Berkas yang tidak disertakan ke Git
```

Folder pengujian, hasil screenshot pengujian, SQL setup, dan `package.json` pengujian sudah dihapus sesuai keputusan pemilik. Penghapusan berkas tersebut tidak menghapus tabel, akun, bucket, atau policy di server Supabase. Arsip script setup/pengujian dapat ditemukan pada riwayat Git, misalnya commit `058a45d`.

## Panduan membaca kode

Komentar berbahasa Indonesia menjelaskan tujuan file, fungsi, bagian UI, urutan proses, dan alasan pemeriksaan penting. Komentar menggunakan `/** ... */` pada JavaScript, `<!-- ... -->` pada HTML, `/* ... */` pada CSS, serta `#` pada Python.

| File | Yang perlu dipahami |
| --- | --- |
| [js/main.js](js/main.js) | Membuat header/footer, navigasi, membaca formulir anak, memanggil model, serta toolbar editor |
| [js/growth-model.js](js/growth-model.js) | Memvalidasi input/model, membaca bobot, menghitung Dense/ReLU/Softmax, dan memilih label |
| [js/public-articles.js](js/public-articles.js) | Query published, kartu, pencarian, pagination, detail, rekomendasi, dan error |
| [js/article-submit.js](js/article-submit.js) | Validasi kiriman, upload, INSERT pending, retry, dan draf publik |
| [js/article-content.js](js/article-content.js) | Sanitasi HTML, validasi ID int8, dan validasi URL gambar |
| [js/article-loading.js](js/article-loading.js) | Membuat dan membersihkan skeleton pemuatan artikel |
| [js/supabase-config.js](js/supabase-config.js) | Project URL, publishable key, dan nama kolom UUID admin |
| [js/supabase-client.js](js/supabase-client.js) | Membuat client admin/publik, timeout, dan `requireAdmin()` |
| [js/admin-articles.js](js/admin-articles.js) | Operasi baca, status, revisi, dan hapus pada tabel artikel |
| [js/admin.js](js/admin.js) | Login/logout, guard halaman, filter, pratinjau, editor, dan respons UI |
| [js/loading.js](js/loading.js) | Overlay pembukaan website dan proses analisis |
| [js/aos-tumbuh.js](js/aos-tumbuh.js) | Animasi saat konten masuk layar dan fallback ketika CDN tidak tersedia |
| [css/style.css](css/style.css) | Token warna, komponen, aturan halaman, media query, dan animasi |
| [model/export_browser.py](model/export_browser.py) | Konversi offline bobot/scaler asli menjadi format yang dibaca browser |

Urutan belajar yang disarankan: baca markup halaman, cari ID elemennya pada JavaScript terkait, ikuti fungsi pemuatan/submit, lalu periksa modul data atau model yang dipanggil. Untuk admin, bedakan pengendali tampilan (`admin.js`) dan operasi database (`admin-articles.js`).

### Pola yang digunakan

- `window.Tumbuh...` menghubungkan modul tanpa bundler; `Object.freeze` membantu mencegah perubahan properti objek secara tidak sengaja.
- Sebagian modul dibungkus fungsi yang langsung dijalankan agar variabel internal tidak memenuhi lingkup global.
- Script dengan `defer` mengikuti urutan HTML dan berjalan setelah dokumen selesai dibaca. SDK, konfigurasi, dan client harus tersedia sebelum dipakai modul fitur.
- `async/await` menunggu hasil request; `try/catch/finally` memisahkan hasil sukses, error, dan pemulihan tombol/loading.
- `generation` dan `requestNumber` menandai versi request agar respons lama tidak menimpa pencarian atau sesi yang sudah berubah.
- `textContent` dipakai untuk metadata artikel. HTML isi artikel hanya dimasukkan setelah melalui sanitizer.
- `hidden`, `inert`, `aria-busy`, dan pesan status membantu tampilan serta aksesibilitas; hak database tetap bergantung pada RLS.

JSON tidak mendukung komentar. Penjelasan metadata model tersedia di bawah dan pada [panduan model](model/README.md). Library pihak ketiga, berkas biner, dan aset desain dipertahankan dalam bentuk aslinya; lisensi SDK/font tetap disertakan. `CNAME` hanya berisi domain, sehingga tidak ditambahi komentar.

## Pemeriksaan pertumbuhan dan model DNN

### Data masukan

| Input | Bentuk dan batas yang diterima aplikasi |
| --- | --- |
| Tanggal lahir | Tanggal valid, tidak melewati tanggal pemeriksaan |
| Usia | Dihitung dalam bulan penuh, 0–60 bulan |
| Jenis kelamin | Laki-laki atau perempuan |
| Berat badan | 1–45 kg, isian mendukung dua angka desimal |
| Panjang/tinggi badan | 35–130 cm, isian mendukung satu angka desimal |

Batas ini merupakan validasi aplikasi, bukan jaminan akurasi model untuk seluruh kombinasi masukan. Umur dihitung menggunakan tanggal perangkat saat pemeriksaan; data ringkasan memakai tanggal pemeriksaan yang disimpan bersama input.

### Preprocessing dan arsitektur

Urutan fitur wajib sama dengan training:

```text
[Gender, Age (Month), Weight, Height]
```

Gender dikodekan laki-laki `1` dan perempuan `0`, sesuai notebook training. Hanya usia, berat, dan tinggi yang menggunakan StandardScaler:

```text
nilai_terstandar = (nilai - mean_training) / scale_training
```

Input kemudian menjadi float32. Arsitektur model adalah **Dense 128 ReLU → Dense 64 ReLU → tiga head Softmax**. Setiap head memilih indeks probabilitas terbesar, lalu mengambil label sesuai urutannya.

| Head | Indeks | Urutan label model |
| --- | --- | --- |
| TBU | Tinggi badan menurut umur, TB/U | Not Stunted, Stunted |
| BBU | Berat badan menurut umur, BB/U | Malnutrition, Normal, Overnutrition, Underfed |
| BBTB | Berat badan menurut tinggi badan, BB/TB | Normal, Obese, Thin, Very Thin |

Label asli dipertahankan agar makna kelas training tidak berubah karena penerjemahan. Probabilitas tidak ditampilkan sebagai persentase akurasi medis. Pemetaan kartu memakai nama head, sehingga urutan kartu berbeda dari urutan output model tetap ditangani dengan benar.

### Berkas model

| Berkas | Isi/penggunaan |
| --- | --- |
| `model_tumbuh.keras` | Model sumber beserta bobot asli |
| `scaler_tumbuh.pkl` | State StandardScaler hasil training |
| `features.json` | Urutan empat fitur masukan |
| `labels.json` | Daftar kelas setiap target |
| `browser-model.json` | Manifest: format, Gender, scaler, lapisan, output, hash bobot dan sumber |
| `weights-*.bin` | Bobot float32 little-endian untuk inferensi browser, 38.184 byte pada versi ini |
| `export_browser.py` | Alat pembaruan artefak browser; tidak dijalankan GitHub Pages |

Dalam manifest, `inputSize` dan `units` menentukan bentuk matriks; `kernelOffset`/`biasOffset` menunjuk posisi berdasarkan jumlah float. `weights.sha256` diperiksa sebelum inferensi, sedangkan `modelId` mengidentifikasi paket model hasil ekspor.

Browser hanya memuat manifest dan bobot untuk prediksi. Model sumber dan exporter tetap berada di repository untuk pemeliharaan. Karena repository/website publik, berkas tersebut dapat diakses orang lain; bobot yang dipakai browser juga dapat diunduh. Jangan menganggap model yang dikirim ke browser sebagai aset rahasia.

Jika model diperbarui, ganti artefak sumber sebagai satu paket, jalankan exporter, verifikasi hasil, kemudian publikasikan manifest dan bobot baru bersama kode yang sesuai. Rincian tersedia pada [model/README.md](model/README.md).

## Pengiriman dan publikasi artikel

Pengunjung tidak perlu login. Form mengunggah satu sampul ke `articles-images`, kemudian menyimpan artikel dengan status `pending`.

| Isian | Batas |
| --- | --- |
| Nama penulis | 2–100 karakter |
| Email | Opsional; format email valid dan maksimal 254 karakter |
| Judul | 5–150 karakter |
| Subjudul | 12–500 karakter |
| Isi | 25–50.000 karakter teks; HTML maksimal 100.000 karakter |
| Sampul | Tepat satu JPG/PNG/WebP, maksimal 5 MB; browser juga memeriksa signature dan decode gambar serta batas 40 megapiksel |

HTML dibersihkan saat ditempel dan sebelum dikirim. Validasi browser membantu pengguna; pembatasan server tetap dibutuhkan karena request dapat dibuat langsung melalui API.

Path gambar berbentuk `submissions/<uuid>/cover.<ext>`, tanpa overwrite. Jika koneksi terputus, fingerprint isian dan gambar membantu memakai kembali percobaan yang sama. Index database `tumbuh_submission_cover_unique` mencegah kiriman ganda untuk path yang sama. Respons duplikat upload diperiksa dengan hash isi gambar, tidak langsung dianggap sukses.

Form dibersihkan hanya setelah server mengonfirmasi kiriman. Jika INSERT gagal setelah upload, isian dan metadata retry dipertahankan. File yang tidak pernah direferensikan artikel dapat menjadi gambar yatim dan perlu dibersihkan pengelola melalui Storage API berizin.

**Simpan Draf** pada form publik hanya menyimpan teks di browser. Gambar harus dipilih ulang saat melanjutkan draf. Draf ini tidak masuk dashboard admin dan tidak menjadi status `draft` pada tabel.

## Penggunaan admin

1. Buka [halaman admin](https://www.ayotumbuh.my.id/admin/) dan login menggunakan akun yang UUID-nya sudah terdaftar pada `admin_users.user_id`.
2. Dashboard dimulai dari filter **Menunggu tinjauan**. Filter lain: **Semua artikel**, **Terbit**, dan **Ditolak**.
3. Pilih **Tinjau artikel lengkap** untuk membaca isi dan sampul. Dialog gambar utuh membantu melihat bagian yang mungkin terpotong pada cover.
4. Untuk memperbaiki typo/format, pilih **Edit Artikel**, revisi judul/subjudul/isi, lalu **Simpan Revisi**.
5. Pilih **Setujui** untuk menerbitkan, **Tolak** untuk menolak, atau **Hapus Artikel** untuk menghapus permanen setelah konfirmasi.
6. Gunakan **Logout** untuk mengakhiri sesi pada browser tersebut.

| Aksi | Pengaruh pada data |
| --- | --- |
| Simpan Revisi | Mengubah `title`, `subtitle`, `content`; status, penulis, email, dan sampul dipertahankan |
| Setujui | Status menjadi `published` |
| Tolak | Status menjadi `rejected` |
| Hapus Artikel | Baris artikel dihapus; gambar Storage tidak otomatis dihapus |

Revisi artikel pending tetap membutuhkan keputusan penerbitan. Revisi artikel yang sudah published berlaku pada halaman publik ketika data dimuat ulang. Tombol draf pada pratinjau masih dinonaktifkan; filter Draf sudah dihapus.

Editor meminta konfirmasi bila pembatalan membuang perubahan. Kegagalan penyimpanan biasa mempertahankan isian. Saat kembali ke tab, sesi diverifikasi dan revisi sementara hanya dipulihkan untuk UUID admin yang sama. Logout/sesi tidak sah membersihkan data editor.

Artikel dibaca ulang sebelum revisi disimpan untuk mendeteksi perubahan sejak editor dibuka. Skema belum mempunyai kolom versi atau penguncian transaksi penyuntingan; dua penyimpanan isi yang tepat bersamaan masih bisa saling menimpa. Hindari merevisi artikel yang sama secara serentak dari beberapa tab/admin.

## Konfigurasi dan keamanan Supabase

Proyek yang digunakan: **ayotumbuh** (`fbvsuugeiagceijnioqw`). Konfigurasi browser berada di [js/supabase-config.js](js/supabase-config.js).

| Properti | Fungsi |
| --- | --- |
| `url` | URL dasar `https://fbvsuugeiagceijnioqw.supabase.co`, tanpa `/rest/v1/` |
| `publishableKey` | Key frontend publik untuk mengakses API sesuai izin RLS |
| `adminUserIdColumn` | `user_id`, kolom UUID pengguna pada tabel admin |

Project URL dan publishable/anon key memang dapat dibaca pengunjung. **Secret key, service_role key, password admin, dan password database tidak boleh dimasukkan ke frontend atau repository.** Jika kredensial rahasia pernah dibagikan, cabut/ganti melalui pengaturan layanan terkait; menghapus teks dari file saja tidak mencabut key.

Untuk mengganti konfigurasi, ambil Project URL melalui bagian Connect/Data API dan publishable key melalui API Keys pada dashboard Supabase. Jangan mengganti proyek atau bucket yang sudah digunakan tanpa migrasi data dan pemeriksaan policy.

### Struktur data yang digunakan aplikasi

Tabel `public.articles`:

| Kolom | Tipe | Penggunaan |
| --- | --- | --- |
| `id` | int8, primary key/identity | Identitas artikel; JavaScript membacanya sebagai string agar tidak kehilangan presisi |
| `created_at` | timestamptz | Tanggal dan pengurutan |
| `author_name` | text | Nama penulis |
| `author_email` | text, opsional | Kontak penulis, hanya diperlukan pada pratinjau admin |
| `title` | text | Judul |
| `subtitle` | text | Ringkasan/subjudul |
| `content` | text | HTML isi artikel yang dibersihkan sebelum ditampilkan |
| `cover_image_path` | text | Path objek sampul di Storage |
| `status` | text | `pending`, `published`, atau `rejected` |

Tabel `public.admin_users` memakai `user_id` untuk mencocokkan UUID akun Supabase Auth. Bucket yang digunakan adalah `articles-images`, dengan akses public untuk URL gambar serta batas ukuran/format sesuai konfigurasi server.

### Pembatasan akses

- Pengunjung dapat mengirim artikel pending dan membaca artikel published melalui client publik terpisah.
- Query publik tidak meminta email penulis; grants kolom harus tetap mencegah akses email melalui API langsung.
- Admin diperiksa melalui keberadaan sesi, `getUser()` ke Auth server, lalu membership `admin_users`.
- Membaca data admin serta UPDATE/DELETE harus tetap dilindungi RLS. Menyembunyikan elemen halaman tidak menggantikan perlindungan database.
- Role frontend tidak boleh bisa mengubah `admin_users` untuk mengangkat dirinya sendiri sebagai admin.
- Revisi membutuhkan izin UPDATE `title`, `subtitle`, `content`; keputusan status membutuhkan UPDATE `status`.
- Gambar dalam public bucket dapat diakses melalui URL, termasuk sampul artikel pending. Jangan memasukkan informasi rahasia ke gambar atau nama objek.

SDK resmi Supabase **2.119.0** dan DOMPurify **3.4.17** disimpan di `js/vendor/`. Versi, lisensi, dan hash file dicatat pada `sources.json`; pertahankan catatan tersebut saat memperbarui library.

## Penyimpanan browser dan privasi

| Penyimpanan | Isi dan tujuan |
| --- | --- |
| `sessionStorage`: `tumbuh-growth-input-v1` | Input anak dan tanggal pemeriksaan untuk halaman hasil pada sesi tab |
| `sessionStorage`: `tumbuh-opened` | Penanda intro website sudah diputar |
| `sessionStorage`: `tumbuh-submission-attempt-v1` | Fingerprint/path/waktu/status upload untuk retry kiriman |
| `localStorage`: `tumbuh-submission-draft-v1` | Draf teks formulir publik, termasuk isian penulis/email bila diisi |
| Penyimpanan sesi SDK Supabase | Token sesi admin sesuai mekanisme SDK; membership tetap diverifikasi ke server |
| Memori halaman | Snapshot dan revisi admin yang belum disimpan; tidak dijadikan draf permanen |

Data anak tidak dikirim oleh alur pemeriksaan ke Supabase atau API prediksi. Supabase menerima data formulir artikel dan gambar ketika pengunjung mengirimnya. Menghapus penyimpanan browser dapat menghilangkan draf, data sesi pemeriksaan, atau sesi login, tetapi tidak menghapus artikel yang sudah tersimpan di server.

## Tampilan, loading, dan navigasi

- HTML menyimpan struktur; CSS mengatur tampilannya; JavaScript menghubungkan interaksi dan data.
- `style.css` memuat aturan dasar serta penyesuaian desain berurutan. Pada selector dengan prioritas setara, aturan di bawah dapat menimpa aturan sebelumnya.
- Skeleton shimmer menandai request artikel yang berjalan, lalu diganti konten dengan fade-in. Skeleton tidak mempercepat request, tetapi memberi umpan balik visual selama menunggu.
- Overlay pembukaan dan analisis diatur `loading.js`; animasi scroll dikoordinasikan `aos-tumbuh.js`.
- Pengaturan `prefers-reduced-motion` mengurangi animasi. Font Inter disediakan bersama lisensinya di repository.
- Setiap rute utama mempunyai `index.html` di foldernya sehingga URL bersih dapat dibuka langsung dan di-refresh pada GitHub Pages.
- Tautan navigasi langsung menuju URL folder. Alias `.html` lama mengalihkan secara inline sambil mempertahankan query/hash; tautan manual tersedia saat JavaScript dimatikan.
- Jalur relatif mendukung custom domain dan penempatan di subfolder `/tumbuh/`.

Acuan desain: [Figma TUMBUH](https://www.figma.com/design/167KzjdOtNG2fEY8wGrC0f/tumbuh.?node-id=0-1). Halaman hasil kini menampilkan inferensi model asli yang terintegrasi.

## Pemeliharaan dan publikasi perubahan

Website aktif menggunakan GitHub Pages dengan sumber branch `main`, folder `/ (root)`, serta custom domain pada `CNAME`.

1. Ubah file sumber yang sesuai; gunakan tabel panduan kode untuk menemukan tempatnya.
2. Periksa perubahan, tautan aset, dan sintaks. Pertahankan ID elemen yang dipakai JavaScript serta urutan dependensi script.
3. Commit dan push perubahan ke repository setelah siap dipublikasikan.
4. Periksa workflow **pages build and deployment** pada GitHub Actions. Push berhasil belum membuktikan deployment sudah selesai.
5. Setelah deployment sukses, periksa halaman aktif dan muat ulang browser jika masih menggunakan cache lama.

Perubahan file website tidak otomatis mengubah database atau policy Supabase. Pengaturan tersebut tetap dikelola pada Supabase. Jangan mengubah DNS atau `CNAME` hanya untuk memperbaiki fitur halaman.

Untuk pembaruan model, ikuti [panduan konversi](model/README.md) dan publikasikan manifest/bobot sebagai paket yang sesuai. Script exporter merupakan alat pemeliharaan; tidak dibutuhkan pengunjung dan tidak berfungsi sebagai backend website.

## Pemeriksaan dan pemecahan masalah

### Checklist setelah perubahan fitur

- Pemeriksaan anak: input valid, input tidak valid, halaman hasil tanpa sesi, refresh hasil, dan kegagalan memuat model.
- Artikel publik: pending tidak terlihat, published muncul, pencarian/pagination bekerja, dan detail memuat isi serta gambar yang benar.
- Pengiriman: validasi gambar, status pending, pesan sukses hanya setelah server menerima, serta retry ketika koneksi gagal.
- Admin: login valid/salah/non-admin, akses URL tanpa login, refresh, logout, dan pembatasan operasi melalui API.
- Revisi: simpan lalu refresh, batal, format, status tetap, dan isian tidak hilang pada error penyimpanan biasa.
- Publikasi/hapus: perubahan terlihat kembali setelah data dimuat ulang; pengunjung tidak mendapat hak UPDATE/DELETE.
- Tampilan: navigasi mobile, skeleton/error/empty state, fokus dialog, dan reduced motion.

### Masalah umum

| Gejala | Yang diperiksa |
| --- | --- |
| Admin kembali ke login | Sesi Auth, verifikasi akun, UUID `admin_users.user_id`, serta izin SELECT membership |
| Error `42501` | Grants kolom/tabel dan policy RLS untuk operasi yang ditolak; jangan mematikan RLS |
| Revisi ditolak tetapi penerbitan bisa | Hak UPDATE `title`, `subtitle`, `content` mungkin berbeda dari hak UPDATE `status` |
| Artikel sudah berubah saat editor terbuka | Simpan salinan revisi, tutup editor, lalu muat ulang versi terbaru sebelum melanjutkan |
| Artikel tidak tampil publik | Status harus published; periksa izin SELECT kolom aman serta respons query |
| Upload gagal | Bucket, MIME, batas 5 MB, policy INSERT Storage, dan koneksi |
| Model gagal dimuat | Manifest/bobot tersedia, nama file sesuai, hash cocok, dan halaman menggunakan HTTPS |
| Model berhasil tetapi hasil perlu ditinjau | Periksa satuan, usia, urutan fitur, encoding Gender, scaler, serta evaluasi model sumber |
| Perubahan belum muncul online | Pastikan commit sudah di-push, deployment berhasil, dan browser tidak memakai versi cache lama |

Verifikasi model yang sudah didokumentasikan: **128 input sintetis × tiga keluaran** cocok kelasnya dengan Keras asli, dengan selisih probabilitas maksimum sekitar `0.00000724`. Ini membuktikan kesetaraan konversi pada input uji, bukan akurasi medis. Sebelum folder tes dibersihkan, 30 skenario browser simulasi untuk alur yang tersedia saat itu lulus. Fitur revisi admin ditambahkan sesudahnya dan pengujian fungsionalnya diserahkan kepada pemilik; jangan menganggap suite lama sudah menguji fitur revisi.

## Batasan dan dokumentasi lanjutan

- Model memprediksi kategori hasil training; tidak menghitung z-score WHO baru dan tidak menggantikan pemeriksaan tenaga kesehatan.
- Fitur admin belum menyediakan riwayat revisi, pemulihan artikel terhapus, atau penguncian transaksi untuk editor serentak.
- Penyuntingan saat ini mencakup judul, subjudul, dan isi; pergantian sampul/identitas penulis belum disediakan melalui editor admin.
- Pengiriman anonim membutuhkan pemantauan penyalahgunaan. Perlindungan spam/CAPTCHA dan rate limit server merupakan pekerjaan lanjutan; tombol loading bukan pembatas frekuensi request di server.
- Pembersihan gambar yatim dilakukan melalui akses Storage yang sah, bukan dengan membuka hak DELETE anonim.

Panduan lebih lanjut:

- [Operasional admin dan keamanan Supabase](docs/supabase-admin.md)
- [Pengiriman publik, retry, dan pemeliharaan gambar](docs/supabase-submissions.md)
- [Model, preprocessing, konversi, dan verifikasi](model/README.md)
