/**
 * Service Worker для энциклопедии «Во Все Хуёвые»
 * Поддерживает кэширование shell/ассетов и автономную работу (PWA).
 */
const CACHE_NAME = 'vvh-wiki-v2.6';

const PRECACHE_PATHS = [
  '',
  'css/style.css?v=2.6',
  'js/data.js?v=2.6',
  'js/app.js?v=2.6',
  'manifest.webmanifest',
  'assets/favicon-32.png',
  'assets/favicon-192.png',
  'assets/apple-touch-icon.png',
  'assets/valentin-thumb.webp',
  'assets/valentin.webp',
  'assets/gusev-thumb.webp',
  'assets/gusev.webp',
  'assets/gey-himbiovech-thumb.webp',
  'assets/gey-himbiovech.webp',
  'assets/valentin.jpg',
  'assets/gusev.jpg',
  'assets/gey-himbiovech.jpg'
];

self.addEventListener('install', (event) => {
  const scopeUrl = self.registration.scope;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urls = PRECACHE_PATHS.map((p) => new URL(p, scopeUrl).toString());
      return Promise.allSettled(
        urls.map((u) => cache.add(u).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith('vvh-wiki-'))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  let reqUrl;
  try {
    reqUrl = new URL(request.url);
  } catch (e) {
    return;
  }

  if (reqUrl.origin !== self.location.origin) {
    return;
  }

  // Навигационные запросы: сначала сеть, при офлайне — кэш или корневая страница
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match(new URL('', self.registration.scope).toString());
          })
        )
    );
    return;
  }

  // Статические ресурсы: кэш с фоновым обновлением (stale-while-revalidate)
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
