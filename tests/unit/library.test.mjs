import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const { toSpell, guessClass, CLASSES } = await import(P + "library.js");
const { cardFor } = await import(P + "entities.js");
const R = await import(P + "rules.js");
const data = JSON.parse(readFileSync(new URL("../../data/spells-srd.json", import.meta.url), "utf8"));

test("SRD library: every spell is valid and renders as a card", () => {
  assert.ok(data.length > 300, String(data.length));
  const names = new Set();
  const c = R.normalize({ name: "L", info: { cls: "Колдун", level: 5 }, casterType: "pact" });
  for (const lib of data) {
    assert.ok(!names.has(lib.nameEn), "duplicate " + lib.nameEn);
    names.add(lib.nameEn);
    assert.ok(lib.classes.length && lib.classes.every(k => k in CLASSES), lib.nameEn);
    assert.ok(!JSON.stringify(lib).includes("—"), lib.nameEn);
    const sp = toSpell(lib);
    assert.equal(sp.name, lib.name);
    for (const l of sp.damage) assert.ok(R.parseDice(l.dice), lib.nameEn + " " + l.dice);
    if (sp.upcast) assert.ok(R.parseDice(sp.upcast), lib.nameEn + " upcast");
    c.spells = [sp];
    const html = cardFor(c, R.compute(c), "spell:" + sp.id);
    assert.ok(html.includes(lib.name.replace(/&/g, "&amp;")), lib.nameEn);
  }
  assert.equal(guessClass(c), "warlock");
  assert.equal(guessClass(R.normalize({ name: "x", info: { cls: "Волшебница" } })), "wizard");
});
