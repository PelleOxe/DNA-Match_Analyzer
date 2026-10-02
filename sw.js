/* DNA-Match Analyzer — service worker (offline-stöd)
 * Ligger bredvid HTML-filen. Nätverk först (alltid senaste versionen när du är online),
 * cache som reserv när du är offline. Inga filnamn är hårdkodade.
 */
const CACHE = 'dna-match-analyzer-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dna-match-analyzer-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Sidan ber SW:n cacha sig själv första gången (första laddningen passerar inte genom fetch-händelsen)
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'cache-page' && d.url) {
    e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(d.url, { cache: 'reload' }))).catch(() => {}));
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // bara samma ursprung
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || Response.error())
      )
  );
});
