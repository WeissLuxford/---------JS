import { newCharacter, normalize, compute, uid, SKILLS } from "./rules.js";
import { CLASSES } from "./classes.js";
import { GEAR, gearToItem } from "./gear.js";
import { featureFromLib, classFeaturesAt, toSpell } from "./library.js";
import { RACES, BACKGROUNDS, CLASS_START, DRAGONS, ABILITY_KEYS, raceAsi } from "./creator-data.js";

const lower = s => String(s || "").toLowerCase().replace(/ё/g, "е");

export function optionChildren(lib, c, clsKey, upTo) {
  const out = [];
  for (let lvl = 1; lvl <= upTo; lvl++) {
    const at = classFeaturesAt(lib, c, clsKey, lvl);
    const boons = at.filter(x => /^pact of /i.test(x.nameEn || ""));
    if (boons.length) out.push({ key: "boon", title: "Дар договора", level: lvl, list: boons, max: 1 });
    if (at.some(x => /^fighting style$/i.test(x.nameEn || ""))) out.push({ key: "style", title: "Боевой стиль", level: lvl, list: lib.filter(x => x.group === "style"), max: 1 });
    const groups = new Map();
    for (const x of at) {
      const parent = at.find(y => y !== x && x.key.startsWith(y.key + "-"));
      if (parent) {
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent).push(x);
      }
    }
    for (const [parent, list] of groups) out.push({ key: parent.key, title: parent.name, level: lvl, list, max: /metamagic/i.test(parent.nameEn || "") ? (upTo >= 17 ? 4 : upTo >= 10 ? 3 : 2) : 1 });
  }
  return out;
}

export function classFeaturesUpTo(lib, c, clsKey, upTo) {
  const out = [];
  for (let lvl = 1; lvl <= upTo; lvl++) {
    const at = classFeaturesAt(lib, c, clsKey, lvl);
    for (const x of at) {
      if (/^pact of /i.test(x.nameEn || "")) continue;
      if (at.some(y => y !== x && x.key.startsWith(y.key + "-"))) continue;
      out.push(x);
    }
  }
  return out;
}

function addProf(text, add) {
  const parts = [...String(text || "").split(/,\s*/), ...String(add || "").split(/,\s*/)].map(s => s.trim()).filter(Boolean);
  return [...new Set(parts)].join(", ");
}

function gearItems(names, cls, start) {
  const items = [];
  const byName = new Map();
  for (const n of names) {
    const g = GEAR.find(x => x.name === n);
    if (!g) continue;
    if (byName.has(n)) {
      byName.get(n).qty += 1;
      continue;
    }
    const it = gearToItem(g, uid);
    it.equipped = true;
    it.qty = n === "Дротик" && start.dartQty ? start.dartQty : 1;
    if (g.kind === "weapon") it.atkProf = true;
    byName.set(n, it);
    items.push(it);
  }
  const armors = items.filter(it => Number(it.acBase) > 0);
  if (armors.length > 1) armors.slice(1).forEach(it => (it.equipped = false));
  if (start.ammo) {
    const ammo = { id: "it-" + uid(), name: start.ammo[0], type: "ammo", qty: start.ammo[1], weight: 1, value: "1 зм", equipped: false, attuned: false, requiresAttunement: false, rarity: "common", damage: [], description: "Стартовое снаряжение." };
    items.push(ammo);
    items.filter(it => /арбалет|лук/i.test(it.name)).forEach(it => (it.ammoId = ammo.id));
  }
  return items;
}

export function buildCharacter(ch, { features = [], spells = [] } = {}) {
  const race = RACES[ch.race] || null;
  const sub = race && race.subraces ? race.subraces[ch.subrace] || null : null;
  const start = CLASS_START[ch.cls] || null;
  const table = CLASSES[ch.cls] || null;
  const bg = BACKGROUNDS[ch.background] || null;
  const level = Math.max(1, Math.min(20, Number(ch.level) || 1));
  const c = newCharacter(String(ch.name || "").trim() || "Новый персонаж");
  c.info.race = race ? race.name : "";
  c.info.subrace = sub ? sub.name : "";
  c.info.cls = table ? table.name : "";
  c.info.subclass = String(ch.subclass || "");
  c.info.level = level;
  c.info.background = bg ? (ch.background === "custom" ? String(ch.bgName || "").trim() || bg.name : bg.name) : "";
  c.info.alignment = String(ch.alignment || "");
  c.info.age = String(ch.age || "");
  const asi = raceAsi(ch.race, ch.subrace, ch.plusTwo || []);
  for (const k of ABILITY_KEYS) c.abilities[k] = Math.min(20, (Number(ch.base && ch.base[k]) || 10) + asi[k] + (Number(ch.bonus && ch.bonus[k]) || 0));
  if (start) for (const k of start.saves) c.saves[k] = true;
  const granted = new Set([...(race && race.skills) || [], ...(bg ? bg.skills : [])]);
  const picked = new Set([...(ch.skills || []), ...(ch.raceSkills || []), ...(ch.bgSkills || [])]);
  for (const s of SKILLS) if (granted.has(s.key) || picked.has(s.key)) c.skills[s.key] = 1;
  for (const k of ch.expertise || []) if (c.skills[k]) c.skills[k] = 2;
  if (table) c.hitDie = "d" + table.die;
  if (start && start.caster) {
    c.casterType = start.caster;
    c.spellAbility = start.ability;
  }
  if (race) {
    c.speed = race.speed;
    if (race.dark) c.senses = `Тёмное зрение ${race.dark} фт`;
    const resist = [...(race.resist || [])];
    if (race.dragon && DRAGONS[ch.dragon]) resist.push(DRAGONS[ch.dragon].type);
    c.defenses.resist = [...new Set(resist)];
    c.proficiencies.languages = race.langs + (sub && sub.extraLang ? ", ещё один язык на выбор" : "") + (bg && bg.langs ? `, ещё ${bg.langs === 1 ? "один язык" : "два языка"} на выбор (предыстория)` : "");
    c.proficiencies.weapons = addProf("", [race.weapons, sub && sub.weapons].filter(Boolean).join(", "));
    c.proficiencies.tools = addProf("", [race.tools, sub && sub.tools].filter(Boolean).join(", "));
  }
  if (start) {
    c.proficiencies.armor = addProf(c.proficiencies.armor, start.armor);
    c.proficiencies.weapons = addProf(c.proficiencies.weapons, start.weapons);
    c.proficiencies.tools = addProf(c.proficiencies.tools, start.tools);
    if (start.unarmored) c.armor = { ...c.armor, name: "Защита без доспехов", addAbility: start.unarmored };
  }
  if (bg) c.proficiencies.tools = addProf(c.proficiencies.tools, bg.tools);
  c.hp.bonusPerLevel = (sub && sub.hpPerLevel) || 0;
  const libFeatures = [];
  if (race) {
    for (const x of features.filter(f => f.group === "race" && f.race === race.name && (!f.subrace || (sub && f.subrace === sub.name)))) {
      const f = { ...x };
      if (race.dragon && DRAGONS[ch.dragon] && /breath/i.test(f.nameEn || "")) {
        const d = DRAGONS[ch.dragon];
        f.damage = [{ dice: "2d6", type: d.type, addMod: false }];
        f.description = `${d.name} дракон: ${d.area}, спасбросок ${d.save === "con" ? "Телосложения" : "Ловкости"}. ` + f.description;
      }
      libFeatures.push(f);
    }
  }
  if (table) {
    const probe = normalize({ ...c, info: { ...c.info } });
    for (const x of classFeaturesUpTo(features, probe, ch.cls, level)) libFeatures.push(x);
    for (const key of ch.options || []) {
      const x = features.find(f => f.key === key);
      if (x) libFeatures.push(x);
    }
    if (ch.cls === "sorcerer" && /дракон|draconic/i.test(c.info.subclass)) {
      c.armor = { ...c.armor, name: "Драконья чешуя", base: 13, dexCap: "full", addAbility: "" };
      c.hp.bonusPerLevel += 1;
    }
  }
  if (bg && bg.srd) for (const x of features.filter(f => f.group === "background")) libFeatures.push(x);
  const seen = new Set();
  c.features = libFeatures.filter(x => !seen.has(x.key) && seen.add(x.key)).map(x => ({ ...featureFromLib(x), category: x.group === "race" ? "race" : x.group === "background" ? "background" : x.group === "invocation" ? "invocation" : "class", source: x.group === "race" ? "race" : x.group === "background" ? "" : "class" }));
  for (const inv of ch.invocations || []) c.features.push({ ...featureFromLib(inv), category: "invocation", source: "class" });
  const pickedSpells = [];
  for (const key of ch.spells || []) {
    const x = spells.find(s => s.key === key);
    if (x) pickedSpells.push({ ...toSpell(x), source: table ? table.name : "" });
  }
  if (race && race.spells) for (const en of race.spells) {
    const x = spells.find(s => s.nameEn === en);
    if (x) pickedSpells.push({ ...toSpell(x), source: `Раса: ${race.name}` });
  }
  if (ch.raceCantrip) {
    const x = spells.find(s => s.key === ch.raceCantrip);
    if (x) pickedSpells.push({ ...toSpell(x), source: `Раса: ${sub ? sub.name : race ? race.name : ""}`, cost: "free" });
  }
  const seenSp = new Set();
  c.spells = pickedSpells.filter(s => !seenSp.has(lower(s.name)) && seenSp.add(lower(s.name)));
  if (ch.equipment !== false && start) {
    c.items = gearItems(start.gear, ch.cls, start);
    if (start.book) c.items.push({ id: "it-" + uid(), name: "Книга заклинаний", type: "book", qty: 1, weight: 3, value: "50 зм", equipped: false, attuned: false, requiresAttunement: false, rarity: "common", damage: [], description: "Книга волшебника: сюда записываются выученные заклинания." });
    c.coins.gp = bg ? bg.gp : 10;
  }
  const out = normalize(c);
  out.hp.current = compute(out).hpMax;
  return out;
}
