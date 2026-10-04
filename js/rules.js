export const ABILITIES = [
  { key: "str", name: "Сила", short: "СИЛ", desc: "Физическая мощь: атаки и урон оружием ближнего боя, Атлетика, переноска тяжестей." },
  { key: "dex", name: "Ловкость", short: "ЛОВ", desc: "Проворство и реакция: КД без тяжёлой брони, инициатива, дальнобойное и фехтовальное оружие." },
  { key: "con", name: "Телосложение", short: "ТЕЛ", desc: "Здоровье и выносливость: хиты за уровень, удержание концентрации." },
  { key: "int", name: "Интеллект", short: "ИНТ", desc: "Память и логика: Магия, История, Анализ, Природа, Религия." },
  { key: "wis", name: "Мудрость", short: "МДР", desc: "Восприятие и интуиция: Внимательность, Проницательность, Медицина, Выживание." },
  { key: "cha", name: "Харизма", short: "ХАР", desc: "Сила личности: Убеждение, Обман, Запугивание, Выступление." }
];

export const ABILITY_KEYS = ABILITIES.map(a => a.key);

export const SKILLS = [
  { key: "acrobatics", name: "Акробатика", ab: "dex", desc: "Удержать равновесие, сделать кувырок, вывернуться из захвата." },
  { key: "investigation", name: "Анализ", ab: "int", desc: "Искать улики, делать выводы, разбираться в устройстве механизмов и ловушек." },
  { key: "athletics", name: "Атлетика", ab: "str", desc: "Лазать, прыгать, плавать, бороться и выталкивать." },
  { key: "perception", name: "Внимательность", ab: "wis", desc: "Заметить, услышать или почуять что-то. Даёт пассивную Внимательность." },
  { key: "survival", name: "Выживание", ab: "wis", desc: "Идти по следу, охотиться, ориентироваться на местности, предсказывать погоду." },
  { key: "performance", name: "Выступление", ab: "cha", desc: "Развлекать публику музыкой, танцем, актёрской игрой или рассказом." },
  { key: "intimidation", name: "Запугивание", ab: "cha", desc: "Влиять угрозами, враждебными действиями и демонстрацией силы." },
  { key: "history", name: "История", ab: "int", desc: "Вспомнить события, легенды, королевства, войны и знаменитых личностей." },
  { key: "sleightOfHand", name: "Ловкость рук", ab: "dex", desc: "Карманные кражи, фокусы, незаметно подбросить или спрятать предмет." },
  { key: "arcana", name: "Магия", ab: "int", desc: "Знания о заклинаниях, магических предметах, планах бытия и их обитателях." },
  { key: "medicine", name: "Медицина", ab: "wis", desc: "Стабилизировать умирающего, распознать болезнь." },
  { key: "deception", name: "Обман", ab: "cha", desc: "Убедительно лгать, скрывать правду словами и поведением." },
  { key: "nature", name: "Природа", ab: "int", desc: "Знания о местности, растениях, животных и погоде." },
  { key: "insight", name: "Проницательность", ab: "wis", desc: "Распознать истинные намерения, ложь и настроение собеседника." },
  { key: "religion", name: "Религия", ab: "int", desc: "Знания о божествах, обрядах, культах и священных символах." },
  { key: "stealth", name: "Скрытность", ab: "dex", desc: "Двигаться бесшумно, прятаться от врагов." },
  { key: "persuasion", name: "Убеждение", ab: "cha", desc: "Влиять тактом, дружелюбием и честными доводами." },
  { key: "animalHandling", name: "Уход за животными", ab: "wis", desc: "Успокоить животное, понять его намерения, управлять верховым зверем." }
];

export const DAMAGE = {
  acid: { name: "Кислота", color: "#a6e05a", icon: "drop" },
  bludgeoning: { name: "Дробящий", color: "#cbbfa8", icon: "hammer" },
  cold: { name: "Холод", color: "#6fd6ff", icon: "snow" },
  fire: { name: "Огонь", color: "#ff8a3d", icon: "flame" },
  force: { name: "Силовое поле", color: "#ea5a73", icon: "force" },
  lightning: { name: "Электричество", color: "#7f9bff", icon: "bolt" },
  necrotic: { name: "Некротический", color: "#6fd3a4", icon: "skull" },
  piercing: { name: "Колющий", color: "#cbbfa8", icon: "dagger" },
  poison: { name: "Яд", color: "#8fc84a", icon: "flask" },
  psychic: { name: "Психический", color: "#e38ae6", icon: "brain" },
  radiant: { name: "Излучение", color: "#f4d66d", icon: "sun" },
  slashing: { name: "Рубящий", color: "#cbbfa8", icon: "axe" },
  thunder: { name: "Звук", color: "#b48cff", icon: "wave" },
  healing: { name: "Лечение", color: "#7ee08a", icon: "heart" },
  temp: { name: "Временные хиты", color: "#9fc6ff", icon: "shield" }
};

export const SCHOOLS = {
  abjuration: { name: "Ограждение", color: "#7fb6ff" },
  conjuration: { name: "Вызов", color: "#f0b75a" },
  divination: { name: "Прорицание", color: "#c9d8ff" },
  enchantment: { name: "Очарование", color: "#ff8fd0" },
  evocation: { name: "Воплощение", color: "#ff7a4a" },
  illusion: { name: "Иллюзия", color: "#b58cff" },
  necromancy: { name: "Некромантия", color: "#6fd3a4" },
  transmutation: { name: "Преобразование", color: "#d9c27a" }
};

export const ACTIONS = {
  action: { name: "Действие", color: "#58c35a", shape: "circle" },
  bonus: { name: "Бонусное действие", color: "#f29b2b", shape: "triangle" },
  reaction: { name: "Реакция", color: "#c46ce0", shape: "diamond" },
  minute: { name: "1 минута", color: "#c9b48a", shape: "clock" },
  ritual: { name: "Ритуал", color: "#c9b48a", shape: "clock" },
  passive: { name: "Пассивно", color: "#8d8577", shape: "ring" },
  free: { name: "Свободно", color: "#e8dcc4", shape: "ring" },
  special: { name: "Особое", color: "#c9b48a", shape: "ring" }
};

export const RECHARGE = {
  always: "Всегда доступно",
  short: "Короткий отдых",
  long: "Длинный отдых",
  dawn: "На рассвете",
  none: "Не восстанавливается"
};

export const RARITY = {
  common: { name: "Обычный", color: "#cfc6b6" },
  uncommon: { name: "Необычный", color: "#4fcf6a" },
  rare: { name: "Редкий", color: "#4aa8ff" },
  veryRare: { name: "Очень редкий", color: "#b46bff" },
  legendary: { name: "Легендарный", color: "#e6a940" },
  artifact: { name: "Артефакт", color: "#ff6f4a" },
  story: { name: "Сюжетный", color: "#e9c77a" }
};

export const ITEM_TYPES = {
  weapon: { name: "Оружие", icon: "sword" },
  armor: { name: "Броня", icon: "armor" },
  artifact: { name: "Артефакт", icon: "gem" },
  tool: { name: "Инструменты", icon: "wrench" },
  consumable: { name: "Расходник", icon: "potion" },
  ammo: { name: "Боеприпасы", icon: "arrow" },
  book: { name: "Книга", icon: "book" },
  gear: { name: "Снаряжение", icon: "bag" },
  treasure: { name: "Ценность", icon: "coin" },
  misc: { name: "Прочее", icon: "pouch" }
};

export const FEATURE_CATS = {
  class: { name: "Классовые умения", icon: "sigil" },
  invocation: { name: "Таинственные воззвания", icon: "eye" },
  gift: { name: "Дары покровителя", icon: "pact" },
  race: { name: "Расовые черты", icon: "horns" },
  background: { name: "Предыстория", icon: "scroll" },
  feat: { name: "Черты", icon: "star" },
  other: { name: "Прочее", icon: "sparkle" }
};

export const FEATURE_SOURCES = {
  "": "",
  dm: "От Мастера",
  own: "Своё",
  class: "Класс",
  race: "Раса",
  item: "Предмет"
};

export const CONDITIONS = [
  { key: "blinded", name: "Ослеплён", desc: "Автоматически проваливает проверки, требующие зрения. Атаки по нему с преимуществом, его атаки с помехой." },
  { key: "charmed", name: "Очарован", desc: "Не может атаковать очаровавшего. Очаровавший получает преимущество на социальные проверки против него." },
  { key: "deafened", name: "Оглох", desc: "Автоматически проваливает проверки, требующие слуха." },
  { key: "frightened", name: "Испуган", desc: "Помеха на проверки и атаки, пока источник страха в поле зрения. Не может добровольно приблизиться к нему." },
  { key: "grappled", name: "Схвачен", desc: "Скорость равна 0." },
  { key: "incapacitated", name: "Недееспособен", desc: "Не может совершать действия и реакции." },
  { key: "invisible", name: "Невидим", desc: "Атаки по нему с помехой, его атаки с преимуществом." },
  { key: "paralyzed", name: "Парализован", desc: "Недееспособен, не двигается и не говорит. Проваливает спасброски Силы и Ловкости. Удар вблизи считается критическим." },
  { key: "petrified", name: "Окаменел", desc: "Превращён в камень. Недееспособен, сопротивление всем видам урона." },
  { key: "poisoned", name: "Отравлен", desc: "Помеха на броски атаки и проверки характеристик." },
  { key: "prone", name: "Сбит с ног", desc: "Может только ползти. Помеха на атаки. Атаки вблизи по нему с преимуществом, издалека с помехой." },
  { key: "restrained", name: "Опутан", desc: "Скорость 0. Помеха на атаки и спасброски Ловкости, атаки по нему с преимуществом." },
  { key: "stunned", name: "Ошеломлён", desc: "Недееспособен, не двигается. Проваливает спасброски Силы и Ловкости, атаки по нему с преимуществом." },
  { key: "unconscious", name: "Без сознания", desc: "Недееспособен, роняет всё, падает ничком. Атаки по нему с преимуществом, удар вблизи критический." }
];

export const CASTER_TYPES = {
  none: "Не заклинатель",
  full: "Полный заклинатель",
  half: "Полузаклинатель",
  third: "Треть-заклинатель",
  pact: "Магия договора (колдун)"
};

export const HIT_DICE = ["d6", "d8", "d10", "d12"];

export const ALIGNMENTS = [
  "Законно-добрый", "Нейтрально-добрый", "Хаотично-добрый",
  "Законно-нейтральный", "Истинно нейтральный", "Хаотично-нейтральный",
  "Законно-злой", "Нейтрально-злой", "Хаотично-злой"
];

const FULL_SLOTS = [
  [], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

export const clampLevel = l => Math.max(1, Math.min(20, Math.floor(Number(l) || 1)));

export const mod = score => Math.floor(((Number(score) || 0) - 10) / 2);

export const profBonus = level => 2 + Math.floor((clampLevel(level) - 1) / 4);

export const fmt = n => (n >= 0 ? "+" + n : "−" + Math.abs(n));

export const cantripTier = level => {
  const l = clampLevel(level);
  return l >= 17 ? 4 : l >= 11 ? 3 : l >= 5 ? 2 : 1;
};

export function slotTable(casterType, level) {
  const l = clampLevel(level);
  if (casterType === "full") return FULL_SLOTS[l].slice();
  if (casterType === "half") return l < 2 ? [] : FULL_SLOTS[Math.ceil(l / 2)].slice();
  if (casterType === "third") return l < 3 ? [] : FULL_SLOTS[Math.ceil(l / 3)].slice();
  return [];
}

export function pactSlots(level) {
  const l = clampLevel(level);
  const count = l === 1 ? 1 : l <= 10 ? 2 : l <= 16 ? 3 : 4;
  const slotLevel = l <= 2 ? 1 : l <= 4 ? 2 : l <= 6 ? 3 : l <= 8 ? 4 : 5;
  return { count, level: slotLevel };
}

export function parseDice(expr) {
  const s = String(expr || "").replace(/\s+/g, "").replace(/[кК]/g, "d").replace(/−/g, "-").toLowerCase();
  if (!s) return null;
  const parts = s.match(/[+-]?[^+-]+/g);
  if (!parts) return null;
  const dice = [];
  let flat = 0;
  for (const p of parts) {
    const sign = p[0] === "-" ? -1 : 1;
    const body = p.replace(/^[+-]/, "");
    const m = body.match(/^(\d*)d(\d+)$/);
    if (m) {
      dice.push({ n: (Number(m[1]) || 1) * sign, f: Number(m[2]) });
    } else if (/^\d+$/.test(body)) {
      flat += sign * Number(body);
    } else {
      return null;
    }
  }
  return { dice, flat };
}

export function diceToString(p) {
  if (!p) return "";
  const merged = {};
  for (const d of p.dice) merged[d.f] = (merged[d.f] || 0) + d.n;
  const faces = Object.keys(merged).map(Number).sort((a, b) => b - a).filter(f => merged[f] !== 0);
  let out = faces.map((f, i) => (merged[f] < 0 ? "−" : i ? "+" : "") + Math.abs(merged[f]) + "d" + f).join("");
  if (p.flat) out += (p.flat < 0 ? "−" : out ? "+" : "") + Math.abs(p.flat);
  return out || "0";
}

export function scaleDice(expr, times, { scaleFlat = true } = {}) {
  const p = parseDice(expr);
  if (!p) return expr;
  return diceToString({ dice: p.dice.map(d => ({ n: d.n * times, f: d.f })), flat: scaleFlat ? p.flat * times : p.flat });
}

export function addDice(...exprs) {
  const dice = [];
  let flat = 0;
  for (const e of exprs) {
    if (e === "" || e == null) continue;
    if (typeof e === "number") { flat += e; continue; }
    const p = parseDice(e);
    if (!p) continue;
    dice.push(...p.dice);
    flat += p.flat;
  }
  return diceToString({ dice, flat });
}

export function rollDice(expr) {
  const p = parseDice(expr);
  if (!p) return null;
  const rolls = [];
  let total = p.flat;
  for (const d of p.dice) {
    const sign = d.n < 0 ? -1 : 1;
    for (let i = 0; i < Math.abs(d.n); i++) {
      const r = 1 + Math.floor(Math.random() * d.f);
      rolls.push({ f: d.f, r, sign });
      total += sign * r;
    }
  }
  return { total, rolls, flat: p.flat };
}

export function rollD20(modifier, mode) {
  const a = 1 + Math.floor(Math.random() * 20);
  const b = 1 + Math.floor(Math.random() * 20);
  let pick = a;
  if (mode === "adv") pick = Math.max(a, b);
  if (mode === "dis") pick = Math.min(a, b);
  return { a, b: mode === "adv" || mode === "dis" ? b : null, pick, total: pick + modifier, nat20: pick === 20, nat1: pick === 1 };
}

export function maxDie(hitDie) {
  return Number(String(hitDie || "d8").replace(/\D/g, "")) || 8;
}

export function evalFormula(input, d) {
  if (input === "" || input == null) return null;
  if (typeof input === "number") return input;
  let s = String(input).trim().toLowerCase();
  if (/^\d+$/.test(s)) return Number(s);
  s = s.replace(/^=/, "")
    .replace(/бонус\s*мастерства|мастерство|бм/g, "pb")
    .replace(/уровень|ур/g, "lvl")
    .replace(/сил/g, "str").replace(/лов/g, "dex").replace(/тел/g, "con")
    .replace(/инт/g, "int").replace(/мдр/g, "wis").replace(/хар/g, "cha")
    .replace(/закл/g, "spell");
  const vars = { pb: d.pb, lvl: d.level, spell: d.spell.mod, ...d.mods };
  s = s.replace(/[a-z]+/g, w => (w in vars ? `(${vars[w]})` : "NaN"));
  if (!/^[\d+\-*/().\s]*$/.test(s)) return null;
  try {
    const v = Function(`"use strict";return (${s})`)();
    return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null;
  } catch {
    return null;
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function newCharacter(name = "Новый персонаж") {
  return {
    name,
    archived: false,
    portrait: "",
    info: {
      race: "", subrace: "", cls: "", subclass: "", level: 1, background: "",
      alignment: "", age: "", xp: 0, setting: "", patron: "", pactBoon: "", player: ""
    },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: {},
    skills: {},
    hitDie: "d8",
    casterType: "none",
    spellAbility: "int",
    armor: { name: "Без брони", base: 10, dexCap: "full", shield: false, bonus: 0 },
    speed: 30,
    initBonus: 0,
    senses: "",
    hp: { current: 8, temp: 0, maxOverride: null, bonusPerLevel: 0, hitDiceUsed: 0, deathSuccess: 0, deathFail: 0, stable: false },
    slotsUsed: {},
    pactUsed: 0,
    conditions: {},
    exhaustion: 0,
    concentration: "",
    damageSwap: { enabled: false, from: "fire", to: "cold", label: "" },
    resistances: "",
    proficiencies: { armor: "", weapons: "", tools: "", languages: "" },
    attacks: [],
    spells: [],
    features: [],
    items: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    personality: { appearance: "", traits: "", ideals: "", bonds: "", flaws: "", backstory: "", allies: "" },
    notes: { patron: [], quests: [], people: [], misc: "" }
  };
}

const num = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

function hash36(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const cleanId = (v, prefix, index) => {
  const raw = String(v ?? "");
  const s = raw.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60);
  if (s && s === raw) return s;
  return `${prefix}-${raw ? hash36(raw) : "n" + index}`;
};

const cleanDamage = list => (Array.isArray(list) ? list : [])
  .filter(d => d && typeof d === "object")
  .map(d => ({ dice: String(d.dice ?? ""), type: typeof d.type === "string" ? d.type : "bludgeoning", addMod: !!d.addMod }));

const NUMERIC_HP = ["current", "temp", "bonusPerLevel", "hitDiceUsed", "deathSuccess", "deathFail"];

export function normalize(c) {
  const src = c && typeof c === "object" && !Array.isArray(c) ? c : {};
  const base = newCharacter();
  const out = { ...base, ...src };
  for (const k of ["info", "abilities", "armor", "hp", "damageSwap", "proficiencies", "coins", "personality", "notes"]) {
    const v = src[k];
    out[k] = { ...base[k], ...(v && typeof v === "object" && !Array.isArray(v) ? v : {}) };
  }
  out.name = String(out.name ?? "").slice(0, 120);
  out.portrait = typeof out.portrait === "string" && out.portrait.startsWith("data:image/") ? out.portrait : "";
  for (const k of ABILITY_KEYS) out.abilities[k] = Math.max(1, Math.min(30, Math.round(num(out.abilities[k], 10))));
  out.info.level = clampLevel(out.info.level);
  out.info.xp = num(out.info.xp);
  for (const k of NUMERIC_HP) out.hp[k] = num(out.hp[k]);
  out.hp.deathSuccess = Math.max(0, Math.min(3, out.hp.deathSuccess));
  out.hp.deathFail = Math.max(0, Math.min(3, out.hp.deathFail));
  out.hp.maxOverride = out.hp.maxOverride === null || out.hp.maxOverride === "" || out.hp.maxOverride === undefined ? null : num(out.hp.maxOverride, null);
  out.hp.stable = !!out.hp.stable;
  for (const k of Object.keys(base.coins)) out.coins[k] = Math.max(0, num(out.coins[k]));
  out.armor.base = num(out.armor.base, 10);
  out.armor.bonus = num(out.armor.bonus);
  out.armor.dexCap = ["full", "2", "0"].includes(String(out.armor.dexCap)) ? String(out.armor.dexCap) : "full";
  out.speed = num(out.speed, 30);
  out.initBonus = num(out.initBonus);
  out.exhaustion = Math.max(0, Math.min(6, Math.round(num(out.exhaustion))));
  out.pactUsed = Math.max(0, num(out.pactUsed));
  out.hitDie = HIT_DICE.includes(out.hitDie) ? out.hitDie : "d8";
  out.casterType = out.casterType in CASTER_TYPES ? out.casterType : "none";
  out.spellAbility = ABILITY_KEYS.includes(out.spellAbility) ? out.spellAbility : "int";
  out.concentration = String(out.concentration ?? "");
  const prefixes = { attacks: "at", spells: "sp", features: "ft", items: "it" };
  for (const k of Object.keys(prefixes)) {
    out[k] = (Array.isArray(out[k]) ? out[k] : []).filter(x => x && typeof x === "object").map((x, i) => ({ ...x, id: cleanId(x.id, prefixes[k], i), name: String(x.name ?? "") }));
  }
  out.items = out.items.map(it => ({ ...it, qty: Math.max(0, num(it.qty, 1)), weight: Math.max(0, num(it.weight)) }));
  for (const k of ["attacks", "spells", "features", "items"]) {
    out[k] = out[k].map(x => ({ ...x, used: Math.max(0, num(x.used)) }));
  }
  out.spells = out.spells.map(sp => ({ ...sp, level: Math.max(0, Math.min(9, Math.round(num(sp.level)))), damage: cleanDamage(sp.damage) }));
  out.features = out.features.map(f => ({ ...f, damage: cleanDamage(f.damage) }));
  out.items = out.items.map(it => ({ ...it, damage: cleanDamage(it.damage) }));
  out.attacks = out.attacks.map(at => ({ ...at, damage: typeof at.damage === "string" ? at.damage : String(at.damage ?? "") }));
  for (const k of ["patron", "quests", "people"]) {
    out.notes[k] = (Array.isArray(out.notes[k]) ? out.notes[k] : []).filter(x => x && typeof x === "object").map((x, i) => ({ ...x, id: cleanId(x.id, "nt-" + k, i) }));
  }
  out.notes.misc = String(out.notes.misc ?? "");
  for (const k of ["saves", "skills", "slotsUsed", "conditions"]) {
    out[k] = out[k] && typeof out[k] === "object" && !Array.isArray(out[k]) ? out[k] : {};
  }
  return out;
}

export function swapType(c, type) {
  const s = c.damageSwap;
  return s && s.enabled && s.from === type ? s.to : type;
}

export function compute(c) {
  const level = clampLevel(c.info.level);
  const pb = profBonus(level);
  const mods = {};
  for (const k of ABILITY_KEYS) mods[k] = mod(c.abilities[k]);
  const saves = {};
  for (const k of ABILITY_KEYS) saves[k] = mods[k] + (c.saves[k] ? pb : 0);
  const skills = {};
  for (const s of SKILLS) {
    const p = Number(c.skills[s.key]) || 0;
    skills[s.key] = mods[s.ab] + (p === 2 ? pb * 2 : p === 1 ? pb : 0);
  }
  const passive = {
    perception: 10 + skills.perception,
    insight: 10 + skills.insight,
    investigation: 10 + skills.investigation
  };
  const a = c.armor;
  const dexPart = a.dexCap === "0" ? 0 : a.dexCap === "2" ? Math.min(mods.dex, 2) : mods.dex;
  const ac = (Number(a.base) || 10) + dexPart + (a.shield ? 2 : 0) + (Number(a.bonus) || 0);
  const die = maxDie(c.hitDie);
  const perLevel = Math.floor(die / 2) + 1;
  const autoMax = Math.max(1, die + mods.con) + Math.max(0, level - 1) * Math.max(1, perLevel + mods.con) + level * (Number(c.hp.bonusPerLevel) || 0);
  const hpMax = c.hp.maxOverride != null && c.hp.maxOverride !== "" ? Number(c.hp.maxOverride) : autoMax;
  const spellMod = mods[c.spellAbility] ?? 0;
  const spell = { ability: c.spellAbility, mod: spellMod, dc: 8 + pb + spellMod, atk: pb + spellMod };
  const pact = c.casterType === "pact" ? pactSlots(level) : null;
  const slots = slotTable(c.casterType, level);
  const carry = (Number(c.abilities.str) || 0) * 15;
  let weight = 0;
  let attuned = 0;
  for (const it of c.items) {
    weight += (Number(it.weight) || 0) * (Number(it.qty) || 0);
    if (it.attuned) attuned++;
  }
  weight += Object.values(c.coins).reduce((s, v) => s + (Number(v) || 0), 0) / 50;
  const d = { level, pb, mods, saves, skills, passive, ac, hpMax, autoMax, spell, pact, slots, carry, weight: Math.round(weight * 10) / 10, attuned, tier: cantripTier(level) };
  d.init = mods.dex + (Number(c.initBonus) || 0);
  d.hitDice = { total: level, left: Math.max(0, level - (Number(c.hp.hitDiceUsed) || 0)), die: c.hitDie };
  d.uses = {};
  for (const list of [c.features, c.items, c.spells]) {
    for (const f of list) {
      if (f.uses !== "" && f.uses != null) d.uses[f.id] = evalFormula(f.uses, d);
    }
  }
  d.attacks = {};
  for (const at of c.attacks) d.attacks[at.id] = attackStats(c, d, at);
  return d;
}

export function attackStats(c, d, at) {
  const abMod = at.ability === "spell" ? d.spell.mod : at.ability === "none" ? 0 : d.mods[at.ability] ?? 0;
  const prof = at.ability === "spell" ? d.pb : at.proficient ? d.pb : 0;
  const bonus = Number(at.bonus) || 0;
  const times = at.scaling === "cantrip-dice" ? d.tier : 1;
  const beams = at.scaling === "cantrip-beams" ? d.tier : Math.max(1, Number(at.count) || 1);
  let dmg = scaleDice(at.damage || "", times, { scaleFlat: false });
  if (at.addMod) dmg = addDice(dmg, abMod);
  if (Number(at.dmgBonus)) dmg = addDice(dmg, Number(at.dmgBonus));
  const type = swapType(c, at.damageType);
  if (at.kind === "save") {
    const dc = at.ability === "spell" ? d.spell.dc : 8 + d.pb + abMod + bonus;
    return { kind: "save", dc, save: at.saveAbility || "dex", dmg, type, beams };
  }
  return { kind: "attack", hit: abMod + prof + bonus, dmg, type, beams };
}

export function spellCast(c, d, sp, slotLevel) {
  const base = Number(sp.level) || 0;
  let level = base;
  if (base > 0) {
    if (slotLevel) level = slotLevel;
    else if (sp.castAt) level = Number(sp.castAt);
    else if (d.pact && sp.cost === "slot") level = Math.max(base, d.pact.level);
  }
  const lines = (sp.damage || []).map(x => {
    let dice = x.dice || "";
    if (base === 0 && sp.scaling === "cantrip-dice") dice = scaleDice(dice, d.tier, { scaleFlat: false });
    if (base > 0 && sp.upcast && level > base) dice = addDice(dice, scaleDice(sp.upcast, level - base));
    if (x.addMod) dice = addDice(dice, d.spell.mod);
    return { dice, type: swapType(c, x.type), swapped: swapType(c, x.type) !== x.type, origType: x.type };
  });
  const beams = base === 0 && sp.scaling === "cantrip-beams" ? d.tier : 1;
  return { level, lines, beams };
}

export function usesInfo(d, entity) {
  const max = d.uses[entity.id];
  if (max == null) return null;
  const used = Math.min(max, Number(entity.used) || 0);
  return { max, used, left: max - used };
}

export function importCharacter(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const raw = data.character && typeof data.character === "object" && !Array.isArray(data.character) ? data.character : data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || typeof raw.name !== "string") return null;
  const c = normalize(raw);
  delete c.id;
  delete c.updatedAt;
  delete c.createdAt;
  delete c.updatedBy;
  delete c.ownerUid;
  delete c.ownerName;
  c.archived = false;
  if (!raw.hp || raw.hp.current == null) c.hp.current = compute(c).hpMax;
  return c;
}
