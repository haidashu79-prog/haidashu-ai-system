/* 海大叔站 · 离线加速 Service Worker */
const VER = 'hds-2026-11-12-1';
const ASSET_CACHE = VER + '-assets';
const PAGE_CACHE  = VER + '-pages';
const CORE = ['/assets/site.css', '/assets/p3d-shell.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(ASSET_CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(new Request(u, {cache:'reload'})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(
      ks.filter(k => !k.startsWith(VER)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 页面导航：先网后缓存，网络超时 2.5s 用缓存兜底（回访秒开）
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(PAGE_CACHE);
      const net = fetch(req).then(r => {
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      }).catch(() => null);
      const timeout = new Promise(res => setTimeout(() => res(null), 2500));
      const first = await Promise.race([net, timeout]);
      if (first) return first;
      const hit = await cache.match(req);
      if (hit) return hit;
      const netLater = await net;
      if (netLater) return netLater;
      return new Response('离线中，请稍后重试', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    })());
    return;
  }

  // 静态资源：先缓存，后台静默更新
  if (/\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?|json)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const hit = await cache.match(req);
      const net = fetch(req).then(r => {
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      }).catch(() => null);
      return hit || (await net) || new Response('', {status: 504});
    })());
  }
});
