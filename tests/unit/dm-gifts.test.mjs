import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const { giftsMissing, giftsAvailable, applyGifts, KIRION_ID } = await import(P + "dm-gifts.js");
const { kirion } = await import(P + "seed.js");
const R = await import(P + "rules.js");

const seed = () => R.normalize(kirion());

function stripped() {
  const c = seed();
  c.spells = c.spells.filter(s => s.id !== "sp-kania-seal");
  c.features = c.features.filter(f => f.id !== "g-spell-recognition");
  c.features.push({ id: "g-contract-genius", name: "Гений договоров", nameEn: "Contract Genius", category: "gift", source: "own", action: "passive" });
  c.notes.patron = c.notes.patron.filter(n => n.id !== "n-patron-campaign");
  c.notes.places = [];
  c.notes.misc = c.notes.misc.filter(n => !["n-dm-rules", "n-law-magic", "n-law-crime"].includes(n.id));
  c.notes.people[0].text = "моя правка";
  return c;
}

test("the seed already has every gift", () => {
  assert.equal(giftsMissing(seed()), false);
});

test("gifts are added to an older sheet, replace Contract Genius and keep the rest", () => {
  const c = stripped();
  assert.equal(giftsMissing(c), true);
  const spellsBefore = c.spells.length;
  const res = applyGifts(c, seed());
  assert.equal(giftsMissing(c), false);
  assert.equal(c.spells.length, spellsBefore + 1);
  assert.ok(c.spells.some(s => s.id === "sp-kania-seal" && s.name === "Печать Кании"));
  assert.ok(c.features.some(f => f.id === "g-spell-recognition"));
  assert.ok(!c.features.some(f => f.id === "g-contract-genius"));
  assert.equal(res.dropped, 1);
  assert.equal(c.notes.people[0].text, "моя правка");
  assert.ok(c.notes.places.some(n => n.id === "pl-crownspire"));
  assert.ok(c.notes.misc.some(n => n.id === "n-law-magic"));
  assert.ok(c.notes.patron.some(n => n.id === "n-patron-campaign"));
});

test("applying twice changes nothing", () => {
  const c = stripped();
  applyGifts(c, seed());
  const once = JSON.stringify(c);
  const res = applyGifts(c, seed());
  assert.equal(JSON.stringify(c), once);
  assert.deepEqual(res.added, []);
  assert.equal(res.dropped, 0);
});

test("the button is only for the owner of this one character", () => {
  const mk = (id, role, c = stripped(), preview = "") => ({ id, rights: () => ({ role }), S: { c, preview } });
  assert.equal(giftsAvailable(mk(KIRION_ID, "owner")), true);
  assert.equal(giftsAvailable(mk(KIRION_ID, "open")), true);
  for (const role of ["admin", "editor", "viewer", "guest", "banned", "orphan", "preview"]) assert.equal(giftsAvailable(mk(KIRION_ID, role)), false, role);
  assert.equal(giftsAvailable(mk("someone-else", "owner")), false);
  assert.equal(giftsAvailable(mk(KIRION_ID, "owner", seed())), false);
  assert.equal(giftsAvailable(mk(KIRION_ID, "owner", stripped(), "t1")), false);
});

test("the backstory replaces profile texts and notes once, with a journal entry", () => {
  const c = stripped();
  c.notes.sessions = [];
  c.personality.backstory = "старое";
  c.personality.ideals = "старое";
  c.notes.people[0].text = "моя правка";
  assert.equal(giftsMissing(c), true);
  const res = applyGifts(c, seed());
  assert.ok(res.added.includes("Предыстория"));
  assert.equal(c.personality.ideals, seed().personality.ideals);
  assert.notEqual(c.notes.people[0].text, "моя правка");
  assert.ok(c.notes.sessions.some(n => n.id === "ses-backstory"));
  assert.equal(giftsMissing(c), false);
  const once = JSON.stringify(c);
  c.personality.ideals = "после";
  const again = applyGifts(c, seed());
  assert.equal(c.personality.ideals, "после");
  assert.deepEqual(again.added, []);
  assert.notEqual(JSON.stringify(c), once);
});
