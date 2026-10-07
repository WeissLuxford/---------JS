import { normalize } from "./rules.js";

let cache = null;

const asset = v => (typeof v === "string" && /^assets\/templates\/[a-z0-9-]+\.webp$/.test(v) ? v : "");

export async function loadTemplates() {
  if (cache) return cache;
  const res = await fetch(new URL("../data/templates.json", import.meta.url));
  if (!res.ok) throw new Error("templates");
  const raw = await res.json();
  cache = (Array.isArray(raw) ? raw : []).filter(t => t && typeof t.key === "string" && t.c && typeof t.c === "object").map(t => ({ key: t.key, icon: String(t.icon || "user"), blurb: String(t.blurb || ""), art: asset(t.art), board: asset(t.board), portrait: asset(t.portrait), c: normalize(t.c) }));
  return cache;
}

async function portraitData(path) {
  try {
    const res = await fetch(new URL("../" + path, import.meta.url));
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise(ok => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result || ""));
      r.onerror = () => ok("");
      r.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function templateCopy(t) {
  const c = normalize(JSON.parse(JSON.stringify(t.c)));
  c.archived = false;
  if (!c.portrait && t.portrait) c.portrait = normalize({ ...c, portrait: await portraitData(t.portrait) }).portrait;
  return c;
}
