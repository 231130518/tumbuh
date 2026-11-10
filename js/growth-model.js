/**
 * Mesin prediksi kecil untuk arsitektur Dense yang diekspor dari Keras.
 * Hanya aset model yang diunduh; data anak diproses pada perangkat pengunjung.
 */
/* Inferensi Dense/ReLU/Softmax dari bobot Keras asli, seluruhnya di browser. */
(() => {
  "use strict";
  const modelRoot = new URL("../model/", document.currentScript.src);
  const FEATURES = ["Gender", "Age (Month)", "Weight", "Height"];
  let pendingModel;

  /**
   * Menolak input yang tidak sesuai pilihan jenis kelamin serta batas umur/berat/tinggi formulir.
   */
  function validateInput(input) {
    if (!input || !["male", "female"].includes(input.sex) ||
        !Number.isInteger(input.age) || input.age < 0 || input.age > 60 ||
        !Number.isFinite(input.weight) || input.weight < 1 || input.weight > 45 ||
        !Number.isFinite(input.height) || input.height < 35 || input.height > 130) {
      throw new Error("Data pemeriksaan tidak valid. Periksa usia, jenis kelamin, berat, dan tinggi anak.");
    }
  }

  /**
   * Mengunduh manifest JSON atau bobot biner dengan timeout.
   * Manifest dicek ulang ke server; nama berkas bobot mengandung hash untuk menghindari cache versi campur.
   */
  async function fetchAsset(url, json = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: json ? "no-cache" : "default" });
      if (!response.ok) throw new Error("Model belum dapat dimuat. Periksa koneksi, lalu coba lagi.");
      return await (json ? response.json() : response.arrayBuffer());
    } finally { clearTimeout(timer); }
  }

  /**
   * Memeriksa format manifest, preprocessing, SHA-256 bobot, dimensi lapisan, dan keluaran model.
   * Jika ada ketidakcocokan, model tidak dijalankan agar hasil tidak berasal dari aset yang rusak.
   */
  async function loadModel() {
    const manifest = await fetchAsset(new URL("browser-model.json", modelRoot), true);
    const invalid = () => { throw new Error("Berkas model tidak cocok atau rusak. Hubungi pengelola TUMBUH."); };
    if (manifest.format !== "tumbuh-dense-v1" ||
        JSON.stringify(manifest.features) !== JSON.stringify(FEATURES) ||
        manifest.genderEncoding?.male !== 1 || manifest.genderEncoding?.female !== 0 ||
        JSON.stringify(manifest.scaler?.features) !== JSON.stringify(FEATURES.slice(1)) ||
        manifest.scaler.mean?.length !== 3 || manifest.scaler.scale?.length !== 3 ||
        !manifest.scaler.mean.every(Number.isFinite) ||
        !manifest.scaler.scale.every((value) => Number.isFinite(value) && value > 0) ||
        !/^[a-f0-9]{64}$/.test(manifest.modelId || "") ||
        !/^weights-[a-f0-9]{16}\.bin$/.test(manifest.weights?.file || "") ||
        !/^[a-f0-9]{64}$/.test(manifest.weights?.sha256 || "")) invalid();
    const buffer = await fetchAsset(new URL(manifest.weights.file, modelRoot));
    if (!buffer.byteLength || buffer.byteLength % 4 || buffer.byteLength !== manifest.weights.bytes) invalid();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      (value) => value.toString(16).padStart(2, "0")).join("");
    if (digest !== manifest.weights.sha256) invalid();
    const view = new DataView(buffer);
    const weights = new Float32Array(buffer.byteLength / 4);
    for (let i = 0; i < weights.length; i += 1) {
      weights[i] = view.getFloat32(i * 4, true);
      if (!Number.isFinite(weights[i])) invalid();
    }
    /**
     * Ukuran output setiap lapisan disimpan untuk memvalidasi koneksi dan offset bobot sebelum inferensi.
     */
    const shapes = new Map([["input_layer", 4]]);
    if (!Array.isArray(manifest.layers) || manifest.layers.length !== 5) invalid();
    let offset = 0;
    for (const layer of manifest.layers) {
      if (shapes.has(layer.name) || shapes.get(layer.input) !== layer.inputSize ||
          !Number.isInteger(layer.units) || layer.units < 1 || layer.units > 256 ||
          !["relu", "softmax"].includes(layer.activation) ||
          layer.kernelOffset !== offset) invalid();
      offset += layer.inputSize * layer.units;
      if (layer.biasOffset !== offset) invalid();
      offset += layer.units;
      if (offset > weights.length) invalid();
      shapes.set(layer.name, layer.units);
    }
    if (offset !== weights.length || !Array.isArray(manifest.outputs) || manifest.outputs.length !== 3) invalid();
    const expected = { BBU: 4, TBU: 2, BBTB: 4 };
    const heads = new Set();
    for (const output of manifest.outputs) {
      if (!expected[output.name] || heads.has(output.name) ||
          shapes.get(output.name) !== expected[output.name] ||
          !Array.isArray(output.labels) || output.labels.length !== expected[output.name] ||
          !output.labels.every((label) => typeof label === "string" && label.length > 0) ||
          manifest.layers.find((layer) => layer.name === output.name)?.activation !== "softmax") invalid();
      heads.add(output.name);
    }
    return { manifest, weights };
  }

  /**
   * Menyimpan Promise pemuatan supaya request paralel berbagi model yang sama.
   * Jika gagal, cache Promise dihapus agar tombol retry dapat mencoba unduhan baru.
   */
  function getModel() {
    if (!pendingModel) pendingModel = loadModel().catch((error) => {
      pendingModel = null; // Retry boleh memuat kembali setelah jaringan pulih.
      if (error.name === "AbortError" || error instanceof TypeError) {
        throw new Error("Model belum dapat dimuat. Periksa koneksi, lalu coba lagi.");
      }
      throw error;
    });
    return pendingModel;
  }

  /**
   * Menghitung input × kernel + bias, kemudian ReLU atau Softmax.
   * Softmax dikurangi logit maksimum sebelum eksponensial untuk menjaga kestabilan numerik.
   */
  function dense(input, layer, weights) {
    const output = new Float32Array(layer.units);
    for (let j = 0; j < layer.units; j += 1) {
      let value = weights[layer.biasOffset + j];
      for (let i = 0; i < input.length; i += 1) {
        value += input[i] * weights[layer.kernelOffset + i * layer.units + j];
      }
      output[j] = Math.fround(value);
      if (layer.activation === "relu") output[j] = Math.max(0, output[j]);
    }
    if (layer.activation === "softmax") {
      const maximum = Math.max(...output);
      const exps = Array.from(output, (value) => Math.exp(value - maximum));
      const total = exps.reduce((sum, value) => sum + value, 0);
      for (let i = 0; i < output.length; i += 1) output[i] = exps[i] / total;
    }
    if (!output.every(Number.isFinite)) throw new Error("Model tidak menghasilkan nilai yang valid. Periksa kembali isian.");
    return output;
  }

  /**
   * Menormalisasi tiga fitur numerik dengan scaler training; Gender tetap 1/0.
   * Menjalankan lapisan sesuai urutan dan memilih indeks probabilitas terbesar pada setiap head.
   */
  async function predict(input) {
    validateInput(input);
    // Salin input agar perubahan isian saat fetch tidak mengubah pemeriksaan ini.
    const raw = [input.age, input.weight, input.height];
    const sex = input.sex;
    const { manifest, weights } = await getModel();
    /**
     * Urutan dan float32 mengikuti input Keras; hanya usia, berat, tinggi memakai mean/scale.
     */
    const vector = new Float32Array([manifest.genderEncoding[sex],
      ...raw.map((value, i) => (value - manifest.scaler.mean[i]) / manifest.scaler.scale[i])]);
    const values = new Map([["input_layer", vector]]);
    for (const layer of manifest.layers) values.set(layer.name, dense(values.get(layer.input), layer, weights));
    const results = {};
    for (const head of manifest.outputs) {
      const probabilities = Array.from(values.get(head.name));
      const classIndex = probabilities.indexOf(Math.max(...probabilities));
      results[head.name] = { label: head.labels[classIndex], classIndex, probabilities };
    }
    return { modelId: manifest.modelId, results };
  }
  window.TumbuhGrowthModel = Object.freeze({ predict });
})();
