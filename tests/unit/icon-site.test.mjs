import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const read = f => readFileSync(new URL(f, root), "utf8");
const reg = JSON.parse(read("assets/icons/site.json"));
const catalog = JSON.parse(read("assets/icons/catalog.json"));
const sources = JSON.parse(read("assets/icons/sources.json")).packs;
const { ART } = await import(new URL("js/icon-art.js", root).href);
const { CREDITS } = await import(new URL("js/credits.js", root).href);
const entries = Object.values(reg).flatMap(x => Object.entries(x));

test("site icons come from the registry and the art module is fresh", () => {
  assert.deepEqual(Object.keys(ART).sort(), entries.map(e => e[0]).sort(), "run node tools/icons.mjs site");
  for (const [key, [vb, d]] of Object.entries(ART)) {
    assert.ok(vb === 100 || vb === 512, key);
    assert.ok(/^[mM][\d\s.,a-zA-Z-]+$/.test(d), key);
  }
});

test("every site icon has a known source and its author is credited", () => {
  const credited = JSON.stringify(CREDITS);
  for (const [key, id] of entries) {
    const i = catalog.icons.find(x => x.id === id);
    assert.ok(i, key + " -> " + id);
    assert.ok(["tw", "gi", "np"].includes(i.pack), key);
    const who = i.author ? sources[i.pack].authors[i.author].name : sources[i.pack].author;
    assert.ok(credited.includes(who), key + ": add " + who + " to js/credits.js");
  }
});

test("noun project files are clean silhouettes without the caption", () => {
  const dir = new URL("assets/icons/noun-project/", root);
  for (const a of readdirSync(dir)) for (const f of readdirSync(new URL(a + "/", dir))) {
    const svg = readFileSync(new URL(a + "/" + f, dir), "utf8");
    assert.ok(!/<text|Noun Project|Created by/i.test(svg), f);
    assert.ok(svg.includes('viewBox="0 0 100 100"'), f);
  }
});
