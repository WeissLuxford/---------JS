const VERSION = "v55";
const BUILD = "cccb115bc4";
const SHELL = "dnd-shell-" + VERSION + "-" + BUILD;
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
  "assets/fonts/alegreya-sc-500-cyr.woff2",
  "assets/fonts/alegreya-sc-500-lat.woff2",
  "assets/fonts/alegreya-sc-700-cyr.woff2",
  "assets/fonts/alegreya-sc-700-lat.woff2",
  "assets/fonts/eb-garamond-cyr.woff2",
  "assets/fonts/eb-garamond-italic-cyr.woff2",
  "assets/fonts/eb-garamond-italic-lat.woff2",
  "assets/fonts/eb-garamond-lat.woff2",
  "js/access.js",
  "js/achievements.js",
  "js/admin.js",
  "js/ambient.js",
  "js/backup.js",
  "js/board.js",
  "js/changes.js",
  "js/classes.js",
  "js/cloud.js",
  "js/creator-build.js",
  "js/creator-data.js",
  "js/creator.js",
  "js/config.js",
  "js/device.js",
  "js/entities.js",
  "js/icon-map.js",
  "js/wake.js",
  "js/checks.js",
  "js/templates.js",
  "js/shake.js",
  "js/packs.js",
  "js/gear.js",
  "js/doll.js",
  "js/drag.js",
  "js/credits.js",
  "js/editor.js",
  "js/dice3d.js",
  "js/home.js",
  "js/icons.js",
  "js/icon-art.js",
  "js/icon-credits.js",
  "js/library.js",
  "js/main.js",
  "js/notes.js",
  "js/note-hints.js",
  "js/print.js",
  "js/pwa.js",
  "js/ref.js",
  "js/rules.js",
  "js/seed.js",
  "js/share.js",
  "js/sheet.js",
  "js/sheet-cards.js",
  "js/sheet-chronicle.js",
  "js/sheet-dialogs.js",
  "js/sheet-profile.js",
  "js/sheet-levelup.js",
  "js/sheet-magic.js",
  "js/sheet-notes.js",
  "js/sheet-tabfx.js",
  "js/sheet-rolls.js",
  "js/sheet-scenes.js",
  "js/sheet-turn.js",
  "js/sheet-undo.js",
  "js/sheet-util.js",
  "js/store.js",
  "js/dm-gifts.js",
  "js/sync.js",
  "js/tab-fx.js",
  "js/tabs.js",
  "js/ui.js",
  "data/spells-srd.json",
  "data/spells-extra.json",
  "data/features-srd.json",
  "data/templates.json",
  "assets/icons/picker.json"
];
const CDN_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(new Request(url, { cache: "reload" })).catch(() => null)))
        .then(() => fetch("assets/icons/used.json", { cache: "reload" }).then(r => r.json()).then(list => Promise.all(list.map(url => cache.add(url).catch(() => null)))).catch(() => null)))
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

function fromNetwork(request, cacheName, opaque = false, fresh = false) {
  const req = !fresh ? request : request.mode === "navigate" ? new Request(request.url, { cache: "no-cache" }) : new Request(request, { cache: "no-cache" });
  return fetch(req).then(res => {
    if (res && ((res.ok && (res.type === "basic" || res.type === "cors")) || (opaque && res.type === "opaque"))) {
      const copy = res.clone();
      caches.open(cacheName).then(c => c.put(request, copy)).catch(() => {});
    }
    return res;
  });
}

function fromShell(request) {
  const key = request.mode === "navigate" ? "index.html" : request;
  return caches.match(key, { ignoreSearch: true }).then(hit => hit || fromNetwork(request, SHELL, false, true).catch(() => (request.mode === "navigate" ? caches.match("index.html") : null)).then(res => res || new Response("", { status: 504, statusText: "offline" })));
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
    if (url.pathname.includes("/assets/icons/")) {
      event.respondWith(caches.match(request).then(hit => hit || fromNetwork(request, SHELL)));
      return;
    }
    event.respondWith(fromShell(request));
    return;
  }
  if (!CDN_HOSTS.includes(url.hostname)) return;
  if (url.hostname === "www.gstatic.com" && !url.pathname.startsWith("/firebasejs/")) return;
  event.respondWith(cacheFirst(request));
});
