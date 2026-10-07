import { fxSettings, reducedMotion, playSound } from "./ui.js";

const KEY = "dnd.dice3d";
const COLOR = "#5a1e1e";
let box = null;
let loading = null;
let failed = false;
let host = null;
let hideTimer = null;
let busy = false;

export function dice3dOn() {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function setDice3d(on) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  if (on) preloadDice3d();
  return !!on;
}

function enabled() {
  return dice3dOn() && !failed && fxSettings().anim && !reducedMotion();
}

function ensureHost() {
  host = document.getElementById("dice3d");
  if (!host) {
    host = document.createElement("div");
    host.id = "dice3d";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
  return host;
}

export function dice3dReady() {
  if (!enabled()) return false;
  if (!box && !busy) preloadDice3d();
  return !!box && !busy;
}

export function preloadDice3d() {
  if (!enabled() || loading || box || typeof document === "undefined" || !document.body) return loading;
  const net = navigator.connection;
  if (net && net.saveData) return null;
  ensureHost();
  loading = import("../vendor/dice-box/dist/dice-box.es.min.js")
    .then(async ({ default: DiceBox }) => {
      const b = new DiceBox({
        container: "#dice3d",
        assetPath: new URL("../vendor/dice-box/dist/assets/", import.meta.url).pathname,
        origin: location.origin,
        theme: "default",
        themeColor: COLOR,
        scale: 7,
        enableShadows: true,
        shadowTransparency: 0.6,
        lightIntensity: 1.1
      });
      await b.init();
      box = b;
      return b;
    })
    .catch(() => {
      failed = true;
      return null;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

function hide() {
  if (!host) return;
  host.classList.remove("on");
  setTimeout(() => {
    if (box && host && !host.classList.contains("on")) box.clear();
  }, 450);
}

export async function throw3d(count, faces = 20) {
  if (!enabled() || busy) return null;
  if (!box) {
    preloadDice3d();
    return null;
  }
  busy = true;
  clearTimeout(hideTimer);
  ensureHost().classList.add("on");
  playSound("roll", { dice: count });
  try {
    const res = await Promise.race([box.roll(`${count}d${faces}`), new Promise(ok => setTimeout(() => ok(null), 6000))]);
    const values = Array.isArray(res) ? res.map(x => Number(x.value)).filter(v => Number.isInteger(v) && v >= 1 && v <= faces) : [];
    if (values.length !== count) {
      hide();
      return null;
    }
    hideTimer = setTimeout(hide, 1500);
    return values;
  } catch {
    hide();
    return null;
  } finally {
    busy = false;
  }
}
