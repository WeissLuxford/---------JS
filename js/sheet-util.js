import { ABILITIES, ACCENTS } from "./rules.js";

export const SNAPSHOT_GAP = 10 * 60 * 1000;
export const lastSnapshot = new Map();
export const clone = v => JSON.parse(JSON.stringify(v));
export const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || k;
export const META = ["updatedAt", "createdAt", "updatedBy", "id"];

export function sameContent(a, b) {
  const strip = x => {
    const y = { ...x };
    META.forEach(k => delete y[k]);
    return JSON.stringify(y);
  };
  return strip(a) === strip(b);
}

export const UI_PREFS = "dnd.ui";

export function loadUiPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(UI_PREFS) || "{}");
    return { invSort: typeof p.invSort === "string" ? p.invSort : "added", invEqFirst: p.invEqFirst !== false };
  } catch {
    return { invSort: "added", invEqFirst: true };
  }
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function accentStyle(key) {
  if (!key || key === "gold" || !ACCENTS[key]) return "";
  const [a, b, c] = ACCENTS[key].c;
  return `--gold:${a};--gold-2:${b};--gold-3:${c};--line:${rgba(a, 0.24)};--line-2:${rgba(a, 0.45)}`;
}

const ACCENT_VARS = ["--gold", "--gold-2", "--gold-3", "--line", "--line-2"];

export function applyAccent(key) {
  const st = document.documentElement.style;
  ACCENT_VARS.forEach(v => st.removeProperty(v));
  accentStyle(key).split(";").filter(Boolean).forEach(x => {
    const i = x.indexOf(":");
    st.setProperty(x.slice(0, i), x.slice(i + 1));
  });
}

export function loadJson(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function loadTurn(id) {
  try {
    const t = JSON.parse(localStorage.getItem("dnd.turn." + id) || "{}");
    return { action: !!t.action, bonus: !!t.bonus, reaction: !!t.reaction };
  } catch {
    return { action: false, bonus: false, reaction: false };
  }
}

export function saveUiPrefs(ui) {
  try {
    localStorage.setItem(UI_PREFS, JSON.stringify({ invSort: ui.invSort, invEqFirst: ui.invEqFirst }));
  } catch {}
}
