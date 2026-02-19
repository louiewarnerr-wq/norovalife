const CACHE = "norovalife-v3";
const ASSETS = [
  "/", "/index.html", "/styles.css", "/app.js",
  "/data/countries.js", "/data/events.js",
  "/manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
