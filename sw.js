// Sube este número cada vez que publiques una versión nueva (v2, v3...)
const VERSION = "v1";
const CACHE = "rutabot-" + VERSION;

// Archivos propios
const LOCALES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-48.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-120.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-167.png",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// Librerías externas que usa index.html (se guardan para uso sin conexión)
const EXTERNOS = [
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@600;800;900&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2",
  "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCALES);
    // Los externos no deben impedir la instalación si alguno falla
    await Promise.allSettled(EXTERNOS.map(async (url) => {
      const resp = await fetch(url, { mode: "cors" });
      if (resp.ok) await cache.put(url, resp);
    }));
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith("http")) return;
  const url = new URL(req.url);

  // Archivos propios: responde al instante desde la caché y se actualiza en segundo plano
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(req, { ignoreSearch: true });
      const red = fetch(req).then((resp) => {
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      }).catch(() => null);
      if (guardado) { e.waitUntil(red); return guardado; }
      const resp = await red;
      if (resp) return resp;
      if (req.mode === "navigate") return cache.match("./index.html");
      return Response.error();
    })());
    return;
  }

  // Librerías y fuentes externas: caché primero, y se guardan al descargarse
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(req);
    if (guardado) return guardado;
    try {
      const resp = await fetch(req);
      if (resp.ok || resp.type === "opaque") cache.put(req, resp.clone());
      return resp;
    } catch (err) {
      return Response.error();
    }
  })());
});
