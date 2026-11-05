import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const N = await import(P + "notes.js");
const S = await import(P + "session-stats.js");

const base = () => R.normalize({ name: "x", info: { level: 3 }, coins: { gp: 10 }, stats: { rolls: 4, sum: 40, crit: 1, dmgTotal: 10, rounds: 2 }, notes: { people: [{ id: "p1", title: "A" }], questions: [{ id: "q1", status: "open" }] } });

test("new session stores a snapshot and totals show only changes", () => {
  const c = base();
  const ses = N.newSession(c, 1000, "s1");
  assert.equal(ses.snap.lv, 3);
  assert.deepEqual(S.sessionTotals(c, ses, true), []);
  c.info.level = 4;
  c.coins.gp = 60;
  c.notes.people.push({ id: "p2", title: "B", dead: true });
  c.notes.questions[0].status = "answered";
  Object.assign(c.stats, { rolls: 8, sum: 100, crit: 2, fumble: 1, dmgTotal: 40, rounds: 5, taken: 7 });
  const keys = S.sessionTotals(c, ses, true).map(x => x.key);
  assert.deepEqual(keys, ["level", "money", "people", "dead", "letters", "rolls", "crit", "fumble", "dmg", "taken"]);
  const t = Object.fromEntries(S.sessionTotals(c, ses, true).map(x => [x.key, x.text]));
  assert.equal(t.money, "+50 зм");
  assert.equal(t.rolls, "d20: 4, среднее 15");
  assert.equal(t.dmg, "Урон: 30, 10 за раунд");
});

test("finished session is frozen at snapEnd, missing snap gives nothing", () => {
  const c = base();
  const ses = N.newSession(c, 1000, "s1");
  c.stats.rolls = 9;
  ses.snapEnd = S.takeSnap(c);
  c.stats.rolls = 50;
  assert.equal(S.sessionTotals(c, ses, false).find(x => x.key === "rolls").text.startsWith("d20: 5"), true);
  assert.deepEqual(S.sessionTotals(c, { id: "old" }, true), []);
  assert.deepEqual(S.sessionTotals(c, { snap: ses.snap }, false), []);
});

test("normalize cleans snapshots and drops garbage", () => {
  const c = R.normalize({ notes: { sessions: [{ id: "a", snap: { lv: "5", cp: 100, evil: 1 }, snapEnd: "x" }] } });
  const s = c.notes.sessions[0];
  assert.equal(s.snap.lv, 5);
  assert.equal("evil" in s.snap, false);
  assert.equal("snapEnd" in s, false);
});

test("session card shows totals chips only when open and with a snapshot", async () => {
  const T = await import(P + "tabs.js");
  const c = base();
  const now = Date.now();
  const ses = N.newSession(c, now, "s1");
  ses.text = "- **10:00** Привет";
  c.notes.sessions = [ses];
  c.info.level = 4;
  c.notes.people.push({ id: "p2", title: "B", dead: true });
  const open = T.notesList({ c, d: {}, ui: { notesSection: "sessions", noteOpen: { s1: true } } });
  assert.match(open, /class="ses-sum"/);
  assert.match(open, /Уровень 3 → 4/);
  assert.match(open, /Погибших: 1/);
  const shut = T.notesList({ c, d: {}, ui: { notesSection: "sessions", noteOpen: { s1: false } } });
  assert.doesNotMatch(shut, /ses-sum/);
  delete ses.snap;
  assert.doesNotMatch(T.notesList({ c, d: {}, ui: { notesSection: "sessions", noteOpen: { s1: true } } }), /ses-sum/);
});
