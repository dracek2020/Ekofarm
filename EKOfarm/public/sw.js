// EKOfarm – service worker: upozornění do telefonu (Web Push) a mezipaměť obrázků (rychlé načtení podruhé).
const IMG_CACHE = 'ekofarm-img-v21';   // při nové grafice zvýšit číslo
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/img/')) return;
  e.respondWith(caches.open(IMG_CACHE).then(async c => {
    const hit = await c.match(e.request);
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok) c.put(e.request, res.clone());
    return res;
  }));
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(keys => Promise.all(keys.filter(k => k.startsWith('ekofarm-img-') && k !== IMG_CACHE).map(k => caches.delete(k))))
  .then(() => self.clients.claim())));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'EKOfarm', {
    body: d.body || 'Na farmě je něco hotové.', icon: '/img/icon-192.png', badge: '/img/icon-192.png', tag: d.tag || 'ekofarm', renotify: true,
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('/');
  }));
});
