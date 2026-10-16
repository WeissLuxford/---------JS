import { GEAR } from "./gear.js";

export const DOLL_SLOTS = {
  head: { name: "Голова", icon: "gi/sbed/helmet", side: "left" },
  cloak: { name: "Плащ", icon: "gi/lucasms/cloak", side: "left" },
  body: { name: "Доспех", icon: "gi/lorc/breastplate", side: "left" },
  hands: { name: "Перчатки", icon: "gi/delapouite/gauntlet", side: "left" },
  feet: { name: "Обувь", icon: "gi/lorc/walking-boot", side: "left" },
  neck: { name: "Амулет", icon: "gi/lorc/gem-pendant", side: "right" },
  eyes: { name: "Глаза", icon: "gi/lorc/spectacles", side: "right" },
  wrists: { name: "Наручи", icon: "gi/skoll/bracers", side: "right" },
  ring1: { name: "Кольцо", icon: "gi/delapouite/ring", side: "right" },
  ring2: { name: "Кольцо", icon: "gi/delapouite/ring", side: "right" },
  main: { name: "Правая рука", icon: "gi/lorc/broadsword", side: "weapon", set: 1 },
  off: { name: "Левая рука", icon: "gi/sbed/shield", side: "weapon", set: 1 },
  main2: { name: "Правая рука", icon: "gi/lorc/broadsword", side: "weapon", set: 2 },
  off2: { name: "Левая рука", icon: "gi/sbed/shield", side: "weapon", set: 2 }
};

export const SLOT_KEYS = Object.keys(DOLL_SLOTS);

const KIND_RE = [
  ["eyes", /монокл|очки|очков|линз|окуляр|повязк[аи] на глаз|глаза орла|monocle|goggles|spectacles|lenses|eyes of|eye patch/i],
  ["head", /шлем|шляп|капюшон|корон|диадем|венец|обруч|маска|helm|hat|hood|crown|circlet|diadem/i],
  ["cloak", /плащ|накидк|мантия|cloak|cape|mantle/i],
  ["hands", /перчат|рукавиц|gloves?|gauntlets?/i],
  ["wrists", /наруч|браслет|bracers?|bracelet/i],
  ["feet", /сапог|сапож|ботин|туфл|обувь|сандал|boots?|slippers?|shoes?/i],
  ["neck", /амулет|ожерель|кулон|медальон|подвеск|талисман|брош|amulet|necklace|pendant|medallion|periapt|brooch/i],
  ["ring", /кольц|перстен|\bring\b/i]
];

const SHIELD_RE = /(^|[^а-яё])щит|\bshield\b/i;
const TWO_RE = /двуруч|two-handed/i;
const LIGHT_RE = /лёгкое|легкое|\blight\b/i;

const text = it => `${it.name || ""} ${it.nameEn || ""}`;
const gearOf = it => GEAR.find(g => g.kind === "weapon" && (g.name === it.name || (it.nameEn && g.nameEn === it.nameEn)));

export function isShield(it) {
  return !(Number(it.acBase) > 0) && SHIELD_RE.test(text(it));
}

export function isWeapon(it) {
  return it.type === "weapon" || (Array.isArray(it.damage) && it.damage.length > 0 && !!it.atkAbility);
}

export function isTwoHanded(it) {
  if (!isWeapon(it)) return false;
  if (TWO_RE.test(`${it.effect || ""} ${it.description || ""}`)) return true;
  const g = gearOf(it);
  return !!g && TWO_RE.test(g.props || "");
}

export function isLight(it) {
  const g = gearOf(it);
  return LIGHT_RE.test(`${it.effect || ""} ${g ? g.props : ""}`);
}

export function slotKind(it) {
  if (Number(it.acBase) > 0) return "body";
  if (isShield(it)) return "off";
  if (isWeapon(it)) return "main";
  const t = text(it);
  for (const [k, re] of KIND_RE) if (re.test(t)) return k;
  if (it.type === "armor") return "body";
  return "";
}

export function fitsSlot(it, slot) {
  const k = slotKind(it);
  if (slot === "ring1" || slot === "ring2") return k === "ring";
  if (slot === "main" || slot === "main2") return k === "main";
  if (slot === "off" || slot === "off2") return k === "off" || (k === "main" && !isTwoHanded(it));
  return k === slot;
}

const pairOf = s => ({ main: "off", off: "main", main2: "off2", off2: "main2" })[s] || "";

export function dollLayout(c) {
  const items = c.items || [];
  const cells = {};
  const extra = [];
  const place = (it, slot) => {
    if (!slot || cells[slot]) return false;
    const pair = pairOf(slot);
    if (pair && cells[pair] && isTwoHanded(cells[pair])) return false;
    if (pair && isTwoHanded(it) && cells[pair]) return false;
    cells[slot] = it;
    return true;
  };
  const worn = items.filter(it => it.equipped || it.slot === "main2" || it.slot === "off2");
  worn.filter(it => it.slot).forEach(it => {
    if (it.slot === "extra" || !place(it, it.slot)) extra.push(it);
  });
  worn.filter(it => !it.slot).forEach(it => {
    const k = slotKind(it);
    let ok = false;
    if (k === "ring") ok = place(it, "ring1") || place(it, "ring2");
    else if (k === "main") ok = place(it, "main") || (!isTwoHanded(it) && place(it, "off"));
    else if (k) ok = place(it, k);
    if (!ok) extra.push(it);
  });
  const two = {};
  ["main", "main2"].forEach(s => {
    if (cells[s] && isTwoHanded(cells[s]) && !cells[pairOf(s)]) two[s] = true;
  });
  return { cells, extra, two };
}

function freeCell(c, it, slot) {
  const { cells } = dollLayout(c);
  const drop = x => {
    if (!x || x.id === it.id) return;
    x.equipped = false;
    x.slot = "";
  };
  drop(cells[slot]);
  const pair = pairOf(slot);
  if (pair && (isTwoHanded(it) || (cells[pair] && isTwoHanded(cells[pair])))) drop(cells[pair]);
}

export function pinLayout(c) {
  const { cells } = dollLayout(c);
  Object.entries(cells).forEach(([slot, it]) => {
    it.slot = slot;
  });
}

export function equipTo(c, id, slot) {
  const it = (c.items || []).find(x => x.id === id);
  if (!it || !DOLL_SLOTS[slot]) return false;
  pinLayout(c);
  freeCell(c, it, slot);
  it.slot = slot;
  it.equipped = DOLL_SLOTS[slot].set !== 2;
  it.container = "";
  return true;
}

export function unequip(c, id) {
  const it = (c.items || []).find(x => x.id === id);
  if (!it) return false;
  pinLayout(c);
  it.equipped = false;
  it.slot = "";
  return true;
}

export function swapSets(c) {
  pinLayout(c);
  const map = { main: "main2", off: "off2", main2: "main", off2: "off" };
  (c.items || []).forEach(it => {
    if (!map[it.slot]) return;
    it.slot = map[it.slot];
    it.equipped = DOLL_SLOTS[it.slot].set === 1;
  });
}

function inside(c, boxId, id) {
  const seen = new Set();
  let cur = (c.items || []).find(x => x.id === boxId);
  while (cur && !seen.has(cur.id)) {
    if (cur.id === id) return true;
    seen.add(cur.id);
    cur = (c.items || []).find(x => x.id === cur.container);
  }
  return false;
}

export function placeOf(c, id) {
  const L = dollLayout(c);
  const at = Object.keys(L.cells).find(k => L.cells[k].id === id);
  if (at) return { kind: "slot", slot: at };
  const it = (c.items || []).find(x => x.id === id);
  if (!it) return null;
  if (it.equipped) return { kind: "extra" };
  return { kind: "bag", box: it.container || "" };
}

function putAt(c, it, place) {
  if (place.kind === "slot") return equipTo(c, it.id, place.slot);
  if (place.kind === "extra") {
    it.equipped = true;
    it.slot = "extra";
    it.container = "";
    return true;
  }
  if (place.box && inside(c, place.box, it.id)) return false;
  it.equipped = false;
  it.slot = "";
  it.container = place.box || "";
  return true;
}

export function dropItem(c, id, target) {
  const it = (c.items || []).find(x => x.id === id);
  if (!it || !target) return "none";
  pinLayout(c);
  const from = placeOf(c, id);
  let to = target;
  if (to.kind === "item") {
    const t = (c.items || []).find(x => x.id === to.id);
    if (!t || t.id === id) return "none";
    if (t.isContainer) to = { kind: "bag", box: t.id };
    else {
      const tp = placeOf(c, t.id);
      if (tp.kind === "slot") to = tp;
      else {
        if (from.kind === "slot" && fitsSlot(t, from.slot)) {
          if (!putAt(c, it, tp)) return "none";
          equipTo(c, t.id, from.slot);
          return "ok";
        }
        to = tp;
      }
    }
  }
  if (to.kind === "bag" && to.box && (to.box === id || inside(c, to.box, id))) return "none";
  if (to.kind === "slot") {
    if (!fitsSlot(it, to.slot)) return "nofit";
    if (from.kind === "slot" && from.slot === to.slot) return "none";
    const L = dollLayout(c);
    const occ = L.cells[to.slot];
    putAt(c, it, to);
    if (occ && occ.id !== id) {
      if (from.kind === "slot" && fitsSlot(occ, from.slot)) equipTo(c, occ.id, from.slot);
      else if (from.kind === "extra") putAt(c, occ, { kind: "extra" });
      else putAt(c, occ, from.kind === "bag" ? from : { kind: "bag", box: "" });
    }
    return "ok";
  }
  if (from.kind === to.kind && (to.kind === "extra" || from.box === to.box)) return "none";
  return putAt(c, it, to) ? "ok" : "none";
}

export function slotCandidates(c, slot) {
  const items = (c.items || []).filter(it => !it.isContainer);
  const fit = items.filter(it => fitsSlot(it, slot));
  const rest = items.filter(it => !fitsSlot(it, slot));
  return { fit, rest };
}

const HALF = [
  [60, 52], [52, 53, 42, 55, 35, 60], [28, 65, 25, 78, 23, 96], [21, 114, 19, 132, 17, 150], [16, 160, 15, 170, 18, 176],
  [21, 180, 26, 176, 26, 168], [27, 156, 29, 138, 32, 118], [34, 104, 36, 94, 38, 88], [39, 104, 40, 120, 41, 134],
  [38, 146, 37, 158, 38, 170], [39, 200, 41, 232, 42, 262], [42, 272, 38, 280, 34, 284], [31, 288, 36, 292, 46, 291],
  [52, 290, 53, 284, 53, 276], [54, 248, 55, 218, 56, 190], [57, 180, 58, 176, 60, 176]
];

function silhouettePath() {
  const m = ([x, y]) => `${x} ${y}`;
  const fw = HALF.slice(1).map(s => `C${m(s.slice(0, 2))} ${m(s.slice(2, 4))} ${m(s.slice(4, 6))}`).join(" ");
  const pts = [HALF[0], ...HALF.slice(1).map(s => [s[4], s[5]])];
  const back = [];
  for (let i = HALF.length - 1; i >= 1; i--) {
    const s = HALF[i];
    const to = pts[i - 1];
    back.push(`C${120 - s[2]} ${s[3]} ${120 - s[0]} ${s[1]} ${120 - to[0]} ${to[1]}`);
  }
  return `M${m(HALF[0])} ${fw} ${back.join(" ")} Z`;
}

export const SILHOUETTE = `<svg class="doll-fig" viewBox="0 0 120 300" aria-hidden="true"><defs><radialGradient id="dollGlow" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="#e9c77a" stop-opacity=".34"/><stop offset=".6" stop-color="#c9a35b" stop-opacity=".14"/><stop offset="1" stop-color="#c9a35b" stop-opacity="0"/></radialGradient><linearGradient id="dollFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2c1f"/><stop offset="1" stop-color="#1c150f"/></linearGradient></defs><ellipse cx="60" cy="130" rx="58" ry="150" fill="url(#dollGlow)"/><ellipse cx="60" cy="292" rx="34" ry="5" fill="#000" opacity=".45"/><ellipse cx="60" cy="30" rx="14.5" ry="17.5" fill="url(#dollFill)" stroke="#c9a35b" stroke-opacity=".55" stroke-width="1"/><path d="M54 44 L66 44 L67 54 L53 54 Z" fill="url(#dollFill)"/><path d="${silhouettePath()}" fill="url(#dollFill)" stroke="#c9a35b" stroke-opacity=".55" stroke-width="1" stroke-linejoin="round"/></svg>`;
