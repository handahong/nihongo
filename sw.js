// 오프라인 캐시. 파일을 고치면 아래 버전 숫자를 올려야 새 버전이 반영돼.
const V = 'jp-srs-v6';
const FILES = ['./', './index.html', './manifest.json',
  './decks.json', './words-core.json', './words-jlpt.json', './words-travel.json', './words-sub.json', './words-vocab.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 단어장은 네트워크 우선(새 단어가 바로 반영되게), 실패하면 캐시
  if (/words-.*\.json$|decks\.json$/.test(url.pathname)) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone();
        caches.open(V).then(c => c.put(e.request, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone();
      caches.open(V).then(c => c.put(e.request, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
