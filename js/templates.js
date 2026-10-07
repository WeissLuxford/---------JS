import { normalize } from "./rules.js";

let cache = null;

const asset = v => (typeof v === "string" && /^assets\/templates\/[a-z0-9-]+\.webp$/.test(v) ? v : "");

export async function loadTemplates() {
  if (cache) return cache;
  const res = await fetch(new URL("../data/templates.json", import.meta.url));
  if (!res.ok) throw new Error("templates");
  const raw = await res.json();
  cache = (Array.isArray(raw) ? raw : []).filter(t => t && typeof t.key === "string" && t.c && typeof t.c === "object").map(t => ({ key: t.key, icon: String(t.icon || "user"), blurb: String(t.blurb || ""), art: asset(t.art), board: asset(t.board), c: normalize(t.c) }));
  return cache;
}

export function templateCopy(t) {
  const c = normalize(JSON.parse(JSON.stringify(t.c)));
  c.archived = false;
  return c;
}
