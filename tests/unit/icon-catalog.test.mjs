import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { prepare, search } from "../../tools/icon-search.mjs";

const root = new URL("../../", import.meta.url);
const catalog = JSON.parse(readFileSync(new URL("assets/icons/catalog.json", root), "utf8"));

test("icon catalog lists every own icon from js/icons.js", () => {
  const src = readFileSync(new URL("js/icons.js", root), "utf8");
  const body = src.slice(src.indexOf("const P = {"), src.indexOf("\n};"));
  const own = [...body.matchAll(/^  ([a-zA-Z0-9]+): '/gm)].map(m => "own/" + m[1]);
  const ids = new Set(catalog.icons.map(i => i.id));
  for (const id of own) assert.ok(ids.has(id), "run node tools/icons.mjs build, missing " + id);
});

test("icon catalog points at files that exist, with a theme and a known pack", () => {
  const packs = Object.keys(catalog.packs);
  const themes = new Set(catalog.themes.map(t => t.key));
  for (const i of catalog.icons) {
    assert.ok(packs.includes(i.pack), i.id);
    if (i.pack !== "logo") assert.ok(existsSync(new URL(i.file, root)), "missing file " + i.file);
    for (const t of i.themes) assert.ok(themes.has(t), i.id + " unknown theme " + t);
  }
  const bare = catalog.icons.filter(i => i.pack !== "gi" && !i.themes.length);
  assert.deepEqual(bare.map(i => i.id), []);
});

test("icon search finds russian and english words and hides offstyle by default", () => {
  const c = prepare(structuredClone(catalog));
  assert.equal(search(c, "сила")[0].id, "tw/ability/strength");
  assert.ok(search(c, "кинжал").some(i => i.id === "tw/weapon/dagger"));
  assert.ok(search(c, "костер").every(i => !/bone/.test(i.id)));
  assert.equal(search(c, "crown")[0].name, "crown");
  assert.ok(search(c, "").every(i => !i.flags.includes("offstyle")));
  assert.ok(search(c, "", { theme: "offstyle" }).length > 100);
});
