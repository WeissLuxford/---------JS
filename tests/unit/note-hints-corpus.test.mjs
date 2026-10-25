import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const N = await import(P + "notes.js");
const H = await import(P + "note-hints.js");
const { kirion } = await import(P + "seed.js");
const { corpus, extraNotes } = await import("./note-hints-corpus.mjs");

const raw = kirion();
for (const k of Object.keys(extraNotes)) raw.notes[k] = [...(raw.notes[k] || []), ...extraNotes[k]];
raw.notes.sessions = [];
const c = R.normalize(raw);
const byId = {};
for (const s of ["people", "places", "quests", "clues", "patron", "misc"]) for (const n of c.notes[s] || []) byId[n.id] = n.title;

for (const row of corpus) {
  test(row.t, () => {
    assert.deepEqual(H.findNames(c, row.t).map(h => h.name).sort(), (row.names || []).slice().sort(), "names");
    assert.deepEqual(H.findCoins(row.t).map(h => `${h.sign}*${h.amount}${h.unit}`), row.coins || [], "coins");
    assert.deepEqual(H.findDeaths(c, row.t).map(h => h.title).sort(), (row.deaths || []).slice().sort(), "deaths");
    assert.deepEqual([...N.referencedIds(c, { id: "", text: row.t })].map(i => byId[i]).sort(), (row.mentions || []).slice().sort(), "mentions");
  });
}
