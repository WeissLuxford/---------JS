import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
const P = new URL("../../js/", import.meta.url).href;
const { RENDER, TABS } = await import(P + "tabs.js");
const { cardFor } = await import(P + "entities.js");
const { normalize, compute } = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");
const PAY = '"><x-xss>';
const ENUM = new Set(["id", "type", "school", "action", "recharge", "rarity", "category", "source", "cost", "scaling", "ability", "saveAbility", "save", "status", "attitude", "hitDie", "casterType", "spellAbility", "dexCap", "from", "to", "kind", "slot", "portrait", "uses"]);
function poison(o) {
  if (Array.isArray(o)) return o.map(poison);
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" && !ENUM.has(k) ? v + PAY : poison(v)]));
  return o;
}
test("no user string reaches HTML unescaped (all tabs + all cards)", () => {
  const c = normalize(poison(kirion()));
  const d = compute(c);
  const ui = { invFilter: "all", notesSection: "patron" };
  const out = [];
  for (const t of TABS) out.push([t.key, RENDER[t.key]({ c, d, ui })]);
  for (const sec of ["quests", "people", "misc"]) out.push(["notes:" + sec, RENDER.notes({ c, d, ui: { ...ui, notesSection: sec } })]);
  for (const [kind, list] of [["spell", c.spells], ["feature", c.features], ["item", c.items], ["attack", c.attacks]]) for (const e of list) out.push([kind + ":" + e.id, cardFor(c, d, `${kind}:${e.id}`)]);
  const bad = out.filter(([, h]) => h.includes("<x-xss>")).map(([k]) => k);
  console.log(`  checked ${out.length} renders, unescaped in: ${bad.length ? bad.join(", ") : "none"}`);
  assert.deepEqual(bad, []);
});
