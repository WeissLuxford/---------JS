import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const D = await import(P + "creator-data.js");
const B = await import(P + "creator-build.js");
const CR = await import(P + "creator.js");
const C = await import(P + "classes.js");
const rawF = JSON.parse(fs.readFileSync(new URL("../../data/features-srd.json", import.meta.url), "utf8"));
const inv = C.INVOCATIONS.map(x => ({ key: "inv-" + x.key, group: "invocation", cls: "warlock", sub: "", subEn: "", race: "", subrace: "", level: x.level || 0, name: x.name, nameEn: "", action: "passive", recharge: "always", uses: "", description: x.description }));
const features = [...rawF, ...inv];
const spells = JSON.parse(fs.readFileSync(new URL("../../data/spells-srd.json", import.meta.url), "utf8")).map((x, i) => ({ ...x, key: x.nameEn + "#" + i }));
const spellKey = en => spells.find(s => s.nameEn === en).key;
const std = cls => D.suggestArray(cls);

test("racial bonuses, point buy and standard array helpers", () => {
  assert.deepEqual(D.raceAsi("dwarf", "hill"), { str: 0, dex: 0, con: 2, int: 0, wis: 1, cha: 0 });
  assert.deepEqual(D.raceAsi("halfElf", "", ["dex", "con", "str"]), { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 2 });
  assert.deepEqual(D.raceAsi("halfElf", "", ["cha", "dex"]).cha, 2);
  assert.equal(D.pointsSpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }), 27);
  assert.equal(D.pointsSpent({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }), 0);
  assert.deepEqual(Object.values(std("wizard")).sort((a, b) => b - a), D.STANDARD_ARRAY);
  assert.equal(std("wizard").int, 15);
  const r = D.roll4d6(() => 0.99);
  assert.equal(r.total, 18);
  assert.equal(D.asiLevels("fighter", 6, C.CLASSES), 2);
  assert.equal(D.asiLevels("rogue", 10, C.CLASSES), 3);
});

test("hill dwarf fighter level 1 is assembled by the rules", () => {
  const c = B.buildCharacter({ name: "Торин", race: "dwarf", subrace: "hill", cls: "fighter", level: 1, background: "soldier", base: std("fighter"), skills: ["perception", "survival"], options: ["style-defense"] }, { features, spells });
  const d = R.compute(c);
  assert.equal(c.abilities.str, 15);
  assert.equal(c.abilities.con, 16);
  assert.equal(c.abilities.wis, 13);
  assert.deepEqual(Object.keys(c.saves).sort(), ["con", "str"]);
  assert.deepEqual(Object.keys(c.skills).sort(), ["athletics", "intimidation", "perception", "survival"]);
  assert.equal(c.hitDie, "d10");
  assert.equal(d.hpMax, 10 + 3 + 1);
  assert.equal(c.hp.current, d.hpMax);
  assert.equal(d.ac, 16 + 2);
  assert.equal(c.speed, 25);
  assert.deepEqual(c.defenses.resist, ["poison"]);
  const names = c.features.map(f => f.name);
  assert.ok(names.includes("Второе дыхание"));
  assert.ok(names.includes("Дварфийская выдержка"));
  assert.ok(names.includes("Оборона"));
  assert.equal(c.features.find(f => f.name === "Дварфийская выдержка").category, "race");
  assert.ok(c.items.some(it => it.name === "Длинный меч" && it.equipped));
  assert.ok(c.items.some(it => it.type === "ammo" && it.qty === 20));
  assert.equal(c.coins.gp, 10);
  assert.match(c.proficiencies.armor, /все доспехи/);
});

test("tiefling fiend warlock started at level 5", () => {
  const c = B.buildCharacter({
    name: "Кирион", race: "tiefling", cls: "warlock", level: 5, subclass: "Исчадие", background: "custom", bgName: "Механик", bgSkills: ["history", "investigation"],
    base: std("warlock"), skills: ["arcana", "deception"], options: ["warlock-pact-of-the-tome"],
    spells: [spellKey("Eldritch Blast"), spellKey("Minor Illusion"), spellKey("Misty Step"), spellKey("Fireball")],
    invocations: features.filter(x => ["inv-agonizing", "inv-devilsSight", "inv-maskFaces"].includes(x.key))
  }, { features, spells });
  const d = R.compute(c);
  assert.equal(c.info.background, "Механик");
  assert.equal(c.abilities.cha, 17);
  assert.equal(d.level, 5);
  assert.equal(d.hpMax, 8 + 2 + 4 * (5 + 2));
  assert.equal(c.casterType, "pact");
  assert.equal(d.pact.count, 2);
  assert.equal(d.pact.level, 3);
  const names = c.features.map(f => f.name);
  for (const n of ["Благословение Тёмного", "Договор гримуара", "Мучительный заряд", "Адское сопротивление"]) assert.ok(names.includes(n), n);
  assert.ok(!names.includes("Договор цепи"));
  assert.ok(!names.includes("Удача Тёмного"));
  assert.equal(c.features.filter(f => f.category === "invocation").length, 3);
  assert.ok(c.spells.some(s => s.nameEn === "Thaumaturgy" && /Раса/.test(s.source)));
  assert.ok(c.spells.some(s => s.nameEn === "Fireball"));
  assert.deepEqual(c.defenses.resist, ["fire"]);
});

test("draconic sorcerer, dragonborn breath and high elf cantrip", () => {
  const c = B.buildCharacter({ race: "dragonborn", dragon: "silver", cls: "sorcerer", subclass: "Наследие драконьей крови", level: 3, background: "sage", base: std("sorcerer"), skills: ["arcana", "insight"], options: ["sorcerer-metamagic-quickened", "sorcerer-metamagic-twinned"] }, { features, spells });
  const d = R.compute(c);
  assert.equal(d.ac, 13 + R.mod(c.abilities.dex));
  assert.equal(d.hpMax, (6 + 2) + 2 * (4 + 2) + 3);
  assert.deepEqual(c.defenses.resist, ["cold"]);
  const breath = c.features.find(f => f.name === "Оружие дыхания");
  assert.equal(breath.damage[0].type, "cold");
  assert.match(breath.description, /Серебряный/);
  assert.ok(c.features.some(f => f.name === "Ускоренное заклинание"));
  assert.ok(!c.features.some(f => f.name === "Аккуратное заклинание"));
  const elf = B.buildCharacter({ race: "elf", subrace: "high", raceCantrip: spellKey("Fire Bolt"), cls: "wizard", level: 1, background: "sage", base: std("wizard") }, { features, spells });
  assert.equal(elf.abilities.int, 16);
  assert.ok(elf.skills.perception);
  assert.ok(elf.spells.some(s => s.nameEn === "Fire Bolt"));
  assert.ok(elf.items.some(it => it.name === "Книга заклинаний"));
});

test("monk and barbarian use unarmored defense, rogue gets expertise", () => {
  const monk = B.buildCharacter({ race: "human", cls: "monk", level: 1, base: { str: 10, dex: 15, con: 13, int: 8, wis: 14, cha: 12 } }, { features, spells });
  const dm = R.compute(monk);
  assert.equal(dm.ac, 10 + 3 + 2);
  assert.equal(monk.items.find(it => it.name === "Дротик").qty, 10);
  const rogue = B.buildCharacter({ race: "halfling", subrace: "lightfoot", cls: "rogue", level: 1, background: "criminal", base: std("rogue"), skills: ["acrobatics", "perception", "insight", "investigation"], expertise: ["stealth", "perception"] }, { features, spells });
  assert.equal(rogue.skills.stealth, 2);
  assert.equal(rogue.skills.perception, 2);
  assert.equal(rogue.skills.acrobatics, 1);
  assert.equal(R.compute(rogue).ac, 11 + R.mod(rogue.abilities.dex));
});

test("creator counts follow class tables at the starting level", () => {
  const k = (cls, level) => CR.creatorCounts({ cls, level });
  assert.deepEqual(k("warlock", 1), { cantrips: 2, spells: 2, invocations: 0, arcanum: [], expertise: 0, asi: 0, skills: 2 });
  assert.equal(k("warlock", 5).invocations, 3);
  assert.equal(k("warlock", 5).spells, 6);
  assert.deepEqual(k("warlock", 13).arcanum, [6, 7]);
  assert.equal(k("wizard", 1).spells, 6);
  assert.equal(k("wizard", 3).spells, 10);
  assert.equal(k("cleric", 1).spells, 0);
  assert.equal(k("cleric", 1).cantrips, 3);
  assert.equal(k("rogue", 6).expertise, 4);
  assert.equal(k("bard", 3).expertise, 2);
  assert.equal(k("fighter", 6).asi, 2);
  assert.equal(k("ranger", 1).skills, 3);
});

test("option groups and features up to a level", () => {
  const probe = R.normalize({ name: "x", info: { subclass: "Охотник" } });
  const groups = B.optionChildren(features, probe, "ranger", 7);
  assert.ok(groups.some(g => g.key === "style"));
  assert.ok(groups.some(g => g.key === "ranger-hunter-prey" && g.list.length === 3));
  assert.ok(groups.some(g => g.key === "ranger-hunter-defensive-tactics"));
  const list = B.classFeaturesUpTo(features, probe, "ranger", 7).map(x => x.key);
  assert.ok(list.includes("ranger-hunter-prey"));
  assert.ok(!list.some(k => k.startsWith("ranger-hunter-prey-")));
  const sorc = B.optionChildren(features, R.normalize({ name: "x", info: { subclass: "Наследие драконьей крови" } }), "sorcerer", 10);
  assert.equal(sorc.find(g => /metamagic/.test(g.key)).max, 3);
});
