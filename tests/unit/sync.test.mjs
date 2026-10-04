import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const { diffPaths, applyPaths, DELETE } = await import(P + "sync.js");
const { normalize } = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");
const clone = v => JSON.parse(JSON.stringify(v));
const strip = o => { const x = clone(o); for (const k of ["id", "updatedAt", "createdAt", "updatedBy"]) delete x[k]; return x; };

let seed = 1;
const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
function mutate(c) {
  const ops = [
    c => (c.hp.current = rnd(40)),
    c => (c.name = "N" + rnd(99)),
    c => (c.notes.misc = "t" + rnd(999)),
    c => (c.spells[rnd(c.spells.length)].used = rnd(3)),
    c => c.items.splice(rnd(c.items.length), 1),
    c => (c.slotsUsed[1 + rnd(3)] = rnd(3)),
    c => delete c.conditions[Object.keys(c.conditions)[0]],
    c => (c.conditions["k" + rnd(9)] = true),
    c => (c.info = { ...c.info, patron: "P" + rnd(9) }),
    c => (c.personality.extra = { deep: { a: rnd(5) } }),
    c => delete c.personality.extra,
  ];
  ops[rnd(ops.length)](c);
}

test("applyPaths(base, diffPaths(base, cur)) == cur  (500 random edits)", () => {
  for (let i = 0; i < 500; i++) {
    const a = normalize(kirion());
    const b = clone(a);
    for (let k = 0; k < 1 + rnd(4); k++) mutate(b);
    const out = applyPaths(clone(a), diffPaths(a, b));
    assert.deepEqual(strip(out), strip(b));
  }
});

test("payload: one 'used' pip tap rewrites the whole list", () => {
  const a = normalize(kirion());
  const b = clone(a);
  b.features[0].used = 1;
  const ch = diffPaths(a, b);
  const bytes = JSON.stringify(ch).length;
  console.log(`  pip tap -> paths=${ch.map(c => c[0].join(".")).join(",")} payload=${bytes} B (whole char ${JSON.stringify(a).length} B)`);
  assert.equal(ch.length, 1);
});

test("concurrent edits to different items of the same list: both survive the rebase", () => {
  const base = normalize(kirion());
  const A = clone(base); A.spells[0].used = 1;
  const B = clone(base); B.spells[1].name = "Renamed";
  const server = applyPaths(clone(base), diffPaths(base, B));
  const merged = applyPaths(clone(server), diffPaths(base, A));
  assert.equal(merged.spells[1].name, "Renamed");
  assert.equal(merged.spells[0].used, 1);
});

const serverApply = (doc, changes) => applyPaths(doc, changes.map(([p, v]) => [p, v]));
test("server-side: two in-flight writes to different items of one list (last writer wins)", () => {
  const base = normalize(kirion());
  const A = clone(base); A.spells[0].used = 1;
  const B = clone(base); B.spells[1].name = "Renamed";
  let server = serverApply(clone(base), diffPaths(base, B));
  server = serverApply(server, diffPaths(base, A));
  console.log(`  server keeps B's rename: ${server.spells[1].name === "Renamed"}; A's use: ${server.spells[0].used === 1}`);
});
