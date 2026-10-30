import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("service worker precaches every app module and the spell library", () => {
  const sw = readFileSync(new URL("../../sw.js", import.meta.url), "utf8");
  const files = readdirSync(new URL("../../js/", import.meta.url)).filter(f => f.endsWith(".js")).map(f => "js/" + f);
  for (const f of [...files, "css/app.css", "index.html", "data/spells-srd.json", "data/spells-extra.json", "data/features-srd.json", "favicon.svg", "manifest.webmanifest"]) assert.ok(sw.includes(`"${f}"`), "missing in sw.js PRECACHE: " + f);
});

test("sw.js BUILD matches the site files (run node tools/sw-version.mjs after edits)", async () => {
  const { computeBuild, currentBuild } = await import("../../tools/sw-version.mjs");
  assert.equal(currentBuild(), computeBuild(), "sw.js BUILD is stale: run node tools/sw-version.mjs");
});
