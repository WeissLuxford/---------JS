import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const { spellIcon, featureIcon } = await import(P + "entities.js");
const { normalize } = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");
const read = f => JSON.parse(readFileSync(new URL("../../" + f, import.meta.url), "utf8"));

const same = (a, b) => {
  const x = String(a.nameEn || a.name).toLowerCase();
  const y = String(b.nameEn || b.name).toLowerCase();
  return x === y || x.endsWith(": " + y) || y.endsWith(": " + x);
};

function clashes(list, look) {
  const seen = new Map();
  const bad = [];
  for (const e of list) {
    const k = look(e);
    const prev = (seen.get(k) || []).find(p => !same(p, e));
    if (prev) bad.push(`${prev.name} / ${e.name}: ${k}`);
    seen.set(k, [...(seen.get(k) || []), e]);
  }
  return bad;
}

const chars = [["Кирион", normalize(kirion())], ...read("data/templates.json").map(t => [t.key, normalize(t.c)])];

test("no two spells share icon and color", () => {
  assert.deepEqual(clashes(read("data/spells-srd.json"), sp => { const r = spellIcon({ damageSwap: {} }, sp); return r.icon + " " + r.color; }), []);
  for (const [who, c] of chars) assert.deepEqual(clashes(c.spells, sp => { const r = spellIcon(c, sp); return r.icon + " " + r.color; }), [], who);
});

test("no two different features share an icon", () => {
  assert.deepEqual(clashes(read("data/features-srd.json"), f => featureIcon(f)), []);
  for (const [who, c] of chars) assert.deepEqual(clashes(c.features, f => featureIcon(f) + " " + (f.source === "dm" ? "dm" : "")), [], who);
});
