# Model pertumbuhan TUMBUH

Website menggunakan bobot `model_tumbuh.keras` dan preprocessing `scaler_tumbuh.pkl` yang disediakan pemilik. Model tidak dilatih ulang. Konfigurasi diverifikasi dari [notebook Colab pemilik](https://colab.research.google.com/drive/1T8Fb687MnmcojKM0AwS7QSyGtumRQ47o): pemetaan Gender pada sel 24, standardisasi final pada sel 58, dan penyimpanan artefak pada sel 65.

## Input dan keluaran

Urutan input: `Gender`, `Age (Month)`, `Weight`, `Height`.

- Gender: laki-laki `1`, perempuan `0`; tidak distandardisasi.
- Usia: bulan penuh dari tanggal lahir sampai tanggal pemeriksaan.
- Berat: kilogram; tinggi: sentimeter.
- Hanya usia, berat, dan tinggi yang distandardisasi dengan `(nilai - mean_) / scale_`, kemudian dikonversi ke float32 seperti pada training.
- Batas formulir tetap 0–60 bulan, 1–45 kg, dan 35–130 cm. Batas input ini bukan bukti akurasi model pada seluruh kombinasi nilai tersebut.

Arsitektur: Dense 128 ReLU → Dense 64 ReLU → tiga keluaran Softmax. Nama keluaran menjadi acuan pemetaan, bukan posisi kartu di halaman:

| Head | Indeks | Label sesuai urutan `labels.json` |
| --- | --- | --- |
| BBU | BB/U | Malnutrition, Normal, Overnutrition, Underfed |
| TBU | TB/U | Not Stunted, Stunted |
| BBTB | BB/TB | Normal, Obese, Thin, Very Thin |

Label asli ditampilkan untuk mempertahankan makna kelas training. UI tidak menyajikan probabilitas sebagai persentase akurasi atau diagnosis medis. Tidak ada perhitungan z-score baru atau perubahan label model.

## Berkas yang digunakan

- `browser-model.json`: arsitektur, preprocessing, urutan label, dan hash sumber.
- `weights-*.bin`: bobot float32 little-endian, 38.184 byte. Nama mengandung hash supaya pembaruan model tidak tercampur dengan cache bobot lama.
- `../js/growth-model.js`: operasi Dense, ReLU, dan Softmax di browser. Bobot diperiksa dengan SHA-256 sebelum digunakan.
- Empat berkas asli (`.keras`, `.pkl`, features, labels) dan `export_browser.py` dipertahankan untuk pembaruan model; tidak diunduh oleh halaman pemeriksaan.

Halaman hasil memuat model hanya jika ada input valid dalam sessionStorage. Analisis ulang saat refresh memakai input tersebut. Data anak tidak dikirim ke Supabase atau layanan prediksi. Pengunduhan aset model tetap membutuhkan koneksi; jika gagal, UI menampilkan pesan dan tombol coba lagi, tanpa hasil contoh.

## Memperbarui model

Ganti keempat artefak asli sebagai satu paket yang berasal dari training yang sama. Jika urutan fitur, encoding Gender, lapisan, atau label berubah, sesuaikan exporter dan validasi JavaScript; jangan hanya mengganti nama file.

Konversi dijalankan lokal, bukan di GitHub Pages. Contoh lingkungan terpisah:

```sh
python3 -m venv /tmp/tumbuh-model-env
/tmp/tumbuh-model-env/bin/pip install keras==3.13.2 'jax[cpu]' numpy h5py joblib
KERAS_BACKEND=jax /tmp/tumbuh-model-env/bin/python model/export_browser.py
```

Perintah dijalankan dari root repository. Exporter hanya menerima scaler StandardScaler dengan objek numpy yang diizinkan dan model Dense yang didukung. Setelah ekspor, sertakan manifest dan bobot baru saat publikasi; bobot versi sebelumnya boleh dibersihkan setelah versi baru aktif. Website tidak membutuhkan instalasi Python, Node, atau backend untuk prediksi.

## Verifikasi integrasi

Pada 9 November 2026, 128 input sintetis dibandingkan antara browser dan model Keras 3.13.2 asli menggunakan backend JAX. Ketiga kelas keluaran cocok pada seluruh input; selisih absolut probabilitas maksimum `0.000007241964340209961` (toleransi `0.00002`). Ini pemeriksaan kesetaraan implementasi, bukan validasi akurasi medis atau uji dataset independen.

Pemeriksaan browser juga lulus untuk input kosong/tidak valid, formulir sampai hasil, refresh, base path `/tumbuh/`, layar mobile, kegagalan jaringan dan retry, serta penolakan bobot rusak. Alat uji dan screenshot disimpan di folder sementara di luar repository, sesuai permintaan agar proyek tidak dipenuhi file pengujian.

Referensi operasi: [Keras Dense](https://keras.io/api/layers/core_layers/dense/) dan [StandardScaler](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.StandardScaler.html).
