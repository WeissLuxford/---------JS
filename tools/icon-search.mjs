export const PACK_ORDER = ["gi", "tw", "own", "logo", "sr"];

export function norm(s) {
  return String(s || "").toLowerCase().replace(/ё/g, "е");
}

export function stem(w) {
  if (w.length >= 8) return w.slice(0, -2);
  if (w.length >= 4) return w.slice(0, -1);
  return w;
}

function words(s) {
  return norm(s).split(/[^a-zа-я0-9]+/).filter(Boolean);
}

export function prepare(catalog) {
  const themes = Object.fromEntries(catalog.themes.map(t => [t.key, t]));
  for (const i of catalog.icons) {
    i._en = words(i.name);
    i._ru = words(i.ru);
    i._tags = (i.tags || []).flatMap(words);
    i._th = (i.themes || []).flatMap(k => [k, ...words(themes[k]?.ru)]);
    i._misc = words([i.pack, i.author, i.group].join(" "));
  }
  return catalog;
}

function hit(list, q, s, exact, part) {
  let best = 0;
  for (const w of list) {
    if (w === q) return exact;
    if (w.startsWith(s) || (w.length >= 4 && q.startsWith(w))) best = part;
  }
  return best;
}

export function score(i, tokens) {
  let total = 0;
  for (const q of tokens) {
    const s = stem(q);
    const v = Math.max(
      hit(i._en, q, s, 10, 6),
      hit(i._ru, q, s, 9, 6),
      hit(i._th, q, s, 4, 3),
      hit(i._tags, q, s, 3, 2),
      hit(i._misc, q, s, 2, 1)
    );
    if (!v) return 0;
    total += v;
  }
  return total + 3 / Math.max(1, i._en.length);
}

export function search(catalog, query = "", opt = {}) {
  const tokens = words(query);
  const packs = opt.packs?.length ? opt.packs : null;
  const theme = opt.theme || null;
  const hide = opt.all ? [] : ["face", "offstyle"].filter(f => !(theme === "offstyle" && f === "offstyle") && !(theme === "people" && f === "face"));
  const out = [];
  for (const i of catalog.icons) {
    if (packs && !packs.includes(i.pack)) continue;
    if (theme && !i.themes.includes(theme)) continue;
    if (!opt.dups && i.dup) continue;
    if (hide.some(f => i.flags.includes(f))) continue;
    const sc = tokens.length ? score(i, tokens) : 1;
    if (sc) out.push([sc, i]);
  }
  out.sort((a, b) => b[0] - a[0] || PACK_ORDER.indexOf(a[1].pack) - PACK_ORDER.indexOf(b[1].pack) || a[1].name.localeCompare(b[1].name));
  return out.map(x => x[1]);
}
