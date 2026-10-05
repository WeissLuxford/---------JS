import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const K = await import(P + "packs.js");
const R = await import(P + "rules.js");

test("standard packs match the player's handbook weights", () => {
  const w = key => K.packWeight(K.PACKS.find(p => p.key === key));
  assert.equal(w("explorer"), 7 + 1 + 1 + 10 + 20 + 5 + 10);
  assert.equal(w("dungeoneer"), 5 + 3 + 2.5 + 10 + 1 + 20 + 5 + 10);
  assert.equal(w("scholar"), 5);
  assert.ok(K.PACKS.every(p => p.items.length >= 5 && p.value.endsWith("зм")));
});

test("pack items land in the container and survive normalize", () => {
  const items = K.packItems("explorer", "it-bag", R.uid);
  assert.equal(items.length, 7);
  assert.ok(items.every(it => !it.equipped));
  assert.deepEqual(items.filter(it => it.container === "").map(it => it.name).sort(), ["Пеньковая верёвка (50 фт)", "Спальник"]);
  const c = R.normalize({ name: "x", items: [{ id: "it-bag", name: "Рюкзак", type: "gear", isContainer: true, capacity: 30 }, ...items] });
  assert.equal(c.items.filter(it => it.container === "it-bag").length, 5);
  assert.equal(new Set(c.items.map(it => it.id)).size, 8);
  assert.equal(c.items.find(it => it.name === "Факел").qty, 10);
  assert.deepEqual(K.packItems("nope", "", R.uid), []);
});

test("containers from the gear table are real containers", async () => {
  const G = await import(P + "gear.js");
  const pack = G.GEAR.find(g => g.name === "Рюкзак");
  const it = G.gearToItem(pack, R.uid);
  assert.equal(it.type, "gear");
  assert.equal(it.isContainer, true);
  assert.equal(it.capacity, 30);
  assert.equal(it.acBonus, undefined);
  const c = R.normalize({ name: "x", items: [it, ...K.packItems("explorer", it.id, R.uid)] });
  const d = R.compute(c);
  assert.equal(d.weight, 5 + 54);
  assert.ok(G.GEAR.filter(g => g.kind === "gear").every(g => g.capacity > 0 && g.value));
});
