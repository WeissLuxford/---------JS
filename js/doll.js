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

const HELD_RE = /палочк|жезл|посох|скипетр|сфера|фокусировк|святой символ|священный символ|тотем|ветвь омелы|wand|rod|staff|orb|arcane focus|holy symbol|totem/i;
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
  if (it.type === "wand") return "held";
  const t = text(it);
  for (const [k, re] of KIND_RE) if (re.test(t)) return k;
  if (HELD_RE.test(t)) return "held";
  if (it.type === "armor") return "body";
  return "";
}

export function fitsSlot(it, slot) {
  const k = slotKind(it);
  if (slot === "ring1" || slot === "ring2") return k === "ring";
  if (slot === "main" || slot === "main2") return k === "main" || k === "held";
  if (slot === "off" || slot === "off2") return k === "off" || k === "held" || (k === "main" && !isTwoHanded(it));
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
    else if (k === "held") ok = place(it, "off") || place(it, "main");
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

export const SILHOUETTE = `<svg class="doll-fig" viewBox="0 0 148 331" aria-hidden="true"><defs><radialGradient id="dollGlow" cx="50%" cy="38%" r="60%"><stop offset="0" stop-color="#e9c77a" stop-opacity=".34"/><stop offset=".6" stop-color="#c9a35b" stop-opacity=".14"/><stop offset="1" stop-color="#c9a35b" stop-opacity="0"/></radialGradient><linearGradient id="dollFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3a27"/><stop offset="1" stop-color="#241a12"/></linearGradient></defs><ellipse cx="74" cy="150" rx="70" ry="168" fill="url(#dollGlow)"/><ellipse cx="74" cy="325" rx="38" ry="5" fill="#000" opacity=".45"/><g transform="translate(-5 -8)" fill="url(#dollFill)" stroke="#c9a35b" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round"><path d="M79 54.282H68.824c.038 4.586-1.385 8.232-6.538 11.407-7.58 4.67-9.766 1.589-16.504 5.364-7.18 4.022-9.839 16.322-12.894 25.27-2.701 7.914-3.117 16.702-4.642 24.654-.96 5.011-3.727 6.429-4.641 12.172-1.757 11.036-3.522 24.117-4.596 34.05-.276 2.561-2.591 3.421-3.874 4.538-1.219 1.06-2.22 1.889-3.999 3.642-.543.535-.672 1.678-1.192 2.751-.444.915-1.52 1.539-1.807 2.352-.817 2.305-3.163 3.662-2.55 4.548.571.823 2.963-.165 4.11-.981.735-.523 1.362-1.352 1.457-2.282.916-.331 2.108-2.771 2.696-2.658.255.049.358 4.46-.575 7.508-.363 1.188-.67 1.746-.674 2.528-.006 1.006-.16 3.338-.28 4.41-.178 1.575.308 3.032 1.256 3.104.221.017 1.34-.282 1.348-2.017.003-.633.08-1.127.196-1.94.2-1.41 1.494-4.138 1.725-5.36.073-.386.352-1.376.62-1.344.082.01-.405 2.901-.686 4.113-.311 1.344.145 2.27-.003 5.033-.129 2.425.035 3.81 1.266 3.857.389.015 1.558.013 1.588-3.536.01-1.045.366-2.909.633-4.717.196-1.328.213-2.719 1.035-4.298-.045 1.672-.144 1.89-.228 3.518-.052 1-.405 6.609-.105 4.25.126-.994-1.25 4.052.94 4.15.731.033 1.703-.889 2.127-7.134.124-1.828.436-4.288.92-5.66.278 1.198.342 1.72.34 2.309 0 .417.182 1.77-.008 3.119-.275 1.938-.424 3.24.59 3.353.563.063 1.243-.686 1.658-2.026.144-.468.1-1.138.254-1.678.516-1.826.189-3.734.364-4.958.24-1.666.536-2.492.768-3.213.238-.741.558-2.94.586-5.338.029-2.398-.968-2.465-.583-8.918.384-6.453 8.154-18.314 9.738-27.921.473-2.867 1.92-5.448 2.661-8.237 1.276-4.802 1.526-9.863 3.064-14.587 1.138-3.498 4.521-10.065 4.521-10.065s3.182 11.689 3.818 15.85c1.985 12.977-3.566 24.173-6.04 38.02-1.97 11.022-4.033 18.866-3.904 33.362.153 17.179 3.793 32.78 4.084 42.012.037 1.167-1.263 5.772-1.05 10.691.214 4.919-.912 11.933-.846 18.338.154 15.018 4.941 26.356 6.856 33.113.94 3.315 2.014 8.499 2.072 11.147.078 3.488-1.054 3.863-1.29 5.849-.171 1.447 1.404 3.98 1.432 4.53 0 0-1.043 1.238-1.213 2-.24 1.068.41 2.044-.065 2.763-.95 1.44-.887.8-1.376 1.576-.506.802-3.655 4.06-4.223 5.238-.448.93-.328 1.605-.152 2.641.244 1.439.81 2.807 2.358 2.398.478.321 1.065 1.026 1.485.333.117.795 1.684.863 2.444.514 1.09.992 3.102.854 4.167-.008 1.423 1.224 5.613.643 5.96-1.689 1.357-.592 1.717-1.758 1.496-3.055-.37-2.172-.335-4.06-.712-6.231-.295-1.69-.157-4.057.783-5.499 1.485-2.278.777-6.197.323-6.985-.453-.787-.22-15.214.078-23.764.276-7.938 2.694-15.697 3.063-23.632.157-3.378-.512-6.76-.365-10.138.199-4.552 1.255-9.03 1.678-13.566.389-4.172.263-8.388.79-12.545 1.88-14.845 6.893-16.859 8.44-44.09m0 0c1.548 27.231 6.56 29.245 8.441 44.09.527 4.157.401 8.374.79 12.545.423 4.537 1.48 9.014 1.678 13.566.147 3.379-.522 6.76-.365 10.138.37 7.935 2.787 15.693 3.063 23.632.298 8.551.531 22.976.078 23.764-.454.788-1.162 4.707.323 6.985.94 1.442 1.078 3.808.783 5.499-.377 2.17-.343 4.059-.712 6.23-.22 1.298.139 2.464 1.496 3.056.347 2.332 4.537 2.913 5.96 1.689 1.065.862 3.078 1 4.167.008.76.349 2.327.28 2.444-.514.42.693 1.007-.012 1.485-.333 1.548.409 2.114-.96 2.358-2.398.176-1.036.296-1.712-.152-2.64-.568-1.18-3.717-4.437-4.223-5.239-.489-.776-.426-.136-1.376-1.576-.475-.72.174-1.695-.065-2.763-.17-.762-1.213-2-1.213-2 .028-.55 1.603-3.083 1.432-4.53-.236-1.986-1.368-2.36-1.29-5.849.058-2.648 1.132-7.832 2.072-11.147 1.915-6.758 6.702-18.096 6.856-33.113.066-6.406-1.06-13.419-.847-18.338s-1.086-9.524-1.05-10.691c.292-9.231 3.932-24.833 4.085-42.012.13-14.497-1.933-22.34-3.903-33.362-2.475-13.847-8.026-25.043-6.041-38.02.636-4.161 3.818-15.85 3.818-15.85s3.383 6.567 4.521 10.065c1.538 4.725 1.788 9.786 3.064 14.587.74 2.789 2.188 5.37 2.66 8.237 1.585 9.607 9.355 21.468 9.74 27.921s-.613 6.52-.584 8.918c.028 2.397.348 4.597.586 5.338.232.721.529 1.547.768 3.213.176 1.224-.152 3.132.365 4.958.152.54.109 1.21.254 1.678.414 1.34 1.094 2.089 1.657 2.026 1.014-.114.865-1.415.59-3.353-.19-1.348-.008-2.702-.009-3.119-.002-.59.063-1.111.341-2.31.484 1.373.796 3.833.92 5.661.424 6.245 1.396 7.167 2.128 7.134 2.189-.098.813-5.144.94-4.15.299 2.359-.054-3.25-.106-4.25-.084-1.628-.183-1.846-.228-3.518.822 1.58.839 2.97 1.035 4.298.267 1.808.624 3.672.633 4.717.03 3.549 1.2 3.551 1.588 3.536 1.23-.047 1.395-1.432 1.266-3.857-.148-2.764.308-3.689-.003-5.033-.281-1.212-.768-4.103-.685-4.113.267-.032.546.958.619 1.344.231 1.222 1.524 3.95 1.726 5.36.116.813.192 1.307.195 1.94.008 1.735 1.127 2.034 1.348 2.017.948-.072 1.434-1.53 1.257-3.104-.12-1.072-.275-3.404-.28-4.41-.006-.782-.312-1.34-.675-2.528-.933-3.047-.83-7.46-.575-7.508.588-.113 1.78 2.327 2.696 2.658.095.93.722 1.759 1.457 2.282 1.147.816 3.539 1.804 4.11.98.613-.885-1.733-2.242-2.55-4.547-.287-.813-1.363-1.437-1.807-2.352-.52-1.073-.649-2.216-1.192-2.751-1.78-1.753-2.78-2.582-3.999-3.642-1.283-1.117-3.598-1.977-3.874-4.537-1.074-9.934-2.839-23.014-4.596-34.051-.914-5.743-3.68-7.16-4.641-12.172-1.525-7.951-1.94-16.74-4.642-24.653-3.055-8.95-5.714-21.25-12.894-25.271-6.738-3.775-8.923-.693-16.504-5.364-5.153-3.175-6.576-6.821-6.538-11.407H78.998"/><path transform="translate(79 56) scale(1.28) translate(-79 -56)" d="M79 59.397c-3.914 0-7.324-2.644-10.175-5.115-.86-.746-1.197-4.034-1.914-4.866-.748.224-2.416-.196-2.946-1.32-.736-1.56-2.257-4.293-2.194-7.266.03-1.354.961-3.111 2.909-3.104-.284-9.913 5.816-16.699 14.317-16.7 8.5 0 14.6 6.786 14.319 16.7 1.947-.009 2.88 1.748 2.909 3.103.063 2.973-1.457 5.705-2.193 7.266-.53 1.124-2.199 1.544-2.946 1.32-.717.833-1.053 4.12-1.914 4.866-2.85 2.472-6.26 5.116-10.173 5.117-3.914 0-7.323-2.645-10.173-5.117-.86-.746-1.197-4.033-1.914-4.866-.747.224-2.415-.196-2.946-1.32-.735-1.56-2.256-4.293-2.192-7.266.029-1.355.96-3.112 2.908-3.104-.282-9.913 5.819-16.699 14.32-16.699 8.5.001 14.6 6.787 14.316 16.7 1.948-.007 2.88 1.75 2.909 3.104.063 2.973-1.458 5.705-2.194 7.266-.53 1.125-2.198 1.544-2.946 1.32-.717.832-1.053 4.12-1.914 4.866-2.85 2.47-6.26 5.115-10.174 5.115"/></g></svg>`;
