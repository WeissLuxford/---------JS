import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const C = await import(P + "classes.js");
const { kirion } = await import(P + "seed.js");
const lib = JSON.parse(fs.readFileSync(new URL("../../data/spells-srd.json", import.meta.url))).map((x, i) => ({ ...x, key: x.nameEn + "#" + i }));
const K = () => R.normalize(kirion());

test("warlock 5 to 6: one new spell up to 3rd level, Fiend feature, no invocation", () => {
  const c = K();
  const cls = C.detectClass(c);
  const plan = C.levelUpPlan(c, cls, 5);
  assert.deepEqual(plan.picks, { cantrips: 0, spells: 1, invocations: 0, arcanum: 0, swapSpell: true, swapInvocation: true });
  assert.equal(C.learnLevel(c, cls, 6, R.slotTable, R.pactSlots), 3);
  assert.equal(C.detectSubclass(c, cls).key, "fiend");
  assert.deepEqual(C.newFeatures(c, cls, 6).map(f => f.name), ["Удача Тёмного"]);
  const luck = C.newFeatures(c, cls, 6)[0];
  assert.equal(luck.recharge, "short");
  assert.equal(luck.uses, "1");
});

test("spell candidates respect class, level, known spells and the Fiend list", () => {
  const c = K();
  const cls = C.detectClass(c);
  const list = C.spellCandidates(lib, c, cls, 3);
  const names = list.map(x => x.nameEn);
  assert.ok(list.every(x => x.level >= 1 && x.level <= 3));
  assert.ok(names.includes("Scorching Ray") && names.includes("Stinking Cloud") && names.includes("Command"));
  assert.ok(list.find(x => x.nameEn === "Scorching Ray").expanded);
  assert.ok(!names.includes("Fireball") && !names.includes("Misty Step") && !names.includes("Burning Hands"));
  assert.ok(!names.includes("Fire Shield"));
  assert.ok(!names.includes("Cure Wounds"));
  const cantrips = C.spellCandidates(lib, c, cls, 0, { cantrips: true });
  assert.ok(cantrips.every(x => x.level === 0));
  assert.ok(!cantrips.some(x => x.nameEn === "Eldritch Blast"));
});

test("invocations: prerequisites and owned ones", () => {
  const c = K();
  const at7 = C.invocationOptions(c, 7);
  const get = k => at7.find(x => x.key === k);
  assert.equal(get("agonizing").ok, true);
  assert.equal(get("bewitching").ok, true);
  assert.equal(get("ascendantStep").ok, false);
  assert.match(get("ascendantStep").why, /9 уровень/);
  assert.equal(get("thirstingBlade").ok, false);
  assert.match(get("thirstingBlade").why, /клинка/);
  assert.equal(get("bookAncient").ok, true);
  assert.equal(get("maskFaces").have, true);
  assert.equal(get("fiendishVigor").have, true);
  const noBlast = R.normalize({ ...kirion(), spells: [] });
  assert.equal(C.invocationOptions(noBlast, 7).find(x => x.key === "agonizing").ok, false);
  assert.equal(C.INVOCATIONS.length, 32);
  assert.equal(new Set(C.INVOCATIONS.map(x => x.key)).size, 32);
});

test("warlock tables across levels", () => {
  const c = K();
  const cls = C.detectClass(c);
  const at = from => C.levelUpPlan(c, cls, from).picks;
  assert.equal(at(6).invocations, 1);
  assert.equal(at(10).arcanum, 6);
  assert.equal(at(12).arcanum, 7);
  assert.equal(at(3).cantrips, 1);
  assert.deepEqual(C.newFeatures(c, cls, 10).map(f => f.name), ["Дьявольская стойкость"]);
  assert.deepEqual(C.newFeatures(c, cls, 14).map(f => f.name), ["Бросок через ад"]);
  assert.deepEqual(C.newFeatures(c, cls, 11).map(f => f.name), ["Таинственный арканум"]);
  assert.equal(C.learnLevel(c, cls, 9, R.slotTable, R.pactSlots), 5);
  assert.equal(C.learnLevel(c, cls, 20, R.slotTable, R.pactSlots), 5);
});

test("other casters: highest learnable level and subclass isolation", () => {
  const bard = R.normalize({ name: "b", info: { cls: "Бард", subclass: "Коллегия знаний", level: 4 }, casterType: "full" });
  const cls = C.detectClass(bard);
  assert.equal(C.learnLevel(bard, cls, 5, R.slotTable, R.pactSlots), 3);
  assert.equal(C.detectSubclass(bard, cls), null);
  const cleric = R.normalize({ name: "c", info: { cls: "Жрец", subclass: "Исчадие" } });
  assert.equal(C.detectSubclass(cleric, C.detectClass(cleric)), null);
  const ranger = R.normalize({ name: "r", info: { cls: "Следопыт" } });
  assert.equal(C.learnLevel(ranger, C.detectClass(ranger), 5, R.slotTable, R.pactSlots), 2);
  const wizard = R.normalize({ name: "w", info: { cls: "Волшебник" } });
  assert.equal(C.levelUpPlan(wizard, C.detectClass(wizard), 3).picks.spells, 2);
});
