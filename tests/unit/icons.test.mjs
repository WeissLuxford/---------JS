import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const E = await import(P + "entities.js");
const R = await import(P + "rules.js");
const M = await import(P + "icon-map.js");
const C = await import(P + "classes.js");
const G = await import(P + "gear.js");
const read = f => fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8");
const src = read("js/icons.js");
const ALL = new Set([...src.slice(0, src.indexOf("export const ICON_NAMES")).matchAll(/^  ([a-zA-Z0-9]+):/gm)].map(m => m[1]));
const spells = JSON.parse(read("data/spells-srd.json"));
const feats = JSON.parse(read("data/features-srd.json"));
const c = R.normalize({ name: "x" });
const share = list => {
  const n = {};
  for (const ic of list) n[ic] = (n[ic] || 0) + 1;
  return Math.max(...Object.values(n)) / list.length;
};

test("every mapped icon exists", () => {
  for (const t of [M.SPELL_ICONS, M.FEATURE_ICONS, M.INVOCATION_ICONS]) for (const [k, v] of Object.entries(t)) assert.ok(ALL.has(v), `${k} -> ${v}`);
  const en = new Set(spells.map(s => s.nameEn));
  for (const k of Object.keys(M.SPELL_ICONS)) assert.ok(en.has(k), k);
  const fen = new Set(feats.map(f => f.nameEn));
  for (const k of Object.keys(M.FEATURE_ICONS)) assert.ok(fen.has(k), k);
  const inv = new Set(C.INVOCATIONS.map(x => x.name));
  for (const k of Object.keys(M.INVOCATION_ICONS)) assert.ok(inv.has(k), k);
});

test("library spells are spread over many icons", () => {
  const icons = spells.map(s => E.spellIcon(c, s).icon);
  for (const ic of icons) assert.ok(ALL.has(ic), ic);
  assert.ok(new Set(icons).size >= 100, String(new Set(icons).size));
  assert.ok(share(icons) < 0.04, String(share(icons)));
  const by = en => E.spellIcon(c, spells.find(s => s.nameEn === en)).icon;
  assert.equal(by("Web"), "web");
  assert.equal(by("Black Tentacles"), "tentacle");
  assert.equal(by("Meteor Swarm"), "constellation");
  assert.equal(by("Moonbeam"), "moon");
  assert.equal(by("Secret Chest"), "chest");
  const mb = spells.find(s => s.nameEn === "Moonbeam");
  assert.equal(E.spellIcon(c, mb).color, R.DAMAGE.radiant.color);
});

test("library features and invocations get their own icons", () => {
  const cat = f => (f.group === "race" ? "race" : f.group === "background" ? "background" : "class");
  const icons = feats.map(f => E.featureIcon({ ...f, category: cat(f) }));
  assert.ok(!icons.includes("sigil"));
  assert.ok(new Set(icons).size >= 70, String(new Set(icons).size));
  assert.ok(share(icons) < 0.06, String(share(icons)));
  const inv = C.INVOCATIONS.map(x => E.featureIcon({ name: x.name, category: "invocation" }));
  assert.ok(new Set(inv).size >= 25, String(new Set(inv).size));
  assert.equal(E.featureIcon({ name: "Ярость", nameEn: "Rage", category: "class" }), "fist");
  assert.equal(E.featureIcon({ name: "Канал божественности: Что-то новое", nameEn: "Channel Divinity: Something", category: "class" }), "sun");
});

test("own entries are still guessed by words, explicit icon wins", () => {
  assert.equal(E.featureIcon({ name: "Магия договора", category: "class" }), "pact");
  assert.equal(E.featureIcon({ name: "Увеличение характеристик", category: "feat" }), "upgrade");
  assert.equal(E.featureIcon({ name: "Ярость", nameEn: "Rage", icon: "flame", category: "class" }), "flame");
  assert.equal(E.spellIcon(c, { name: "Паутина тьмы", school: "conjuration", damage: [] }).icon, "web");
  assert.equal(E.spellIcon(c, { name: "Рой саранчи", school: "conjuration", damage: [{ dice: "2d6", type: "piercing" }] }).icon, "bug");
  assert.equal(E.itemIcon({ name: "Боевой посох", type: "weapon" }), "staff");
  assert.equal(E.itemIcon({ name: "Духовая трубка", type: "weapon" }), "arrow");
  assert.equal(E.itemIcon({ name: "Окованный сундук", type: "gear" }), "chest");
  assert.equal(E.itemIcon({ name: "Рюкзак", type: "gear" }), "backpack");
  assert.equal(E.itemIcon({ name: "Мешочек с компонентами", type: "gear" }), "pouch");
  assert.equal(E.itemIcon({ name: "Мешок", type: "gear" }), "bag");
  for (const g of G.GEAR) assert.ok(ALL.has(E.itemIcon({ name: g.name, type: g.kind === "armor" ? "armor" : "weapon" })), g.name);
});

test("new icons are offered in the icon picker", async () => {
  const I = await import(P + "icons.js");
  for (const k of ["chest", "thorns", "bug", "lock", "lips", "frame", "prism", "maze", "antimagic", "footprints", "disc", "yinyang", "upgrade"]) assert.ok(I.ICON_NAMES.includes(k), k);
});
