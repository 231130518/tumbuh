/* TUMBUH — layar loading Draft 4.6. Frontend-only, tanpa hasil prediksi buatan. */
(function () {
  'use strict';

  const scriptURL = document.currentScript ? document.currentScript.src : location.href;
  const logoURL = new URL('../assets/logo-tumbuh.png', scriptURL).href;
  const params = new URLSearchParams(location.search);
  const forcePreview = params.get('previewLoading') === '1';
  let sessionHasOpened = false;
  try { sessionHasOpened = sessionStorage.getItem('tumbuh-opened') === '1'; } catch (_) {}
  const shouldPlayIntro = forcePreview || !sessionHasOpened;
  if (shouldPlayIntro) document.documentElement.classList.add('tumbuh-preload');

  const MIN_DURATION = 2320; // Figma: 200 ms jeda + 1350 ms smart animate + 750 ms hold.
  const EXIT_DURATION = 280; // Figma: dissolve 280 ms.
  let overlay = null;
  let running = false;

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function markOpened() {
    try { sessionStorage.setItem('tumbuh-opened', '1'); } catch (_) {}
  }
  function buildOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'tumbuh-loader';
    overlay.className = 'tumbuh-loader';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'TUMBUH sedang memuat');
    overlay.setAttribute('aria-hidden', 'true');
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
  function present(mode) {
    const element = buildOverlay();
    element.classList.remove('is-exiting', 'is-animating');
    element.style.display = 'block'; // harus terlihat sebelum animasi diulang
    element.classList.toggle('is-prediction', mode === 'prediction');
    element.querySelector('#tumbuh-loading-caption').textContent = mode === 'prediction'
      ? 'Sedang memprediksi pertumbuhan anak...'
      : 'Menyiapkan ruang untuk tumbuh bersama';
    element.setAttribute('aria-label', mode === 'prediction' ? 'Sedang memprediksi pertumbuhan anak' : 'Menyiapkan website TUMBUH');
    element.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('tumbuh-is-loading');
    document.documentElement.classList.remove('tumbuh-preload');
    // Reflow mengulang animasi dari 0, termasuk setelah startup untuk mode prediksi.
    void element.offsetWidth;
    element.classList.add('is-animating');
    return element;
  }
  async function dismiss() {
    if (!overlay) return;
    overlay.classList.add('is-exiting');
    await sleep(EXIT_DURATION);
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-animating', 'is-exiting');
    document.documentElement.classList.remove('tumbuh-is-loading', 'tumbuh-preload');
    document.dispatchEvent(new CustomEvent('tumbuh:loader-dismissed'));
    overlay.style.display = 'none';
    running = false;
  }
  async function run(mode, task, options = {}) {
    if (running) return null;
    running = true;
    const current = present(mode);
    current.style.display = 'block';
    const minMs = options.minDurationMs == null ? MIN_DURATION : options.minDurationMs;
    try {
      const [value] = await Promise.all([Promise.resolve().then(task), sleep(minMs)]);
      await dismiss();
      return value;
    } catch (error) {
      await dismiss();
      throw error;
    }
  }
  function waitForWindowLoad() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise(resolve => window.addEventListener('load', resolve, {once: true}));
  }
  window.TumbuhLoader = { run, isRunning: () => running };
  document.addEventListener('DOMContentLoaded', () => {
    if (!shouldPlayIntro) return;
    run('startup', waitForWindowLoad).then(markOpened).catch(() => {
      document.documentElement.classList.remove('tumbuh-is-loading', 'tumbuh-preload');
      document.dispatchEvent(new CustomEvent('tumbuh:loader-dismissed'));
      markOpened();
    });
  }, { once:true });
})();
