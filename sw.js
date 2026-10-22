/* 2秒ドリル。通信は一切しないので、初回に読んだら以後は全部キャッシュから返す。 */
const CACHE = "s2-v5";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 新しい版があれば取りに行き、無ければキャッシュで動かす */
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  /* 記録のやりとりには触らない。
     ここを通すと、Daily Reps への GET がキャッシュに入って古い版を掴む。
     さらに失敗時に index.html を返す作りなので、
     つながっていないのに「成功」に見えてしまう。 */
  const u = new URL(req.url);
  if(u.origin !== self.location.origin) return;
  if(u.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
