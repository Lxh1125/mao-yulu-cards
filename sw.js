const CACHE = 'zhixing-static-v4';
const FILES = ['./','./index.html','./style.css','./script.js','./data.js','./manifest.webmanifest','./landscapes.js','./assets/photos/great-wall.jpg','./assets/photos/huangshan.jpg','./assets/photos/guilin.jpg','./assets/photos/dunhuang.jpg','./assets/photos/west-lake.jpg','./assets/icon.svg','./assets/apple-touch-icon.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('zhixing-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // Keep one coherent asset version; newer workers activate after existing tabs close.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(error => {
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    throw error;
  })));
});
