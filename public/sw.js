// public/sw.js — Service Worker para PWA Bolão Copa 2026
const CACHE_NAME = 'bolao-2026-v1';
const STATIC_ASSETS = ['/', '/dashboard'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Não cachear chamadas de API
  if (e.request.url.includes('worldcup26.ir') || e.request.url.includes('supabase')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

// Suporte a notificações push
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Bolão Copa 2026', {
      body: data.body || 'Novo aviso do bolão!',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});
