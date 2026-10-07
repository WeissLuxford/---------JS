import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../../js/ui.js", import.meta.url), "utf8");
const block = src.slice(src.indexOf("const SAMPLES = {"), src.indexOf("};", src.indexOf("const SAMPLES = {")));
const names = [...new Set([...block.matchAll(/"([A-Za-z0-9-]+)"/g)].map(m => m[1]))];

test("every sound sample ships as ogg and m4a", () => {
  assert.ok(names.length >= 10, names.join(","));
  for (const n of names) for (const ext of ["ogg", "m4a"]) {
    const f = new URL(`../../assets/audio/sfx/${n}.${ext}`, import.meta.url);
    assert.ok(fs.existsSync(f), `${n}.${ext}`);
    assert.ok(fs.statSync(f).size < 60000, `${n}.${ext} size`);
  }
});

test("dice sounds cover single and many dice and the shake", () => {
  for (const k of ["roll", "rollMany", "shake", "coins", "equip", "unequip"]) assert.match(block, new RegExp(`\\b${k}: \\[`), k);
});
