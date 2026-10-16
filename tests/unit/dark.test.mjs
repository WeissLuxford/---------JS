import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; }, createElement() { return { classList: { add() {} }, appendChild() {}, addEventListener() {} }; }, body: { appendChild() {} } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const { isDark, fxOf } = await import("../../js/entities.js");
const spells = JSON.parse(readFileSync(new URL("../../data/spells-srd.json", import.meta.url), "utf8"));
const feats = JSON.parse(readFileSync(new URL("../../data/features-srd.json", import.meta.url), "utf8"));
const spell = n => spells.find(s => s.name === n);

test("dark spells get the dark silhouette, the rest keep the hot core", () => {
  for (const n of ["Тьма", "Сглаз", "Порча", "Прикосновение вампира", "Перст смерти", "Восставший труп", "Ужас", "Леденящее прикосновение"]) assert.ok(isDark(spell(n)), n);
  for (const n of ["Огненный шар", "Защита от смерти", "Снятие проклятия", "Воскрешение", "Град"]) assert.ok(!isDark(spell(n)), n);
  assert.ok(isDark({ name: "Голод Хадара", damage: [{ type: "cold" }] }));
  assert.equal(fxOf({ name: "Тьма" }), "dark");
  assert.equal(fxOf({ name: "Огненный шар" }), "hot");
});

test("patron gifts and fiendish features are dark", () => {
  assert.ok(isDark({ name: "Голос в голове", category: "gift" }, "feature"));
  assert.ok(isDark(feats.find(f => f.name === "Благословение Тёмного"), "feature"));
  assert.ok(isDark(feats.find(f => f.name === "Адское сопротивление"), "feature"));
  assert.ok(!isDark({ name: "Магия договора", category: "class" }, "feature"));
  const n = spells.filter(s => isDark(s)).length;
  assert.ok(n >= 20 && n <= 45, "dark spells: " + n);
});
