import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
const P = new URL("../../js/", import.meta.url).href;
const { RENDER, TABS } = await import(P + "tabs.js");
const { cardFor } = await import(P + "entities.js");
const { normalize, compute, importCharacter } = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");
const clone = v => JSON.parse(JSON.stringify(v));

function renderEverything(c) {
  const d = compute(c);
  const ui = { invFilter: "all", notesSection: "patron" };
  let html = 0;
  for (const t of TABS) html += RENDER[t.key]({ c, d, ui }).length;
  for (const sec of ["quests", "people", "misc"]) html += RENDER.notes({ c, d, ui: { ...ui, notesSection: sec } }).length;
  for (const [kind, list] of [["spell", c.spells], ["feature", c.features], ["item", c.items], ["attack", c.attacks]])
    for (const e of list) html += cardFor(c, d, `${kind}:${e.id}`).length;
  return html;
}

test("every tab and every card renders for the seed", () => {
  const t = performance.now();
  const n = renderEverything(normalize(kirion()));
  console.log(`  rendered ${n} chars of HTML in ${(performance.now() - t).toFixed(1)} ms`);
  assert.ok(n > 10000);
});

const CASES = {
  "spells[].damage is a string": c => (c.spells[0].damage = "2d6"),
  "features[].damage is a string": c => (c.features[0].damage = "1d6"),
  "items[].damage is an object": c => (c.items[0].damage = { dice: "1d4" }),
  "damageSwap.to unknown type": c => (c.damageSwap = { enabled: true, from: "fire", to: "plasma", label: "x" }),
  "damageSwap.from unknown + matching spell": c => { c.damageSwap = { enabled: true, from: "zzz", to: "cold", label: "x" }; c.spells[0].damage = [{ dice: "1d6", type: "zzz" }]; },
  "attack.damage is a number": c => (c.attacks[0].damage = 7),
  "notes.quests[] text is a number": c => (c.notes.quests = [{ id: "q", title: 5, text: 12 }]),
  "info.level is '5abc'": c => (c.info.level = "5abc"),
  "spell.name missing": c => delete c.spells[0].name,
  "spells[].level = 'x'": c => (c.spells[0].level = "x"),
  "item.qty = 1e9": c => (c.items[0].qty = 1e9),
  "feature.uses = '999999'": c => (c.features[0].uses = "999999"),
  "coins.gp is a string": c => (c.coins.gp = "много"),
  "slotsUsed is an array": c => (c.slotsUsed = [1, 2]),
};

for (const [name, fn] of Object.entries(CASES)) {
  test("malformed data survives normalize+render: " + name, () => {
    const raw = clone(kirion());
    fn(raw);
    const viaImport = importCharacter({ format: "dnd-sheet", version: 1, character: raw });
    assert.ok(viaImport, "import accepted the file");
    const t = performance.now();
    renderEverything(normalize(raw));
    const ms = performance.now() - t;
    if (ms > 200) console.log(`  ${name}: ${ms.toFixed(0)} ms`);
  });
}
