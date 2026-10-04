import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const { describeChanges } = await import(P + "changes.js");
const { normalize } = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");
const clone = v => JSON.parse(JSON.stringify(v));

test("no changes -> empty list", () => {
  const a = normalize(kirion());
  assert.deepEqual(describeChanges(a, clone(a)), []);
});
test("hp, ability, item add/remove are described", () => {
  const a = normalize(kirion());
  const b = clone(a);
  b.hp.current = 3; b.abilities.str = 18; b.items.push({ id: "it-new", name: "Верёвка" }); b.items.splice(0, 1);
  const out = describeChanges(a, b);
  assert.ok(out.some(s => s.startsWith("Хиты:")), out.join("|"));
  assert.ok(out.some(s => s.startsWith("СИЛ:")));
  assert.ok(out.some(s => s.includes("добавлено «Верёвка»")));
  assert.ok(out.some(s => s.includes("удалено")));
});
