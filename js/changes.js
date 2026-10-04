import { ABILITIES, SKILLS, CONDITIONS, DAMAGE, DEFENSE_KINDS } from "./rules.js";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const INFO = {
  race: "Раса", subrace: "Подраса", cls: "Класс", subclass: "Подкласс", level: "Уровень", background: "Предыстория",
  alignment: "Мировоззрение", age: "Возраст", xp: "Опыт", setting: "Сеттинг", patron: "Покровитель", pactBoon: "Дар договора", player: "Игрок"
};
const HP = { current: "Хиты", temp: "Временные хиты", maxOverride: "Макс. хиты", bonusPerLevel: "Доп. хиты за уровень", rollAdj: "Поправка хитов от бросков", hitDiceUsed: "Потрачено костей хитов", deathSuccess: "Успехи спасбросков от смерти", deathFail: "Провалы спасбросков от смерти", stable: "Стабилизация" };
const PERSONALITY = { appearance: "Внешность", traits: "Черты характера", ideals: "Идеалы", bonds: "Привязанности", flaws: "Слабости", backstory: "Предыстория (текст)", allies: "Союзники" };
const PROF = { armor: "Владение доспехами", weapons: "Владение оружием", tools: "Инструменты", languages: "Языки" };
const COINS = { pp: "ПМ", gp: "ЗМ", ep: "ЭМ", sp: "СМ", cp: "ММ" };
const LISTS = { attacks: "Атаки", spells: "Заклинания", features: "Умения", items: "Снаряжение" };
const NOTES = { patron: "Заметки о покровителе", quests: "Задания", people: "Люди", misc: "Прочие заметки" };
const SIMPLE = {
  name: "Имя", speed: "Скорость", initBonus: "Бонус инициативы", hitDie: "Кость хитов", casterType: "Тип заклинателя",
  spellAbility: "Заклинательная характеристика", senses: "Чувства", resistances: "Сопротивления (заметка)", exhaustion: "Истощение",
  pactUsed: "Потраченные ячейки договора", concentration: "Концентрация", inspiration: "Вдохновение"
};

const short = v => {
  if (v === null || v === undefined || v === "") return "пусто";
  if (typeof v === "boolean") return v ? "да" : "нет";
  const s = String(v).replace(/\s+/g, " ");
  return s.length > 28 ? s.slice(0, 27) + "…" : s;
};

const arrow = (label, a, b) => `${label}: ${short(a)} → ${short(b)}`;

const isLong = v => typeof v === "string" && v.length > 40;

function listChanges(label, a = [], b = [], nameKey = "name") {
  const out = [];
  const byA = new Map(a.map(x => [x.id, x]));
  const byB = new Map(b.map(x => [x.id, x]));
  const added = b.filter(x => !byA.has(x.id)).map(x => x[nameKey] || "без названия");
  const removed = a.filter(x => !byB.has(x.id)).map(x => x[nameKey] || "без названия");
  const changedNames = [];
  const usesOnly = [];
  for (const x of b) {
    const y = byA.get(x.id);
    if (!y || same(x, y)) continue;
    const rest = k => {
      const { used, collapsed, ...r } = k;
      return r;
    };
    const view = k => {
      const { collapsed, ...r } = k;
      return r;
    };
    if (same(view(x), view(y))) continue;
    if (same(rest(x), rest(y))) usesOnly.push(x[nameKey] || "без названия");
    else changedNames.push(x[nameKey] || "без названия");
  }
  if (added.length) out.push(`${label}: добавлено ${added.map(n => `«${n}»`).join(", ")}`);
  if (removed.length) out.push(`${label}: удалено ${removed.map(n => `«${n}»`).join(", ")}`);
  if (changedNames.length) out.push(`${label}: изменено ${changedNames.map(n => `«${n}»`).join(", ")}`);
  if (usesOnly.length) out.push(`Использования: ${usesOnly.map(n => `«${n}»`).join(", ")}`);
  return out;
}

function objChanges(labels, a = {}, b = {}, prefix = "") {
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (same(a[k], b[k])) continue;
    const label = prefix + (labels[k] || k);
    out.push(isLong(a[k]) || isLong(b[k]) ? `${label}: текст изменён` : arrow(label, a[k], b[k]));
  }
  return out;
}

export function describeChanges(a, b) {
  if (!a || !b) return [];
  const out = [];
  for (const [k, label] of Object.entries(SIMPLE)) {
    if (!same(a[k], b[k])) out.push(isLong(a[k]) || isLong(b[k]) ? `${label}: текст изменён` : arrow(label, a[k], b[k]));
  }
  out.push(...objChanges(INFO, a.info, b.info));
  for (const ab of ABILITIES) {
    if (a.abilities[ab.key] !== b.abilities[ab.key]) out.push(arrow(ab.short, a.abilities[ab.key], b.abilities[ab.key]));
  }
  out.push(...objChanges(HP, a.hp, b.hp));
  if (!same(a.saves, b.saves)) {
    const names = ABILITIES.filter(x => !!a.saves[x.key] !== !!b.saves[x.key]).map(x => `${x.name} ${b.saves[x.key] ? "+" : "−"}`);
    if (names.length) out.push(`Спасброски: ${names.join(", ")}`);
  }
  if (!same(a.skills, b.skills)) {
    const lvl = v => ["нет", "владение", "компетентность"][Number(v) || 0];
    const names = SKILLS.filter(x => (Number(a.skills[x.key]) || 0) !== (Number(b.skills[x.key]) || 0)).map(x => `${x.name} (${lvl(b.skills[x.key])})`);
    if (names.length) out.push(`Навыки: ${names.join(", ")}`);
  }
  if (!same(a.armor, b.armor)) out.push(`Доспех: ${short(b.armor.name)}`);
  if (!same(a.slotsUsed, b.slotsUsed)) out.push("Ячейки заклинаний");
  if (!same(a.conditions, b.conditions)) {
    const on = CONDITIONS.filter(x => !a.conditions[x.key] && b.conditions[x.key]).map(x => x.name);
    const off = CONDITIONS.filter(x => a.conditions[x.key] && !b.conditions[x.key]).map(x => x.name);
    if (on.length) out.push(`Состояния: ${on.join(", ")}`);
    if (off.length) out.push(`Сняты состояния: ${off.join(", ")}`);
  }
  if (!same(a.damageSwap, b.damageSwap)) out.push("Замена типа урона");
  for (const [k, label] of Object.entries(DEFENSE_KINDS)) {
    const x = (a.defenses && a.defenses[k]) || [];
    const y = (b.defenses && b.defenses[k]) || [];
    if (same(x, y)) continue;
    const names = list => list.map(t => (DAMAGE[t] || {}).name || t).join(", ") || "нет";
    out.push(`${label}: ${names(x)} → ${names(y)}`);
  }
  out.push(...objChanges(PROF, a.proficiencies, b.proficiencies));
  const coins = Object.keys(COINS).filter(k => a.coins[k] !== b.coins[k]).map(k => `${COINS[k]} ${short(a.coins[k])} → ${short(b.coins[k])}`);
  if (coins.length) out.push(`Монеты: ${coins.join(", ")}`);
  for (const [k, label] of Object.entries(LISTS)) out.push(...listChanges(label, a[k], b[k]));
  for (const [k, label] of Object.entries(NOTES)) out.push(...listChanges(label, a.notes[k], b.notes[k], "title"));
  out.push(...objChanges(PERSONALITY, a.personality, b.personality));
  if (a.archived !== b.archived) out.push(b.archived ? "Убран в архив" : "Возвращён из архива");
  return out;
}
