import { ammoFor, gearWeapon } from "./rules.js";
import { GEAR } from "./gear.js";
import { detectClass } from "./classes.js";

const low = s => String(s || "").toLowerCase().replace(/ё/g, "е");

function gearArmor(name) {
  const n = low(name);
  let best = null;
  for (const g of GEAR) {
    if (g.kind !== "armor" && g.kind !== "shield") continue;
    const k = low(g.name);
    if (new RegExp(`(^|[^а-яa-z])${k}([^а-яa-z]|$)`).test(n) && (!best || k.length > best.name.length)) best = g;
  }
  return best;
}

function knowsWeapon(text, g) {
  const t = low(text);
  if (!t.trim()) return true;
  if (/все[а-я]* (виды )?оружи|любое оружи/.test(t) || t.includes(low(g.name))) return true;
  return g.group.startsWith("Простое") ? /прост/.test(t) : /воинск/.test(t);
}

function knowsArmor(text, g) {
  const t = low(text);
  if (!t.trim()) return true;
  if (/все доспех|любые доспех/.test(t)) return true;
  if (g.kind === "shield") return /щит/.test(t);
  if (g.group.startsWith("Лёгк")) return /легк|средн|тяжел/.test(t);
  if (g.group.startsWith("Средн")) return /средн|тяжел/.test(t);
  return /тяжел/.test(t);
}

const AMMO_NAME = [[/арбалет/i, "болтов"], [/лук(?![а-яё])/i, "стрел"], [/праща/i, "снарядов для пращи"], [/духов[а-яё]* трубк/i, "игл"]];

export function sheetIssues(c, d) {
  const out = [];
  const add = (level, text, open = "", tab = "") => out.push({ level, text, open, tab });
  const items = c.items || [];
  const spells = c.spells || [];
  const prof = c.proficiencies || {};

  if (d.attuned > 3) {
    add("warn", `Настроено предметов: ${d.attuned}, а можно не больше 3. Сними настройку с лишних.`, "", "inventory");
  }

  const worn = items.filter(it => it.equipped);
  const armors = worn.filter(it => Number(it.acBase) > 0);
  if (armors.length > 1) add("warn", `Надето сразу несколько доспехов: ${armors.map(it => it.name).join(", ")}. КД считается по одному.`, "item:" + armors[1].id);
  const shields = worn.filter(it => !(Number(it.acBase) > 0) && Number(it.acBonus) > 0 && /щит/i.test(it.name || ""));
  if (shields.length > 1) add("warn", `Надето два щита: ${shields.map(it => it.name).join(", ")}. Бонус к КД даёт только один.`, "item:" + shields[1].id);

  for (const it of worn) {
    const a = gearArmor(it.name);
    if (a && (Number(it.acBase) > 0 || Number(it.acBonus) > 0) && !knowsArmor(prof.armor, a)) {
      add("warn", `«${it.name}»: нет владения (${a.kind === "shield" ? "щиты" : a.group.toLowerCase()}). Помеха на проверки, спасброски и атаки по Силе и Ловкости, заклинания накладывать нельзя.`, "item:" + it.id);
    }
  }

  for (const it of items) {
    if (!d.weapons[it.id]) continue;
    const g = gearWeapon(it.name);
    if (it.atkProf === false) add("info", `«${it.name}»: отмечено без владения, бонус мастерства к атаке не добавляется.`, "item:" + it.id);
    else if (g && !knowsWeapon(prof.weapons, g)) add("info", `«${it.name}»: во владениях нет ${g.group.startsWith("Простое") ? "простого" : "воинского"} оружия. Если его правда нет, убери галочку «Есть владение» в настройках предмета, и бонус мастерства уйдёт из атаки. Если есть, допиши владение на вкладке «Персонаж».`, "item:" + it.id);
    const need = AMMO_NAME.find(([re]) => re.test(it.name || ""));
    if (need) {
      const ammo = ammoFor(c, it);
      if (!ammo || !(Number(ammo.qty) > 0)) add("info", `«${it.name}»: нет ${need[1]}.`, "item:" + it.id);
    }
  }

  const maxSlot = d.pact ? d.pact.level : (d.slots || []).length;
  for (const sp of spells) {
    const lvl = Number(sp.level) || 0;
    if (lvl > 0 && sp.cost === "slot" && c.casterType !== "none" && lvl > maxSlot) {
      add("info", `«${sp.name}» ${lvl} круга, а ячейки сейчас только до ${maxSlot || 0} круга.`, "spell:" + sp.id);
    }
  }

  const cls = detectClass(c);
  if (cls && cls.prepared && !/[,/]| и /.test(String((c.info && c.info.cls) || ""))) {
    const lvl = d.level || 1;
    const allowed = Math.max(1, (d.mods[cls.prepared] || 0) + (cls.halfPrep ? Math.floor(lvl / 2) : lvl));
    const prepared = spells.filter(sp => Number(sp.level) > 0 && sp.cost === "slot" && sp.prepared !== false && !/раса|домен|клятв|круг|предмет/i.test(sp.source || ""));
    if (prepared.length > allowed) add("warn", `Подготовлено заклинаний: ${prepared.length}, а ${cls.name.toLowerCase()} ${lvl} уровня может ${allowed}. Сними подготовку с лишних на вкладке «Магия».`, "", "spells");
  }

  if (d.weight > d.carry) add("info", `Вес снаряжения ${d.weight} фнт больше грузоподъёмности ${d.carry} фнт.`, "", "inventory");

  return out;
}
