import { fxSettings } from "./ui.js";

const COUNTS = { rain: 70, storm: 90, snow: 45, blizzard: 110, wind: 14 };
let layer = null;
let current = "";

function reducedMotion() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function particles(kind, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = (Math.random() * 110 - 5).toFixed(1);
    const delay = (-Math.random() * 6).toFixed(2);
    const dur = kind === "snow" ? 7 + Math.random() * 7 : kind === "blizzard" ? 2.2 + Math.random() * 2 : kind === "wind" ? 2.5 + Math.random() * 2.5 : 0.55 + Math.random() * 0.45;
    const size = kind === "snow" || kind === "blizzard" ? 2 + Math.random() * 3 : 1;
    const y = kind === "wind" ? (Math.random() * 90 + 5).toFixed(1) : 0;
    out.push(`<i class="amb-p" style="--x:${x}vw;--y:${y}vh;--d:${dur.toFixed(2)}s;--dl:${delay}s;--s:${size.toFixed(1)}px;--o:${(0.35 + Math.random() * 0.55).toFixed(2)}"></i>`);
  }
  return out.join("");
}

export function setAmbient(scene) {
  const time = (scene && scene.time) || "";
  const weather = (scene && scene.weather) || "";
  const motion = fxSettings().anim && !reducedMotion();
  const key = `${time}|${weather}|${motion}`;
  if (key === current && layer && layer.isConnected) return;
  current = key;
  if (!time && !weather) {
    if (layer) layer.remove();
    layer = null;
    return;
  }
  if (!layer || !layer.isConnected) {
    layer = document.createElement("div");
    layer.className = "ambient";
    layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);
  }
  layer.dataset.time = time;
  layer.dataset.weather = weather;
  layer.classList.toggle("still", !motion);
  const kind = weather === "storm" ? "rain" : weather;
  const parts = motion && COUNTS[weather] ? `<div class="amb-${kind}">${particles(kind, COUNTS[weather])}</div>` : "";
  const fog = weather === "fog" ? `<div class="amb-fog"><b></b><b></b><b></b></div>` : "";
  const flash = weather === "storm" && motion ? `<div class="amb-flash"></div>` : "";
  const stars = time === "night" && (!weather || weather === "clear" || weather === "wind") ? `<div class="amb-stars"></div>` : "";
  layer.innerHTML = `<div class="amb-tint"></div>${stars}${fog}${parts}${flash}`;
}
