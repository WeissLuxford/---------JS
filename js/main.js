import { initStore, createIfMissing, getMode, validId } from "./store.js";
import { mountHome } from "./home.js";
import { mountSheet } from "./sheet.js";
import { closeAllModals, whenHistoryIdle, onModalEntry } from "./ui.js";
import "./pwa.js";

const root = document.getElementById("app");
let unmount = null;

function navigate(hash) {
  whenHistoryIdle(() => {
    if (location.hash === hash) route();
    else if (onModalEntry()) location.replace(hash);
    else location.hash = hash;
  });
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  closeAllModals();
  if (unmount) unmount();
  unmount = null;
  window.scrollTo(0, 0);
  let id = null;
  if (parts[0] === "t" && parts[1] && /^[a-z0-9_-]{1,40}$/i.test(parts[1])) {
    unmount = mountSheet(root, "tpl-" + parts[1], parts[2], navigate, { template: parts[1] });
    return;
  }
  if (parts[0] === "c" && parts[1]) {
    try {
      id = decodeURIComponent(parts[1]);
    } catch {
      id = null;
    }
  }
  if (id && validId(id)) unmount = mountSheet(root, id, parts[2], navigate);
  else {
    if (parts.length) history.replaceState(null, "", "#/");
    unmount = mountHome(root, navigate);
  }
}

async function ensureSeed() {
  try {
    const { SEED_ID, kirion } = await import("./seed.js");
    await createIfMissing(SEED_ID, kirion());
  } catch (e) {
    console.warn("seed", e);
  }
}

async function start() {
  await initStore();
  if (getMode() === "local") await ensureSeed();
  window.addEventListener("hashchange", route);
  route();
}

function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (location.protocol !== "https:" && !local) return;
  if (local && !new URLSearchParams(location.search).has("sw")) {
    navigator.serviceWorker.getRegistrations().then(list => list.forEach(r => r.unregister())).catch(() => {});
    if (window.caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    return;
  }
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

registerWorker();
start();
