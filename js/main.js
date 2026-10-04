import { initStore, charExists, createChar } from "./store.js";
import { mountHome } from "./home.js";
import { mountSheet } from "./sheet.js";

const root = document.getElementById("app");
let unmount = null;

function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (unmount) unmount();
  unmount = null;
  window.scrollTo(0, 0);
  if (parts[0] === "c" && parts[1]) {
    unmount = mountSheet(root, decodeURIComponent(parts[1]), parts[2], navigate);
  } else {
    unmount = mountHome(root, navigate);
  }
}

async function ensureSeed() {
  try {
    const { SEED_ID, kirion } = await import("./seed.js");
    if (!(await charExists(SEED_ID))) await createChar(SEED_ID, kirion());
  } catch (e) {
    console.warn("seed", e);
  }
}

async function start() {
  await initStore();
  window.addEventListener("hashchange", route);
  route();
  ensureSeed();
}

start();
