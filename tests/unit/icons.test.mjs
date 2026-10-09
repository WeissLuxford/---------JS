import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const E = await import(P + "entities.js");
const R = await import(P + "rules.js");
const M = await import(P + "icon-map.js");
const I = await import(P + "icons.js");
const C = await import(P + "classes.js");
const G = await import(P + "gear.js");
const read = f => fs.readFileSync(new URL("../../" + f, import.meta.url), "utf8");
const src = read("js/icons.js");
const { ART, USED } = await import(P + "icon-art.js");
const ALL = new Set([...src.slice(0, src.indexOf("export const ICON_NAMES")).matchAll(/^  ([a-zA-Z0-9]+):/gm)].map(m => m[1]).concat(Object.keys(ART), USED));
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

test("library spells get their own pack icons", () => {
  const icons = spells.map(s => E.spellIcon(c, s).icon);
  for (const ic of icons) assert.ok(ALL.has(ic) && I.iconFile(ic), ic);
  assert.ok(new Set(icons).size >= 250, String(new Set(icons).size));
  assert.ok(share(icons) < 0.01, String(share(icons)));
  for (const s of spells) assert.equal(E.spellIcon(c, s).icon, M.SPELL_ICONS[s.nameEn], s.nameEn);
  const mb = spells.find(s => s.nameEn === "Moonbeam");
  assert.equal(E.spellIcon(c, mb).color, R.DAMAGE.radiant.color);
});

test("library features and invocations get their own pack icons", () => {
  const cat = f => (f.group === "race" ? "race" : f.group === "background" ? "background" : "class");
  const icons = feats.map(f => E.featureIcon({ ...f, category: cat(f) }));
  for (const ic of icons) assert.ok(I.iconFile(ic), ic);
  assert.ok(new Set(icons).size >= 200, String(new Set(icons).size));
  const inv = C.INVOCATIONS.map(x => E.featureIcon({ name: x.name, category: "invocation" }));
  for (const ic of inv) assert.ok(I.iconFile(ic), ic);
  assert.equal(new Set(inv).size, inv.length);
  assert.equal(E.featureIcon({ name: "Ярость", nameEn: "Rage", category: "class" }), M.FEATURE_ICONS.Rage);
});

test("own entries are guessed by words with pack icons, explicit icon wins", () => {
  assert.ok(I.iconFile(E.featureIcon({ name: "Магия договора", category: "class" })));
  assert.ok(I.iconFile(E.featureIcon({ name: "Что-то своё", category: "feat" })));
  assert.equal(E.featureIcon({ name: "Ярость", nameEn: "Rage", icon: "flame", category: "class" }), "flame");
  assert.equal(E.spellIcon(c, { name: "Своё", icon: "gi/lorc/ice-bolt", school: "evocation", damage: [] }).icon, "gi/lorc/ice-bolt");
  const custom = [E.spellIcon(c, { name: "Паутина тьмы", school: "conjuration", damage: [] }).icon, E.spellIcon(c, { name: "Рой саранчи", school: "conjuration", damage: [{ dice: "2d6", type: "piercing" }] }).icon];
  for (const ic of custom) assert.ok(I.iconFile(ic), ic);
  const items = ["Боевой посох", "Окованный сундук", "Рюкзак", "Мешочек с компонентами", "Мешок"].map(n => E.itemIcon({ name: n, type: "gear" }));
  for (const ic of items) assert.ok(I.iconFile(ic), ic);
  assert.equal(new Set(items).size, items.length);
  for (const g of G.GEAR) assert.ok(ALL.has(E.itemIcon({ name: g.name, type: g.kind === "armor" ? "armor" : "weapon" })), g.name);
});

test("new icons are offered in the icon picker", () => {
  for (const k of ["chest", "thorns", "bug", "lock", "lips", "frame", "prism", "maze", "antimagic", "footprints", "disc", "yinyang", "upgrade"]) assert.ok(I.ICON_NAMES.includes(k), k);
});
