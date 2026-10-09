import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const { toCloud, fromCloud, cloudDiff, rebase, applyToCloudDoc, legacyLists, orderKeys, LIST_PATHS } = await import(P + "cloud.js");
const { normalize } = await import(P + "rules.js");
const { kirion } = await import(P + "seed.js");
const clone = v => JSON.parse(JSON.stringify(v));
const noOrder = c => JSON.parse(JSON.stringify(c, (k, v) => (k === "_o" ? undefined : v)));

function cloudStart() {
  const server = toCloud(normalize(kirion()));
  return { server, base: () => normalize(fromCloud(server)) };
}
const send = (server, base, cur) => applyToCloudDoc(server, cloudDiff(base, cur));
const read = server => normalize(fromCloud(server));

test("app -> cloud -> app keeps every list, its order and content", () => {
  const c = normalize(kirion());
  const back = normalize(fromCloud(toCloud(c)));
  assert.deepEqual(noOrder(back), noOrder(c));
  for (const p of LIST_PATHS) {
    const v = p.reduce((o, k) => o[k], toCloud(c));
    assert.ok(v && typeof v === "object" && !Array.isArray(v), p.join("."));
  }
});

test("one pip tap sends one field of one item", () => {
  const { base } = cloudStart();
  const a = base();
  const b = clone(a);
  b.features[0].used = 1;
  const ch = cloudDiff(a, b);
  assert.deepEqual(ch.map(x => x[0]), [["features", a.features[0].id, "used"]]);
});

test("offline phone and computer edit different items: the cloud keeps both", () => {
  const { server, base } = cloudStart();
  const b0 = base();
  const phone = clone(b0);
  phone.items[0].used = 2;
  phone.items = phone.items.filter((_, i) => i !== 3);
  const pc = clone(b0);
  pc.items[1].name = "Переименован";
  pc.items.push({ id: "it-new", name: "Новый предмет", qty: 1 });
  for (const order of [[pc, phone], [phone, pc]]) {
    let s = clone(server);
    for (const dev of order) s = send(s, b0, dev);
    const r = read(s);
    assert.equal(r.items.find(x => x.id === b0.items[0].id).used, 2);
    assert.equal(r.items.find(x => x.id === b0.items[1].id).name, "Переименован");
    assert.ok(r.items.some(x => x.id === "it-new"));
    assert.ok(!r.items.some(x => x.id === b0.items[3].id));
    assert.equal(r.items.length, b0.items.length);
    assert.equal(r.items[r.items.length - 1].id, "it-new");
  }
});

test("two devices change different fields of the same item: both survive", () => {
  const { server, base } = cloudStart();
  const b0 = base();
  const a = clone(b0);
  a.spells[2].used = 1;
  const b = clone(b0);
  b.spells[2].name = "Новое имя";
  const r = read(send(send(clone(server), b0, a), b0, b));
  assert.equal(r.spells[2].used, 1);
  assert.equal(r.spells[2].name, "Новое имя");
});

test("unsent local field is kept when a remote edit to another field of the same item arrives", () => {
  const { server, base } = cloudStart();
  const b0 = base();
  const pc = clone(b0);
  pc.items[0].name = "С компьютера";
  const incoming = read(send(clone(server), b0, pc));
  const phone = clone(b0);
  phone.items[0].used = 3;
  const merged = normalize(rebase(b0, phone, incoming));
  assert.equal(merged.items[0].name, "С компьютера");
  assert.equal(merged.items[0].used, 3);
  assert.deepEqual(cloudDiff(incoming, merged).map(x => x[0]), [["items", b0.items[0].id, "used"]], "the phone then sends only its own field");
});

test("an edit to an item deleted elsewhere does not bring back a nameless ghost", () => {
  const { server, base } = cloudStart();
  const b0 = base();
  const gone = b0.items[0].id;
  const pc = clone(b0);
  pc.items.shift();
  const s1 = send(clone(server), b0, pc);
  const phone = clone(b0);
  phone.items[0].used = 1;
  const r = read(send(s1, b0, phone));
  assert.ok(!r.items.some(x => x.id === gone));
  assert.ok(r.items.every(x => x.name));
  const merged = normalize(rebase(b0, phone, read(s1)));
  assert.ok(!merged.items.some(x => x.id === gone));
});

test("moving one card rewrites only its order key, and survives an add from another device", () => {
  const { server, base } = cloudStart();
  const b0 = base();
  const a = clone(b0);
  const [moved] = a.attacks.splice(3, 1);
  a.attacks.unshift(moved);
  const ch = cloudDiff(b0, a);
  assert.deepEqual(ch.map(x => x[0]), [["attacks", moved.id, "_o"]]);
  const b = clone(b0);
  b.attacks.push({ id: "at-new", name: "Новая атака" });
  const r = read(send(send(clone(server), b0, a), b0, b));
  assert.deepEqual(r.attacks.map(x => x.id), [moved.id, ...b0.attacks.filter(x => x.id !== moved.id).map(x => x.id), "at-new"]);
});

test("order keys stay strictly increasing under many inserts at the front", () => {
  let list = [{ id: "a", _o: 1 }];
  for (let i = 0; i < 200; i++) {
    const keys = orderKeys(list);
    list = list.map((e, n) => ({ ...e, _o: keys[n] }));
    list.unshift({ id: "x" + i });
  }
  const keys = orderKeys(list);
  for (let i = 1; i < keys.length; i++) assert.ok(keys[i] > keys[i - 1]);
});

test("old documents with arrays are read as is and rewritten whole once", () => {
  const legacy = normalize(kirion());
  assert.deepEqual(legacyLists(legacy).map(p => p.join(".")), LIST_PATHS.map(p => p.join(".")));
  const app = normalize(fromCloud(legacy));
  assert.deepEqual(noOrder(app), noOrder(legacy));
  const cur = clone(app);
  cur.hp.current = 5;
  const ch = cloudDiff(app, cur, legacyLists(legacy));
  assert.ok(ch.some(x => x[0].join(".") === "hp.current"));
  const after = applyToCloudDoc(clone(legacy), ch);
  assert.deepEqual(legacyLists(after), []);
  assert.deepEqual(noOrder(read(after)), noOrder({ ...app, hp: { ...app.hp, current: 5 } }));
});

test("duplicate ids in one list are made unique instead of lost", () => {
  const c = normalize({ name: "x", items: [{ id: "it-a", name: "1" }, { id: "it-a", name: "2" }] });
  assert.deepEqual(c.items.map(x => x.id), ["it-a", "it-a-2"]);
  assert.equal(read(toCloud(c)).items.length, 2);
});
