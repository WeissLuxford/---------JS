import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const { combatSources } = await import(P + "tabs.js");
const E = await import(P + "entities.js");

const base = extra => R.normalize({ name: "Тест", abilities: { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 10 }, info: { level: 5, cls: "Воин" }, ...extra });

test("a hand-made sword appears in combat once it is worn", () => {
  const sword = { id: "it-s", name: "Длинный меч +1", type: "weapon", equipped: false, atkBonus: 1 };
  let c = base({ items: [sword] });
  assert.equal(Object.keys(R.compute(c).weapons).length, 0);
  c = base({ items: [{ ...sword, equipped: true }] });
  const d = R.compute(c);
  const w = d.weapons["it-s"];
  assert.ok(w);
  assert.equal(w.ability, "str");
  assert.equal(w.hit, 3 + 3 + 1);
  assert.equal(w.dmg, "1d8+4");
  assert.equal(w.type, "slashing");
  assert.equal(combatSources(c, d).weapons.length, 1);
  c = base({ items: [{ ...sword, equipped: true, combat: "no" }] });
  assert.equal(Object.keys(R.compute(c).weapons).length, 0);
});

test("weapon ability is guessed by name, own damage wins", () => {
  assert.equal(R.asWeapon({ name: "Рапира отца", type: "weapon" }).atkAbility, "finesse");
  assert.equal(R.asWeapon({ name: "Старый длинный лук", type: "weapon" }).atkAbility, "dex");
  assert.equal(R.asWeapon({ name: "Кувалда", type: "weapon" }).atkAbility, "str");
  assert.deepEqual(R.asWeapon({ name: "Меч", type: "weapon", damage: [{ dice: "2d6", type: "fire" }] }).damage, [{ dice: "2d6", type: "fire" }]);
  assert.equal(R.asWeapon({ name: "Меч-кладенец", type: "gear" }), null);
  assert.equal(R.asWeapon({ name: "Кинжал", type: "weapon", atkAbility: "dex" }).atkAbility, "dex");
  assert.equal(R.gearWeapon("Двуручный меч предков").name, "Двуручный меч");
  assert.equal(R.gearWeapon("Мечта"), null);
});

test("prepared spells with damage show up, unprepared do not", () => {
  const sp = (name, level, extra) => ({ id: "sp-" + name, name, level, save: "dex", damage: [{ dice: "8d6", type: "fire" }], ...extra });
  const c = base({ casterType: "full", spells: [sp("Огненный шар", 3), sp("Молния", 3, { prepared: false }), sp("Лечение ран", 1, { save: "", damage: [{ dice: "1d8", type: "healing" }] }), sp("Град", 4, { combat: "no" })] });
  const names = combatSources(c, R.compute(c)).spells.map(s => s.name);
  assert.deepEqual(names, ["Огненный шар"]);
});

test("worn items with an action and features with damage are linked", () => {
  const c = base({
    items: [
      { id: "it-w", name: "Палочка холода", type: "wand", equipped: true, action: "action", uses: "7", recharge: "dawn" },
      { id: "it-r", name: "Кольцо", type: "gear", equipped: true, action: "passive" },
      { id: "it-p", name: "Зелье лечения", type: "consumable", equipped: false, action: "action", uses: "1" },
      { id: "it-b", name: "Брошь щита", type: "gear", equipped: false, action: "reaction", uses: "1", combat: "yes" }
    ],
    features: [
      { id: "ft-b", name: "Оружие дыхания", action: "action", damage: [{ dice: "2d6", type: "cold" }] },
      { id: "ft-s", name: "Второе дыхание", action: "bonus", damage: [{ dice: "1d10", type: "healing" }] },
      { id: "ft-x", name: "Скрытая атака", action: "special", damage: [{ dice: "3d6", type: "piercing" }], combat: "no" }
    ]
  });
  const src = combatSources(c, R.compute(c));
  assert.deepEqual(src.pinned.map(p => p.e.name).sort(), ["Брошь щита", "Оружие дыхания", "Палочка холода"]);
});

test("item card shows the attack of a hand-made weapon", () => {
  const c = base({ items: [{ id: "it-a", name: "Боевой топор", type: "weapon", equipped: true }] });
  const m = E.itemModel(c, R.compute(c), c.items[0]);
  assert.match(JSON.stringify(m), /Атака \+6/);
});
