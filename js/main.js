import { initStore, createIfMissing, getMode, validId } from "./store.js";
import { mountHome } from "./home.js";
import { mountSheet } from "./sheet.js";
import { closeAllModals } from "./ui.js";

const root = document.getElementById("app");
let unmount = null;

function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  closeAllModals();
  if (unmount) unmount();
  unmount = null;
  window.scrollTo(0, 0);
  let id = null;
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

start();
