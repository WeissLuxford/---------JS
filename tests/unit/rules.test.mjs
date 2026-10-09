import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");

test("ability modifier and proficiency", () => {
  assert.equal(R.mod(10), 0); assert.equal(R.mod(9), -1); assert.equal(R.mod(20), 5); assert.equal(R.mod(1), -5);
  assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(R.profBonus), [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
});

test("pact slots table (warlock)", () => {
  const exp = { 1: [1, 1], 2: [2, 1], 3: [2, 2], 5: [2, 3], 7: [2, 4], 9: [2, 5], 11: [3, 5], 17: [4, 5] };
  for (const [l, [n, lvl]] of Object.entries(exp)) assert.deepEqual(R.pactSlots(Number(l)), { count: n, level: lvl }, "level " + l);
});

test("dice parsing / formatting", () => {
  assert.deepEqual(R.parseDice("2d6+3"), { dice: [{ n: 2, f: 6 }], flat: 3 });
  assert.deepEqual(R.parseDice("2к6"), { dice: [{ n: 2, f: 6 }], flat: 0 });
  assert.deepEqual(R.parseDice("d8"), { dice: [{ n: 1, f: 8 }], flat: 0 });
  assert.equal(R.parseDice("abc"), null);
  assert.equal(R.addDice("1d8", 3), "1d8+3");
  assert.equal(R.addDice("1d8", -1), "1d8−1");
  assert.equal(R.scaleDice("1d10", 2, { scaleFlat: false }), "2d10");
});

test("evalFormula: Russian aliases and injection safety", () => {
  const d = R.compute(R.normalize(kirion()));
  assert.equal(R.evalFormula("бм", d), d.pb);
  assert.equal(R.evalFormula("хар", d), Math.max(0, d.mods.cha));
  assert.equal(R.evalFormula("constructor", d), null);
  assert.equal(R.evalFormula("alert(1)", d), null);
  assert.equal(R.evalFormula("1/0", d), null);
});

test("normalize is idempotent on seed and on garbage", () => {
  for (const x of [kirion(), {}, null, { name: 5, hp: "x", spells: "nope", abilities: [] }]) {
    const a = R.normalize(x);
    const b = R.normalize(a);
    assert.deepEqual(b, a);
  }
});

test("seed character derived numbers (regression snapshot)", () => {
  const d = R.compute(R.normalize(kirion()));
  assert.equal(d.level, 5);
  assert.equal(d.pb, 3);
  assert.deepEqual(d.pact, { count: 2, level: 3 });
  assert.equal(typeof d.hpMax, "number");
});

test("importCharacter rejects non-sheets and accepts minimal files", () => {
  assert.equal(R.importCharacter(null), null);
  assert.equal(R.importCharacter([]), null);
  assert.equal(R.importCharacter({ foo: 1 }), null);
  assert.equal(R.importCharacter({ name: 5 }), null);
  assert.ok(R.importCharacter({ name: "x" }));
  assert.ok(R.importCharacter({ format: "dnd-sheet", version: 1, character: kirion() }));
});

test("agonizing blast adds the spell modifier to every eldritch blast beam", () => {
  const c = R.normalize(kirion());
  const d0 = R.compute(c);
  const eb = c.spells.find(s => s.name === "Мистический заряд");
  const at = c.attacks.find(a => a.name === "Мистический заряд");
  assert.equal(R.spellCast(c, d0, eb).lines[0].dice, "1d10");
  assert.equal(R.spellCast(c, d0, eb).beams, 2);
  assert.equal(R.hasAgonizing(c), false);
  c.features.push({ id: "f-ag", name: "Мучительный заряд", category: "invocation" });
  const d = R.compute(c);
  assert.equal(R.spellCast(c, d, eb).lines[0].dice, "1d10+4");
  assert.equal(R.spellCast(c, d, eb).beams, 2);
  assert.equal(R.attackStats(c, d, at).dmg, "1d10+4");
  const fb = c.spells.find(s => s.name === "Огненный шар");
  assert.ok(!/\+4$/.test(R.spellCast(c, d, fb).lines[0].dice));
});
