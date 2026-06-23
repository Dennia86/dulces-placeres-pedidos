const CACHE = 'dp-v4';
const FILES = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // El documento HTML (la app misma) SIEMPRE se pide a la red primero.
  // Así nunca vuelve a quedar "pegado" en una versión vieja cacheada.
  if (req.mode === 'navigate' || req.url.endsWith('/') || req.url.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Firebase / Google APIs: siempre red, sin caché
  if (req.url.includes('firebase') || req.url.includes('googleapis')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Resto de archivos estáticos (íconos, manifest): caché primero, red de respaldo
  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
