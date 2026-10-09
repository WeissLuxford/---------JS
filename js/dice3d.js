import { fxSettings, reducedMotion, playSound, setDiceThrower } from "./ui.js";

const KEY = "dnd.dice3d";
const FALLBACK = "#c9a35b";
let color = FALLBACK;
let accent = FALLBACK;
let skin = { theme: "default", tint: true };
let box = null;
let loading = null;
let failed = false;
let host = null;
let label = null;
let hideTimer = null;
let busy = false;
let lastRolls = [];

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

function applyLook() {
  const next = skin.tint || !skin.color ? accent : skin.color;
  const theme = skin.theme || "default";
  if (next === color && box && box.config && box.config.theme === theme) return;
  color = next;
  if (box) box.updateConfig({ theme, themeColor: color }).catch(() => {});
}

export function setDiceColor(hex) {
  accent = typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex) ? hex : FALLBACK;
  applyLook();
}

export function setDiceSkin(next) {
  skin = next && next.theme ? next : { theme: "default", tint: true };
  applyLook();
}

export async function previewDice() {
  if (!dice3dReady()) {
    if (loading) await loading;
    if (!dice3dReady()) return;
  }
  const v = await throw3d(1);
  if (v) landDice({ text: String(v[0]), kind: v[0] === 20 ? "crit" : v[0] === 1 ? "fumble" : "" });
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
    label = document.createElement("div");
    label.className = "d3-total";
    host.appendChild(label);
    document.body.appendChild(host);
  }
  label = host.querySelector(".d3-total");
  return host;
}

export function dice3dBusy() {
  return busy;
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
        theme: skin.theme || "default",
        themeColor: color,
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
  clearTimeout(hideTimer);
  document.removeEventListener("pointerdown", hide, true);
  if (!host) return;
  host.classList.remove("on", "landed", "crit", "fumble");
  setTimeout(() => {
    if (box && host && !host.classList.contains("on")) box.clear();
  }, 450);
}

async function throwGroups(groups) {
  if (!enabled() || busy || !box) return null;
  busy = true;
  hide();
  clearTimeout(hideTimer);
  ensureHost();
  label.textContent = "";
  host.classList.add("on");
  const count = groups.reduce((a, g) => a + g.n, 0);
  playSound("roll", { dice: count });
  try {
    const res = await Promise.race([box.roll(groups.map(g => `${g.n}d${g.f}`)), new Promise(ok => setTimeout(() => ok(null), 7000))]);
    if (!Array.isArray(res) || res.length !== count) {
      hide();
      return null;
    }
    const ids = [...new Set(res.map(x => x.groupId))].sort((a, b) => a - b);
    const out = groups.map(() => []);
    lastRolls = [];
    for (const x of res) {
      const k = ids.indexOf(x.groupId);
      const v = Number(x.value);
      if (k < 0 || !Number.isInteger(v) || v < 1 || v > groups[k].f) {
        hide();
        return null;
      }
      out[k].push(v);
      lastRolls.push(x);
    }
    host.classList.add("landed");
    hideTimer = setTimeout(hide, 2600);
    setTimeout(() => document.addEventListener("pointerdown", hide, true), 0);
    return out;
  } catch {
    hide();
    return null;
  } finally {
    busy = false;
  }
}

export async function throw3d(count, faces = 20) {
  const out = await throwGroups([{ n: count, f: faces }]);
  return out ? out[0] : null;
}

export function landDice({ text = "", kind = "", discard = -1 } = {}) {
  if (!host || !host.classList.contains("on")) return;
  label.textContent = text;
  host.classList.toggle("crit", kind === "crit");
  host.classList.toggle("fumble", kind === "fumble");
  const drop = lastRolls[discard];
  if (drop && box) {
    setTimeout(() => {
      try {
        box.remove({ groupId: drop.groupId, rollId: drop.rollId });
      } catch {}
    }, 350);
  }
}

setDiceThrower({
  ready: () => dice3dReady(),
  busy: () => busy,
  groups: throwGroups,
  land: landDice
});
