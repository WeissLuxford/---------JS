import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const B = await import(P + "board.js");

const sample = () => R.normalize({
  name: "x",
  notes: {
    people: [
      { id: "p1", title: "Отец Бенедикт", text: "Служит в [[Собор Святой Агаты]]" },
      { id: "p2", title: "Рэй", text: "" },
      { id: "p3", title: "Одиночка Вейл", text: "" }
    ],
    places: [{ id: "l1", title: "Собор Святой Агаты", aliases: "Собор", text: "" }],
    clues: [{ id: "c1", title: "Следы сажи", state: "false", text: "Нашли у собора, Рэй молчал" }],
    sessions: [{ id: "s1", title: "Сессия 1", created: 1, text: "- **20:10** Бенедикт и Рэй спорили" }]
  }
});

test("graph links notes directly and through journal entries", () => {
  const g = B.buildGraph(sample());
  const ids = g.nodes.map(n => n.id).sort();
  assert.deepEqual(ids, ["c1", "l1", "p1", "p2", "p3"]);
  const has = (a, b) => g.edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  assert.ok(has("p1", "l1"));
  assert.ok(has("c1", "l1"));
  assert.ok(has("c1", "p2"));
  assert.ok(has("p1", "p2"));
  assert.ok(g.edges.find(e => (e.a === "p1" && e.b === "p2") || (e.a === "p2" && e.b === "p1")).via.includes("Сессия 1"));
  assert.equal(g.nodes.find(n => n.id === "p3").degree, 0);
  const linked = B.buildGraph(sample(), { onlyLinked: true });
  assert.ok(!linked.nodes.some(n => n.id === "p3"));
  const withSessions = B.buildGraph(sample(), { sections: ["people", "sessions"] });
  assert.ok(withSessions.nodes.some(n => n.id === "s1"));
  assert.ok(withSessions.edges.some(e => (e.a === "s1" || e.b === "s1")));
});

test("layout is deterministic, inside the board and keeps saved positions", () => {
  const g = B.buildGraph(sample());
  const a = B.layoutGraph(g, {}, { width: 1000, height: 700 });
  const b = B.layoutGraph(g, {}, { width: 1000, height: 700 });
  for (const n of g.nodes) {
    assert.deepEqual(a.get(n.id), b.get(n.id));
    const p = a.get(n.id);
    assert.ok(p.x >= 40 && p.x <= 960 && p.y >= 40 && p.y <= 660);
  }
  const fixed = B.layoutGraph(g, { p1: { x: 123, y: 456 } });
  assert.deepEqual([fixed.get("p1").x, fixed.get("p1").y], [123, 456]);
  const near = (x, y) => Math.hypot(a.get(x).x - a.get(y).x, a.get(x).y - a.get(y).y);
  assert.ok(near("p1", "l1") < near("p3", "l1") + 400);
  assert.equal(B.layoutGraph({ nodes: [], edges: [] }).size, 0);
});
