const VERSION = "v10";
const SHELL = "dnd-shell-" + VERSION;
const CDN = "dnd-cdn-" + VERSION;
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "favicon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "css/app.css",
  "js/access.js",
  "js/admin.js",
  "js/ambient.js",
  "js/changes.js",
  "js/classes.js",
  "js/config.js",
  "js/device.js",
  "js/entities.js",
  "js/gear.js",
  "js/home.js",
  "js/icons.js",
  "js/library.js",
  "js/main.js",
  "js/print.js",
  "js/pwa.js",
  "js/ref.js",
  "js/rules.js",
  "js/seed.js",
  "js/share.js",
  "js/sheet.js",
  "js/sheet-cards.js",
  "js/sheet-dialogs.js",
  "js/sheet-levelup.js",
  "js/sheet-magic.js",
  "js/sheet-rolls.js",
  "js/sheet-turn.js",
  "js/sheet-undo.js",
  "js/sheet-util.js",
  "js/store.js",
  "js/sync.js",
  "js/tabs.js",
  "js/ui.js",
  "data/spells-srd.json"
];
const CDN_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];
const NETWORK_WAIT = 3500;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(new Request(url, { cache: "reload" })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("dnd-") && k !== SHELL && k !== CDN).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request, cacheName, opaque = false) {
  return fetch(request).then(res => {
    if (res && ((res.ok && (res.type === "basic" || res.type === "cors")) || (opaque && res.type === "opaque"))) {
      const copy = res.clone();
      caches.open(cacheName).then(c => c.put(request, copy)).catch(() => {});
    }
    return res;
  });
}

function networkFirst(event, request) {
  const net = fromNetwork(request, SHELL);
  event.waitUntil(net.then(() => null, () => null));
  const cached = () => caches.match(request, { ignoreSearch: true }).then(hit => hit || (request.mode === "navigate" ? caches.match("index.html") : null));
  const timer = new Promise(res => setTimeout(res, NETWORK_WAIT)).then(cached);
  return Promise.race([net.catch(cached), timer.then(hit => hit || net)]).then(res => res || net.catch(() => new Response("", { status: 504, statusText: "offline" })));
}

function cacheFirst(request) {
  return caches.match(request).then(hit => hit || fromNetwork(request, CDN, true));
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.includes("/old/")) return;
    event.respondWith(networkFirst(event, request));
    return;
  }
  if (!CDN_HOSTS.includes(url.hostname)) return;
  if (url.hostname === "www.gstatic.com" && !url.pathname.startsWith("/firebasejs/")) return;
  event.respondWith(cacheFirst(request));
});
