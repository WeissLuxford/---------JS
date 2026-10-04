import {
  ABILITIES, SKILLS, DAMAGE, SCHOOLS, ACTIONS, RECHARGE, RARITY, ITEM_TYPES, FEATURE_CATS, FEATURE_SOURCES,
  CONDITIONS, CASTER_TYPES, HIT_DICE, ALIGNMENTS, fmt, spellCast, usesInfo, swapType, uid, addDice
} from "./rules.js";
import { icon, slotMark, actionMark } from "./icons.js";
import { card, rich, esc, actionFoot, openForm } from "./ui.js";

const ABIL_OPTS = ABILITIES.map(a => [a.key, a.name]);
const SAVE_OPTS = [["", "Нет"], ...ABIL_OPTS];
const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || "";
const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || "";

const FEATURE_SINGULAR = {
  class: "Классовое умение",
  invocation: "Таинственное воззвание",
  gift: "Дар покровителя",
  race: "Расовая черта",
  background: "Умение предыстории",
  feat: "Черта",
  other: "Умение"
};

export const LIST_KEY ={ spell: "spells", feature: "features", item: "items", attack: "attacks" };

export function findEntity(c, kind, id) {
  const list = c[LIST_KEY[kind]];
  return list ? list.find(x => x.id === id) : null;
}

function rechargeText(e, u) {
  if (!u) return "";
  const r = RECHARGE[e.recharge] || "";
  return `${u.left} из ${u.max}` + (r && e.recharge !== "always" ? ` · ${r.toLowerCase()}` : "");
}

export function spellLevelText(sp) {
  const lvl = Number(sp.level) || 0;
  const school = (SCHOOLS[sp.school] || {}).name || "";
  return lvl === 0 ? `Заговор · ${school}` : `Заклинание ${lvl} круга · ${school}`;
}

export function spellIcon(c, sp) {
  const first = (sp.damage || [])[0];
  if (first && DAMAGE[swapType(c, first.type)]) {
    const t = DAMAGE[swapType(c, first.type)];
    return { icon: t.icon, color: t.color };
  }
  const sc = SCHOOLS[sp.school] || { color: "#e9c77a" };
  const map = { abjuration: "shield", conjuration: "sparkle", divination: "eye", enchantment: "brain", evocation: "force", illusion: "mask", necromancy: "skull", transmutation: "gear" };
  return { icon: map[sp.school] || "sparkle", color: sc.color };
}

export function spellCostText(c, d, sp, cast) {
  const lvl = Number(sp.level) || 0;
  if (lvl === 0 || sp.cost === "free") return { mark: slotMark("#8d8577"), text: lvl === 0 ? "Заговор, без ячейки" : "Без ячейки" };
  if (sp.cost === "uses") {
    const u = usesInfo(d, sp);
    return { mark: slotMark("#e9a54a"), text: u ? `${u.left}/${u.max} · ${(RECHARGE[sp.recharge] || "").toLowerCase()}` : "Особое использование" };
  }
  if (d.pact) return { mark: slotMark("#c07cff"), text: `Ячейка договора ${d.pact.level} круга` };
  return { mark: slotMark("#5fc7ff"), text: `Ячейка ${cast.level} круга` };
}

export function spellModel(c, d, sp, slotLevel) {
  const cast = spellCast(c, d, sp, slotLevel);
  const lines = cast.lines.map((l, i) => ({ ...l, prefix: cast.beams > 1 && i === 0 ? cast.beams + " × " : "" }));
  const meta = [
    { icon: "range", text: sp.range },
    { icon: "area", text: sp.area },
    { icon: "timer", text: sp.duration },
    sp.save ? { icon: "drop", text: `Спасбросок ${abShort(sp.save)} · СЛ ${d.spell.dc}` } : null,
    sp.attack ? { icon: "target", text: `Атака ${fmt(d.spell.atk)}` } : null,
    sp.concentration ? { icon: "spiral", text: "Концентрация" } : null,
    sp.ritual ? { icon: "candle", text: "Ритуал" } : null,
    sp.components ? { icon: "hand", text: sp.components } : null
  ];
  const body = rich(sp.description) + (sp.higher ? `<p class="higher"><b>На больших кругах:</b> ${esc(sp.higher)}</p>` : "") +
    (cast.lines.some(l => l.swapped) && c.damageSwap.label ? `<p class="swap-p">${icon("snow")} ${esc(c.damageSwap.label)}: ${esc(DAMAGE[c.damageSwap.from].name.toLowerCase())} → ${esc(DAMAGE[c.damageSwap.to].name.toLowerCase())}</p>` : "");
  const action = ACTIONS[sp.action] || ACTIONS.action;
  const castTime = sp.castTime && sp.castTime !== action.name ? sp.castTime : action.name;
  const castLvlNote = Number(sp.level) > 0 && cast.level !== Number(sp.level) ? `Накладывается на ${cast.level} круге` : "";
  const u = sp.cost === "uses" ? usesInfo(d, sp) : null;
  return {
    title: sp.name,
    subtitle: spellLevelText(sp) + (sp.nameEn ? ` · ${sp.nameEn}` : ""),
    art: spellIcon(c, sp),
    badges: [sp.source ? { text: sp.source } : null, castLvlNote ? { text: castLvlNote, color: "#c07cff" } : null],
    dice: lines,
    body,
    effect: sp.onSave,
    uses: u,
    usesColor: "#e9a54a",
    meta,
    footer: [{ mark: actionMark(action.shape, action.color), text: castTime }, spellCostText(c, d, sp, cast)]
  };
}

export function featureModel(c, d, f) {
  const cat = FEATURE_CATS[f.category] || FEATURE_CATS.other;
  const u = usesInfo(d, f);
  const lines = (f.damage || []).map(x => ({ dice: x.addMod ? addDice(x.dice, d.spell.mod) : x.dice, type: swapType(c, x.type), swapped: swapType(c, x.type) !== x.type, origType: x.type }));
  const src = FEATURE_SOURCES[f.source];
  const footer = [actionFoot(f.action || "passive")];
  if (u) footer.push({ mark: slotMark("#e9a54a"), text: rechargeText(f, u) });
  else if (f.recharge === "always" && f.action && f.action !== "passive") footer.push({ mark: slotMark("#8d8577"), text: "Всегда доступно" });
  if (f.slot === "pact") footer.push({ mark: slotMark("#c07cff"), text: "Тратит ячейку договора" });
  return {
    title: f.name,
    subtitle: (FEATURE_SINGULAR[f.category] || "Умение") + (f.nameEn ? ` · ${f.nameEn}` : ""),
    art: { icon: cat.icon, color: f.source === "dm" ? "#f0c46a" : "#c9a0ff" },
    badges: [src ? { text: src, color: f.source === "dm" ? "#f0c46a" : f.source === "own" ? "#6fd3c4" : "#c9a35b" } : null],
    dice: lines,
    body: rich(f.description),
    effect: f.effect,
    uses: u,
    usesColor: "#e9a54a",
    meta: [{ icon: "range", text: f.range }, { icon: "timer", text: f.duration }, f.save ? { icon: "drop", text: `Спасбросок ${abShort(f.save)} · СЛ ${d.spell.dc}` } : null],
    footer
  };
}

export function itemModel(c, d, it) {
  const t = ITEM_TYPES[it.type] || ITEM_TYPES.misc;
  const r = RARITY[it.rarity] || RARITY.common;
  const u = usesInfo(d, it);
  const lines = (it.damage || []).map(x => ({ dice: x.dice, type: swapType(c, x.type), swapped: swapType(c, x.type) !== x.type, origType: x.type }));
  const stats = [
    `<span>${icon("hourglass")}Вес: ${fmtNum(it.weight)} фнт${Number(it.qty) > 1 ? ` × ${it.qty}` : ""}</span>`,
    it.value ? `<span>${icon("coin")}${esc(it.value)}</span>` : "",
    Number(it.qty) > 1 ? `<span>${icon("bag")}Количество: ${it.qty}</span>` : ""
  ].join("");
  const footer = [];
  if (it.action) footer.push(actionFoot(it.action));
  if (u) footer.push({ mark: slotMark("#e9a54a"), text: rechargeText(it, u) });
  return {
    title: it.name,
    subtitle: `${t.name} · ${r.name}`,
    art: { icon: itemIcon(it), color: r.color },
    rarityColor: r.color,
    badges: [it.equipped ? { text: "Экипировано", color: "#e9c77a" } : null, it.requiresAttunement ? { text: it.attuned ? "Настроено" : "Требует настройки", color: it.attuned ? "#b46bff" : "#8d8577" } : null],
    dice: lines,
    stats,
    body: rich(it.description),
    effect: it.effect,
    uses: u,
    usesColor: "#e9a54a",
    footer
  };
}

export function attackModel(c, d, at) {
  const s = d.attacks[at.id];
  const dt = DAMAGE[s.type] || DAMAGE.bludgeoning;
  const lines = [{ dice: s.dmg, type: s.type, prefix: s.beams > 1 ? s.beams + " × " : "", swapped: s.type !== at.damageType, origType: at.damageType }];
  const head = s.kind === "save" ? `Спасбросок ${abShort(s.save)} · СЛ ${s.dc}` : `Бросок атаки ${fmt(s.hit)}`;
  return {
    title: at.name,
    subtitle: s.kind === "save" ? "Атака со спасброском" : at.ability === "spell" ? "Атака заклинанием" : "Атака оружием",
    art: { icon: dt.icon, color: dt.color },
    badges: [{ text: head, color: "#e9c77a" }],
    dice: lines,
    body: rich(at.notes),
    meta: [{ icon: "range", text: at.range }],
    footer: [actionFoot(at.action || "action")]
  };
}

export function skillModel(c, d, key) {
  const s = SKILLS.find(x => x.key === key);
  const p = Number(c.skills[key]) || 0;
  return {
    title: s.name,
    subtitle: `Навык · ${abName(s.ab)}`,
    art: { icon: "d20", color: "#e9c77a" },
    badges: [{ text: p === 2 ? "Компетентность" : p === 1 ? "Владение" : "Без владения", color: p ? "#e9c77a" : "#8d8577" }],
    stats: `<span class="big-num">${fmt(d.skills[key])}</span><span>${abShort(s.ab)} ${fmt(d.mods[s.ab])}${p ? ` · мастерство ${fmt(p === 2 ? d.pb * 2 : d.pb)}` : ""}</span>`,
    body: rich(s.desc + (key === "perception" ? `\n\nПассивная Внимательность: ${d.passive.perception}.` : "")),
    footer: [{ mark: actionMark("ring", "#e9c77a"), text: "Нажми, чтобы бросить" }]
  };
}

export function abilityModel(c, d, key) {
  const a = ABILITIES.find(x => x.key === key);
  return {
    title: a.name,
    subtitle: "Характеристика",
    art: { icon: "star", color: "#e9c77a" },
    stats: `<span class="big-num">${esc(c.abilities[key])}</span><span>Модификатор ${fmt(d.mods[key])} · Спасбросок ${fmt(d.saves[key])}${c.saves[key] ? " (владение)" : ""}</span>`,
    body: rich(a.desc)
  };
}

export function conditionModel(key) {
  const k = CONDITIONS.find(x => x.key === key);
  return { title: k.name, subtitle: "Состояние", art: { icon: "skull", color: "#e5533d" }, body: rich(k.desc) };
}

export function modelFor(c, d, ref, opts = {}) {
  const [kind, id] = ref.split(":");
  if (kind === "skill") return skillModel(c, d, id);
  if (kind === "ability") return abilityModel(c, d, id);
  if (kind === "condition") return conditionModel(id);
  const e = findEntity(c, kind, id);
  if (!e) return null;
  if (kind === "spell") return spellModel(c, d, e, opts.slotLevel);
  if (kind === "feature") return featureModel(c, d, e);
  if (kind === "item") return itemModel(c, d, e);
  if (kind === "attack") return attackModel(c, d, e);
  return null;
}

export function cardFor(c, d, ref, opts) {
  const m = modelFor(c, d, ref, opts);
  return m ? card(m) : "";
}

export function itemIcon(it) {
  const n = (it.name || "").toLowerCase();
  const guess = [
    ["монокл", "monocle"], ["компас", "compass"], ["конденсатор", "battery"], ["перо", "feather"], ["кружк", "mug"],
    ["верёвк", "rope"], ["веревк", "rope"], ["фонар", "lantern"], ["рацион", "bread"], ["блокнот", "notebook"],
    ["целител", "medkit"], ["арбалет", "arrow"], ["кинжал", "dagger"], ["книга", "book"], ["рюкзак", "bag"], ["масло", "potion"]
  ].find(([k]) => n.includes(k));
  if (it.icon) return it.icon;
  if (guess) return guess[1];
  return (ITEM_TYPES[it.type] || ITEM_TYPES.misc).icon;
}

export function fmtNum(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return String(v).replace(".", ",");
}

const actionOpts = Object.entries(ACTIONS).map(([k, v]) => [k, v.name]);
const rechargeOpts = Object.entries(RECHARGE);
const usesHint = "Число или формула: =pb (бонус мастерства), =int+lvl, =cha. Пусто, если без ограничений";

export const EDITORS = {
  spell: {
    title: "Заклинание",
    make: () => ({ id: "sp-" + uid(), name: "", nameEn: "", level: 1, school: "evocation", action: "action", castTime: "", range: "", area: "", duration: "Мгновенно", concentration: false, ritual: false, components: "", save: "", attack: false, damage: [], scaling: "none", upcast: "", castAt: null, onSave: "", description: "", higher: "", source: "", cost: "slot", uses: "", recharge: "long", used: 0, prepared: true }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "nameEn", label: "Англ. название" },
      { key: "level", label: "Круг (0 = заговор)", type: "number" },
      { key: "school", label: "Школа", type: "select", options: SCHOOLS },
      { key: "action", label: "Время накладывания", type: "select", options: actionOpts },
      { key: "castTime", label: "Своё время (необязательно)", placeholder: "10 минут" },
      { key: "range", label: "Дистанция", placeholder: "120 фт" },
      { key: "area", label: "Область", placeholder: "сфера 20 фт" },
      { key: "duration", label: "Длительность" },
      { key: "components", label: "Компоненты", placeholder: "В, С, М" },
      { key: "source", label: "Источник", placeholder: "Колдун, Раса..." },
      { key: "concentration", label: "Концентрация", type: "checkbox" },
      { key: "ritual", label: "Ритуал", type: "checkbox" },
      { key: "attack", label: "Бросок атаки заклинанием", type: "checkbox" },
      { key: "save", label: "Спасбросок цели", type: "select", options: SAVE_OPTS },
      { key: "damage", label: "Урон / эффект", type: "dicelist", span: 3 },
      { key: "scaling", label: "Рост заговора", type: "select", options: [["none", "Нет"], ["cantrip-dice", "Больше кубов на 5/11/17 ур."], ["cantrip-beams", "Больше лучей на 5/11/17 ур."]] },
      { key: "upcast", label: "Кубы за круг выше", placeholder: "1d6" },
      { key: "castAt", label: "Всегда на круге", type: "number", nullable: true, hint: "Для врождённых заклинаний" },
      { key: "cost", label: "Чем платишь", type: "select", options: [["slot", "Ячейка заклинаний"], ["uses", "Свои использования"], ["free", "Бесплатно"]] },
      { key: "uses", label: "Использований", placeholder: "1", hint: usesHint },
      { key: "recharge", label: "Восстановление", type: "select", options: rechargeOpts },
      { key: "onSave", label: "Строка-итог (жирным)", placeholder: "При успехе: половина урона", span: 3 },
      { key: "description", label: "Описание", type: "textarea", rows: 6, span: 3 },
      { key: "higher", label: "На больших кругах", type: "textarea", rows: 2, span: 3 }
    ]
  },
  feature: {
    title: "Умение",
    make: (cat = "other") => ({ id: "ft-" + uid(), name: "", nameEn: "", category: cat, source: "", action: "passive", recharge: "always", uses: "", used: 0, slot: "none", range: "", duration: "", save: "", damage: [], description: "", effect: "" }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "nameEn", label: "Англ. название" },
      { key: "category", label: "Раздел", type: "select", options: FEATURE_CATS },
      { key: "source", label: "Откуда", type: "select", options: Object.entries(FEATURE_SOURCES).map(([k, v]) => [k, v || "Не указано"]) },
      { key: "action", label: "Действие", type: "select", options: actionOpts },
      { key: "uses", label: "Использований", placeholder: "1 или =pb", hint: usesHint },
      { key: "recharge", label: "Перезарядка", type: "select", options: rechargeOpts },
      { key: "slot", label: "Ячейка", type: "select", options: [["none", "Не тратит ячейку"], ["pact", "Тратит ячейку договора"]] },
      { key: "range", label: "Дистанция" },
      { key: "duration", label: "Длительность" },
      { key: "save", label: "Спасбросок цели", type: "select", options: SAVE_OPTS },
      { key: "damage", label: "Кубы (урон, лечение, врем. хиты)", type: "dicelist", span: 3 },
      { key: "effect", label: "Строка-итог (жирным)", span: 3 },
      { key: "description", label: "Описание", type: "textarea", rows: 6, span: 3 }
    ]
  },
  item: {
    title: "Предмет",
    make: (type = "gear") => ({ id: "it-" + uid(), name: "", type, rarity: "common", qty: 1, weight: 0, equipped: false, attuned: false, requiresAttunement: false, action: "", uses: "", recharge: "long", used: 0, damage: [], description: "", effect: "", value: "" }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "type", label: "Тип", type: "select", options: ITEM_TYPES },
      { key: "rarity", label: "Редкость", type: "select", options: RARITY },
      { key: "qty", label: "Количество", type: "number" },
      { key: "weight", label: "Вес одного, фнт", type: "number" },
      { key: "value", label: "Цена", placeholder: "25 зм" },
      { key: "equipped", label: "Экипировано", type: "checkbox" },
      { key: "requiresAttunement", label: "Требует настройки", type: "checkbox" },
      { key: "attuned", label: "Настроено", type: "checkbox" },
      { key: "action", label: "Применение", type: "select", options: [["", "Нет"], ...actionOpts] },
      { key: "uses", label: "Заряды / использования", hint: usesHint },
      { key: "recharge", label: "Восстановление", type: "select", options: rechargeOpts },
      { key: "damage", label: "Кубы", type: "dicelist", span: 3 },
      { key: "effect", label: "Строка-итог (жирным)", span: 3 },
      { key: "description", label: "Описание", type: "textarea", rows: 5, span: 3 }
    ]
  },
  attack: {
    title: "Атака",
    make: () => ({ id: "at-" + uid(), name: "", kind: "attack", ability: "str", proficient: true, bonus: 0, damage: "1d6", addMod: true, dmgBonus: 0, damageType: "slashing", saveAbility: "dex", range: "5 фт", scaling: "none", count: 1, action: "action", notes: "" }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "kind", label: "Тип", type: "select", options: [["attack", "Бросок атаки"], ["save", "Спасбросок цели"]] },
      { key: "ability", label: "Характеристика", type: "select", options: [...ABIL_OPTS, ["spell", "Заклинательная"], ["none", "Нет"]] },
      { key: "proficient", label: "Владение", type: "checkbox" },
      { key: "bonus", label: "Доп. бонус к попаданию / СЛ", type: "number" },
      { key: "damage", label: "Кубы урона", placeholder: "1d8" },
      { key: "damageType", label: "Тип урона", type: "select", options: DAMAGE },
      { key: "addMod", label: "Прибавлять модификатор к урону", type: "checkbox" },
      { key: "dmgBonus", label: "Доп. урон", type: "number" },
      { key: "saveAbility", label: "Спасбросок цели", type: "select", options: ABIL_OPTS },
      { key: "range", label: "Дистанция" },
      { key: "scaling", label: "Рост заговора", type: "select", options: [["none", "Нет"], ["cantrip-dice", "Больше кубов"], ["cantrip-beams", "Больше лучей"]] },
      { key: "count", label: "Атак / лучей", type: "number" },
      { key: "action", label: "Действие", type: "select", options: actionOpts },
      { key: "notes", label: "Заметки", type: "textarea", rows: 3, span: 3 }
    ]
  },
  note: {
    title: "Запись",
    make: () => ({ id: "nt-" + uid(), title: "", subtitle: "", status: "", attitude: "", text: "" })
  }
};

export function noteFields(section) {
  const f = [
    { key: "title", label: section === "people" ? "Имя" : "Заголовок", span: 2 },
    { key: "subtitle", label: section === "people" ? "Кто это" : "Подзаголовок" }
  ];
  if (section === "quests") f.push({ key: "status", label: "Статус", type: "select", options: [["active", "Активно"], ["done", "Выполнено"], ["failed", "Провалено"], ["", "Без статуса"]] });
  if (section === "people") f.push({ key: "attitude", label: "Отношение", type: "select", options: [["ally", "Союзник"], ["neutral", "Нейтрально"], ["hostile", "Враг"], ["", "Неизвестно"]] });
  f.push({ key: "text", label: "Текст", type: "textarea", rows: 8, span: 3 });
  return f;
}

export function infoFields() {
  return [
    { type: "heading", key: "_h1", label: "Персонаж", span: 3 },
    { key: "name", label: "Имя", span: 2, max: 120 },
    { key: "info.player", label: "Игрок" },
    { key: "info.race", label: "Раса" },
    { key: "info.subrace", label: "Подраса" },
    { key: "info.age", label: "Возраст" },
    { key: "info.cls", label: "Класс" },
    { key: "info.subclass", label: "Подкласс" },
    { key: "info.level", label: "Уровень", type: "number" },
    { key: "info.background", label: "Предыстория" },
    { key: "info.alignment", label: "Мировоззрение", suggest: ALIGNMENTS },
    { key: "info.xp", label: "Опыт", type: "number" },
    { key: "info.patron", label: "Покровитель / божество" },
    { key: "info.pactBoon", label: "Дар договора / путь" },
    { key: "info.setting", label: "Сеттинг" },
    { type: "heading", key: "_h2", label: "Механика", span: 3 },
    { key: "hitDie", label: "Кость хитов", type: "select", options: HIT_DICE },
    { key: "casterType", label: "Заклинатель", type: "select", options: CASTER_TYPES },
    { key: "spellAbility", label: "Заклинательная характеристика", type: "select", options: ABIL_OPTS },
    { key: "speed", label: "Скорость, фт", type: "number" },
    { key: "initBonus", label: "Доп. бонус инициативы", type: "number" },
    { key: "hp.maxOverride", label: "Макс. хиты вручную", type: "number", nullable: true, hint: "Пусто = считается автоматически" },
    { key: "hp.bonusPerLevel", label: "Доп. хиты за уровень", type: "number", hint: "Например, черта Крепкий: 2" },
    { key: "senses", label: "Чувства", placeholder: "Тёмное зрение 60 фт", span: 2 },
    { key: "resistances", label: "Сопротивления и иммунитеты", span: 3 },
    { type: "heading", key: "_h3", label: "Спасброски с владением", span: 3 },
    ...ABILITIES.map(a => ({ key: "saves." + a.key, label: a.name, type: "checkbox" })),
    { type: "heading", key: "_h4", label: "Замена типа урона (хоумбрю)", span: 3 },
    { key: "damageSwap.enabled", label: "Включено", type: "checkbox" },
    { key: "damageSwap.from", label: "Из", type: "select", options: DAMAGE },
    { key: "damageSwap.to", label: "В", type: "select", options: DAMAGE },
    { key: "damageSwap.label", label: "Название эффекта", span: 3 }
  ];
}

export function armorFields() {
  return [
    { key: "armor.name", label: "Доспех", span: 2 },
    { key: "armor.base", label: "Базовый КД", type: "number" },
    { key: "armor.dexCap", label: "Ловкость", type: "select", options: [["full", "Полностью (лёгкий / без доспеха)"], ["2", "Не больше +2 (средний)"], ["0", "Не учитывается (тяжёлый)"]] },
    { key: "armor.shield", label: "Щит (+2)", type: "checkbox" },
    { key: "armor.bonus", label: "Прочие бонусы", type: "number", hint: "Кольцо защиты, магия и т.п." }
  ];
}

export function openEditor(kind, entity, { onSave, onDelete, makeArg } = {}) {
  const ed = EDITORS[kind];
  const value = entity || ed.make(makeArg);
  return openForm({ title: (entity ? "Изменить: " : "Новое: ") + ed.title.toLowerCase(), fields: ed.fields, value, onSave, onDelete: entity ? onDelete : null });
}
