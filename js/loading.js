/**
 * Overlay pembukaan situs dan indikator analisis model.
 * File dipanggil dari head untuk menyiapkan kelas loading sebelum konten halaman terlihat.
 */
/* TUMBUH — layar loading Draft 4.6. Frontend-only, tanpa hasil prediksi buatan. */
(function () {
  "use strict";

  const scriptURL = document.currentScript
    ? document.currentScript.src
    : location.href;
  const logoURL = new URL("../assets/logo-tumbuh.png", scriptURL).href;
  const params = new URLSearchParams(location.search);
  const forcePreview = params.get("previewLoading") === "1";
  let sessionHasOpened = false;
  try {
    sessionHasOpened = sessionStorage.getItem("tumbuh-opened") === "1";
  } catch (_) {}
  const shouldPlayIntro = forcePreview || !sessionHasOpened;
  if (shouldPlayIntro) document.documentElement.classList.add("tumbuh-preload");

  const EXIT_DURATION = 280; // Figma: dissolve 280 ms.
  let overlay = null;
  let running = false;

  /**
   * Promise jeda animasi; tidak menentukan atau memalsukan hasil pemeriksaan.
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Mencatat bahwa intro sudah diputar pada sesi tab ini.
   */
  function markOpened() {
    try {
      sessionStorage.setItem("tumbuh-opened", "1");
    } catch (_) {}
  }
  /**
   * Membangun DOM overlay satu kali dan menggunakan ulang elemen yang sama untuk pemuatan berikutnya.
   */
  function buildOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "tumbuh-loader";
    overlay.className = "tumbuh-loader";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "TUMBUH sedang memuat");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="loader-vignette" aria-hidden="true"></div>
      <div class="loader-scene">
        <span class="loader-glow loader-glow--emerald" aria-hidden="true"></span>
        <span class="loader-glow loader-glow--navy" aria-hidden="true"></span>
        <span class="loader-glow loader-glow--broad" aria-hidden="true"></span>
        <div class="loader-emblem" aria-hidden="true">
          <span class="loader-ring loader-ring--soft"></span>
          <span class="loader-ring loader-ring--outer"></span>
          <span class="loader-ring loader-ring--backing"></span>
          <img src="${logoURL}" alt="" class="loader-logo" />
        </div>
        <p class="loader-eyebrow loader-reveal">TEMAN SETIAP CERITA PERTUMBUHAN</p>
        <div class="loader-track" aria-hidden="true"><span class="loader-fill"></span></div>
        <p class="loader-wordmark" aria-label="TUMBUH.">
          <span class="loader-letter" style="--i:0" aria-hidden="true">T</span>
          <span class="loader-letter" style="--i:1" aria-hidden="true">U</span>
          <span class="loader-letter" style="--i:2" aria-hidden="true">M</span>
          <span class="loader-letter" style="--i:3" aria-hidden="true">B</span>
          <span class="loader-letter" style="--i:4" aria-hidden="true">U</span>
          <span class="loader-letter" style="--i:5" aria-hidden="true">H</span>
          <span class="loader-letter" style="--i:6" aria-hidden="true">.</span>
        </p>
        <p class="loader-caption loader-reveal" id="tumbuh-loading-caption">Menyiapkan ruang untuk tumbuh bersama</p>
        <p class="loader-whisper loader-reveal">SETIAP LANGKAH KECIL BERARTI</p>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }
  /**
   * Menyiapkan overlay untuk startup/prediction dan mengulang animasi dari awal.
   */
  function present(mode) {
    const element = buildOverlay();
    element.classList.remove("is-exiting", "is-animating");
    element.style.display = "block"; // harus terlihat sebelum animasi diulang
    element.classList.toggle("is-prediction", mode === "prediction");
    element.classList.remove("has-progress");
    element.querySelector("#tumbuh-loading-caption").textContent =
      mode === "prediction"
        ? "Sedang memprediksi pertumbuhan anak..."
        : "Menyiapkan ruang untuk tumbuh bersama";
    element.setAttribute(
      "aria-label",
      mode === "prediction"
        ? "Sedang memprediksi pertumbuhan anak"
        : "Menyiapkan website TUMBUH",
    );
    element.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("tumbuh-is-loading");
    document.documentElement.classList.remove("tumbuh-preload");
    // Reflow mengulang animasi dari 0, termasuk setelah startup untuk mode prediksi.
    void element.offsetWidth;
    element.classList.add("is-animating");
    return element;
  }
  /**
   * Menjalankan animasi keluar, melepas penguncian halaman, lalu memberi sinyal agar AOS dapat mulai.
   */
  async function dismiss() {
    if (!overlay) return;
    overlay.classList.add("is-exiting");
    await sleep(EXIT_DURATION);
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-animating", "is-exiting");
    document.documentElement.classList.remove(
      "tumbuh-is-loading",
      "tumbuh-preload",
    );
    document.dispatchEvent(new CustomEvent("tumbuh:loader-dismissed"));
    overlay.style.display = "none";
    running = false;
  }
  async function run(mode, task) {
    if (running) return null;
    running = true;
    present(mode);
    try {
      return await task();
    } finally {
      await dismiss();
    }
  }

  function showPredictionProgress(text, percent) {
    if (!running || !overlay?.classList.contains("is-prediction")) return;
    overlay.querySelector("#tumbuh-loading-caption").textContent = text;
    overlay.classList.toggle("has-progress", percent != null);
    if (percent != null) overlay.querySelector(".loader-fill").style.width = percent + "%";
  }
  window.TumbuhLoader = { run, showPredictionProgress, isRunning: () => running };
  if (!shouldPlayIntro) return;

  // Rekam juga aset cache yang selesai sebelum parser mencapai akhir dokumen.
  const settled = new WeakSet();
  let update = () => {};
  function onResource(event) {
    settled.add(event.target);
    update();
  }
  document.addEventListener("load", onResource, true);
  document.addEventListener("error", onResource, true);

  function start() {
    if (document.readyState === "loading") return;
    document.removeEventListener("readystatechange", start);
    run("startup", async () => {
      const resources = [...document.querySelectorAll(
        'script[src], link[rel~="stylesheet"][href], img[src]:not([loading="lazy"])'
      )];
      const fill = overlay.querySelector(".loader-fill");
      const caption = overlay.querySelector("#tumbuh-loading-caption");
      function display(percent) {
        fill.style.width = percent + "%";
        caption.textContent = "Memuat halaman · " + percent + "%";
      }
      // Satu langkah terakhir untuk aset lain yang ditunggu oleh window.load.
      update = () => {
        const done = resources.filter(item => settled.has(item) || item.complete === true);
        display(Math.floor(100 * done.length / (resources.length + 1)));
      };
      update();
      if (document.readyState !== "complete") {
        await new Promise(resolve => window.addEventListener("load", resolve, { once: true }));
      }
      document.removeEventListener("load", onResource, true);
      document.removeEventListener("error", onResource, true);
      update = () => {};
      display(100);
    }).then(markOpened);
  }
  document.addEventListener("readystatechange", start);
  start();
})();
