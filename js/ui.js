import { icon, die, actionMark, ICON_NAMES } from "./icons.js";
import { DAMAGE, DAMAGE_TYPES, ACTIONS, parseDice, rollDice, diceToString, fmt } from "./rules.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function inline(text, opts) {
  let s = esc(text);
  let todo = "";
  const t = s.match(/^\[( |x|х)\]\s+/i);
  if (t) {
    todo = `<span class="rt-todo ${t[1].trim() ? "done" : ""}" aria-hidden="true"></span>`;
    s = s.slice(t[0].length);
  }
  const keep = [];
  const put = html => `\u0001${keep.push(html) - 1}\u0002`;
  if (opts && opts.link) s = s.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, a, b) => put(opts.link(a, b)));
  if (opts && opts.mentions) {
    opts.mentions.re.lastIndex = 0;
    s = s.replace(opts.mentions.re, (all, pre, name) => {
      const html = opts.mentions.render(name);
      return html ? pre + put(html) : all;
    });
  }
  s = s
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/==(.+?)==/g, "<mark>$1</mark>")
    .replace(/\*(\S(?:[^*]*?\S)?)\*/g, "<i>$1</i>");
  if (keep.length) s = s.replace(/\u0001(\d+)\u0002/g, (_, i) => keep[Number(i)] || "");
  return todo + s;
}

export function rich(text, opts) {
  const inline2 = x => inline(x, opts);
  const lines = String(text ?? "").replace(/\r/g, "").split("\n");
  const out = [];
  let para = [];
  let list = null;
  let quote = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline2).join("<br>")}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline2(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${quote.map(inline2).join("<br>")}</blockquote>`);
    quote = [];
  };
  const flush = () => {
    flushPara();
    flushList();
    flushQuote();
  };
  const toList = (tag, item) => {
    flushPara();
    flushQuote();
    if (!list || list.tag !== tag) {
      flushList();
      list = { tag, items: [] };
    }
    list.items.push(item);
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) flush();
    else if ((m = line.match(/^\s*(#{1,3})\s+(.+)$/))) {
      flush();
      out.push(`<h${m[1].length + 3} class="rt-h">${inline2(m[2])}</h${m[1].length + 3}>`);
    } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush();
      out.push("<hr>");
    } else if ((m = line.match(/^\s*>\s?(.*)$/))) {
      flushPara();
      flushList();
      quote.push(m[1]);
    } else if ((m = line.match(/^\s*[-*•]\s+(.+)$/))) toList("ul", m[1]);
    else if ((m = line.match(/^\s*\d+[.)]\s+(.+)$/))) toList("ol", m[1]);
    else {
      flushList();
      flushQuote();
      para.push(line);
    }
  }
  flush();
  return out.join("");
}

export function plainPreview(text, max = 90) {
  const s = String(text ?? "").replace(/[#>*_~=`|-]+/g, " ").replace(/\[( |x|х)\]/gi, " ").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

const toastHost = () => {
  let el = $("#toasts");
  if (!el) {
    el = document.createElement("div");
    el.id = "toasts";
    document.body.appendChild(el);
  }
  return el;
};

export function toast(html, { kind = "", timeout = 3200 } = {}) {
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.setAttribute("role", kind === "bad" ? "alert" : "status");
  el.innerHTML = html;
  const host = toastHost();
  host.appendChild(el);
  const limit = window.matchMedia("(max-width: 760px)").matches ? 2 : 3;
  const live = Array.from(host.children).filter(t => !t.classList.contains("gone"));
  live.slice(0, Math.max(0, live.length - limit)).forEach(t => {
    t.classList.add("gone");
    t.classList.remove("in");
    setTimeout(() => t.remove(), 250);
  });
  requestAnimationFrame(() => el.classList.add("in"));
  const close = () => {
    el.classList.remove("in");
    setTimeout(() => el.remove(), 250);
  };
  el.addEventListener("click", close);
  if (timeout) setTimeout(close, timeout);
  close.el = el;
  return close;
}

const FX_KEY = "dnd.fx";

export function fxSettings() {
  try {
    const v = JSON.parse(localStorage.getItem(FX_KEY) || "{}");
    return { sound: v.sound !== false, anim: v.anim !== false };
  } catch {
    return { sound: true, anim: true };
  }
}

export function setFx(key, value) {
  const v = { ...fxSettings(), [key]: !!value };
  try {
    localStorage.setItem(FX_KEY, JSON.stringify(v));
  } catch {}
  return v;
}

let actx = null;
let noiseBuf = null;

function audio() {
  if (!fxSettings().sound) return null;
  try {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      actx = new AC();
    }
    if (actx.state === "suspended") actx.resume();
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.3, actx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return actx;
  } catch {
    return null;
  }
}

function tone(a, { type = "sine", from, to = from, at = 0, dur = 0.3, vol = 0.1, filter = 0 }) {
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) {
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filter;
    o.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(a, { at = 0, dur = 0.05, vol = 0.12, freq = 3000, q = 1.2, type = "bandpass" }) {
  const t = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SAMPLES = {
  roll: ["die-throw-1", "die-throw-2", "die-throw-3", "die-throw-4"],
  rollMany: ["dice-throw-1", "dice-throw-2", "dice-throw-3"],
  shake: ["dice-shake-1", "dice-shake-2", "dice-shake-3"],
  coins: ["handleCoins", "handleCoins2"],
  equip: ["cloth1", "cloth2", "cloth3", "beltHandle1"],
  unequip: ["metalClick", "cloth2"]
};
const sampleBufs = new Map();
let sampleExt = "";

function loadSamples(a, kind) {
  if (!sampleExt) {
    try {
      sampleExt = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? "ogg" : "m4a";
    } catch {
      sampleExt = "m4a";
    }
  }
  for (const name of SAMPLES[kind] || []) {
    if (sampleBufs.has(name)) continue;
    sampleBufs.set(name, null);
    fetch(new URL(`../assets/audio/sfx/${name}.${sampleExt}`, import.meta.url))
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(b => new Promise((ok, bad) => a.decodeAudioData(b, ok, bad)))
      .then(buf => sampleBufs.set(name, buf))
      .catch(() => sampleBufs.delete(name));
  }
}

function playSample(a, kind, vol = 0.6) {
  loadSamples(a, kind);
  const ready = (SAMPLES[kind] || []).map(n => sampleBufs.get(n)).filter(Boolean);
  if (!ready.length) return false;
  const src = a.createBufferSource();
  src.buffer = ready[Math.floor(Math.random() * ready.length)];
  src.playbackRate.value = 0.94 + Math.random() * 0.12;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(a.destination);
  src.start();
  return true;
}

export function warmSounds() {
  const a = audio();
  if (a) ["roll", "rollMany", "shake"].forEach(k => loadSamples(a, k));
}

export function playSound(kind, { dice = 1 } = {}) {
  const a = audio();
  if (!a) return;
  if (SAMPLES[kind] && kind !== "roll") return void playSample(a, kind);
  if (kind === "roll" && playSample(a, dice > 1 ? "rollMany" : "roll")) return;
  if (kind === "roll") {
    [0, 0.07, 0.15, 0.26].forEach((at, i) => noise(a, { at: at + Math.random() * 0.02, dur: 0.045, vol: 0.09 - i * 0.015, freq: 2200 + Math.random() * 2200 }));
  } else if (kind === "crit") {
    [880, 1108.7, 1318.5, 1760].forEach((f, i) => tone(a, { type: "triangle", from: f, at: i * 0.07, dur: 0.9, vol: 0.07 }));
    tone(a, { type: "sine", from: 2637, at: 0.3, dur: 1.1, vol: 0.03 });
    noise(a, { at: 0.28, dur: 0.6, vol: 0.025, freq: 7000, q: 0.7 });
  } else if (kind === "fumble") {
    tone(a, { type: "sawtooth", from: 170, to: 48, dur: 0.55, vol: 0.09, filter: 700 });
    noise(a, { dur: 0.18, vol: 0.14, freq: 160, q: 0.8, type: "lowpass" });
  } else if (kind === "hit") {
    tone(a, { type: "sine", from: 140, to: 55, dur: 0.28, vol: 0.16 });
    noise(a, { dur: 0.12, vol: 0.12, freq: 420, q: 0.9, type: "lowpass" });
  } else if (kind === "heal") {
    [523.3, 659.3, 784].forEach((f, i) => tone(a, { type: "sine", from: f, at: i * 0.09, dur: 0.7, vol: 0.045 }));
  } else if (kind === "levelup") {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, { type: "triangle", from: f, at: i * 0.11, dur: 0.5, vol: 0.06 }));
    [1046.5, 1318.5, 1568].forEach(f => tone(a, { type: "sine", from: f, at: 0.5, dur: 1.4, vol: 0.035 }));
    noise(a, { at: 0.48, dur: 0.9, vol: 0.02, freq: 8000, q: 0.6 });
  } else if (kind === "campfire" || kind === "dawn") {
    for (let i = 0; i < 8; i++) noise(a, { at: i * 0.28, dur: 0.34, vol: 0.035, freq: 260, q: 0.6, type: "lowpass" });
    for (let i = 0; i < 26; i++) noise(a, { at: Math.random() * 2.3, dur: 0.012 + Math.random() * 0.03, vol: 0.03 + Math.random() * 0.07, freq: 1400 + Math.random() * 4200, q: 1.4 });
    if (kind === "dawn") [392, 523.3, 659.3, 784].forEach((f, i) => tone(a, { type: "sine", from: f, at: 1.5 + i * 0.22, dur: 1.6, vol: 0.03 }));
  } else if (kind === "ignite") {
    noise(a, { dur: 0.35, vol: 0.06, freq: 900, q: 0.7 });
    tone(a, { type: "sine", from: 660, at: 0.08, dur: 0.9, vol: 0.04 });
  } else if (kind === "skull") {
    tone(a, { type: "sine", from: 96, to: 42, dur: 0.5, vol: 0.18 });
    noise(a, { dur: 0.22, vol: 0.1, freq: 200, q: 0.8, type: "lowpass" });
  } else if (kind === "candle") {
    [440, 554.4, 659.3].forEach((f, i) => tone(a, { type: "sine", from: f, at: i * 0.35, dur: 1.4, vol: 0.04 }));
    [0, 0.35, 0.7].forEach(at => noise(a, { at, dur: 0.3, vol: 0.04, freq: 900, q: 0.7 }));
  } else if (kind === "revive") {
    [392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, { type: "triangle", from: f, at: i * 0.08, dur: 1.2, vol: 0.05 }));
    noise(a, { at: 0.3, dur: 0.8, vol: 0.02, freq: 7000, q: 0.6 });
  } else if (kind === "toll") {
    [0, 1.6].forEach(at => {
      tone(a, { type: "sine", from: 110, at, dur: 2.6, vol: 0.16 });
      tone(a, { type: "sine", from: 264, at, dur: 1.8, vol: 0.05 });
      tone(a, { type: "sine", from: 367, at, dur: 1.2, vol: 0.03 });
    });
  } else if (kind === "achievement") {
    [659.3, 880, 1174.7].forEach((f, i) => tone(a, { type: "triangle", from: f, at: i * 0.09, dur: 0.6, vol: 0.05 }));
    tone(a, { type: "sine", from: 1760, at: 0.3, dur: 0.9, vol: 0.025 });
  } else if (kind === "heartbeat") {
    tone(a, { type: "sine", from: 75, to: 48, dur: 0.16, vol: 0.2 });
    tone(a, { type: "sine", from: 68, to: 44, at: 0.24, dur: 0.2, vol: 0.15 });
  }
}

export function reducedMotion() {
  return reduced();
}

function reduced() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const RC_KEY = "dnd.rollcard";
const DAMAGE_ROLL = /^(dmg|idmg|sdmg|crit|icrit):/;

export function rollCardOn() {
  try {
    return localStorage.getItem(RC_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setRollCard(on) {
  try {
    localStorage.setItem(RC_KEY, on ? "1" : "0");
  } catch {}
  if (!on) closeRollCard();
  return !!on;
}

let rollCard = null;

export function closeRollCard() {
  if (!rollCard || !rollCard.classList.contains("in")) return;
  rollCard.classList.remove("in");
  rollCard.dataset.last = "";
}

function cardDown(e) {
  swallowing = false;
  if (!rollCard || !rollCard.classList.contains("in")) return;
  if (rollCard.contains(e.target)) {
    if (!e.target.closest("button, a, input")) closeRollCard();
    return;
  }
  const r = e.target.closest && e.target.closest("[data-roll]");
  if (r && DAMAGE_ROLL.test(r.dataset.roll) && rollCard.dataset.last === "attack") return;
  closeRollCard();
  swallowing = true;
  e.preventDefault();
  e.stopPropagation();
}

let swallowing = false;

function swallow(e) {
  if (!swallowing) return;
  e.stopPropagation();
  if (!e.type.startsWith("touch")) e.preventDefault();
  if (e.type === "click") swallowing = false;
}

function cardHost() {
  if (!rollCard) {
    rollCard = document.createElement("div");
    rollCard.id = "roll-card";
    rollCard.setAttribute("role", "status");
    rollCard.setAttribute("aria-live", "polite");
    document.body.appendChild(rollCard);
    document.addEventListener("pointerdown", cardDown, true);
    for (const t of ["mousedown", "touchstart", "pointerup", "mouseup", "touchend", "click", "contextmenu"]) document.addEventListener(t, swallow, { capture: true, passive: false });
  }
  return rollCard;
}

export function spendDamageButtons(scope) {
  if (!scope) return;
  scope.querySelectorAll("[data-hit-dmg], [data-crit], .r-btns-l").forEach(b => b.remove());
  scope.querySelectorAll(".r-btns").forEach(b => {
    if (!b.children.length) b.remove();
  });
}

function rollOut(html, { timeout, kind = "", append = false } = {}) {
  if (!rollCardOn()) return toast(html, { timeout });
  const host = cardHost();
  if (append && host.classList.contains("in") && host.dataset.last === "attack") spendDamageButtons(host);
  else host.innerHTML = "";
  const el = document.createElement("div");
  el.className = "rc-entry";
  el.innerHTML = html;
  host.appendChild(el);
  host.dataset.last = kind;
  host.classList.remove("in");
  void host.offsetWidth;
  host.classList.add("in");
  const close = () => closeRollCard();
  close.el = el;
  return close;
}

const NAT = {
  attack: { crit: ["Попадание, крит", "Естественная 20: кости урона вдвое"], fumble: ["Промах", "Естественная 1: мимо при любой сумме"] },
  death: { crit: ["Снова в строю", "Естественная 20: 1 хит"], fumble: ["Два провала", "Естественная 1"] }
};

function critBanner(kind, entry, special = "attack") {
  const [title, sub] = (NAT[special] || NAT.attack)[kind];
  if (rollCardOn()) {
    if (entry && !entry.querySelector(".rc-crit")) entry.insertAdjacentHTML("afterbegin", `<div class="rc-crit ${kind}">${esc(title)}</div>`);
    return;
  }
  if (!fxSettings().anim) return;
  let el = document.getElementById("crit-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "crit-banner";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  el.className = "";
  el.innerHTML = `<b>${esc(title)}</b><span>${esc(sub)}</span>`;
  void el.offsetWidth;
  el.className = `in ${kind}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ""), 1900);
}

function rollFx(el, { finals = [], crit = false, fumble = false, ms = 620, dice = 1, landed = false, special = "attack" } = {}) {
  const fx = fxSettings();
  const totals = Array.from(el.querySelectorAll("[data-final]"));
  const land = () => {
    el.classList.remove("rolling");
    totals.forEach(t => (t.textContent = t.dataset.final));
    if (crit) {
      el.classList.add("crit-fx");
      playSound("crit");
      critBanner("crit", el, special);
    } else if (fumble) {
      el.classList.add("fumble-fx");
      playSound("fumble");
      critBanner("fumble", el, special);
    }
  };
  if (landed) return land();
  playSound("roll", { dice });
  if (!fx.anim || reduced() || !totals.length) return land();
  el.classList.add("rolling");
  const start = Date.now();
  const tick = () => {
    if (!el.isConnected) return;
    if (Date.now() - start >= ms) return land();
    totals.forEach(t => {
      const f = Number(t.dataset.final);
      const span = Math.max(4, Math.abs(f));
      t.textContent = String(Math.max(0, Math.round(f - span / 2 + Math.random() * span)));
    });
    setTimeout(tick, 55);
  };
  tick();
}

export const rollLog = [];

function logRoll(entry) {
  rollLog.unshift({ ...entry, at: Date.now() });
  if (rollLog.length > 40) rollLog.pop();
}

function whyHtml(why, fail) {
  return `${fail ? `<div class="r-fail">Автоматический провал: ${esc(fail)}</div>` : ""}${(why || []).map(w => `<div class="r-why">${esc(w)}</div>`).join("")}`;
}

export function showD20(label, modifier, result, mode, { why = [], fail = "", extra = "", landed = false, special = "attack" } = {}) {
  const nat20 = !!special && result.nat20;
  const nat1 = !!special && result.nat1;
  const cls = nat20 ? "crit" : nat1 ? "fumble" : "";
  const both = result.b != null ? `<span class="r-both">${result.a} / ${result.b} ${mode === "adv" ? "преим." : "помеха"}</span>` : "";
  const note = nat20 ? NAT[special].crit[1] : nat1 ? NAT[special].fumble[1] : "";
  logRoll({ label, text: `${fail ? "провал" : result.total} (${result.pick}${fmt(modifier)})` });
  const t = rollOut(
    `<div class="roll ${cls} ${fail ? "failed" : ""}">${die(20, nat20 ? "#f4d66d" : nat1 ? "#e5533d" : "#cbbfa8", result.pick)}<div class="r-body"><div class="r-label">${esc(label)}</div><div class="r-calc">${result.pick} ${fmt(modifier).replace(/^([+−])/, "$1 ")} ${both}</div>${note ? `<div class="r-note">${note}</div>` : ""}${whyHtml(why, fail)}${extra ? `<div class="r-btns">${extra}</div>` : ""}</div><div class="r-total" ${fail ? "" : `data-final="${result.total}"`}>${fail ? "✕" : result.total}</div></div>`,
    { timeout: extra ? 9000 : why.length || fail ? 6500 : 4500, kind: /атака/i.test(label) || /data-hit-dmg/.test(extra) ? "attack" : "d20" }
  );
  rollFx(t.el, { crit: nat20, fumble: nat1, dice: result.b != null ? 2 : 1, landed, special });
}

export function showBeams(label, modifier, results, mode, { why = [], extra = "", landed = false } = {}) {
  const rows = results.map((r, i) => {
    const both = r.b != null ? `<span class="r-both">${r.a} / ${r.b}</span>` : "";
    return `<div class="r-beam ${r.nat20 ? "crit" : r.nat1 ? "fumble" : ""}"><span>Луч ${i + 1}</span><span class="r-calc">${r.pick} ${fmt(modifier).replace(/^([+−])/, "$1 ")} ${both}</span><b data-final="${r.total}">${r.total}</b>${r.nat20 ? `<em>крит</em>` : r.nat1 ? `<em>промах</em>` : ""}</div>`;
  }).join("");
  results.forEach((r, i) => logRoll({ label: `${label} (луч ${i + 1})`, text: `${r.total} (${r.pick}${fmt(modifier)})` }));
  const top = results.some(r => r.nat20) ? "#f4d66d" : "#cbbfa8";
  const t = rollOut(
    `<div class="roll beams">${die(20, top, results.length + "×")}<div class="r-body"><div class="r-label">${esc(label)}${mode !== "normal" ? ` · ${mode === "adv" ? "преимущество" : "помеха"}` : ""}</div>${rows}${whyHtml(why, "")}${extra ? `<div class="r-btns">${extra}</div>` : ""}</div></div>`,
    { timeout: 12000, kind: "attack" }
  );
  rollFx(t.el, { crit: results.some(r => r.nat20), fumble: results.every(r => r.nat1), dice: results.length, landed });
}

let thrower = null;

export function setDiceThrower(t) {
  thrower = t;
}

export function diceBusy() {
  return !!(thrower && thrower.busy());
}

const FACES_3D = new Set([4, 6, 8, 10, 12, 20, 100]);

function diceGroups(exprs) {
  const groups = [];
  exprs.forEach((expr, i) => {
    const p = parseDice(expr);
    if (p) p.dice.forEach(d => groups.push({ i, n: d.n, f: d.f }));
  });
  const total = groups.reduce((a, g) => a + g.n, 0);
  if (!total || total > 30 || groups.some(g => g.n < 1 || !FACES_3D.has(g.f))) return null;
  return groups;
}

function takers(groups, vals, count) {
  const q = Array.from({ length: count }, () => ({}));
  groups.forEach((g, k) => {
    const box = q[g.i];
    (box[g.f] = box[g.f] || []).push(...(vals[k] || []));
  });
  return q.map(box => f => (box[f] && box[f].length ? box[f].shift() : undefined));
}

export function throwExprs(exprs) {
  if (!thrower || !thrower.ready()) return null;
  const groups = diceGroups(exprs);
  if (!groups) return null;
  return thrower.groups(groups).then(vals => (vals ? takers(groups, vals, exprs.length) : null));
}

export function landDice(info = {}) {
  if (thrower) thrower.land(rollCardOn() ? { ...info, text: "" } : info);
}

export function showDamage(label, lines, crit = false, opts = {}) {
  if (diceBusy()) return null;
  const exprs = lines.map(line => (crit || line.crit ? critExpr(line.dice) : line.dice));
  const pending = throwExprs(exprs);
  if (pending) return pending.then(take => renderDamage(label, lines, crit, exprs, take, opts));
  return renderDamage(label, lines, crit, exprs, null, opts);
}

function renderDamage(label, lines, crit, exprs, take, { after } = {}) {
  const parts = [];
  const byType = {};
  let total = 0;
  let count = 0;
  const all = [];
  for (const [i, line] of lines.entries()) {
    const expr = exprs[i];
    const r = rollDice(expr, take ? take[i] : undefined);
    if (!r) continue;
    total += r.total;
    count += r.rolls.length;
    all.push(...r.rolls);
    byType[line.type] = (byType[line.type] || 0) + r.total;
    const dt = DAMAGE[line.type] || DAMAGE.bludgeoning;
    const rolls = r.rolls.length ? `<span class="r-rolls">[${r.rolls.map(x => (x.sign < 0 ? "−" : "") + x.r).join(", ")}]</span>` : "";
    parts.push(`<div class="r-line ${line.crit ? "crit" : ""}" style="--c:${dt.color}">${line.tag ? `<em>${esc(line.tag)}</em>` : ""}<span>${esc(expr)}</span>${rolls}<b>${r.total}</b> ${icon(dt.icon)} ${esc(dt.name)}</div>`);
  }
  if (!parts.length) return null;
  logRoll({ label, text: String(total) });
  const extra = after ? after(byType) : "";
  const firstType = DAMAGE[lines[0].type] || DAMAGE.bludgeoning;
  const t = rollOut(
    `<div class="roll dmg">${die(maxFace(lines[0].dice), firstType.color, "")}<div class="r-body"><div class="r-label">${esc(label)}${crit ? " · крит" : ""}</div>${parts.join("")}${extra ? `<div class="r-btns">${extra}</div>` : ""}</div><div class="r-total" data-final="${total}">${total}</div></div>`,
    { timeout: extra ? 9000 : 5500, kind: "damage", append: true }
  );
  rollFx(t.el, { ms: 420, dice: count, landed: !!take });
  if (take) landDice({ text: String(total) });
  return { total, byType, allMax: all.length >= 2 && all.every(x => x.r === x.f) };
}

export const DIE_COLORS = { 4: "#4fcf6a", 6: "#4cc4d9", 8: "#a86ee6", 10: "#e55ca6", 12: "#e5533d", 20: "#f08a2c", 100: "#d7b35a" };

const TRAY_MAX = 60;

function trayHtml(r, live) {
  const shown = r.rolls.slice(0, TRAY_MAX);
  const dice = shown.map((x, i) => {
    const face = live ? 1 + Math.floor(Math.random() * x.f) : x.r;
    const top = x.f === 20 && r.rolls.length === 1 ? (x.r === 20 ? "crit" : x.r === 1 ? "fumble" : "") : "";
    return `<span class="tray-die ${x.sign < 0 ? "neg" : ""} ${live ? "" : top}" style="--i:${i}" title="d${x.f}">${x.sign < 0 ? "<em>−</em>" : ""}${die(x.f === 100 ? 10 : x.f, DIE_COLORS[x.f] || "#e9c77a", face)}</span>`;
  }).join("");
  const more = r.rolls.length > TRAY_MAX ? `<span class="tray-more">ещё ${r.rolls.length - TRAY_MAX}</span>` : "";
  const flat = r.flat ? `<span class="tray-flat">${r.flat < 0 ? "−" : "+"}${Math.abs(r.flat)}</span>` : "";
  const total = live ? Math.max(0, Math.round(r.total * (0.5 + Math.random()))) : r.total;
  return `<div class="tray-dice">${dice}${more}${flat}</div><div class="tray-total"><span>Всего</span><b>${total}</b></div>`;
}

export function openDiceRoller() {
  const faces = [4, 6, 8, 10, 12, 20, 100];
  const m = openModal({
    title: "Бросок кубов",
    cls: "small dice-roller",
    body: `<div class="dice-tray empty" data-tray aria-live="polite"><p>Собери бросок кнопками ниже и нажми «Бросить»</p></div>
      <div class="dice-pad">${faces.map(f => `<button class="dice-btn" data-f="${f}" style="--c:${DIE_COLORS[f]}" aria-label="Добавить d${f}">${die(f === 100 ? 10 : f, DIE_COLORS[f], f === 100 ? "%" : f)}<span>d${f}</span></button>`).join("")}</div>
      <label class="fld"><span>Что бросить</span><input type="text" data-expr placeholder="2d6+3" autocomplete="off" inputmode="text"></label>
      <div class="dice-mods">${[-2, -1, 1, 2, 5].map(n => `<button class="qbtn ${n < 0 ? "minus" : "plus"}" data-mod="${n}">${n < 0 ? "−" + Math.abs(n) : "+" + n}</button>`).join("")}</div>
      <div class="form-actions"><button class="btn ghost" data-clear>Очистить</button><button class="btn gold" data-go>${icon("d20")}Бросить</button></div>
      <p class="hint">Нажимай на кубы, чтобы собрать бросок, или впиши сам: 2d6+1d4+3. Окно не закрывается, можно бросать снова.</p>`
  });
  const input = m.body.querySelector("[data-expr]");
  const tray = m.body.querySelector("[data-tray]");
  const set = p => (input.value = p.dice.length || p.flat ? diceToString(p).replace(/−/g, "-") : "");
  const cur = () => parseDice(input.value) || { dice: [], flat: 0 };
  let timer = null;
  const roll = expr => {
    if (diceBusy()) return;
    if (!parseDice(expr)) return toast("Не понял бросок. Пример: 2d6+3", { kind: "bad" });
    const pending = throwExprs([expr]);
    if (pending) return pending.then(take => rollNow(expr, take ? take[0] : undefined));
    rollNow(expr);
  };
  const rollNow = (expr, take) => {
    const r = rollDice(expr, take);
    if (!r) return toast("Не понял бросок. Пример: 2d6+3", { kind: "bad" });
    clearTimeout(timer);
    logRoll({ label: "Бросок " + expr, text: String(r.total) });
    const one = r.rolls.length === 1 && r.rolls[0].f === 20 ? r.rolls[0].r : null;
    tray.classList.remove("empty", "crit-fx", "fumble-fx", "rolling");
    const land = () => {
      tray.classList.remove("rolling");
      tray.innerHTML = trayHtml(r, false);
      if (one === 20) {
        tray.classList.add("crit-fx");
        playSound("crit");
      } else if (one === 1) {
        tray.classList.add("fumble-fx");
        playSound("fumble");
      }
    };
    if (take) {
      landDice({ text: String(r.total), kind: one === 20 ? "crit" : one === 1 ? "fumble" : "" });
      return land();
    }
    playSound("roll", { dice: r.rolls.length });
    if (!fxSettings().anim || reduced()) return land();
    tray.classList.add("rolling");
    const start = Date.now();
    const tick = () => {
      if (!tray.isConnected) return;
      if (Date.now() - start >= 620) return land();
      tray.innerHTML = trayHtml(r, true);
      timer = setTimeout(tick, 70);
    };
    tick();
  };
  m.body.addEventListener("click", e => {
    const f = e.target.closest("[data-f]");
    if (f) {
      const p = cur();
      const face = Number(f.dataset.f);
      const d = p.dice.find(x => x.f === face && x.n > 0);
      if (d) d.n += 1;
      else p.dice.push({ n: 1, f: face });
      return set(p);
    }
    const md = e.target.closest("[data-mod]");
    if (md) {
      const p = cur();
      p.flat += Number(md.dataset.mod);
      return set(p);
    }
    if (e.target.closest("[data-clear]")) {
      clearTimeout(timer);
      tray.className = "dice-tray empty";
      tray.innerHTML = "<p>Собери бросок кнопками ниже и нажми «Бросить»</p>";
      return (input.value = "");
    }
    if (e.target.closest("[data-go]")) roll(input.value.trim() || "1d20");
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") m.body.querySelector("[data-go]").click();
  });
  return m;
}

export function critExpr(expr) {
  const p = parseDice(expr);
  if (!p) return expr;
  const dice = p.dice.map(d => `${d.n * 2}d${d.f}`).join("+");
  return dice + (p.flat ? (p.flat > 0 ? "+" : "") + p.flat : "");
}

export function maxFace(expr) {
  const p = parseDice(expr);
  if (!p || !p.dice.length) return 6;
  return Math.max(...p.dice.map(d => d.f));
}

const modalStack = [];
let armed = 0;
let armSeq = 0;
let backPending = false;
const idleWaiters = [];
let modalSeq = 0;

function arm() {
  if (armed || backPending) return;
  armed = ++armSeq;
  try {
    history.pushState({ dndModal: armed }, "");
  } catch {
    armed = 0;
  }
}

function disarmSoon() {
  setTimeout(() => {
    if (modalStack.length || !armed) return;
    const mine = !!(history.state && history.state.dndModal === armed);
    armed = 0;
    if (mine) {
      backPending = true;
      history.back();
      setTimeout(() => {
        if (backPending) settleBack();
      }, 600);
    }
  }, 0);
}

function settleBack() {
  backPending = false;
  if (modalStack.length) arm();
  idleWaiters.splice(0).forEach(fn => fn());
}

window.addEventListener("popstate", () => {
  if (backPending) return settleBack();
  const st = history.state;
  if (armed && !(st && st.dndModal === armed)) {
    armed = 0;
    const top = modalStack[modalStack.length - 1];
    if (top) top.close();
    if (modalStack.length) arm();
    return;
  }
  if (!armed && st && st.dndModal) history.replaceState(null, "");
});

export function whenHistoryIdle(fn) {
  if (backPending) idleWaiters.push(fn);
  else fn();
}

export function onModalEntry() {
  return !!(armed && history.state && history.state.dndModal === armed);
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function openModal({ title = "", body = "", wide = false, cls = "", onClose } = {}) {
  hideHoverCard();
  const opener = document.activeElement;
  const titleId = "mt" + ++modalSeq;
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal ${wide ? "wide" : ""} ${cls}" role="dialog" aria-modal="true" tabindex="-1" ${title ? `aria-labelledby="${titleId}"` : ""}>${title ? `<div class="modal-head"><h2 id="${titleId}">${esc(title)}</h2><button class="icon-btn" data-close title="Закрыть" aria-label="Закрыть">${icon("close")}</button></div>` : `<button class="icon-btn modal-x" data-close title="Закрыть" aria-label="Закрыть">${icon("close")}</button>`}<div class="modal-body"></div></div>`;
  const box = back.querySelector(".modal");
  const bodyEl = back.querySelector(".modal-body");
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);
  document.body.appendChild(back);
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => {
    back.classList.add("in");
    if (!box.contains(document.activeElement)) box.focus({ preventScroll: true });
  });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove("in");
    const i = modalStack.indexOf(api);
    if (i >= 0) modalStack.splice(i, 1);
    if (!modalStack.length) {
      document.body.classList.remove("no-scroll");
      disarmSoon();
    }
    setTimeout(() => back.remove(), 200);
    if (box.contains(document.activeElement)) {
      const fine = window.matchMedia("(pointer: fine)").matches;
      if (fine && opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
      else document.activeElement.blur();
    }
    onClose && onClose();
  };
  back.addEventListener("mousedown", e => {
    if (e.target === back) back.dataset.down = "1";
  });
  back.addEventListener("click", e => {
    if (e.target === back && back.dataset.down === "1") close();
    back.dataset.down = "";
    if (e.target.closest("[data-close]")) close();
  });
  const api = { el: back, body: bodyEl, close };
  modalStack.push(api);
  arm();
  return api;
}

document.addEventListener("keydown", e => {
  if (!modalStack.length) return;
  const top = modalStack[modalStack.length - 1];
  if (e.key === "Escape") {
    top.close();
    return;
  }
  if (e.key !== "Tab") return;
  const box = top.el.querySelector(".modal");
  const list = Array.from(box.querySelectorAll(FOCUSABLE)).filter(x => x.offsetParent !== null || x === document.activeElement);
  if (!list.length) {
    e.preventDefault();
    box.focus();
    return;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const inside = box.contains(document.activeElement);
  if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === box)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
    e.preventDefault();
    first.focus();
  }
});

export function closeAllModals() {
  modalStack.slice().forEach(m => m.close());
}

export function confirmDialog(text, { ok = "Да", danger = false } = {}) {
  return new Promise(resolve => {
    let answered = false;
    const m = openModal({
      title: "Подтверждение",
      body: `<p class="confirm-text">${esc(text)}</p><div class="form-actions"><button class="btn ghost" data-no>Отмена</button><button class="btn ${danger ? "danger" : "gold"}" data-yes>${esc(ok)}</button></div>`,
      onClose: () => !answered && resolve(false)
    });
    m.body.querySelector("[data-yes]").onclick = () => { answered = true; m.close(); resolve(true); };
    m.body.querySelector("[data-no]").onclick = () => { answered = true; m.close(); resolve(false); };
  });
}

export function promptNumber(title, { label = "", value = "", buttons, select = null }) {
  return new Promise(resolve => {
    let answered = false;
    const sel = select ? `<label class="fld"><span>${esc(select.label)}</span><select data-sel>${select.options.map(([k, l]) => `<option value="${esc(k)}" ${String(select.value ?? "") === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${select.hint ? `<small>${esc(select.hint)}</small>` : ""}</label>` : "";
    const m = openModal({
      title,
      cls: "small",
      body: `<label class="fld"><span>${esc(label)}</span><input type="number" inputmode="numeric" class="num-big" value="${esc(value)}"></label>${sel}<div class="form-actions">${buttons.map((b, i) => `<button class="btn ${b.cls || "gold"}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div>`,
      onClose: () => !answered && resolve(null)
    });
    const input = m.body.querySelector("input");
    const selEl = m.body.querySelector("[data-sel]");
    setTimeout(() => input.focus(), 50);
    const done = i => {
      answered = true;
      const v = Number(input.value);
      m.close();
      resolve({ value: Number.isFinite(v) ? v : 0, action: buttons[i].value, type: selEl ? selEl.value : "" });
    };
    m.body.querySelectorAll("[data-i]").forEach(b => (b.onclick = () => done(Number(b.dataset.i))));
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && buttons.length === 1) done(0);
    });
  });
}

export function damageLine(line, { showDie = true } = {}) {
  const dt = DAMAGE[line.type] || { name: line.type || "", color: "#cbbfa8", icon: "gi/lorc/magic-swirl" };
  return `<div class="dmg-line" style="--c:${dt.color}">${showDie ? `<span class="dmg-die">${die(maxFace(line.dice), dt.color, maxFace(line.dice))}</span>` : ""}<span class="dmg-text">${esc(line.prefix || "")}${esc(line.dice)} ${icon(dt.icon)} ${esc(dt.name)}${line.swapped ? ' <span class="swap-note">(было: ' + esc((DAMAGE[line.origType] || {}).name || "") + ")</span>" : ""}</span></div>`;
}

export function diceStack(lines) {
  if (!lines.length) return "";
  const dice = lines.slice(0, 3).map(l => {
    const dt = DAMAGE[l.type] || { color: "#cbbfa8" };
    return die(maxFace(l.dice), dt.color, maxFace(l.dice));
  }).join("");
  const texts = lines.map((l, i) => damageLine({ ...l, prefix: l.prefix || (i && l.or ? "или " : i ? "+" : "") }, { showDie: false })).join("");
  return `<div class="dice-block"><div class="dice-stack n${Math.min(3, lines.length)}">${dice}</div><div class="dice-texts">${texts}</div></div>`;
}

const FX_CORE = { "#ff8a3d": "#ffe98a", "#ff7a4a": "#ffe08a", "#ea5a73": "#ffc4dc", "#f0b75a": "#fff1b8", "#f4d66d": "#fffbe0" };

function mixTo(hex, to, k) {
  return "#" + [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + to * k).toString(16).padStart(2, "0")).join("");
}

export function artFx(fx, color, k = 1) {
  if (!fx || !/^#[0-9a-f]{6}$/i.test(color) || typeof document === "undefined" || typeof document.getElementById !== "function" || !document.body) return "";
  const c = color.toLowerCase();
  const id = `fx-${fx}-${c.slice(1)}${k === 1 ? "" : "-s"}`;
  if (document.getElementById(id)) return id;
  let host = document.getElementById("art-fx");
  if (!host) {
    host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.id = "art-fx";
    host.setAttribute("width", "0");
    host.setAttribute("height", "0");
    host.setAttribute("aria-hidden", "true");
    host.style.position = "absolute";
    document.body.appendChild(host);
  }
  const glow = `<feGaussianBlur in="SourceAlpha" stdDeviation="${3 * k}" result="g1"/><feGaussianBlur in="SourceAlpha" stdDeviation="${8 * k}" result="g2"/><feComponentTransfer in="g1" result="g1a"><feFuncA type="linear" slope=".6"/></feComponentTransfer><feComponentTransfer in="g2" result="g2a"><feFuncA type="linear" slope=".4"/></feComponentTransfer><feMerge result="gm"><feMergeNode in="g2a"/><feMergeNode in="g1a"/></feMerge><feFlood flood-color="${c}"/><feComposite in2="gm" operator="in" result="glow"/>`;
  const body = fx === "halo"
    ? `<feMorphology in="SourceAlpha" operator="dilate" radius="${6 * k}" result="d"/><feMorphology in="d" operator="erode" radius="${6 * k}" result="closed"/><feGaussianBlur in="closed" stdDeviation="${9 * k}" result="h0"/><feComponentTransfer in="h0" result="h1"><feFuncA type="linear" slope=".9"/></feComponentTransfer><feFlood flood-color="${c}"/><feComposite in2="h1" operator="in" result="halo"/><feFlood flood-color="${mixTo(c, 0, .92)}"/><feComposite in2="SourceAlpha" operator="in" result="body"/><feMerge><feMergeNode in="halo"/><feMergeNode in="body"/></feMerge>`
    : `${glow}<feFlood flood-color="${c}"/><feComposite in2="SourceAlpha" operator="in" result="rim"/><feGaussianBlur in="SourceAlpha" stdDeviation="${2.2 * k}" result="sb"/><feComponentTransfer in="sb" result="cm0"><feFuncA type="linear" slope="3.2" intercept="-1.75"/></feComponentTransfer><feComposite in="cm0" in2="SourceAlpha" operator="in" result="cm"/><feFlood flood-color="${FX_CORE[c] || mixTo(c, 255, .62)}"/><feComposite in2="cm" operator="in" result="core"/><feMerge><feMergeNode in="glow"/><feMergeNode in="rim"/><feMergeNode in="core"/></feMerge>`;
  host.insertAdjacentHTML("beforeend", `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">${body}</filter>`);
  return id;
}

export function card(m) {
  const fx = m.art ? artFx(m.art.fx, m.art.color || "") : "";
  const art = m.art ? `<div class="card-art${fx ? " fx" : ""}${m.art.fx === "flat" ? " flat" : ""}" style="--c:${m.art.color || "#e9c77a"}${fx ? `;--fx:url(#${fx})` : ""}">${icon(m.art.icon)}</div>` : "";
  const badges = (m.badges || []).filter(b => b && b.text).map(b => `<span class="badge" style="--c:${b.color || "#c9a35b"}">${esc(b.text)}</span>`).join("");
  const meta = (m.meta || []).filter(x => x && x.text).map(x => `<span class="meta-i">${icon(x.icon)}${esc(x.text)}</span>`).join("");
  const footer = (m.footer || []).filter(Boolean).map(f => `<span class="foot-i">${f.mark || ""}${esc(f.text)}</span>`).join("");
  const uses = m.uses ? `<div class="card-uses">${pips(m.uses.max, m.uses.left, m.usesColor)}<span>${m.uses.left} / ${m.uses.max}</span></div>` : "";
  return `<article class="bg-card" style="--rar:${m.rarityColor || "transparent"}">
    ${art}
    <header class="card-head"><h3>${esc(m.title)}</h3>${m.subtitle ? `<div class="card-sub">${esc(m.subtitle)}</div>` : ""}${badges ? `<div class="card-badges">${badges}</div>` : ""}</header>
    ${m.dice && m.dice.length ? diceStack(m.dice) : ""}
    ${m.stats ? `<div class="card-stats">${m.stats}</div>` : ""}
    ${m.body ? `<div class="card-desc">${m.body}</div>` : ""}
    ${m.effect ? `<div class="card-effect">${esc(m.effect)}</div>` : ""}
    ${uses}
    ${meta ? `<div class="card-meta">${meta}</div>` : ""}
    ${footer ? `<footer class="card-foot">${footer}</footer>` : ""}
  </article>`;
}

export function pips(max, left, color = "") {
  const n = Math.min(Number(max) || 0, 30);
  let out = "";
  for (let i = 0; i < n; i++) out += `<i class="pip ${i < left ? "on" : ""}"${color ? ` style="--c:${color}"` : ""}></i>`;
  return `<span class="pips">${out}</span>`;
}

export function actionFoot(actionKey) {
  const a = ACTIONS[actionKey];
  if (!a) return null;
  return { mark: actionMark(a.shape, a.color), text: a.name };
}

let hoverEl = null;
let hoverTarget = null;

export function hideHoverCard() {
  if (hoverEl) hoverEl.classList.remove("in");
  hoverTarget = null;
}

export function enableHoverCards(root, resolve) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const over = e => {
    const t = e.target.closest("[data-card]");
    if (!t || t === hoverTarget) return;
    if (document.querySelector(".modal-back")) return;
    const html = resolve(t.dataset.card);
    if (!html) return;
    hoverTarget = t;
    if (!hoverEl) {
      hoverEl = document.createElement("div");
      hoverEl.className = "hover-card";
      document.body.appendChild(hoverEl);
    }
    hoverEl.innerHTML = html;
    const r = t.getBoundingClientRect();
    const w = Math.min(420, window.innerWidth - 24);
    hoverEl.style.width = w + "px";
    let left = r.right + 12;
    if (left + w > window.innerWidth - 12) left = r.left - w - 12;
    if (left < 12) left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
    hoverEl.style.left = left + "px";
    hoverEl.style.top = "0px";
    hoverEl.classList.add("in");
    const h = hoverEl.offsetHeight;
    let top = r.top;
    if (top + h > window.innerHeight - 12) top = Math.max(12, window.innerHeight - h - 12);
    hoverEl.style.top = top + "px";
  };
  const out = e => {
    const t = e.target.closest("[data-card]");
    if (t && !t.contains(e.relatedTarget)) hideHoverCard();
  };
  root.addEventListener("mouseover", over);
  root.addEventListener("mouseout", out);
  window.addEventListener("scroll", hideHoverCard, { passive: true });
  return () => {
    root.removeEventListener("mouseover", over);
    root.removeEventListener("mouseout", out);
    window.removeEventListener("scroll", hideHoverCard);
    hideHoverCard();
  };
}

export function enableReorder(root, onDrop) {
  let drag = null;
  const down = e => {
    const h = e.target.closest(".drag-h");
    if (!h || !root.contains(h)) return;
    const item = h.closest("[data-rid]");
    const box = item && item.closest("[data-reorder]");
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    const r = item.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    ghost.classList.add("drag-ghost");
    Object.assign(ghost.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    document.body.appendChild(ghost);
    item.classList.add("drag-src");
    drag = { item, box, ghost, dx: e.clientX - r.left, dy: e.clientY - r.top, start: ids(box), id: e.pointerId, x: e.clientX, y: e.clientY };
    const tick = () => {
      if (!drag) return;
      const bar = root.querySelector(".order-bar");
      const top = Math.max(90, bar ? bar.getBoundingClientRect().bottom + 36 : 0);
      const edge = drag.y < top ? -1 : drag.y > window.innerHeight - 150 ? 1 : 0;
      if (edge) {
        window.scrollBy(0, edge * 12);
        place();
      }
      drag.raf = requestAnimationFrame(tick);
    };
    drag.raf = requestAnimationFrame(tick);
  };
  const place = () => {
    const under = document.elementFromPoint(drag.x, drag.y);
    const el = under && under.closest("[data-rid]");
    if (!el || el === drag.item || el.parentElement !== drag.box) return;
    const kids = Array.from(drag.box.children);
    if (kids.indexOf(el) > kids.indexOf(drag.item)) el.after(drag.item);
    else el.before(drag.item);
  };
  const ids = box => Array.from(box.children).filter(x => x.dataset && x.dataset.rid).map(x => x.dataset.rid);
  const move = e => {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.ghost.style.left = e.clientX - drag.dx + "px";
    drag.ghost.style.top = e.clientY - drag.dy + "px";
    place();
  };
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { item, box, ghost, start, raf } = drag;
    cancelAnimationFrame(raf);
    drag = null;
    ghost.remove();
    item.classList.remove("drag-src");
    const now = ids(box);
    if (now.join("|") !== start.join("|")) onDrop(box.dataset.reorder, now);
  };
  const key = e => {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const item = e.target.closest && e.target.closest("[data-reorder] > [data-rid]");
    if (!item || !root.contains(item) || !root.querySelector(".drag-h")) return;
    e.preventDefault();
    const box = item.parentElement;
    const start = ids(box);
    const back = e.key === "ArrowUp" || e.key === "ArrowLeft";
    const sib = back ? item.previousElementSibling : item.nextElementSibling;
    if (!sib || !sib.dataset.rid) return;
    if (back) sib.before(item);
    else sib.after(item);
    item.focus();
    onDrop(box.dataset.reorder, ids(box), start);
  };
  root.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  root.addEventListener("keydown", key);
  return () => {
    root.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    root.removeEventListener("keydown", key);
    if (drag) {
      cancelAnimationFrame(drag.raf);
      drag.ghost.remove();
    }
    drag = null;
  };
}

export function enableLongPress(root, onLong) {
  let timer = 0;
  let start = null;
  let suppress = false;
  const cancel = () => {
    clearTimeout(timer);
    timer = 0;
    start = null;
  };
  const down = e => {
    if (e.pointerType === "mouse" || e.button > 0) return;
    const t = e.target.closest("[data-card]");
    if (!t || !root.contains(t) || e.target.closest("input, textarea, select")) return;
    cancel();
    start = { x: e.clientX, y: e.clientY };
    timer = setTimeout(() => {
      timer = 0;
      suppress = true;
      setTimeout(() => (suppress = false), 700);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
      onLong(t.dataset.card, t);
    }, 480);
  };
  const move = e => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
  };
  const click = e => {
    if (!suppress) return;
    suppress = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const end = e => {
    if (suppress && e.cancelable) e.preventDefault();
  };
  const menu = e => {
    if (e.target.closest("[data-card]") && !e.target.closest("input, textarea, select") && (timer || suppress)) e.preventDefault();
  };
  root.addEventListener("pointerdown", down);
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerup", cancel);
  root.addEventListener("pointercancel", cancel);
  document.addEventListener("click", click, true);
  document.addEventListener("touchend", end, { passive: false, capture: true });
  root.addEventListener("contextmenu", menu);
  window.addEventListener("scroll", cancel, { passive: true });
  return () => {
    cancel();
    root.removeEventListener("pointerdown", down);
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerup", cancel);
    root.removeEventListener("pointercancel", cancel);
    document.removeEventListener("click", click, true);
    document.removeEventListener("touchend", end, { capture: true });
    root.removeEventListener("contextmenu", menu);
    window.removeEventListener("scroll", cancel);
  };
}

function optionList(options) {
  if (Array.isArray(options)) return options.map(o => (Array.isArray(o) ? o : [o, o]));
  return Object.entries(options).map(([k, v]) => [k, typeof v === "string" ? v : v.name]);
}

function fieldHtml(f, v) {
  const id = "f_" + f.key.replace(/\W/g, "_");
  const span = f.span ? ` style="grid-column: span ${f.span}"` : "";
  const hint = f.hint ? `<small>${esc(f.hint)}</small>` : "";
  if (f.type === "heading") return `<div class="fld-heading">${esc(f.label)}</div>`;
  if (f.type === "checkbox") {
    return `<label class="fld chk"${span}><input type="checkbox" data-k="${esc(f.key)}" ${v ? "checked" : ""}><span>${esc(f.label)}</span>${hint}</label>`;
  }
  if (f.type === "select") {
    const opts = optionList(f.options).map(([k, l]) => `<option value="${esc(k)}" ${String(v ?? "") === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("");
    return `<label class="fld"${span} for="${id}"><span>${esc(f.label)}</span><select id="${id}" data-k="${esc(f.key)}">${opts}</select>${hint}</label>`;
  }
  if (f.type === "textarea") {
    return `<label class="fld"${span} for="${id}"><span>${esc(f.label)}</span><textarea id="${id}" data-k="${esc(f.key)}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || "")}">${esc(v ?? "")}</textarea>${hint}</label>`;
  }
  if (f.type === "flags") {
    const set = new Set(Array.isArray(v) ? v : []);
    return `<fieldset class="fld types"${span} data-k="${esc(f.key)}" data-flags><legend>${esc(f.label)}</legend><div class="type-chips">${f.options.map(([k, l]) => `<label class="type-chip" style="--c:#e9c77a"><input type="checkbox" value="${esc(k)}" ${set.has(k) ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}</div>${hint}</fieldset>`;
  }
  if (f.type === "types") {
    const set = new Set(Array.isArray(v) ? v : []);
    return `<fieldset class="fld types"${span} data-k="${esc(f.key)}" data-types><legend>${esc(f.label)}</legend><div class="type-chips">${DAMAGE_TYPES.map(k => `<label class="type-chip" style="--c:${DAMAGE[k].color}"><input type="checkbox" value="${k}" ${set.has(k) ? "checked" : ""}>${icon(DAMAGE[k].icon)}<span>${esc(DAMAGE[k].name)}</span></label>`).join("")}</div>${hint}</fieldset>`;
  }
  if (f.type === "icon") {
    const cur = String(v || "");
    return `<fieldset class="fld icons"${span} data-k="${esc(f.key)}" data-icons data-name="${esc(id)}"><legend>${esc(f.label)}</legend><label class="search-box icon-q">${icon("search")}<input type="search" data-icon-q placeholder="Найти: меч, огонь, щит, книга" aria-label="Найти иконку"></label><div class="icon-grid">${iconOpts(id, cur, ICON_NAMES.slice(0, 60))}</div></fieldset>`;
  }
  if (f.type === "richtext") {
    return `<div class="fld rt-field"${span}><label for="${id}">${esc(f.label)}</label><div class="rt-bar" role="toolbar" aria-label="Форматирование">${RT_TOOLS.map(([k, html, t]) => `<button type="button" class="rt-btn" data-rt="${k}" title="${esc(t)}" aria-label="${esc(t)}">${html}</button>`).join("")}<span class="spacer"></span><button type="button" class="rt-btn rt-prev" data-rt-preview aria-pressed="false">Просмотр</button></div><textarea id="${id}" data-k="${esc(f.key)}" rows="${f.rows || 10}" placeholder="${esc(f.placeholder || "")}">${esc(v ?? "")}</textarea><div class="rt-preview note-text" hidden></div>${hint}</div>`;
  }
  if (f.type === "dicelist") {
    const rows = (Array.isArray(v) ? v : []).map(d => diceRow(d)).join("");
    return `<div class="fld dicelist"${span} data-k="${esc(f.key)}" data-dl><span>${esc(f.label)}</span><div class="dl-rows">${rows}</div><button type="button" class="btn ghost sm" data-dl-add>${icon("plus")} Добавить кубы</button>${hint}</div>`;
  }
  const type = f.type === "number" ? "number" : "text";
  const list = f.suggest ? `<datalist id="${id}_dl">${f.suggest.map(o => `<option value="${esc(o)}"></option>`).join("")}</datalist>` : "";
  return `<label class="fld"${span} for="${id}"><span>${esc(f.label)}</span><input id="${id}" type="${type}" ${type === "number" ? 'inputmode="decimal" step="any"' : ""} ${list ? `list="${id}_dl"` : ""} ${f.max ? `maxlength="${f.max}"` : ""} data-k="${esc(f.key)}" value="${esc(v ?? "")}" placeholder="${esc(f.placeholder || "")}">${list}${hint}</label>`;
}

const RT_TOOLS = [
  ["h", "<b>З</b>", "Заголовок"],
  ["bold", "<b>Ж</b>", "Жирный"],
  ["italic", "<i>К</i>", "Курсив"],
  ["under", "<u>Ч</u>", "Подчёркнутый"],
  ["strike", "<s>З</s>", "Зачёркнутый"],
  ["mark", "<mark>М</mark>", "Выделить маркером"],
  ["list", "•", "Список"],
  ["num", "1.", "Нумерованный список"],
  ["todo", "☐", "Список дел"],
  ["quote", "❝", "Цитата"],
  ["hr", "―", "Разделитель"],
  ["link", "[[ ]]", "Ссылка на заметку"]
];

const RT_WRAP = { bold: "**", italic: "*", under: "__", strike: "~~", mark: "==" };
const RT_PREFIX = { h: "## ", list: "- ", num: "1. ", quote: "> ", todo: "- [ ] " };

function replaceText(ta, start, end, text, selStart, selEnd) {
  ta.focus();
  ta.setSelectionRange(start, end);
  let ok = false;
  try {
    ok = document.execCommand("insertText", false, text);
  } catch {}
  if (!ok || ta.value.slice(start, start + text.length) !== text) ta.setRangeText(text, start, end, "end");
  ta.setSelectionRange(selStart, selEnd);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}

export function applyFormat(ta, kind) {
  const value = ta.value;
  const a = ta.selectionStart;
  const b = ta.selectionEnd;
  const wrap = RT_WRAP[kind];
  if (wrap) {
    const sel = value.slice(a, b);
    if (sel.startsWith(wrap) && sel.endsWith(wrap) && sel.length >= wrap.length * 2) {
      const inner = sel.slice(wrap.length, sel.length - wrap.length);
      return replaceText(ta, a, b, inner, a, a + inner.length);
    }
    const text = sel || "текст";
    return replaceText(ta, a, b, wrap + text + wrap, a + wrap.length, a + wrap.length + text.length);
  }
  if (kind === "link") {
    const sel = value.slice(a, b);
    const text = `[[${sel}`;
    return sel ? replaceText(ta, a, b, `[[${sel}]]`, a + sel.length + 4, a + sel.length + 4) : replaceText(ta, a, b, text, a + text.length, a + text.length);
  }
  if (kind === "hr") {
    const before = a > 0 && value[a - 1] !== "\n" ? "\n" : "";
    const text = `${before}\n---\n\n`;
    return replaceText(ta, b, b, text, b + text.length, b + text.length);
  }
  const prefix = RT_PREFIX[kind];
  if (!prefix) return;
  const ls = value.lastIndexOf("\n", a - 1) + 1;
  let le = value.indexOf("\n", Math.max(a, b - (b > a && value[b - 1] === "\n" ? 1 : 0)));
  if (le < 0) le = value.length;
  const lines = value.slice(ls, le).split("\n");
  const pattern = kind === "num" ? /^\d+[.)]\s/ : null;
  const has = l => (pattern ? pattern.test(l) : l.startsWith(prefix));
  const strip = l => (pattern ? l.replace(pattern, "") : l.slice(prefix.length));
  const all = lines.every(l => !l.trim() || has(l));
  const out = lines.map((l, i) => (all ? (has(l) ? strip(l) : l) : !l.trim() && lines.length > 1 ? l : (kind === "num" ? `${i + 1}. ` : prefix) + l.replace(/^(#{1,3}\s|-\s\[( |x|х)\]\s|[-*•]\s|>\s?|\d+[.)]\s)/i, ""))).join("\n");
  replaceText(ta, ls, le, out, ls, ls + out.length);
}

function diceRow(d = {}) {
  const opts = Object.entries(DAMAGE).map(([k, t]) => `<option value="${k}" ${d.type === k ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  return `<div class="dl-row"><input type="text" placeholder="2d8" value="${esc(d.dice || "")}" data-dl-dice><select data-dl-type>${opts}</select><label class="mini-chk" title="Прибавлять модификатор заклинательной характеристики"><input type="checkbox" data-dl-mod ${d.addMod ? "checked" : ""}>+мод</label><button type="button" class="icon-btn" data-dl-rm>${icon("close")}</button></div>`;
}

const lnorm = s => String(s ?? "").toLowerCase().replace(/ё/g, "е");

export function attachLinkSuggest(ta, getTargets) {
  if (!ta || ta.dataset.linkSuggest) return;
  ta.dataset.linkSuggest = "1";
  const box = document.createElement("div");
  box.className = "rt-suggest";
  box.hidden = true;
  box.setAttribute("role", "listbox");
  ta.after(box);
  let items = [];
  let active = 0;
  let start = -1;
  const hide = () => {
    box.hidden = true;
    items = [];
  };
  const pick = i => {
    const it = items[i];
    if (!it) return;
    const end = ta.selectionStart;
    const after = ta.value.slice(end, end + 2) === "]]" ? 2 : 0;
    const text = `[[${it.title}]]`;
    hide();
    replaceText(ta, start, end + after, text, start + text.length, start + text.length);
  };
  const draw = () => {
    box.innerHTML = items.map((it, i) => `<button type="button" class="rt-sg ${i === active ? "on" : ""}" data-sg="${i}" role="option" aria-selected="${i === active ? "true" : "false"}"><b>${esc(it.title)}</b><small>${esc(it.sub || "")}</small></button>`).join("");
  };
  const update = () => {
    const before = ta.value.slice(0, ta.selectionStart);
    const m = before.match(/\[\[([^\]\n|]{0,40})$/);
    if (!m || ta.selectionStart !== ta.selectionEnd) return hide();
    start = ta.selectionStart - m[0].length;
    const q = lnorm(m[1]).trim();
    const all = (getTargets() || []).map(t => ({ title: t.title, sub: t.secName + (t.aliases && t.aliases.length ? ` · ${t.aliases.join(", ")}` : ""), keys: [t.title, ...(t.aliases || [])].map(lnorm) }));
    const starts = all.filter(t => !q || t.keys.some(k => k.startsWith(q)));
    const inside = q ? all.filter(t => !starts.includes(t) && t.keys.some(k => k.includes(q))) : [];
    items = [...starts, ...inside].slice(0, 8);
    if (q && !all.some(t => t.keys.includes(q))) items.push({ title: m[1].trim(), sub: "новая ссылка: заметку можно создать потом" });
    if (!items.length) return hide();
    active = Math.min(active, items.length - 1);
    draw();
    box.hidden = false;
  };
  ta.addEventListener("input", () => {
    active = 0;
    update();
  });
  ta.addEventListener("click", update);
  ta.addEventListener("blur", () => setTimeout(hide, 150));
  ta.addEventListener("keydown", e => {
    if (box.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
      return draw();
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      return pick(active);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hide();
    }
  });
  box.addEventListener("pointerdown", e => e.preventDefault());
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-sg]");
    if (b) pick(Number(b.dataset.sg));
  });
}

function iconOpts(name, cur, keys) {
  const opt = (k, inner, t) => `<label class="icon-opt" title="${esc(t)}"><input type="radio" name="${esc(name)}" value="${esc(k)}" ${cur === k ? "checked" : ""} aria-label="${esc(t)}">${inner}</label>`;
  const list = [...new Set([...(cur ? [cur] : []), ...keys])];
  return opt("", "<span>Авто</span>", "Подобрать по названию") + list.map(k => opt(k, icon(k), k)).join("");
}

let pickerIndex = null;
function loadPicker() {
  pickerIndex ??= fetch("assets/icons/picker.json").then(r => r.json()).catch(() => {
    pickerIndex = null;
    return [];
  });
  return pickerIndex;
}

async function searchIcons(box, q) {
  const words = q.toLowerCase().replace(/ё/g, "е").split(/\s+/).filter(Boolean);
  const grid = box.querySelector(".icon-grid");
  const ch = box.querySelector("input:checked");
  const cur = ch ? ch.value : "";
  let keys = ICON_NAMES.slice(0, 60);
  if (words.length) {
    const idx = await loadPicker();
    keys = idx.filter(([k, t]) => words.every(w => (t + " " + k).replace(/ё/g, "е").includes(w))).map(x => x[0]).slice(0, 80);
  }
  grid.innerHTML = iconOpts(box.dataset.name, cur, keys) + (words.length && !keys.length ? `<p class="hint small icon-none">Ничего не нашлось</p>` : "");
}

export function openForm({ title, fields, value = {}, onSave, onDelete, saveLabel = "Сохранить", extra = "" }) {
  const form = document.createElement("form");
  form.className = "form-grid";
  form.innerHTML = fields.map(f => fieldHtml(f, getPath(value, f.key))).join("") + extra +
    `<div class="form-actions" style="grid-column: 1 / -1">${onDelete ? `<button type="button" class="btn danger" data-del>${icon("trash")} Удалить</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-close>Отмена</button><button type="submit" class="btn gold">${esc(saveLabel)}</button></div>`;
  const m = openModal({ title, body: form, wide: fields.length > 8 || fields.some(f => f.type === "richtext") });
  fields.filter(f => f.type === "richtext" && f.links).forEach(f => attachLinkSuggest(form.querySelector(`[data-k="${CSS.escape(f.key)}"]`), f.links));
  form.addEventListener("pointerdown", e => {
    if (e.target.closest("[data-rt]")) e.preventDefault();
  });
  let iconTimer = 0;
  form.addEventListener("input", e => {
    const q = e.target.closest("[data-icon-q]");
    if (!q) return;
    clearTimeout(iconTimer);
    iconTimer = setTimeout(() => searchIcons(q.closest("[data-icons]"), q.value), 150);
  });
  form.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.closest("[data-icon-q]")) e.preventDefault();
  });
  form.addEventListener("click", e => {
    const rt = e.target.closest("[data-rt]");
    if (rt) {
      const ta = rt.closest(".rt-field").querySelector("textarea");
      if (!ta.hidden) applyFormat(ta, rt.dataset.rt);
      return;
    }
    const pv = e.target.closest("[data-rt-preview]");
    if (pv) {
      const box = pv.closest(".rt-field");
      const ta = box.querySelector("textarea");
      const prev = box.querySelector(".rt-preview");
      const on = prev.hidden;
      if (on) {
        prev.innerHTML = rich(ta.value) || `<p class="empty">Пусто</p>`;
        prev.style.minHeight = ta.offsetHeight + "px";
      }
      prev.hidden = !on;
      ta.hidden = on;
      pv.setAttribute("aria-pressed", String(on));
      pv.classList.toggle("on", on);
      box.querySelectorAll("[data-rt]").forEach(b => (b.disabled = on));
      return;
    }
    if (e.target.closest("[data-dl-add]")) {
      e.target.closest("[data-dl]").querySelector(".dl-rows").insertAdjacentHTML("beforeend", diceRow({ type: "fire" }));
    }
    if (e.target.closest("[data-dl-rm]")) e.target.closest(".dl-row").remove();
  });
  let submitted = false;
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (submitted) return;
    const out = JSON.parse(JSON.stringify(value));
    for (const f of fields) {
      if (f.type === "heading") continue;
      if (f.type === "icon") {
        const ch = form.querySelector(`[data-icons][data-k="${CSS.escape(f.key)}"] input:checked`);
        setPath(out, f.key, ch ? ch.value : "");
        continue;
      }
      if (f.type === "flags") {
        const box = form.querySelector(`[data-flags][data-k="${CSS.escape(f.key)}"]`);
        setPath(out, f.key, Array.from(box.querySelectorAll("input:checked")).map(i => i.value));
        continue;
      }
      if (f.type === "types") {
        const box = form.querySelector(`[data-types][data-k="${CSS.escape(f.key)}"]`);
        setPath(out, f.key, Array.from(box.querySelectorAll("input:checked")).map(i => i.value));
        continue;
      }
      if (f.type === "dicelist") {
        const box = form.querySelector(`[data-dl][data-k="${CSS.escape(f.key)}"]`);
        const list = Array.from(box.querySelectorAll(".dl-row")).map(r => ({
          dice: r.querySelector("[data-dl-dice]").value.trim(),
          type: r.querySelector("[data-dl-type]").value,
          addMod: r.querySelector("[data-dl-mod]").checked
        })).filter(x => x.dice);
        setPath(out, f.key, list);
        continue;
      }
      const el = form.querySelector(`[data-k="${CSS.escape(f.key)}"]`);
      if (!el) continue;
      let v;
      if (f.type === "checkbox") v = el.checked;
      else if (f.type === "number") v = el.value === "" ? (f.nullable ? null : 0) : Number(el.value);
      else v = el.value;
      setPath(out, f.key, v);
    }
    const res = onSave(out);
    if (res !== false) {
      submitted = true;
      m.close();
    }
  });
  const del = form.querySelector("[data-del]");
  if (del) {
    del.onclick = async () => {
      if (await confirmDialog("Удалить без возможности вернуть? (Старая версия останется в истории изменений)", { ok: "Удалить", danger: true })) {
        onDelete();
        m.close();
      }
    };
  }
  setTimeout(() => {
    const first = form.querySelector("input[type=text], textarea");
    if (first && window.matchMedia("(pointer: fine)").matches) first.focus();
  }, 60);
  return m;
}

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

export function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "только что";
  if (s < 3600) return Math.floor(s / 60) + " мин назад";
  if (s < 86400) return Math.floor(s / 3600) + " ч назад";
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(ts, seconds = false) {
  return new Date(ts).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

export function openBoard(source, name = "") {
  const m = openModal({ cls: "tpl-board", wide: true, body: `<div class="board-wait">${icon("d20")}<span>Открываю доску...</span></div>` });
  const fail = () => {
    m.close();
    toast("Доску не удалось загрузить", { kind: "bad" });
  };
  Promise.resolve(source).then(src => {
    if (!src) return fail();
    m.body.innerHTML = `<div class="bz"><img src="${esc(src)}" alt="${esc(name ? "Доска персонажа: " + name : "Доска персонажа")}" draggable="false"></div><p class="bz-hint">Два пальца, двойное касание или колёсико: приблизить</p>`;
    zoomable(m.body.querySelector(".bz"));
  }, fail);
  return m;
}

function zoomable(box) {
  const img = box.querySelector("img");
  const pts = new Map();
  let s = 1, x = 0, y = 0, prevDist = 0, moved = 0, lastTap = 0;
  const apply = () => {
    img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    box.classList.toggle("zoomed", s > 1.01);
  };
  const clamp = () => {
    if (s <= 1.01) {
      s = 1;
      x = 0;
      y = 0;
      return;
    }
    const r = box.getBoundingClientRect();
    const mx = Math.max(0, (img.offsetWidth * s - r.width) / 2);
    const my = Math.max(0, (img.offsetHeight * s - r.height) / 2);
    x = Math.max(-mx, Math.min(mx, x));
    y = Math.max(-my, Math.min(my, y));
  };
  const zoomAt = (next, cx, cy) => {
    const r = box.getBoundingClientRect();
    const px = cx - r.left - r.width / 2;
    const py = cy - r.top - r.height / 2;
    const ns = Math.max(1, Math.min(5, next));
    x = px - ((px - x) * ns) / s;
    y = py - ((py - y) * ns) / s;
    s = ns;
    clamp();
    apply();
  };
  const toggle = (cx, cy) => (s > 1.01 ? zoomAt(1, cx, cy) : zoomAt(2.5, cx, cy));
  const pair = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  };
  box.addEventListener("pointerdown", e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    box.setPointerCapture(e.pointerId);
    moved = 0;
    if (pts.size === 2) prevDist = pair().d;
  });
  box.addEventListener("pointermove", e => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2) {
      const q = pair();
      if (prevDist) zoomAt(s * (q.d / prevDist), q.cx, q.cy);
      prevDist = q.d;
    } else if (pts.size === 1 && s > 1) {
      x += dx;
      y += dy;
      clamp();
      apply();
    }
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    const single = pts.size === 1;
    pts.delete(e.pointerId);
    prevDist = 0;
    if (!single || moved > 12 || e.pointerType === "mouse") return;
    const now = Date.now();
    if (now - lastTap < 320) {
      lastTap = 0;
      toggle(e.clientX, e.clientY);
    } else lastTap = now;
  };
  box.addEventListener("pointerup", up);
  box.addEventListener("pointercancel", up);
  box.addEventListener("dblclick", e => toggle(e.clientX, e.clientY));
  box.addEventListener("wheel", e => {
    e.preventDefault();
    zoomAt(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
  }, { passive: false });
}

export async function compressImage(file, { max = 1600, limit = 900000 } = {}) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const q of [0.86, 0.78, 0.7, 0.6]) {
        let data = canvas.toDataURL("image/webp", q);
        if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", q);
        if (data.length <= limit) return data;
      }
      scale *= 0.8;
    }
    return "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encodeCanvas(canvas, quality = 0.85) {
  let data = canvas.toDataURL("image/webp", quality);
  if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", quality);
  let q = quality;
  while (data.length > 260000 && q > 0.4) {
    q -= 0.1;
    data = canvas.toDataURL("image/jpeg", q);
  }
  return data;
}

export async function cropImage(source, { aspect = 5 / 6, outW = 520, title = "Кадр портрета" } = {}) {
  const owned = typeof source !== "string";
  const url = owned ? URL.createObjectURL(source) : source;
  let img;
  try {
    img = await loadImage(url);
  } catch (e) {
    if (owned) URL.revokeObjectURL(url);
    throw e;
  }
  return new Promise(resolve => {
    let done = false;
    const m = openModal({
      title,
      cls: "small",
      onClose: () => {
        if (owned) setTimeout(() => URL.revokeObjectURL(url), 300);
        if (!done) resolve(null);
      },
      body: `<div class="crop">
          <div class="crop-frame" style="aspect-ratio:${aspect}"><img alt="" draggable="false"><span class="crop-grid"></span></div>
          <div class="crop-zoom">${icon("minus")}<input type="range" min="1" max="4" step="0.01" value="1" aria-label="Масштаб">${icon("plus")}</div>
          <p class="hint">Двигай картинку пальцем или мышью. Масштаб: ползунок, колёсико мыши или два пальца.</p>
          <div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn gold" data-ok>${icon("check")}Сохранить</button></div>
        </div>`
    });
    const frame = m.body.querySelector(".crop-frame");
    const el = frame.querySelector("img");
    const range = m.body.querySelector("input[type=range]");
    el.src = img.src;
    let W = 0, H = 0, base = 1, zoom = 1, x = 0, y = 0;
    const scale = () => base * zoom;
    const clamp = () => {
      const s = scale();
      x = Math.min(0, Math.max(W - img.naturalWidth * s, x));
      y = Math.min(0, Math.max(H - img.naturalHeight * s, y));
    };
    const paint = () => {
      const s = scale();
      el.style.width = img.naturalWidth * s + "px";
      el.style.height = img.naturalHeight * s + "px";
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const measure = () => {
      const r = frame.getBoundingClientRect();
      const cx = W ? (W / 2 - x) / scale() : img.naturalWidth / 2;
      const cy = H ? (H / 2 - y) / scale() : img.naturalHeight / 2;
      W = r.width;
      H = r.height;
      base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      x = W / 2 - cx * scale();
      y = H / 2 - cy * scale();
      clamp();
      paint();
    };
    const setZoom = (z, px = W / 2, py = H / 2) => {
      const nz = Math.min(4, Math.max(1, z));
      const ix = (px - x) / scale();
      const iy = (py - y) / scale();
      zoom = nz;
      x = px - ix * scale();
      y = py - iy * scale();
      clamp();
      paint();
      range.value = String(zoom);
      range.style.setProperty("--p", ((zoom - 1) / 3) * 100 + "%");
    };
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(frame);
    const pts = new Map();
    let pinch = null;
    frame.addEventListener("pointerdown", e => {
      frame.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      }
    });
    frame.addEventListener("pointermove", e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const r = frame.getBoundingClientRect();
        setZoom(pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d)), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        return;
      }
      x += dx;
      y += dy;
      clamp();
      paint();
    });
    const up = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
    };
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);
    frame.addEventListener("wheel", e => {
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    range.addEventListener("input", () => setZoom(Number(range.value)));
    m.body.querySelector("[data-ok]").onclick = () => {
      const s = scale();
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, -x / s, -y / s, W / s, H / s, 0, 0, outW, outH);
      done = true;
      ro.disconnect();
      m.close();
      resolve(encodeCanvas(canvas));
    };
  });
}

export function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}
