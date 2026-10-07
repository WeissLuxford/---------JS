import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const { sheetIssues } = await import(P + "checks.js");
const { combatSources } = await import(P + "tabs.js");
const raw = JSON.parse(fs.readFileSync(new URL("../../data/templates.json", import.meta.url), "utf8"));

test("three ready characters, clean and playable", () => {
  assert.deepEqual(raw.map(t => t.key), ["fighter", "cleric", "wizard"]);
  for (const t of raw) {
    const c = R.normalize(t.c);
    const d = R.compute(c);
    assert.ok(t.blurb && t.icon, t.key);
    for (const k of ["art", "board", "portrait"]) assert.ok(t[k] && fs.existsSync(new URL("../../" + t[k], import.meta.url)), `${t.key} ${k}`);
    assert.ok(fs.statSync(new URL("../../" + t.portrait, import.meta.url)).size < 200000, t.key);
    assert.equal(c.portrait, "", t.key);
    assert.equal(c.info.level, 3, t.key);
    assert.ok(c.info.subclass, t.key);
    assert.equal(c.hp.current, d.hpMax, t.key);
    assert.deepEqual(sheetIssues(c, d), [], t.key);
    assert.ok(combatSources(c, d).weapons.length >= 1, t.key);
    assert.ok(c.personality.backstory.length > 40, t.key);
    assert.ok(!("ownerUid" in t.c) && !("id" in t.c), t.key);
    for (const k of ["attacks", "spells", "features", "items"]) {
      const ids = c[k].map(x => x.id);
      assert.equal(new Set(ids).size, ids.length, `${t.key} ${k}`);
    }
    const itemIds = new Set(c.items.map(x => x.id));
    for (const it of c.items) if (it.ammoId) assert.ok(itemIds.has(it.ammoId), `${t.key} ${it.name}`);
  }
});

test("each class shows its signature", () => {
  const by = k => R.normalize(raw.find(t => t.key === k).c);
  const fighter = by("fighter");
  assert.ok(fighter.features.some(f => f.name === "Второе дыхание"));
  const cleric = by("cleric");
  assert.ok(cleric.spells.some(s => s.nameEn === "Cure Wounds" && s.source === "Домен жизни"));
  const wizard = by("wizard");
  assert.equal(wizard.spells.filter(s => Number(s.level) > 0 && s.prepared !== false).length, 6);
  assert.ok(wizard.items.some(it => it.name === "Книга заклинаний"));
});
