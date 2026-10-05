import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const { sheetIssues } = await import(P + "checks.js");

const make = extra => R.normalize({ name: "Тест", abilities: { str: 14, dex: 14, con: 12, int: 16, wis: 10, cha: 10 }, info: { level: 3, cls: "Волшебник" }, casterType: "full", spellAbility: "int", proficiencies: { armor: "", weapons: "Кинжалы, дротики, пращи, боевые посохи, лёгкие арбалеты", tools: "", languages: "" }, ...extra });
const issues = c => sheetIssues(c, R.compute(c));
const texts = c => issues(c).map(x => x.text).join("\n");

test("a clean sheet has no issues, empty proficiency text is not judged", () => {
  assert.deepEqual(issues(make({})), []);
  assert.deepEqual(issues(make({ proficiencies: { armor: "" }, items: [{ id: "it-p", name: "Латы", type: "armor", equipped: true, acBase: 18, acDex: "0" }] })), []);
});

test("too many attuned items", () => {
  const items = [1, 2, 3, 4].map(i => ({ id: "it-" + i, name: "Кольцо " + i, type: "gear", attuned: true, requiresAttunement: true }));
  const list = issues(make({ items }));
  assert.equal(list.length, 1);
  assert.equal(list[0].level, "warn");
  assert.match(list[0].text, /4, а можно не больше 3/);
});

test("armor without proficiency and two armors", () => {
  const c = make({ proficiencies: { armor: "Лёгкие доспехи" }, items: [
    { id: "it-c", name: "Кольчуга", type: "armor", equipped: true, acBase: 16, acDex: "0" },
    { id: "it-l", name: "Кожаный доспех", type: "armor", equipped: true, acBase: 11, acDex: "full" }
  ] });
  const t = texts(c);
  assert.match(t, /несколько доспехов/);
  assert.match(t, /«Кольчуга»: нет владения \(тяжёлый доспех\)/);
  const ok = make({ proficiencies: { armor: "Все доспехи, щиты" }, items: [{ id: "it-c", name: "Кольчуга", type: "armor", equipped: true, acBase: 16, acDex: "0" }] });
  assert.deepEqual(issues(ok), []);
});

test("martial weapon without proficiency, bow without arrows", () => {
  const c = make({ items: [
    { id: "it-s", name: "Длинный меч", type: "weapon", equipped: true },
    { id: "it-b", name: "Короткий лук", type: "weapon", equipped: true }
  ] });
  const t = texts(c);
  assert.match(t, /«Длинный меч»: во владениях нет воинского оружия/);
  assert.match(t, /«Короткий лук»: нет стрел/);
  const armed = make({ proficiencies: { weapons: "Простое и воинское оружие" }, items: [
    { id: "it-b", name: "Короткий лук", type: "weapon", equipped: true },
    { id: "it-a", name: "Стрелы", type: "ammo", qty: 20 }
  ] });
  assert.deepEqual(issues(armed), []);
});

test("spells above available slots and too many prepared", () => {
  const sp = (name, level, extra) => ({ id: "sp-" + name, name, level, cost: "slot", ...extra });
  const many = ["А", "Б", "В", "Г", "Д", "Е", "Ж"].map(n => sp(n, 1));
  const t = texts(make({ spells: [...many, sp("Огненный шар", 3)] }));
  assert.match(t, /«Огненный шар» 3 круга, а ячейки сейчас только до 2 круга/);
  assert.match(t, /Подготовлено заклинаний: 8, а волшебник 3 уровня может 6/);
  const fine = make({ spells: [...many.slice(0, 5), sp("Е", 1, { prepared: false }), sp("Ж", 1, { prepared: false })] });
  assert.deepEqual(issues(fine), []);
});

test("warlock pact slots count as the max level, overweight is reported", () => {
  const c = make({ info: { level: 5, cls: "Колдун" }, casterType: "pact", spells: [{ id: "sp-f", name: "Огненный шар", level: 3, cost: "slot" }] });
  assert.deepEqual(issues(c), []);
  const heavy = make({ items: [{ id: "it-x", name: "Наковальня", type: "gear", weight: 400 }] });
  assert.match(texts(heavy), /больше грузоподъёмности/);
});
