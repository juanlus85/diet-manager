// Service Worker básico para soporte PWA offline
const CACHE_NAME = 'dieta-v1';

// Al instalar, cachear los recursos estáticos principales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/pwa-icon-192.png',
        '/pwa-icon-512.png',
      ]);
    })
  );
  self.skipWaiting();
});

// Al activar, limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: Network first, fallback a caché para navegación
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo interceptar peticiones al mismo origen
  if (url.origin !== location.origin) return;

  // Para peticiones de API, siempre ir a la red
  if (url.pathname.startsWith('/api/')) return;

  // Para navegación (HTML), intentar red primero, luego caché
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((r) => r || fetch(event.request))
      )
    );
    return;
  }

  // Para assets estáticos, caché primero
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
