const CACHE = 'rog-v20';
const OFFLINE_URL = '/offline.html';
const ASSETS = [
  '/', '/index.html', '/style.css?v=24', '/script.js?v=24',
  '/manifest.webmanifest', OFFLINE_URL
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  const req=e.request; const url=new URL(req.url);
  if(req.method!=='GET' || url.pathname.startsWith('/chat')) return;
  if(req.mode==='navigate'){ e.respondWith(fetch(req).catch(()=>caches.match(OFFLINE_URL))); return; }
  e.respondWith((async ()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req);
    const fetched=fetch(req).then(r=>{ cache.put(req, r.clone()); return r; }).catch(()=>cached);
    return cached || fetched;
  })());
});
