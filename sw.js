// 오프라인용 캐시. 파일을 고쳐 올릴 때는 아래 버전 숫자를 올린다.
const V = "hd-nihongo-v6";
const FILES = ["./", "./index.html", "./decks.json", "./clips.json", "./words-vocab.json", "./manifest.json", "./style.css", "./app.js", "./kana.js", "./pen.js", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // 글꼴 등은 그대로
  // 네트워크 먼저, 안 되면 캐시 (항상 최신 카드를 받되 오프라인에서도 열리게)
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
