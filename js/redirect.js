// Tautan .html lama tetap membuka halaman baru dengan ID dan tujuan scroll utuh.
(() => {
  const link = document.getElementById("redirect-link");
  if (!link) return;
  const destination = new URL(link.href);
  destination.search = location.search;
  destination.hash = location.hash;
  link.href = destination.href;
  location.replace(destination.href);
})();
