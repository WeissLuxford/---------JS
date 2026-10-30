import { confirmDialog, toast, esc } from "./ui.js";
import { icon } from "./icons.js";
import { normalize } from "./rules.js";

export const KIRION_ID = "kirion-thorndike";

const GIFTS = {
  spells: ["sp-kania-seal"],
  features: ["g-spell-recognition"],
  drop: { features: ["g-contract-genius"] },
  notes: { patron: ["n-patron-campaign"], places: ["pl-crownspire"], misc: ["n-dm-rules", "n-law-magic", "n-law-crime"] }
};

const has = (list, id) => Array.isArray(list) && list.some(x => x && x.id === id);

export function giftsMissing(c) {
  if (!c) return false;
  if (GIFTS.spells.some(id => !has(c.spells, id))) return true;
  if (GIFTS.features.some(id => !has(c.features, id))) return true;
  const notes = c.notes && typeof c.notes === "object" ? c.notes : {};
  return Object.entries(GIFTS.notes).some(([k, ids]) => ids.some(id => !has(notes[k], id)));
}

export function giftsAvailable(X) {
  const r = X.rights();
  return X.id === KIRION_ID && (r.role === "owner" || r.role === "open") && !X.S.preview && giftsMissing(X.S.c);
}

export function applyGifts(c, seed) {
  const added = [];
  c.spells = Array.isArray(c.spells) ? c.spells : [];
  c.features = Array.isArray(c.features) ? c.features : [];
  for (const id of GIFTS.spells) {
    const sp = (seed.spells || []).find(x => x.id === id);
    if (sp && !has(c.spells, id)) {
      c.spells.push(sp);
      added.push(sp.name);
    }
  }
  const drop = GIFTS.drop.features;
  const before = c.features.length;
  c.features = c.features.filter(f => !drop.includes(f.id) && !(f.nameEn === "Contract Genius"));
  const dropped = before - c.features.length;
  for (const id of GIFTS.features) {
    const f = (seed.features || []).find(x => x.id === id);
    if (f && !has(c.features, id)) {
      c.features.push(f);
      added.push(f.name);
    }
  }
  if (!c.notes || typeof c.notes !== "object" || Array.isArray(c.notes)) c.notes = {};
  for (const [k, ids] of Object.entries(GIFTS.notes)) {
    if (!Array.isArray(c.notes[k])) c.notes[k] = [];
    for (const id of ids) {
      const n = ((seed.notes || {})[k] || []).find(x => x.id === id);
      if (n && !has(c.notes[k], id)) {
        c.notes[k].push(n);
        added.push(n.title);
      }
    }
  }
  return { added, dropped };
}

export async function runDmGifts(X) {
  if (!giftsAvailable(X)) return;
  const ok = await confirmDialog("Добавить в лист дары и заметки Мастера: Печать Кании, умение «Узнавание заклинаний» (вместо Гения договоров), заметки о Кроунспайре, Мефистофеле, правилах и законах? То, что уже есть, не трогается. Можно отменить кнопкой «Отменить».", { ok: "Добавить" });
  if (!ok) return;
  let seed;
  try {
    const { kirion } = await import("./seed.js");
    seed = normalize(kirion());
  } catch (e) {
    toast(`${icon("close")} Не удалось загрузить дары Мастера`, { kind: "bad" });
    return;
  }
  let res = null;
  X.withUndo("Дары Мастера", () => X.mutate(c => { res = applyGifts(c, seed); }));
  if (res) toast(`${icon("star")} Добавлено: ${esc(res.added.join(", ") || "ничего")}${res.dropped ? `. Заменён Гений договоров` : ""}`, { kind: "good" });
}
