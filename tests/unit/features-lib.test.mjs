import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const L = await import(P + "library.js");
const C = await import(P + "classes.js");
const { kirion } = await import(P + "seed.js");
const data = JSON.parse(fs.readFileSync(new URL("../../data/features-srd.json", import.meta.url), "utf8"));

test("feature library data is well formed", () => {
  const keys = new Set();
  const groups = ["class", "race", "style", "feat", "background"];
  for (const x of data) {
    assert.ok(!keys.has(x.key), "duplicate " + x.key);
    keys.add(x.key);
    assert.ok(groups.includes(x.group), x.key);
    assert.ok(x.name && x.description.length >= 20, x.key);
    assert.ok(R.ACTIONS[x.action], x.key + " action");
    assert.ok(R.RECHARGE[x.recharge], x.key + " recharge");
    if (x.group === "class") {
      assert.ok(C.CLASSES[x.cls], x.key + " cls");
      assert.ok(x.level >= 1 && x.level <= 20, x.key + " level");
    }
    assert.ok(!/[—]/.test(JSON.stringify(x)), x.key + " em dash");
    for (const d of x.damage || []) assert.ok(R.DAMAGE[d.type] && R.parseDice(d.dice), x.key + " damage");
  }
  for (const k of Object.keys(C.CLASSES)) assert.ok(data.filter(x => x.cls === k && x.group === "class").length >= 8, "too few for " + k);
  for (const race of ["Дварф", "Эльф", "Полурослик", "Человек", "Драконорождённый", "Гном", "Полуэльф", "Полуорк", "Тифлинг"]) assert.ok(data.some(x => x.group === "race" && x.race === race), race);
  assert.ok(data.filter(x => x.group === "style").length >= 6);
});

test("uses formulas evaluate for a real character", () => {
  const c = R.normalize(kirion());
  const d = R.compute(c);
  for (const x of data.filter(y => y.uses)) {
    const v = R.evalFormula(x.uses, d);
    assert.ok(Number.isFinite(v), x.key + " " + x.uses);
  }
});

test("library features convert into sheet features in the right category", () => {
  const rage = data.find(x => x.nameEn === "Rage");
  const f = L.featureFromLib(rage);
  assert.equal(f.category, "class");
  assert.equal(f.source, "class");
  assert.equal(f.name, "Ярость");
  assert.ok(f.id.startsWith("ft-"));
  const norm = R.normalize({ name: "x", features: [f] }).features[0];
  assert.equal(norm.name, "Ярость");
  const race = data.find(x => x.group === "race");
  assert.equal(L.featureFromLib(race).category, "race");
  const style = data.find(x => x.group === "style");
  assert.equal(L.featureFromLib(style).category, "feat");
});

test("class features by level follow the character subclass", () => {
  const c = R.normalize(kirion());
  const at6 = L.classFeaturesAt(data, c, "warlock", 6).map(x => x.nameEn);
  assert.ok(at6.includes("Dark One's Own Luck"), at6.join());
  const bersCore = R.normalize({ name: "b", info: { cls: "Варвар", subclass: "Путь берсерка" } });
  const at3 = L.classFeaturesAt(data, bersCore, "barbarian", 3).map(x => x.nameEn);
  assert.ok(at3.includes("Frenzy"), at3.join());
  const noSub = R.normalize({ name: "b", info: { cls: "Варвар", subclass: "Путь тотема" } });
  assert.ok(!L.classFeaturesAt(data, noSub, "barbarian", 3).some(x => x.sub));
  assert.ok(L.matchesSubclass(R.normalize({ name: "x", info: { subclass: "Berserker" } }), { sub: "Путь берсерка", subEn: "Path of the Berserker" }));
});

test("invocations join the library as their own group", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => data });
  const all = await L.loadFeatures();
  const inv = all.filter(x => x.group === "invocation");
  assert.equal(inv.length, C.INVOCATIONS.length);
  const agon = inv.find(x => x.name === "Мучительный заряд");
  assert.match(agon.description, /Мистический заряд/);
  assert.equal(L.featureFromLib(agon).category, "invocation");
});

test("uses are shown in plain Russian", () => {
  assert.equal(L.usesText("1"), "1 раз");
  assert.equal(L.usesText("2"), "2 раза");
  assert.equal(L.usesText("12"), "12 раз");
  assert.equal(L.usesText("=pb"), "использований: бонус мастерства");
  assert.equal(L.usesText("=lvl*5"), "использований: уровень × 5");
  assert.equal(L.usesText(""), "");
});
