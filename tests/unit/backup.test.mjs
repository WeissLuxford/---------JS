import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const B = await import(P + "backup.js");

const memStore = (limit = Infinity) => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (String(v).length > limit) throw new Error("quota");
      m.set(k, String(v));
    },
    m
  };
};
const char = (name, hp = 10) => ({ id: "x", name, updatedAt: 123, info: { level: 3 }, hp: { current: hp } });
const H = 60 * 60 * 1000;

test("backups respect the gap, skip identical content and keep the newest", () => {
  const store = memStore();
  assert.equal(B.saveBackup("c1", char("A"), { now: 1000, store }), true);
  assert.equal(B.saveBackup("c1", char("A", 9), { now: 1000 + H, store }), false);
  assert.equal(B.saveBackup("c1", char("A"), { now: 1000 + 3 * H, store }), false);
  assert.equal(B.saveBackup("c1", char("A", 9), { now: 1000 + 3 * H, store }), true);
  assert.equal(B.saveBackup("c1", char("A", 8), { now: 1000 + 3 * H + 1, store, force: true }), true);
  const list = B.listBackups("c1", store);
  assert.equal(list.length, 3);
  assert.equal(B.readBackup(list[0]).hp.current, 8);
  assert.equal(list[0].level, 3);
  assert.ok(!("id" in B.readBackup(list[0])));
  assert.ok(!("updatedAt" in B.readBackup(list[0])));
});

test("only the last copies are kept and quota errors drop the oldest", () => {
  const store = memStore();
  for (let i = 0; i < 12; i++) B.saveBackup("c2", char("B", i), { now: (i + 1) * 3 * H, store });
  const list = B.listBackups("c2", store);
  assert.equal(list.length, B.BACKUP_MAX);
  assert.equal(B.readBackup(list[0]).hp.current, 11);
  const tiny = memStore(300);
  for (let i = 0; i < 5; i++) B.saveBackup("c3", char("C", i), { now: (i + 1) * 3 * H, store: tiny });
  const kept = B.listBackups("c3", tiny);
  assert.ok(kept.length >= 1 && kept.length < 5);
  assert.equal(B.readBackup(kept[0]).hp.current, 4);
});

test("file reminder is weekly and file names are safe", () => {
  const store = memStore();
  assert.equal(B.fileDue("c1", 10 * 24 * H, store), true);
  B.markFile("c1", 10 * 24 * H, store);
  assert.equal(B.fileDue("c1", 12 * 24 * H, store), false);
  assert.equal(B.fileDue("c1", 18 * 24 * H, store), true);
  assert.equal(B.backupName({ name: "Кирион / Торндайк" }, new Date(2026, 9, 5).getTime()), "Kirion_Torndajk_2026-10-05.json");
  assert.equal(B.backupName({ name: "???" }, new Date(2026, 0, 2).getTime()), "character_2026-01-02.json");
  assert.equal(B.translit("Щука Ёж"), "Schuka Ezh");
  const file = JSON.parse(B.backupFile(char("D")));
  assert.equal(file.format, "dnd-sheet");
  assert.equal(file.character.name, "D");
  assert.ok(!("id" in file.character));
  assert.deepEqual(B.listBackups("none", { getItem: () => "garbage{" }), []);
});
