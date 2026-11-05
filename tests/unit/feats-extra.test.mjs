import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const L = await import(P + "library.js");
const extra = JSON.parse(fs.readFileSync(new URL("../../data/features-extra.json", import.meta.url), "utf8"));
const base = JSON.parse(fs.readFileSync(new URL("../../data/features-srd.json", import.meta.url), "utf8"));

test("extra feats are well formed and do not clash with the SRD list", () => {
  const keys = new Set(base.map(x => x.key));
  const names = new Set(base.map(x => x.name));
  assert.ok(extra.length >= 40);
  for (const x of extra) {
    assert.ok(!keys.has(x.key), "duplicate key " + x.key);
    keys.add(x.key);
    assert.ok(!names.has(x.name), "duplicate name " + x.name);
    names.add(x.name);
    assert.equal(x.group, "feat");
    assert.ok(x.nameEn && x.description.length >= 30, x.key);
    assert.ok(R.ACTIONS[x.action], x.key + " action");
    assert.ok(R.RECHARGE[x.recharge], x.key + " recharge");
    assert.ok(!x.description.includes("\u2014"), x.key + " dash");
  }
});

test("Tough, Alert and Mobile feed the sheet by themselves", () => {
  const mk = features => R.normalize({ name: "x", info: { level: 4 }, abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 }, speed: 30, features });
  const none = R.compute(mk([]));
  const ft = (name, nameEn) => ({ id: "f-" + nameEn, name, nameEn });
  const all = R.compute(mk([ft("Крепкий", "Tough"), ft("Бдительный", "Alert"), ft("Подвижный", "Mobile")]));
  assert.equal(all.hpMax - none.hpMax, 8);
  assert.equal(all.init - none.init, 5);
  assert.equal(all.speed - none.speed, 10);
  const ru = R.compute(mk([{ id: "f1", name: "Крепкий" }]));
  assert.equal(ru.hpMax - none.hpMax, 8);
  assert.equal(R.compute(mk([ft("Другое", "Other")])).hpMax, none.hpMax);
});

test("library loads the extra feats", async () => {
  globalThis.fetch = async url => {
    const f = String(url).split("/data/")[1];
    if (!f) return { ok: false };
    const txt = fs.readFileSync(new URL("../../data/" + f, import.meta.url), "utf8");
    return { ok: true, json: async () => JSON.parse(txt) };
  };
  const all = await L.loadFeatures();
  assert.ok(all.some(x => x.nameEn === "Lucky" && x.group === "feat"));
  assert.ok(all.some(x => x.nameEn === "Grappler"));
});
