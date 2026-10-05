import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");

const char = items => R.normalize({ name: "x", abilities: { str: 10 }, coins: { gp: 0 }, items });

test("containers are recognised by name and keep explicit choices", () => {
  const c = char([{ id: "a", name: "Рюкзак" }, { id: "b", name: "Сумка хранения" }, { id: "c", name: "Длинный меч" }, { id: "d", name: "Мешок", isContainer: false }]);
  const by = id => c.items.find(x => x.id === id);
  assert.equal(by("a").isContainer, true);
  assert.equal(by("a").capacity, 30);
  assert.equal(by("b").weightless, true);
  assert.equal(by("b").capacity, 500);
  assert.equal(by("c").isContainer, false);
  assert.equal(by("d").isContainer, false);
  const pouch = char([{ id: "p", name: "Мешочек с компонентами" }, { id: "q", name: "Кошелёк" }]).items;
  assert.equal(pouch[0].capacity, 6);
  assert.equal(pouch[1].capacity, 6);
});

test("bad container links and cycles are cleared", () => {
  const c = char([
    { id: "a", name: "Рюкзак", container: "b" },
    { id: "b", name: "Мешок", container: "a" },
    { id: "c", name: "Меч", container: "c" },
    { id: "e", name: "Верёвка", container: "missing" },
    { id: "f", name: "Факел", container: "g" },
    { id: "g", name: "Кинжал" }
  ]);
  const by = id => c.items.find(x => x.id === id);
  assert.ok(by("a").container === "" || by("b").container === "");
  assert.equal(by("c").container, "");
  assert.equal(by("e").container, "");
  assert.equal(by("f").container, "");
});

test("weight skips stored containers and bags of holding, load tiers follow Strength", () => {
  const c = char([
    { id: "pack", name: "Рюкзак", weight: 5, qty: 1 },
    { id: "rope", name: "Верёвка", weight: 10, qty: 1, container: "pack" },
    { id: "boh", name: "Сумка хранения", weight: 15, qty: 1, container: "pack" },
    { id: "gold", name: "Слиток", weight: 20, qty: 2, container: "boh" },
    { id: "chest", name: "Сундук", weight: 25, qty: 1, stored: true },
    { id: "plate", name: "Латы", weight: 65, qty: 1, container: "chest" },
    { id: "sword", name: "Меч", weight: 3, qty: 1 }
  ]);
  const d = R.compute(c);
  assert.equal(d.weight, 5 + 10 + 15 + 3);
  assert.deepEqual(d.load, { light: 50, heavy: 100, max: 150, push: 300 });
  const tree = R.containerTree(c);
  assert.equal(tree.pack.inside, 10 + 15);
  assert.equal(tree.boh.inside, 40);
  assert.equal(tree.chest.inside, 65);
  assert.equal(tree.boh.parent, "pack");
  assert.equal(R.carriedWeight(c, c.items.find(x => x.id === "plate")), 0);
});
