export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export const POINT_BUDGET = 27;

export const DRAGONS = {
  black: { name: "Чёрный", type: "acid", area: "линия 5 × 30 фт", save: "dex" },
  blue: { name: "Синий", type: "lightning", area: "линия 5 × 30 фт", save: "dex" },
  brass: { name: "Латунный", type: "fire", area: "линия 5 × 30 фт", save: "dex" },
  bronze: { name: "Бронзовый", type: "lightning", area: "линия 5 × 30 фт", save: "dex" },
  copper: { name: "Медный", type: "acid", area: "линия 5 × 30 фт", save: "dex" },
  gold: { name: "Золотой", type: "fire", area: "конус 15 фт", save: "dex" },
  green: { name: "Зелёный", type: "poison", area: "конус 15 фт", save: "con" },
  red: { name: "Красный", type: "fire", area: "конус 15 фт", save: "dex" },
  silver: { name: "Серебряный", type: "cold", area: "конус 15 фт", save: "con" },
  white: { name: "Белый", type: "cold", area: "конус 15 фт", save: "con" }
};

export const RACES = {
  dwarf: {
    name: "Дварф", icon: "gi/kier-heyl/dwarf-helmet", asi: { con: 2 }, speed: 25, dark: 60, resist: ["poison"], langs: "Общий, дварфийский",
    weapons: "боевой топор, ручной топор, лёгкий молот, боевой молот", tools: "инструменты кузнеца, пивовара или каменщика (на выбор)",
    blurb: "Крепкие и упрямые мастера камня и стали. Сопротивление яду, тёмное зрение.",
    subraces: { hill: { name: "Холмовой дварф", asi: { wis: 1 }, hpPerLevel: 1, blurb: "+1 Мудрость, +1 хит за каждый уровень" } }
  },
  elf: {
    name: "Эльф", icon: "gi/delapouite/elf-ear", asi: { dex: 2 }, speed: 30, dark: 60, skills: ["perception"], langs: "Общий, эльфийский",
    blurb: "Изящные и долгоживущие. Владение Внимательностью, иммунитет к магическому сну.",
    subraces: { high: { name: "Высший эльф", asi: { int: 1 }, weapons: "длинный меч, короткий меч, короткий лук, длинный лук", cantrip: "wizard", extraLang: 1, blurb: "+1 Интеллект, заговор волшебника, эльфийское оружие" } }
  },
  halfling: {
    name: "Полурослик", icon: "gi/delapouite/hobbit-dwelling", asi: { dex: 2 }, speed: 25, size: "Маленький", langs: "Общий, язык полуросликов",
    blurb: "Маленькие и везучие: единица на d20 перебрасывается.",
    subraces: { lightfoot: { name: "Легконогий полурослик", asi: { cha: 1 }, blurb: "+1 Харизма, прячется за существами крупнее себя" } }
  },
  human: { name: "Человек", icon: "gi/delapouite/castle", asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, langs: "Общий и ещё один на выбор", extraLang: 1, blurb: "Разносторонние: +1 ко всем характеристикам." },
  dragonborn: { name: "Драконорождённый", icon: "gi/lorc/dragon-breath", asi: { str: 2, cha: 1 }, speed: 30, langs: "Общий, драконий", dragon: true, blurb: "Потомки драконов: оружие дыхания и сопротивление стихии предка." },
  gnome: {
    name: "Гном", icon: "gi/lorc/pointy-hat", asi: { int: 2 }, speed: 25, size: "Маленький", dark: 60, langs: "Общий, гномий",
    blurb: "Любопытные изобретатели. Преимущество на спасброски Инт, Мдр и Хар против магии.",
    subraces: { rock: { name: "Скальный гном", asi: { con: 1 }, tools: "инструменты ремесленника (жестянщика)", blurb: "+1 Телосложение, мастер механических игрушек" } }
  },
  halfElf: { name: "Полуэльф", icon: "gi/kier-heyl/elf-helmet", asi: { cha: 2 }, plusTwo: true, speed: 30, dark: 60, anySkills: 2, langs: "Общий, эльфийский и ещё один на выбор", extraLang: 1, blurb: "+2 Харизма, +1 к двум другим, два любых навыка." },
  halfOrc: { name: "Полуорк", icon: "gi/lorc/bestial-fangs", asi: { str: 2, con: 1 }, speed: 30, dark: 60, skills: ["intimidation"], langs: "Общий, орочий", blurb: "Сильные и стойкие: раз в день остаются на 1 хите вместо 0." },
  tiefling: { name: "Тифлинг", icon: "gi/lorc/horned-skull", asi: { int: 1, cha: 2 }, speed: 30, dark: 60, resist: ["fire"], langs: "Общий, инфернальный", spells: ["Thaumaturgy"], blurb: "Наследники преисподней: сопротивление огню и заклинания предков." }
};

export const BACKGROUNDS = {
  acolyte: { name: "Прислужник", skills: ["insight", "religion"], langs: 2, gp: 15, srd: true },
  charlatan: { name: "Шарлатан", skills: ["deception", "sleightOfHand"], tools: "набор для грима, набор для фальсификации", gp: 15 },
  criminal: { name: "Преступник", skills: ["deception", "stealth"], tools: "воровские инструменты, игровой набор", gp: 15 },
  entertainer: { name: "Артист", skills: ["acrobatics", "performance"], tools: "набор для грима, музыкальный инструмент", gp: 15 },
  folkHero: { name: "Народный герой", skills: ["animalHandling", "survival"], tools: "инструменты ремесленника, наземный транспорт", gp: 10 },
  guildArtisan: { name: "Гильдейский ремесленник", skills: ["insight", "persuasion"], tools: "инструменты ремесленника", langs: 1, gp: 15 },
  hermit: { name: "Отшельник", skills: ["medicine", "religion"], tools: "набор травника", langs: 1, gp: 5 },
  noble: { name: "Благородный", skills: ["history", "persuasion"], tools: "игровой набор", langs: 1, gp: 25 },
  outlander: { name: "Чужеземец", skills: ["athletics", "survival"], tools: "музыкальный инструмент", langs: 1, gp: 10 },
  sage: { name: "Мудрец", skills: ["arcana", "history"], langs: 2, gp: 10 },
  sailor: { name: "Моряк", skills: ["athletics", "perception"], tools: "инструменты навигатора, водный транспорт", gp: 10 },
  soldier: { name: "Солдат", skills: ["athletics", "intimidation"], tools: "игровой набор, наземный транспорт", gp: 10 },
  urchin: { name: "Беспризорник", skills: ["sleightOfHand", "stealth"], tools: "набор для грима, воровские инструменты", gp: 10 },
  custom: { name: "Своя предыстория", skills: [], anySkills: 2, gp: 10 }
};

const ALL = "any";

export const CLASS_START = {
  barbarian: { saves: ["str", "con"], armor: "лёгкие и средние доспехи, щиты", weapons: "простое и воинское оружие", skills: 2, from: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"], primary: ["str", "con", "dex", "wis", "cha", "int"], gear: ["Секира", "Ручной топор", "Ручной топор", "Метательное копьё", "Метательное копьё", "Метательное копьё", "Метательное копьё"], unarmored: "con", blurb: "Ярость в бою, много хитов, защита без доспехов." },
  bard: { saves: ["dex", "cha"], armor: "лёгкие доспехи", weapons: "простое оружие, ручной арбалет, длинный меч, рапира, короткий меч", tools: "три музыкальных инструмента", skills: 3, from: ALL, primary: ["cha", "dex", "con", "wis", "int", "str"], gear: ["Рапира", "Кожаный доспех", "Кинжал"], caster: "full", ability: "cha", blurb: "Вдохновляет союзников, магия слова и музыки." },
  cleric: { saves: ["wis", "cha"], armor: "лёгкие и средние доспехи, щиты", weapons: "простое оружие", skills: 2, from: ["history", "insight", "medicine", "persuasion", "religion"], primary: ["wis", "con", "str", "dex", "cha", "int"], gear: ["Булава", "Чешуйчатый доспех", "Лёгкий арбалет", "Щит"], ammo: ["Арбалетные болты", 20], caster: "full", ability: "wis", blurb: "Божественная магия: лечение и защита." },
  druid: { saves: ["int", "wis"], armor: "лёгкие и средние доспехи, щиты (не металлические)", weapons: "дубинка, кинжал, дротик, метательное копьё, булава, боевой посох, скимитар, серп, праща, копьё", tools: "набор травника", skills: 2, from: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"], primary: ["wis", "con", "dex", "int", "str", "cha"], gear: ["Скимитар", "Кожаный доспех", "Щит"], caster: "full", ability: "wis", blurb: "Сила природы и превращение в зверей." },
  fighter: { saves: ["str", "con"], armor: "все доспехи, щиты", weapons: "простое и воинское оружие", skills: 2, from: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"], primary: ["str", "con", "dex", "wis", "int", "cha"], gear: ["Кольчуга", "Длинный меч", "Щит", "Лёгкий арбалет"], ammo: ["Арбалетные болты", 20], blurb: "Мастер оружия и доспехов, лучший в чистом бою." },
  monk: { saves: ["str", "dex"], armor: "", weapons: "простое оружие, короткий меч", tools: "один набор инструментов ремесленника или музыкальный инструмент", skills: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"], primary: ["dex", "wis", "con", "str", "int", "cha"], gear: ["Короткий меч", "Дротик"], dartQty: 10, unarmored: "wis", blurb: "Быстрые удары, ки и защита без доспехов." },
  paladin: { saves: ["wis", "cha"], armor: "все доспехи, щиты", weapons: "простое и воинское оружие", skills: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"], primary: ["str", "cha", "con", "wis", "dex", "int"], gear: ["Кольчуга", "Длинный меч", "Щит", "Метательное копьё", "Метательное копьё", "Метательное копьё", "Метательное копьё", "Метательное копьё"], caster: "half", ability: "cha", blurb: "Святой воин: кара, наложение рук, ауры." },
  ranger: { saves: ["str", "dex"], armor: "лёгкие и средние доспехи, щиты", weapons: "простое и воинское оружие", skills: 3, from: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"], primary: ["dex", "wis", "con", "str", "int", "cha"], gear: ["Чешуйчатый доспех", "Короткий меч", "Короткий меч", "Длинный лук"], ammo: ["Стрелы", 20], caster: "half", ability: "wis", blurb: "Охотник и следопыт, лук и магия природы." },
  rogue: { saves: ["dex", "int"], armor: "лёгкие доспехи", weapons: "простое оружие, ручной арбалет, длинный меч, рапира, короткий меч", tools: "воровские инструменты", skills: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"], primary: ["dex", "int", "con", "wis", "cha", "str"], gear: ["Рапира", "Короткий лук", "Кожаный доспех", "Кинжал", "Кинжал"], ammo: ["Стрелы", 20], expertise: true, blurb: "Скрытая атака, компетентность, ловкость рук." },
  sorcerer: { saves: ["con", "cha"], armor: "", weapons: "кинжал, дротик, праща, боевой посох, лёгкий арбалет", skills: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"], primary: ["cha", "con", "dex", "wis", "int", "str"], gear: ["Лёгкий арбалет", "Кинжал", "Кинжал"], ammo: ["Арбалетные болты", 20], caster: "full", ability: "cha", blurb: "Магия в крови, метамагия меняет заклинания." },
  warlock: { saves: ["wis", "cha"], armor: "лёгкие доспехи", weapons: "простое оружие", skills: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"], primary: ["cha", "con", "dex", "wis", "int", "str"], gear: ["Лёгкий арбалет", "Кожаный доспех", "Кинжал", "Кинжал"], ammo: ["Арбалетные болты", 20], caster: "pact", ability: "cha", blurb: "Договор с покровителем, Мистический заряд и воззвания." },
  wizard: { saves: ["int", "wis"], armor: "", weapons: "кинжал, дротик, праща, боевой посох, лёгкий арбалет", skills: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "religion"], primary: ["int", "con", "dex", "wis", "cha", "str"], gear: ["Боевой посох"], book: true, caster: "full", ability: "int", blurb: "Учёный маг с книгой заклинаний и огромным выбором." }
};

export function raceAsi(race, subrace, plusTwo = []) {
  const r = RACES[race];
  const out = Object.fromEntries(ABILITY_KEYS.map(k => [k, 0]));
  if (!r) return out;
  for (const [k, v] of Object.entries(r.asi || {})) out[k] += v;
  const s = r.subraces && r.subraces[subrace];
  if (s) for (const [k, v] of Object.entries(s.asi || {})) out[k] += v;
  if (r.plusTwo) for (const k of plusTwo.slice(0, 2)) if (k in out && k !== "cha") out[k] += 1;
  return out;
}

export function pointsSpent(base) {
  return ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[base[k]] ?? 99), 0);
}

export function suggestArray(cls) {
  const order = (CLASS_START[cls] || {}).primary || ABILITY_KEYS;
  return Object.fromEntries(order.map((k, i) => [k, STANDARD_ARRAY[i]]));
}

export function roll4d6(rand = Math.random) {
  const dice = [0, 0, 0, 0].map(() => 1 + Math.floor(rand() * 6)).sort((a, b) => b - a);
  return { dice, total: dice[0] + dice[1] + dice[2] };
}

export function asiLevels(cls, level, classTable) {
  const list = (classTable[cls] && classTable[cls].asi) || [4, 8, 12, 16, 19];
  return list.filter(l => l <= level).length;
}
