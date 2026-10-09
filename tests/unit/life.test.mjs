import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const E = await import(P + "entities.js");
const T = await import(P + "tabs.js");
const { icon, ICON_NAMES } = await import(P + "icons.js");
const { describeChanges } = await import(P + "changes.js");

test("scene is normalized and unknown or prototype values are dropped", () => {
  assert.deepEqual(R.normalize({ name: "x" }).scene, { time: "", weather: "" });
  assert.deepEqual(R.normalize({ name: "x", scene: { time: "night", weather: "storm" } }).scene, { time: "night", weather: "storm" });
  assert.deepEqual(R.normalize({ name: "x", scene: { time: "constructor", weather: "<b>" } }).scene, { time: "", weather: "" });
  assert.deepEqual(R.normalize({ name: "x", scene: "junk" }).scene, { time: "", weather: "" });
});

test("prototype keys do not slip through other lookups", () => {
  const c = R.normalize({ name: "x", accent: "constructor", casterType: "toString", effects: [{ name: "e", preset: "__proto__" }] });
  assert.equal(c.accent, "gold");
  assert.equal(c.casterType, "none");
  assert.equal(c.effects[0].preset, "");
});

test("scene hints follow visibility and weather rules", () => {
  const plain = R.normalize({ name: "x", scene: { time: "night", weather: "storm" } });
  const info = R.sceneInfo(plain);
  assert.equal(info.set, true);
  assert.equal(info.icon, "storm");
  assert.equal(info.text, "Ночь · Гроза");
  assert.ok(info.hints.some(h => h.includes("ничего не видишь")));
  assert.ok(info.hints.some(h => h.includes("дальнобойные атаки")));
  assert.ok(info.hints.some(h => h.includes("Осадки")));
  const tiefling = R.normalize({ name: "x", senses: "Тёмное зрение 60 фт", scene: { time: "night" } });
  assert.ok(R.hasDarkvision(tiefling));
  assert.ok(R.sceneInfo(tiefling).hints[0].includes("тусклом свете"));
  assert.equal(R.sceneInfo(R.normalize({ name: "x" })).set, false);
  assert.equal(R.sceneInfo(R.normalize({ name: "x", scene: { weather: "fog" } })).hints.length, 1);
});

test("scene changes appear in history", () => {
  const a = R.normalize({ name: "x" });
  const b = R.normalize({ name: "x", scene: { time: "dusk", weather: "rain" } });
  const lines = describeChanges(a, b).join("\n");
  assert.ok(lines.includes("Время суток"));
  assert.ok(lines.includes("Погода"));
});

test("every condition has its own icon", () => {
  for (const k of R.CONDITIONS) {
    assert.ok(k.icon, k.key);
    assert.ok(ICON_NAMES.includes(k.icon), k.icon);
  }
  assert.equal(R.DAMAGE.poison.icon, "dmgPoison");
});

test("new icons are drawn, pickable and render without fallback", () => {
  const added = ["coffin", "scythe", "bone", "katana", "battleaxe", "morningstar", "molotov", "toxic", "crystalball", "rook", "ringgem", "bandage", "pill", "pan", "spider", "mummy", "zombiehand", "reaper", "smoke", "overcast", "rain", "storm", "snowcloud", "fog", "sunrise", "constellation", "firehand", "juggle", "spellfire", "dash", "blind", "charmed", "deaf", "scared", "invisible", "paralyzed", "prone", "stunned", "sleep"];
  const fallback = icon("__none__");
  for (const n of added) {
    assert.ok(ICON_NAMES.includes(n), n);
    assert.notEqual(icon(n), fallback, n);
  }
  assert.ok(!ICON_NAMES.includes("cloud"));
});

test("names pick fitting new icons", () => {
  const item = name => E.itemIcon({ name, type: "misc" });
  assert.equal(item("Флакон яда"), "toxic");
  assert.equal(item("Катана предков"), "katana");
  assert.equal(item("Секира гнома"), "battleaxe");
  assert.equal(item("Моргенштерн"), "morningstar");
  assert.equal(item("Хрустальный шар"), "crystalball");
  assert.equal(item("Бинты"), "bandage");
  assert.equal(item("Котелок"), "pan");
  assert.equal(item("Плащ защиты"), "cloak");
  const c = R.normalize({ name: "x" });
  const sp = (name, damage = []) => E.spellIcon(c, { name, school: "evocation", damage }).icon;
  assert.equal(sp("Огненные руки", [{ dice: "3d6", type: "fire" }]), "firehand");
  assert.equal(sp("Град", [{ dice: "2d8", type: "bludgeoning" }]), "snowcloud");
  assert.equal(sp("Огненный шар", [{ dice: "8d6", type: "fire" }]), "dmgFire");
  assert.equal(sp("Туманное облако"), "fog");
  assert.equal(sp("Усыпление"), "sleep");
  assert.equal(sp("Удержание личности"), "paralyzed");
  assert.equal(sp("Фокусы"), "juggle");
  assert.equal(sp("Невидимость"), "invisible");
});

test("empty states and scene chip escape text", () => {
  assert.ok(T.emptyState("<img>").includes("&lt;img&gt;"));
  const c = R.normalize({ name: "x", scene: { time: "night" } });
  assert.ok(T.sceneChip(c).includes("Ночь"));
  assert.ok(T.sceneChip(R.normalize({ name: "x" })).includes("off"));
});
