const CACHE = 'rog-v10';
const OFFLINE_URL = '/offline.html';
const ASSETS = [
  '/', '/index.html', '/style.css?v=14', '/script.js?v=15',
  '/manifest.webmanifest', OFFLINE_URL
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req=e.request; const url=new URL(req.url);
  if(req.method!=='GET' || url.pathname.startsWith('/chat')) return;

  if(req.mode==='navigate'){ e.respondWith(fetch(req).catch(()=>caches.match(OFFLINE_URL))); return; }

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp=>{
      const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(req, copy)); return resp;
    }).catch(()=>cached))
  );
});
