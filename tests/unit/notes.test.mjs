import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const N = await import(P + "notes.js");
const { rich } = await import(P + "ui.js");
const { describeChanges } = await import(P + "changes.js");
const T = await import(P + "tabs.js");

const sample = () => R.normalize({
  name: "x",
  notes: {
    people: [
      { id: "p1", title: "Отец Бенедикт", aliases: "святой отец", attitude: "ally", text: "Служит в [[Собор]]" },
      { id: "p2", title: "Халвар Торндайк", text: "" },
      { id: "p3", title: "Маргарэт Торндайк", text: "" },
      { id: "p4", title: "Рэй", text: "" }
    ],
    places: [{ id: "l1", title: "Собор Святой Агаты", aliases: "Собор", text: "" }],
    clues: [{ id: "c1", title: "Следы сажи", state: "lead", text: "У склада" }],
    sessions: [{ id: "s1", title: "Сессия 1", created: 1000, text: "- **20:10** Встретили Бенедикта у собора. Рэя не было.\n- **20:30** Халвар молчал, Торндайк тоже" }],
    misc: [{ id: "m1", title: "Слухи", text: "Про [[Неизвестный]] и [[Рэй|нашего Рэя]]" }]
  }
});

const links = html => html.replace(/<button[^>]*data-id="([^"]+)"[^>]*>/g, "[$1:").replace(/<button[^>]*note-create-link[^>]*>/g, "[?:").replace(/<\/button>/g, "]");

test("stems and word forms", () => {
  assert.deepEqual(N.queryStems("Бенедикта"), ["бенедикт"]);
  assert.deepEqual(N.queryStems("Мефистофеля"), ["мефистофел"]);
  assert.deepEqual(N.queryStems("ёлка"), ["елк"]);
  assert.equal(N.stem("дом"), "дом");
  assert.equal(N.stem("12"), "12");
});

test("smart search finds case forms, aliases and fleeting vowels, best match first", () => {
  const c = sample();
  const titles = q => N.searchNotes(c, q).map(r => r.n.title);
  assert.equal(titles("бенедикта")[0], "Отец Бенедикт");
  assert.ok(titles("бенедикта").includes("Сессия 1"));
  assert.deepEqual(titles("святого отца"), ["Отец Бенедикт"]);
  assert.ok(titles("сажи").includes("Следы сажи"));
  assert.deepEqual(titles("склада сажа"), ["Следы сажи"]);
  assert.deepEqual(titles("дракон"), []);
  assert.deepEqual(titles(""), []);
});

test("highlight and snippets escape text and mark matches", () => {
  const st = N.queryStems("бенедикта");
  assert.equal(N.highlight("Отец <Бенедикт>", st), "Отец &lt;<mark>Бенедикт</mark>&gt;");
  const snip = N.snippetHtml("- **20:10** Встретили Бенедикта у собора", st);
  assert.ok(snip.includes("<mark>Бенедикта</mark>"));
  assert.ok(!snip.includes("**"));
  assert.equal(N.plainText("[[Рэй|нашего Рэя]] и [[Собор]]"), "нашего Рэя и Собор");
});

test("links resolve by title and alias, missing links offer creation", () => {
  const c = sample();
  const L = N.richLinks(c);
  const html = links(rich(c.notes.misc[0].text, L("m1")));
  assert.ok(html.includes("[?:Неизвестный]"));
  assert.ok(html.includes("[p4:нашего Рэя]"));
  assert.ok(links(rich(c.notes.people[0].text, L("p1"))).includes("[l1:Собор]"));
  assert.ok(rich("[[<img src=x onerror=alert(1)>]]", L("")).includes("&lt;img"));
  assert.ok(!rich("[[<img src=x onerror=alert(1)>]]", L("")).includes("<img"));
});

test("mentions: case forms, unique first names, ambiguous surnames and titles skipped", () => {
  const c = sample();
  const html = links(rich(c.notes.sessions[0].text, N.richLinks(c)("s1")));
  assert.ok(html.includes("[p1:Бенедикта]"));
  assert.ok(html.includes("[l1:собора]"));
  assert.ok(html.includes("[p4:Рэя]"));
  assert.ok(html.includes("[p2:Халвар]"));
  assert.ok(html.includes("Торндайк тоже"));
  const self = links(rich("Отец Бенедикт пишет сам", N.richLinks(c)("p1")));
  assert.ok(!self.includes("[p1:"));
  assert.ok(!links(rich("рэп и отец", N.richLinks(c)(""))).includes("["));
});

test("backlinks collect [[links]] and mentions", () => {
  const back = N.backlinks(sample());
  const ids = id => (back.get(id) || []).map(x => x.id).sort();
  assert.deepEqual(ids("p1"), ["s1"]);
  assert.deepEqual(ids("l1"), ["p1", "s1"]);
  assert.deepEqual(ids("p4"), ["m1", "s1"]);
  assert.deepEqual(ids("p3"), []);
});

test("journal: current session window, numbering and entries with time", () => {
  const c = sample();
  assert.equal(N.currentSession(c, 1000 + N.SESSION_GAP - 1).id, "s1");
  assert.equal(N.currentSession(c, 1000 + N.SESSION_GAP + 1), null);
  const touched = { ...c, notes: { ...c.notes, sessions: [{ ...c.notes.sessions[0], touched: 5000000 }] } };
  assert.equal(N.currentSession(touched, 5000000 + 1000).id, "s1");
  const now = new Date(2026, 9, 5, 21, 7).getTime();
  const s = N.newSession(c, now, "s2");
  assert.equal(s.title, "Сессия 2");
  assert.equal(s.subtitle, "5 октября 2026");
  assert.equal(s.date, "2026-10-05");
  assert.equal(N.appendEntry("", "Нашли ключ\nв подвале", now), "- **21:07** Нашли ключ\n  в подвале");
  assert.equal(N.appendEntry("- **20:00** a\n\n", "b", now), "- **20:00** a\n- **21:07** b");
  assert.equal(N.appendEntry("x", "   ", now), "x");
});

test("note sections, cleaning and history", () => {
  const c = R.normalize({ name: "x", notes: { clues: [{ id: "c1", title: 5, state: "bogus", pinned: "yes", created: "12" }, ["junk"]], places: "oops" } });
  assert.deepEqual(R.NOTE_KEYS, ["sessions", "people", "places", "quests", "clues", "patron", "misc"]);
  assert.equal(c.notes.clues.length, 1);
  assert.equal(c.notes.clues[0].title, "5");
  assert.equal(c.notes.clues[0].state, "");
  assert.equal(c.notes.clues[0].pinned, true);
  assert.equal(c.notes.clues[0].created, 12);
  assert.deepEqual(c.notes.places, []);
  assert.deepEqual(c.notes.sessions, []);
  const b = R.normalize({ ...c, notes: { ...c.notes, places: [{ id: "l1", title: "Порт" }] } });
  assert.ok(describeChanges(c, b).join("\n").includes("Места"));
  assert.equal(N.NOTE_SECTIONS.map(s => s.key).join(), R.NOTE_KEYS.join());
});

test("pinned notes surface in the strip and the combat panel", () => {
  const c = sample();
  c.notes.people[0].pinned = true;
  assert.deepEqual(N.pinnedNotes(c).map(x => x.n.id), ["p1"]);
  assert.ok(T.pinnedStrip(c).includes("Отец Бенедикт"));
  assert.ok(T.importantPanel(c).includes("data-act=\"open-note\""));
  assert.equal(T.importantPanel(sample()), "");
});

test("notes tab renders search results, journal box and escapes everything", () => {
  const c = sample();
  c.notes.people.push({ id: "px", title: "<script>x</script>", text: "<img src=x>", tags: "<b>" });
  const ui = { notesSection: "sessions", noteOpen: {}, notesQ: "", ordering: false };
  const html = T.tabNotes({ c, d: {}, ui });
  assert.ok(html.includes("data-journal"));
  assert.ok(!html.includes("<script>x"));
  const found = T.notesList({ c, d: {}, ui: { ...ui, notesQ: "бенедикта" } });
  assert.ok(found.includes("Найдено: 2"));
  assert.ok(found.includes("<mark>"));
  const people = T.notesList({ c, d: {}, ui: { ...ui, notesSection: "people", noteOpen: { px: true } } });
  assert.ok(!people.includes("<img src=x>"));
  assert.ok(!people.includes("<script>x"));
});
