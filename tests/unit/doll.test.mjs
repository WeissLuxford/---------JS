import { test } from "node:test";
import assert from "node:assert/strict";
import { dollLayout, equipTo, unequip, swapSets, isTwoHanded, slotKind, fitsSlot } from "../../js/doll.js";
import { normalize, compute } from "../../js/rules.js";

const char = items => ({ items: items.map(x => ({ qty: 1, weight: 0, equipped: false, damage: [], ...x })) });

test("slot kinds are guessed from type and name", () => {
  assert.equal(slotKind({ name: "Проклёпанная кожа", acBase: 12 }), "body");
  assert.equal(slotKind({ name: "Щит", acBonus: 2 }), "off");
  assert.equal(slotKind({ name: "Кинжал", type: "weapon" }), "main");
  assert.equal(slotKind({ name: "Кольцо защиты" }), "ring");
  assert.equal(slotKind({ name: "Амулет здоровья" }), "neck");
  assert.equal(slotKind({ name: "Сапоги эльфов" }), "feet");
  assert.equal(slotKind({ name: "Плащ защиты" }), "cloak");
  assert.equal(slotKind({ name: "Инженерный монокль" }), "eyes");
  assert.equal(slotKind({ name: "Очки ночного видения" }), "eyes");
  assert.equal(slotKind({ name: "Шлем" }), "head");
  assert.equal(slotKind({ name: "Книга теней" }), "");
  assert.equal(slotKind({ name: "Палочка холода", type: "wand" }), "held");
  assert.equal(slotKind({ name: "Святой символ" }), "held");
  assert.ok(fitsSlot({ name: "Палочка холода", type: "wand" }, "off") && fitsSlot({ name: "Палочка холода", type: "wand" }, "main2"));
  assert.ok(!fitsSlot({ name: "Палочка холода", type: "wand" }, "ring1"));
  const w = dollLayout(char([{ id: "d", name: "Кинжал", type: "weapon", equipped: true }, { id: "w", name: "Палочка холода", type: "wand", equipped: true }]));
  assert.equal(w.cells.main.id, "d");
  assert.equal(w.cells.off.id, "w");
});

test("two-handed weapons come from properties or the SRD table", () => {
  assert.ok(isTwoHanded({ name: "Двуручный меч", type: "weapon" }));
  assert.ok(isTwoHanded({ name: "Лёгкий арбалет", type: "weapon" }));
  assert.ok(isTwoHanded({ name: "Посох мага", type: "weapon", effect: "Двуручное" }));
  assert.ok(!isTwoHanded({ name: "Кинжал", type: "weapon" }));
  assert.ok(!fitsSlot({ name: "Двуручный меч", type: "weapon" }, "off"));
  assert.ok(fitsSlot({ name: "Кинжал", type: "weapon" }, "off"));
});

test("equipped items without a slot land on the doll, extras go below", () => {
  const c = char([
    { id: "a", name: "Кожаный доспех", acBase: 11, equipped: true },
    { id: "r1", name: "Кольцо А", equipped: true },
    { id: "r2", name: "Кольцо Б", equipped: true },
    { id: "r3", name: "Кольцо В", equipped: true },
    { id: "w", name: "Длинный меч", type: "weapon", equipped: true },
    { id: "s", name: "Щит", acBonus: 2, equipped: true },
    { id: "b", name: "Книга", equipped: true }
  ]);
  const L = dollLayout(c);
  assert.equal(L.cells.body.id, "a");
  assert.equal(L.cells.ring1.id, "r1");
  assert.equal(L.cells.ring2.id, "r2");
  assert.equal(L.cells.main.id, "w");
  assert.equal(L.cells.off.id, "s");
  assert.deepEqual(L.extra.map(x => x.id).sort(), ["b", "r3"]);
});

test("a two-handed weapon takes both hands and pushes the shield off", () => {
  const c = char([
    { id: "w", name: "Длинный меч", type: "weapon", equipped: true },
    { id: "s", name: "Щит", acBonus: 2, equipped: true },
    { id: "g", name: "Двуручный меч", type: "weapon" }
  ]);
  equipTo(c, "g", "main");
  const L = dollLayout(c);
  assert.equal(L.cells.main.id, "g");
  assert.ok(L.two.main);
  assert.ok(!L.cells.off);
  assert.ok(!c.items.find(x => x.id === "w").equipped);
  assert.ok(!c.items.find(x => x.id === "s").equipped);
});

test("equipping replaces the occupant and takes the item out of a backpack", () => {
  const c = char([
    { id: "p", name: "Рюкзак", isContainer: true },
    { id: "h1", name: "Шлем", equipped: true },
    { id: "h2", name: "Шляпа волшебника", container: "p" }
  ]);
  equipTo(c, "h2", "head");
  const h1 = c.items.find(x => x.id === "h1");
  const h2 = c.items.find(x => x.id === "h2");
  assert.ok(!h1.equipped && h1.slot === "");
  assert.ok(h2.equipped && h2.slot === "head" && h2.container === "");
  unequip(c, "h2");
  assert.ok(!h2.equipped && h2.slot === "");
});

test("swapping weapon sets toggles what counts in combat", () => {
  const c = char([
    { id: "d", name: "Кинжал", type: "weapon", equipped: true },
    { id: "x", name: "Лёгкий арбалет", type: "weapon" }
  ]);
  equipTo(c, "x", "main2");
  assert.ok(!c.items.find(x => x.id === "x").equipped);
  swapSets(c);
  const d = c.items.find(x => x.id === "d");
  const x = c.items.find(x => x.id === "x");
  assert.equal(x.slot, "main");
  assert.ok(x.equipped);
  assert.equal(d.slot, "main2");
  assert.ok(!d.equipped);
  assert.ok(dollLayout(c).two.main);
});

test("normalize keeps valid slots and never counts the spare set as worn", () => {
  const base = normalize({ name: "Т", items: [{ id: "a", name: "Лук", slot: "main2", equipped: true }, { id: "b", name: "Х", slot: "hat" }] });
  assert.equal(base.items[0].slot, "main2");
  assert.equal(base.items[0].equipped, false);
  assert.equal(base.items[1].slot, "");
  assert.equal(normalize({ name: "Т", fullArt: "javascript:x" }).fullArt, "");
  assert.doesNotThrow(() => compute(base));
});

test("dragging between doll, bag, extra and containers", async () => {
  const { dropItem, dollLayout: lay } = await import("../../js/doll.js");
  const c = char([
    { id: "p", name: "Рюкзак", isContainer: true },
    { id: "r1", name: "Кольцо А", equipped: true },
    { id: "r2", name: "Кольцо Б" },
    { id: "d", name: "Кинжал", type: "weapon", equipped: true },
    { id: "m", name: "Булава", type: "weapon", container: "p" },
    { id: "b", name: "Книга" }
  ]);
  assert.equal(dropItem(c, "r2", { kind: "slot", slot: "ring1" }), "ok");
  assert.equal(lay(c).cells.ring1.id, "r2");
  assert.equal(c.items.find(x => x.id === "r1").equipped, false);
  assert.equal(dropItem(c, "b", { kind: "slot", slot: "head" }), "nofit");
  assert.equal(dropItem(c, "m", { kind: "item", id: "d" }), "ok");
  assert.equal(lay(c).cells.main.id, "m");
  assert.equal(c.items.find(x => x.id === "d").container, "p");
  assert.equal(dropItem(c, "m", { kind: "slot", slot: "off" }), "ok");
  assert.equal(lay(c).cells.off.id, "m");
  assert.ok(!lay(c).cells.main);
  assert.equal(dropItem(c, "b", { kind: "extra" }), "ok");
  assert.deepEqual(lay(c).extra.map(x => x.id), ["b"]);
  assert.equal(dropItem(c, "b", { kind: "item", id: "p" }), "ok");
  assert.equal(c.items.find(x => x.id === "b").container, "p");
  assert.equal(c.items.find(x => x.id === "b").equipped, false);
  assert.equal(dropItem(c, "p", { kind: "bag", box: "p" }), "none");
  assert.equal(dropItem(c, "r2", { kind: "bag", box: "" }), "ok");
  assert.ok(!lay(c).cells.ring1);
});

test("dropping a doll item on a fitting bag item swaps them", async () => {
  const { dropItem, dollLayout: lay } = await import("../../js/doll.js");
  const c = char([
    { id: "h1", name: "Шлем", equipped: true },
    { id: "h2", name: "Шляпа" }
  ]);
  assert.equal(dropItem(c, "h1", { kind: "item", id: "h2" }), "ok");
  assert.equal(lay(c).cells.head.id, "h2");
  assert.equal(c.items.find(x => x.id === "h1").equipped, false);
});
