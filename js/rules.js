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

export const DAMAGE_TYPES = Object.keys(DAMAGE).filter(k => k !== "healing" && k !== "temp");

export const EFFECT_PRESETS = {
  bless: { name: "Благословение", attack: "1d4", save: "1d4", rounds: 10, conc: true, note: "+1d4 к атакам и спасброскам" },
  bane: { name: "Порча", attack: "-1d4", save: "-1d4", rounds: 10, conc: true, note: "−1d4 к атакам и спасброскам" },
  guidance: { name: "Указание", check: "1d4", rounds: 10, once: true, conc: true, note: "+1d4 к одной проверке" },
  bardic: { name: "Вдохновение барда", attack: "1d6", save: "1d6", check: "1d6", rounds: 100, once: true, note: "+1d6 к одному броску d20" },
  shieldOfFaith: { name: "Щит веры", ac: 2, rounds: 100, conc: true, note: "+2 к КД" },
  shield: { name: "Щит", ac: 5, rounds: 1, note: "+5 к КД до начала твоего хода" },
  haste: { name: "Ускорение", ac: 2, speedX2: true, adv: ["save:dex"], rounds: 10, conc: true, note: "+2 КД, скорость вдвое, преимущество на спасброски Ловкости" },
  hex: { name: "Сглаз", dmg: "1d6", dmgType: "necrotic", rounds: 600, conc: true, note: "+1d6 некротического урона по цели" },
  huntersMark: { name: "Метка охотника", dmg: "1d6", rounds: 600, conc: true, note: "+1d6 урона по цели" },
  enlarge: { name: "Увеличение", dmg: "1d4", adv: ["check:str", "save:str"], rounds: 10, conc: true, note: "+1d4 к урону оружием, преимущество на Силу" },
  reduce: { name: "Уменьшение", dmg: "-1d4", dis: ["check:str", "save:str"], rounds: 10, conc: true, note: "−1d4 к урону оружием, помеха на Силу" },
  rage: { name: "Ярость", dmg: "2", adv: ["check:str", "save:str"], resist: ["bludgeoning", "piercing", "slashing"], rounds: 10, note: "+2 к урону, сопротивление дробящему, колющему, рубящему" },
  cover2: { name: "Половинное укрытие", ac: 2, dexSave: 2, rounds: 1, note: "+2 к КД и спасброскам Ловкости до следующего хода" },
  cover5: { name: "Укрытие на три четверти", ac: 5, dexSave: 5, rounds: 1, note: "+5 к КД и спасброскам Ловкости до следующего хода" },
  dodge: { name: "Уклонение", adv: ["save:dex"], rounds: 1, note: "Атаки по тебе с помехой, преимущество на спасброски Ловкости" },
  protection: { name: "Защита от энергии", resist: ["fire"], rounds: 600, conc: true, note: "Сопротивление выбранному типу урона (поменяй в «Изменить»)" }
};

export const STANDARD_ACTIONS = {
  action: [
    { key: "attack", name: "Атака", icon: "swords", desc: "Одна атака оружием или безоружным ударом. Вместо атаки можно сделать захват или толчок." },
    { key: "grapple", name: "Захват", icon: "fist", roll: "skill:athletics", desc: "Вместо одной атаки. Твоя Атлетика против Атлетики или Акробатики цели. При успехе цель схвачена: её скорость 0." },
    { key: "shove", name: "Толчок", icon: "hand", roll: "skill:athletics", desc: "Вместо одной атаки. Твоя Атлетика против Атлетики или Акробатики цели: сбить с ног или оттолкнуть на 5 фт." },
    { key: "dash", name: "Рывок", icon: "boot", desc: "До конца хода у тебя есть ещё столько же перемещения, сколько скорость." },
    { key: "disengage", name: "Отход", icon: "back", desc: "До конца хода твоё перемещение не провоцирует атаки по возможности." },
    { key: "dodge", name: "Уклонение", icon: "shield", effect: "dodge", desc: "До начала следующего хода атаки по тебе с помехой (если ты видишь атакующего), а спасброски Ловкости с преимуществом." },
    { key: "help", name: "Помощь", icon: "people", desc: "Союзник получает преимущество на следующую проверку или атаку по цели в 5 фт от тебя." },
    { key: "hide", name: "Засада", icon: "moon", roll: "skill:stealth", desc: "Попытка спрятаться: проверка Скрытности против пассивной Внимательности врагов." },
    { key: "search", name: "Поиск", icon: "search", roll: "skill:perception", desc: "Ищешь что-то: обычно Внимательность, иногда Анализ." },
    { key: "ready", name: "Подготовка", icon: "hourglass", desc: "Выбери условие и действие. Когда условие случится, потратишь реакцию, чтобы сделать это действие." },
    { key: "object", name: "Использовать предмет", icon: "bag", desc: "Выпить зелье, достать второй предмет, открыть тяжёлую дверь и т.п. Одно простое взаимодействие в ход бесплатно." }
  ],
  bonus: [
    { key: "offhand", name: "Атака второй рукой", icon: "dagger", desc: "Только если ты атаковал лёгким рукопашным оружием, а во второй руке тоже лёгкое: ещё одна атака без модификатора характеристики к урону." }
  ],
  reaction: [
    { key: "opportunity", name: "Атака по возможности", icon: "swords", desc: "Когда враг, которого ты видишь, выходит из твоей досягаемости: одна рукопашная атака." },
    { key: "readied", name: "Подготовленное действие", icon: "hourglass", desc: "Если в свой ход ты выбрал «Подготовку», реакция тратится, когда случится условие." }
  ]
};

export function movementInfo(c, d) {
  const str = Number(c.abilities.str) || 10;
  const sp = d.speed;
  return [
    { name: "Прыжок в длину", value: `${str} фт с разбега, ${Math.floor(str / 2)} фт с места`, desc: "Разбег: 10 фт перемещения перед прыжком. Каждый фут прыжка тратит фут перемещения." },
    { name: "Прыжок в высоту", value: `${Math.max(0, 3 + d.mods.str)} фт с разбега, ${Math.floor(Math.max(0, 3 + d.mods.str) / 2)} фт с места`, desc: "Плюс можно дотянуться руками на полтора своего роста." },
    { name: "Лазание и плавание", value: `${Math.floor(sp / 2)} фт за ход`, desc: "Каждый фут стоит 2 фута перемещения, если нет скорости лазания или плавания." },
    { name: "Встать с земли", value: `${Math.floor(sp / 2)} фт перемещения`, desc: "Подняться из положения «сбит с ног» стоит половину скорости." },
    { name: "Ползти", value: "каждый фут стоит 2", desc: "Пока лежишь, двигаться можно только ползком." },
    { name: "Рывок", value: `ещё ${sp} фт`, desc: "Действие «Рывок» даёт ещё одну скорость перемещения." }
  ];
}

export const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export function xpInfo(c) {
  const lvl = clampLevel(c.info.level);
  const xp = Math.max(0, Number(c.info.xp) || 0);
  const next = lvl < 20 ? XP_TABLE[lvl] : null;
  const prev = XP_TABLE[lvl - 1];
  const reach = XP_TABLE.filter(v => xp >= v).length;
  return { level: lvl, xp, next, prev, canLevel: reach > lvl, levelByXp: Math.min(20, reach), pct: next ? Math.max(0, Math.min(100, ((xp - prev) / (next - prev)) * 100)) : 100 };
}

export const COIN_CP = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
export const COIN_NAMES = { pp: "ПМ", gp: "ЗМ", ep: "ЭМ", sp: "СМ", cp: "ММ" };

export function coinsTotalCp(coins) {
  return Object.entries(COIN_CP).reduce((sum, [k, v]) => sum + Math.max(0, Math.floor(Number(coins[k]) || 0)) * v, 0);
}

export function payCoins(coins, amount, unit) {
  const cost = Math.round(Math.max(0, Number(amount) || 0) * (COIN_CP[unit] || 100));
  const out = {};
  for (const k of Object.keys(COIN_CP)) out[k] = Math.max(0, Math.floor(Number(coins[k]) || 0));
  if (!cost) return out;
  if (coinsTotalCp(out) < cost) return null;
  let left = cost;
  const order = ["cp", "sp", "ep", "gp", "pp"].filter(k => COIN_CP[k] <= (COIN_CP[unit] || 100));
  const same = Math.min(out[unit] || 0, Math.floor(left / COIN_CP[unit]));
  out[unit] -= same;
  left -= same * COIN_CP[unit];
  for (const k of order.slice().reverse()) {
    if (k === unit || !left) continue;
    const take = Math.min(out[k], Math.floor(left / COIN_CP[k]));
    out[k] -= take;
    left -= take * COIN_CP[k];
  }
  for (const k of ["cp", "sp", "ep", "gp", "pp"]) {
    if (!left) break;
    while (left > 0 && out[k] > 0 && COIN_CP[k] <= left) {
      out[k] -= 1;
      left -= COIN_CP[k];
    }
  }
  if (left > 0) {
    const big = ["cp", "sp", "ep", "gp", "pp"].find(k => out[k] > 0 && COIN_CP[k] > left);
    if (!big) return null;
    out[big] -= 1;
    let change = COIN_CP[big] - left;
    left = 0;
    for (const k of ["gp", "sp", "cp"]) {
      const n = Math.floor(change / COIN_CP[k]);
      out[k] += n;
      change -= n * COIN_CP[k];
    }
  }
  return out;
}

const AMMO_WORDS = [[/арбалет/i, /болт/i], [/лук(?![а-яё])/i, /стрел/i], [/праща/i, /снаряд|пул|камн|камен/i], [/трубк/i, /игл|дротик/i], [/пистол|мушкет|ружь|револьвер/i, /пул|патрон|заряд/i]];

export function ammoFor(c, holder) {
  if (holder.ammoId) return (c.items || []).find(it => it.id === holder.ammoId) || null;
  if (holder.ammoId === "none") return null;
  const pair = AMMO_WORDS.find(([w]) => w.test(holder.name || ""));
  if (!pair) return null;
  return (c.items || []).find(it => (it.type === "ammo" || pair[1].test(it.name || "")) && pair[1].test(it.name || "")) || null;
}

export const ACCENTS = {
  gold: { name: "Золото", c: ["#c9a35b", "#e9c77a", "#f6e2ae"] },
  crimson: { name: "Багровый", c: ["#c0504a", "#e57a72", "#f7c1ba"] },
  emerald: { name: "Изумруд", c: ["#4fa776", "#78cf9c", "#c3efd3"] },
  ice: { name: "Лёд", c: ["#5aa5c9", "#86cbea", "#cdeefc"] },
  amethyst: { name: "Аметист", c: ["#9a6fd0", "#bf98ee", "#e6d5fb"] },
  copper: { name: "Медь", c: ["#c27a46", "#e59f6c", "#f6d0b0"] },
  steel: { name: "Сталь", c: ["#8d98a6", "#b5c0cc", "#e2e8ef"] }
};

export const EFFECT_ROLLS = { attack: "атаки", save: "спасброски", check: "проверки" };

export const DEFENSE_KINDS = { resist: "Сопротивление", vuln: "Уязвимость", immune: "Иммунитет" };

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
  wand: { name: "Палочка, жезл, посох", icon: "wand" },
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
    armor: { name: "Без брони", base: 10, dexCap: "full", shield: false, bonus: 0, addAbility: "" },
    speed: 30,
    initBonus: 0,
    senses: "",
    hp: { current: 8, temp: 0, maxOverride: null, bonusPerLevel: 0, rollAdj: 0, hitDiceUsed: 0, deathSuccess: 0, deathFail: 0, stable: false },
    slotsUsed: {},
    pactUsed: 0,
    conditions: {},
    exhaustion: 0,
    concentration: "",
    damageSwap: { enabled: false, from: "fire", to: "cold", label: "" },
    resistances: "",
    defenses: { resist: [], vuln: [], immune: [] },
    inspiration: false,
    accent: "gold",
    effects: [],
    proficiencies: { armor: "", weapons: "", tools: "", languages: "" },
    attacks: [],
    spells: [],
    features: [],
    items: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    personality: { appearance: "", traits: "", ideals: "", bonds: "", flaws: "", backstory: "", allies: "" },
    notes: { patron: [], quests: [], people: [], misc: [] }
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

const DEFENSE_WORDS = [
  ["acid", /кислот/], ["bludgeoning", /дробящ/], ["cold", /холод|мороз/], ["fire", /огн|огон|пламен/],
  ["force", /силов/], ["lightning", /электр|молни/], ["necrotic", /некрот/], ["piercing", /колющ/],
  ["poison", /(^|[^а-яё])(яд(а|у|ом|е|ы|ов|ам|ами|ах)?|ядовит[а-яё]*)(?![а-яё])/], ["psychic", /психи/], ["radiant", /излуч|сияни/], ["slashing", /рубящ/], ["thunder", /звук|гром/]
];

export function parseDefenses(text) {
  const out = { resist: [], vuln: [], immune: [] };
  for (const part of String(text || "").toLowerCase().split(/[,;\n]+/)) {
    const kind = /иммун/.test(part) ? "immune" : /уязв/.test(part) ? "vuln" : "resist";
    for (const [type, re] of DEFENSE_WORDS) if (re.test(part) && !out[kind].includes(type)) out[kind].push(type);
  }
  return out;
}

const cleanTypes = v => (Array.isArray(v) ? v.filter((t, i) => DAMAGE_TYPES.includes(t) && v.indexOf(t) === i) : []);

const ADV_RE = /^(attack|save|check)(:(str|dex|con|int|wis|cha))?$/;
const diceOrEmpty = v => {
  const t = String(v ?? "").trim().slice(0, 20);
  return t && parseDice(t) ? t : "";
};

export function cleanEffect(e, i = 0) {
  const x = e && typeof e === "object" && !Array.isArray(e) ? e : {};
  const rounds = x.rounds === null || x.rounds === "" || x.rounds === undefined ? null : Math.max(0, Math.round(num(x.rounds)));
  return {
    id: cleanId(x.id, "ef", i),
    name: String(x.name ?? "").slice(0, 80) || "Эффект",
    preset: x.preset in EFFECT_PRESETS ? x.preset : "",
    attack: diceOrEmpty(x.attack),
    save: diceOrEmpty(x.save),
    check: diceOrEmpty(x.check),
    dmg: diceOrEmpty(x.dmg),
    dmgType: DAMAGE_TYPES.includes(x.dmgType) ? x.dmgType : "",
    ac: Math.round(num(x.ac)),
    dexSave: Math.round(num(x.dexSave)),
    speed: Math.round(num(x.speed)),
    speedX2: !!x.speedX2,
    adv: (Array.isArray(x.adv) ? x.adv : []).filter(k => typeof k === "string" && ADV_RE.test(k)),
    dis: (Array.isArray(x.dis) ? x.dis : []).filter(k => typeof k === "string" && ADV_RE.test(k)),
    resist: cleanTypes(x.resist),
    rounds,
    once: !!x.once,
    mine: !!x.mine,
    concName: String(x.concName ?? "").slice(0, 120),
    until: ["short", "long"].includes(x.until) ? x.until : "",
    note: String(x.note ?? "").slice(0, 300)
  };
}

export function presetEffect(key, extra = {}) {
  const p = EFFECT_PRESETS[key];
  if (!p) return null;
  return cleanEffect({ ...p, preset: key, id: "ef-" + uid(), ...extra });
}

export const NOTE_KEYS = ["patron", "quests", "people", "misc"];

const NUMERIC_HP = ["current", "temp", "bonusPerLevel", "rollAdj", "hitDiceUsed", "deathSuccess", "deathFail"];

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
  out.armor.addAbility = ABILITY_KEYS.includes(out.armor.addAbility) ? out.armor.addAbility : "";
  out.armor.shield = !!out.armor.shield;
  out.resistances = String(out.resistances ?? "");
  const def = src.defenses && typeof src.defenses === "object" && !Array.isArray(src.defenses) ? src.defenses : null;
  out.defenses = def ? { resist: cleanTypes(def.resist), vuln: cleanTypes(def.vuln), immune: cleanTypes(def.immune) } : parseDefenses(out.resistances);
  out.inspiration = !!out.inspiration;
  out.accent = out.accent in ACCENTS ? out.accent : "gold";
  out.effects = (Array.isArray(src.effects) ? src.effects : []).map((e, i) => cleanEffect(e, i));
  out.speed = num(out.speed, 30);
  out.initBonus = num(out.initBonus);
  out.exhaustion = Math.max(0, Math.min(6, Math.round(num(out.exhaustion))));
  out.pactUsed = Math.max(0, num(out.pactUsed));
  out.hitDie = HIT_DICE.includes(out.hitDie) ? out.hitDie : "d8";
  out.casterType = out.casterType in CASTER_TYPES ? out.casterType : "none";
  out.spellAbility = ABILITY_KEYS.includes(out.spellAbility) ? out.spellAbility : "int";
  out.concentration = String(out.concentration ?? "");
  out.damageSwap.enabled = !!out.damageSwap.enabled;
  if (!(out.damageSwap.from in DAMAGE)) out.damageSwap.from = "fire";
  if (!(out.damageSwap.to in DAMAGE)) out.damageSwap.to = "cold";
  out.damageSwap.label = String(out.damageSwap.label ?? "").slice(0, 60);
  const prefixes = { attacks: "at", spells: "sp", features: "ft", items: "it" };
  for (const k of Object.keys(prefixes)) {
    out[k] = (Array.isArray(out[k]) ? out[k] : []).filter(x => x && typeof x === "object").map((x, i) => ({ ...x, id: cleanId(x.id, prefixes[k], i), name: String(x.name ?? "") }));
  }
  out.items = out.items.map(it => ({ ...it, qty: Math.max(0, num(it.qty, 1)), weight: Math.max(0, num(it.weight)) }));
  out.items = out.items.map(it => {
    const x = { ...it };
    if ("atkAbility" in x) x.atkAbility = ["str", "dex", "finesse", "spell"].includes(x.atkAbility) ? x.atkAbility : "";
    if ("atkProf" in x) x.atkProf = !!x.atkProf;
    if ("atkBonus" in x) x.atkBonus = Math.round(num(x.atkBonus));
    if ("acBase" in x) x.acBase = x.acBase === null || x.acBase === "" ? null : Math.max(0, Math.min(30, Math.round(num(x.acBase))));
    if ("acDex" in x) x.acDex = ["full", "2", "0"].includes(String(x.acDex)) ? String(x.acDex) : "full";
    if ("acBonus" in x) x.acBonus = Math.round(num(x.acBonus));
    if ("range" in x) x.range = String(x.range ?? "").slice(0, 60);
    if ("ammoId" in x) x.ammoId = String(x.ammoId ?? "").slice(0, 60);
    if ("combat" in x) x.combat = x.combat === "yes" ? "yes" : "";
    return x;
  });
  out.spells = out.spells.map(sp => ("combat" in sp ? { ...sp, combat: ["yes", "no"].includes(sp.combat) ? sp.combat : "" } : sp));
  out.items = out.items.map(it => ("breakOn" in it ? { ...it, breakOn: it.breakOn == null || it.breakOn === "" ? null : Math.max(1, Math.min(20, Math.round(num(it.breakOn, 1)))) } : it));
  for (const k of ["attacks", "spells", "features", "items"]) {
    out[k] = out[k].map(x => ({ ...x, used: Math.max(0, num(x.used)) }));
  }
  out.spells = out.spells.map(sp => ({ ...sp, level: Math.max(0, Math.min(9, Math.round(num(sp.level)))), damage: cleanDamage(sp.damage) }));
  out.spells = out.spells.map(sp => (sp.cost === "item" ? { ...sp, itemId: String(sp.itemId ?? ""), charges: Math.max(1, Math.round(num(sp.charges, 1))), maxCharges: Math.max(1, Math.round(num(sp.maxCharges, num(sp.charges, 1)))) } : sp));
  out.features = out.features.map(f => ({ ...f, damage: cleanDamage(f.damage), ...("combat" in f ? { combat: f.combat === "yes" ? "yes" : "" } : {}) }));
  out.attacks = out.attacks.map(at => ("ammoId" in at ? { ...at, ammoId: String(at.ammoId ?? "").slice(0, 60) } : at));
  out.items = out.items.map(it => ({ ...it, damage: cleanDamage(it.damage) }));
  out.attacks = out.attacks.map(at => ({ ...at, damage: typeof at.damage === "string" ? at.damage : String(at.damage ?? "") }));
  const misc = out.notes.misc;
  if (!Array.isArray(misc)) {
    const text = typeof misc === "string" ? misc : "";
    out.notes.misc = text.trim() ? [{ id: "nt-misc-legacy", title: "Заметки", subtitle: "", text }] : [];
  }
  for (const k of NOTE_KEYS) {
    out.notes[k] = (Array.isArray(out.notes[k]) ? out.notes[k] : []).filter(x => x && typeof x === "object").map((x, i) => ({ ...x, id: cleanId(x.id, "nt-" + k, i) }));
  }
  for (const k of ["saves", "skills", "slotsUsed", "conditions"]) {
    out[k] = out[k] && typeof out[k] === "object" && !Array.isArray(out[k]) ? out[k] : {};
  }
  return out;
}

export function swapType(c, type) {
  const s = c.damageSwap;
  return s && s.enabled && s.from === type ? s.to : type;
}

const SHIELD_RE = /(^|[^а-яё])щит|\bshield\b/i;

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
  const worn = (c.items || []).filter(it => it.equipped && (!it.requiresAttunement || it.attuned));
  const dexBy = cap => (cap === "0" ? 0 : cap === "2" ? Math.min(mods.dex, 2) : mods.dex);
  const armorTotal = it => Number(it.acBase) + dexBy(String(it.acDex || "full"));
  const armorItem = worn.filter(it => Number(it.acBase) > 0).sort((x, y) => armorTotal(y) - armorTotal(x))[0] || null;
  const armorBase = armorItem ? Number(armorItem.acBase) : Number(a.base) || 10;
  const dexCap = armorItem ? String(armorItem.acDex || "full") : a.dexCap;
  const dexPart = dexBy(dexCap);
  const itemAc = worn.reduce((sum, it) => sum + (Number(it.acBonus) || 0), 0);
  const shieldItem = worn.some(it => !(Number(it.acBase) > 0) && Number(it.acBonus) > 0 && SHIELD_RE.test(`${it.name || ""} ${it.nameEn || ""}`));
  const hasShield = !!a.shield || shieldItem;
  const armored = !!armorItem || a.dexCap !== "full" || (Number(a.base) || 10) > 10;
  const addOn = !!a.addAbility && (a.addAbility === "int" ? dexCap === "full" && !hasShield : !armored && (a.addAbility === "con" || !hasShield));
  const ac = armorBase + dexPart + (addOn ? mods[a.addAbility] || 0 : 0) + (a.shield && !shieldItem ? 2 : 0) + (Number(a.bonus) || 0) + itemAc;
  const cond = c.conditions || {};
  const ex = Number(c.exhaustion) || 0;
  const die = maxDie(c.hitDie);
  const perLevel = Math.floor(die / 2) + 1;
  const autoMax = Math.max(1, Math.max(1, die + mods.con) + Math.max(0, level - 1) * Math.max(1, perLevel + mods.con) + level * (Number(c.hp.bonusPerLevel) || 0) + (Number(c.hp.rollAdj) || 0));
  const fullMax = c.hp.maxOverride != null && c.hp.maxOverride !== "" ? Number(c.hp.maxOverride) : autoMax;
  const hpMax = ex >= 4 ? Math.max(1, Math.floor(fullMax / 2)) : fullMax;
  const baseSpeed = Number(c.speed) || 0;
  const stopped = ex >= 5 || ["grappled", "restrained", "paralyzed", "stunned", "unconscious", "petrified"].some(k => cond[k]);
  const effects = Array.isArray(c.effects) ? c.effects : [];
  const boosted = Math.max(0, baseSpeed + effects.reduce((sum, e) => sum + (Number(e.speed) || 0), 0)) * (effects.some(e => e.speedX2) ? 2 : 1);
  const speed = stopped ? 0 : ex >= 2 ? Math.floor(boosted / 2) : boosted;
  const dfn = c.defenses || { resist: [], vuln: [], immune: [] };
  const extraResist = effects.flatMap(e => e.resist || []);
  const defenses = { resist: cond.petrified ? DAMAGE_TYPES.slice() : [...new Set([...(dfn.resist || []), ...extraResist])], vuln: (dfn.vuln || []).slice(), immune: (dfn.immune || []).slice() };
  const acBonus = effects.reduce((sum, e) => sum + (Number(e.ac) || 0), 0);
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
  const d = { level, pb, mods, saves, skills, passive, ac: ac + acBonus, baseAc: ac, hpMax, fullMax, autoMax, speed, baseSpeed, defenses, spell, pact, slots, carry, weight: Math.round(weight * 10) / 10, attuned, tier: cantripTier(level) };
  d.init = mods.dex + (Number(c.initBonus) || 0);
  d.hitDice = { total: level, left: Math.max(0, level - (Number(c.hp.hitDiceUsed) || 0)), die: c.hitDie };
  d.uses = {};
  for (const list of [c.features, c.items, c.spells]) {
    for (const f of list) {
      if (f.uses !== "" && f.uses != null) d.uses[f.id] = evalFormula(f.uses, d);
    }
  }
  d.armorItem = armorItem ? armorItem.id : "";
  d.addAbilityOn = addOn;
  d.shieldItem = shieldItem;
  d.attacks = {};
  for (const at of c.attacks) d.attacks[at.id] = attackStats(c, d, at);
  d.weapons = {};
  for (const it of c.items || []) if (it.atkAbility && it.equipped) d.weapons[it.id] = weaponStats(c, d, it);
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

export function weaponStats(c, d, it) {
  const ab = it.atkAbility === "finesse" ? (d.mods.dex >= d.mods.str ? "dex" : "str") : it.atkAbility;
  const abMod = ab === "spell" ? d.spell.mod : d.mods[ab] ?? 0;
  const bonus = Number(it.atkBonus) || 0;
  const lines = (it.damage || []).filter(x => x.dice).map((x, i) => ({ dice: i === 0 ? addDice(x.dice, abMod + bonus) : x.dice, type: swapType(c, x.type) }));
  return { kind: "attack", ability: ab, hit: abMod + (it.atkProf === false ? 0 : d.pb) + bonus, dmg: lines[0] ? lines[0].dice : "", type: lines[0] ? lines[0].type : "bludgeoning", lines, beams: 1, range: it.range || "" };
}

export function spellInCombat(sp) {
  if (sp.combat === "yes") return true;
  if (sp.combat === "no" || sp.cost === "item") return false;
  return Number(sp.level) === 0 && (sp.attack || !!sp.save) && (sp.damage || []).some(x => x.type !== "healing" && x.type !== "temp");
}

export function spellCast(c, d, sp, slotLevel, extra = 0) {
  const base = Number(sp.level) || 0;
  let level = base;
  if (base > 0) {
    if (slotLevel) level = slotLevel;
    else if (sp.castAt) level = Number(sp.castAt);
    else if (d.pact && sp.cost === "slot") level = Math.max(base, d.pact.level);
  }
  const lines = (sp.damage || []).map((x, i) => {
    let dice = x.dice || "";
    if (base === 0 && sp.scaling === "cantrip-dice") dice = scaleDice(dice, d.tier, { scaleFlat: false });
    if (i === 0 && base > 0 && sp.upcast && level > base) dice = addDice(dice, scaleDice(sp.upcast, level - base));
    if (i === 0 && sp.cost === "item" && sp.upcast && extra > 0) dice = addDice(dice, scaleDice(sp.upcast, extra));
    if (x.addMod) dice = addDice(dice, d.spell.mod);
    return { dice, type: swapType(c, x.type), swapped: swapType(c, x.type) !== x.type, origType: x.type };
  });
  const beams = base === 0 && sp.scaling === "cantrip-beams" ? d.tier : 1;
  return { level, lines, beams };
}

const condName = k => (CONDITIONS.find(x => x.key === k) || {}).name || k;

export function rollContext(c, kind, ability) {
  const cond = (c && c.conditions) || {};
  const ex = Number(c && c.exhaustion) || 0;
  const adv = [];
  const dis = [];
  const warn = [];
  let autoFail = "";
  const on = keys => keys.filter(k => cond[k]).map(condName);
  if (kind === "attack") {
    dis.push(...on(["blinded", "frightened", "poisoned", "prone", "restrained"]));
    adv.push(...on(["invisible"]));
    if (ex >= 3) dis.push(`Истощение ${ex}`);
    const stop = on(["incapacitated", "paralyzed", "stunned", "unconscious", "petrified"]);
    if (stop.length) warn.push(`${stop.join(", ")}: действовать нельзя`);
  }
  if (kind === "check") {
    dis.push(...on(["frightened", "poisoned"]));
    if (ex >= 1) dis.push(`Истощение ${ex}`);
    if (cond.blinded) warn.push("Ослеплён: проверки, где нужно зрение, проваливаются");
    if (cond.deafened) warn.push("Оглох: проверки, где нужен слух, проваливаются");
  }
  if (kind === "save" || kind === "death") {
    if (ability === "dex" && cond.restrained) dis.push(condName("restrained"));
    if (ex >= 3) dis.push(`Истощение ${ex}`);
    if (ability === "str" || ability === "dex") {
      const fail = on(["paralyzed", "stunned", "unconscious", "petrified"]);
      if (fail.length) autoFail = fail.join(", ");
    }
  }
  const rollKind = kind === "death" ? "save" : kind;
  const hit = list => list.includes(rollKind) || (ability && list.includes(`${rollKind}:${ability}`));
  const bonus = [];
  for (const e of (c && Array.isArray(c.effects) ? c.effects : [])) {
    if (hit(e.adv || [])) adv.push(e.name);
    if (hit(e.dis || [])) dis.push(e.name);
    const expr = e[rollKind];
    if (expr && EFFECT_ROLLS[rollKind]) bonus.push({ id: e.id, name: e.name, expr, once: !!e.once });
    if (rollKind === "save" && ability === "dex" && Number(e.dexSave)) bonus.push({ id: e.id, name: e.name, expr: String(e.dexSave), once: false });
  }
  return { adv, dis, warn, autoFail, bonus };
}

export function effectDamage(c) {
  return (Array.isArray(c.effects) ? c.effects : []).filter(e => e.dmg).map(e => ({ dice: e.dmg, type: e.dmgType, name: e.name }));
}

export function effectSummary(e) {
  const parts = [];
  for (const [k, l] of Object.entries(EFFECT_ROLLS)) if (e[k]) parts.push(`${/^[-−]/.test(e[k]) ? e[k] : "+" + e[k]} ${l}`);
  if (e.ac) parts.push(`${e.ac > 0 ? "+" : ""}${e.ac} КД`);
  if (e.dexSave) parts.push(`${e.dexSave > 0 ? "+" : ""}${e.dexSave} спасброски Ловкости`);
  if (e.dmg) parts.push(`${/^[-−]/.test(e.dmg) ? e.dmg : "+" + e.dmg} урон${e.dmgType ? " (" + (DAMAGE[e.dmgType] || {}).name.toLowerCase() + ")" : ""}`);
  if (e.speedX2) parts.push("скорость ×2");
  if (e.speed) parts.push(`${e.speed > 0 ? "+" : ""}${e.speed} фт скорости`);
  if ((e.adv || []).length) parts.push("преимущество");
  if ((e.dis || []).length) parts.push("помеха");
  if ((e.resist || []).length) parts.push("сопротивление: " + e.resist.map(t => (DAMAGE[t] || {}).name.toLowerCase()).join(", "));
  return parts.join(", ");
}

export function resolveMode(manual, ctx) {
  const a = manual === "adv" || ctx.adv.length > 0;
  const d = manual === "dis" || ctx.dis.length > 0;
  return a && d ? "normal" : a ? "adv" : d ? "dis" : "normal";
}

export function rollReasons(manual, ctx) {
  const adv = [...(manual === "adv" ? ["выбрано вручную"] : []), ...ctx.adv];
  const dis = [...(manual === "dis" ? ["выбрано вручную"] : []), ...ctx.dis];
  const out = [];
  if (adv.length && dis.length) out.push(`Преимущество (${adv.join(", ")}) и помеха (${dis.join(", ")}) гасят друг друга`);
  else if (adv.length && ctx.adv.length) out.push(`Преимущество: ${adv.join(", ")}`);
  else if (dis.length && ctx.dis.length) out.push(`Помеха: ${dis.join(", ")}`);
  out.push(...ctx.warn);
  return out;
}

export function applyDefenses(amount, type, defenses) {
  const n = Math.max(0, Math.floor(Number(amount) || 0));
  if (!type || !defenses) return { amount: n, kind: "" };
  if ((defenses.immune || []).includes(type)) return { amount: 0, kind: "immune" };
  const resist = (defenses.resist || []).includes(type);
  const vuln = (defenses.vuln || []).includes(type);
  let v = n;
  if (resist) v = Math.floor(v / 2);
  if (vuln) v *= 2;
  return { amount: v, kind: resist && vuln ? "both" : resist ? "resist" : vuln ? "vuln" : "" };
}

export function itemCharges(lib) {
  const lvl = Number(lib.level) || 0;
  const charges = Math.max(1, lvl - 1);
  const first = (lib.damage || [])[0];
  const grows = !!first && first.type !== "temp" && (lvl === 0 || !!lib.upcast);
  return { charges, maxCharges: grows ? charges + 2 : charges, upcast: grows ? (lvl === 0 ? first.dice : lib.upcast) : "" };
}

export function reorderSubset(list, ids) {
  const byId = new Map(list.map(x => [x.id, x]));
  const want = ids.filter(id => byId.has(id));
  const set = new Set(want);
  const slots = [];
  list.forEach((x, i) => set.has(x.id) && slots.push(i));
  const out = list.slice();
  slots.forEach((p, k) => (out[p] = byId.get(want[k])));
  return out;
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
