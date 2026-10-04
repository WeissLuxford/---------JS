import { test } from "node:test";
import assert from "node:assert/strict";

const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (f, ms, ...a) => {
  const t = realSetTimeout(f, ms, ...a);
  if (t && t.unref) t.unref();
  return t;
};
const REG = [];
const TOASTS = [];
function fakeEl(tag = "div") {
  const kids = new Map();
  const handlers = {};
  const el = {
    tag, style: {}, dataset: {}, children: [], isConnected: true, textContent: "", value: "", checked: false, hidden: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, appendChild(x) { el.children.push(x); return x; }, remove() {}, focus() {}, blur() {}, contains() { return false; },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    removeEventListener() {},
    fire(type, ev) { (handlers[type] || []).forEach(fn => fn(ev)); },
    closest() { return null; },
    matches() { return false; },
    querySelector(sel) {
      if (!kids.has(sel)) {
        const e = fakeEl();
        kids.set(sel, e);
        REG.push([sel, e]);
      }
      return kids.get(sel);
    },
    querySelectorAll() { return []; },
    _html: "",
    set innerHTML(v) { el._html = v; if (tag === "toast") TOASTS.push(v); },
    get innerHTML() { return el._html; }
  };
  return el;
}
const store = new Map([["dnd.fx", JSON.stringify({ anim: false, sound: false })]]);
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
globalThis.history = { state: null, pushState() {}, replaceState() {}, back() {} };
globalThis.location = { hostname: "test", search: "", hash: "", href: "http://test/", protocol: "http:" };
globalThis.requestAnimationFrame = () => 0;
const body = fakeEl("body");
globalThis.document = {
  addEventListener() {}, removeEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return fakeEl("toast"); },
  body, activeElement: body, documentElement: fakeEl()
};
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };

const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const C = await import(P + "classes.js");
const { installRolls } = await import(P + "sheet-rolls.js");
const { installDialogs } = await import(P + "sheet-dialogs.js");
const { installLevelUp } = await import(P + "sheet-levelup.js");
const { installMagic } = await import(P + "sheet-magic.js");

const PHB_XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

function makeX(src) {
  const S = { c: R.normalize(src), ui: { turn: { action: false, bonus: false, reaction: false }, ammoSpent: {} }, disposed: false, lastCast: {}, lastExtra: {} };
  S.d = R.compute(S.c);
  const X = { S, root: fakeEl(), id: "t" };
  X.readOnly = () => false;
  X.takeMode = () => "normal";
  X.tipsOn = () => false;
  X.renderTab = () => {};
  X.renderAll = () => {};
  X.showUndo = () => {};
  X.offerEffect = () => {};
  X.withUndo = (_l, fn) => fn();
  X.mutate = fn => {
    const prevConc = S.c.concentration;
    fn(S.c);
    if (prevConc && S.c.concentration !== prevConc) S.c.effects = S.c.effects.filter(e => !(e.mine && e.concName === prevConc));
    S.d = R.compute(S.c);
    return true;
  };
  X.curHp = (c = S.c) => Math.max(0, Math.min(S.d.hpMax, Number(c.hp.current) || 0));
  X.setHp = (c, value) => {
    const was = Number(c.hp.current) || 0;
    const v = Math.max(0, Math.min(S.d.hpMax, Math.round(value)));
    c.hp.current = v;
    if ((was <= 0) !== (v <= 0) || v > 0) {
      c.hp.deathSuccess = 0;
      c.hp.deathFail = 0;
      c.hp.stable = false;
    }
  };
  installMagic(X);
  installRolls(X);
  installDialogs(X);
  installLevelUp(X);
  return X;
}

function withRandom(values, fn) {
  const orig = Math.random;
  let i = 0;
  Math.random = () => (i < values.length ? values[i++] : 0.5);
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}
const d20is = v => (v - 1) / 20 + 0.001;
const dNis = (v, n) => (v - 1) / n + 0.001;
const lastReg = sel => [...REG].reverse().find(([s]) => s === sel)[1];

const base = (o = {}) => ({ name: "x", info: { cls: "", level: 5 }, hitDie: "d10", abilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 }, ...o });

test("xpInfo matches PHB XP table at every level", () => {
  for (let L = 1; L <= 20; L++) {
    const atStart = R.xpInfo(R.normalize({ name: "x", info: { level: L, xp: PHB_XP[L - 1] } }));
    assert.equal(atStart.levelByXp, L, `xp ${PHB_XP[L - 1]} -> level ${L}`);
    assert.equal(atStart.canLevel, false);
    assert.equal(atStart.next, L < 20 ? PHB_XP[L] : null);
    if (L < 20) {
      const justBelow = R.xpInfo(R.normalize({ name: "x", info: { level: L, xp: PHB_XP[L] - 1 } }));
      assert.equal(justBelow.canLevel, false, `level ${L} at ${PHB_XP[L] - 1}`);
      const reached = R.xpInfo(R.normalize({ name: "x", info: { level: L, xp: PHB_XP[L] } }));
      assert.equal(reached.canLevel, true, `level ${L} at ${PHB_XP[L]}`);
      assert.equal(reached.levelByXp, L + 1);
    }
  }
  assert.equal(R.xpInfo(R.normalize({ name: "x", info: { level: 1, xp: 1000000 } })).levelByXp, 20);
  assert.equal(R.xpInfo(R.normalize({ name: "x", info: { level: 3, xp: 6500 } })).levelByXp, 5);
});

test("coinsTotalCp uses PHB coin ratios", () => {
  assert.equal(R.coinsTotalCp({ cp: 1, sp: 1, ep: 1, gp: 1, pp: 1 }), 1 + 10 + 50 + 100 + 1000);
  assert.equal(R.coinsTotalCp({ cp: 0, sp: 0, ep: 2, gp: 0, pp: 0 }), 100);
  assert.equal(R.coinsTotalCp({ pp: 1 }), R.coinsTotalCp({ gp: 10 }));
});

test("payCoins pays exact amounts, makes change and refuses when short", () => {
  const w = (cp, sp, ep, gp, pp) => ({ cp, sp, ep, gp, pp });
  const total = c => R.coinsTotalCp(c);
  assert.deepEqual(R.payCoins(w(0, 0, 0, 10, 0), 3, "gp"), w(0, 0, 0, 7, 0));
  const r1 = R.payCoins(w(0, 0, 0, 1, 0), 3, "sp");
  assert.equal(total(r1), 70);
  assert.ok(r1.gp === 0 && r1.sp === 7);
  const r2 = R.payCoins(w(0, 0, 0, 0, 1), 5, "gp");
  assert.equal(total(r2), 500);
  assert.equal(r2.pp, 0);
  const r3 = R.payCoins(w(0, 0, 1, 0, 0), 3, "sp");
  assert.equal(total(r3), 20);
  assert.equal(R.payCoins(w(5, 5, 0, 0, 0), 1, "gp"), null);
  assert.equal(R.payCoins(w(99, 0, 0, 0, 0), 1, "gp"), null);
  const r4 = R.payCoins(w(100, 0, 0, 0, 0), 1, "gp");
  assert.equal(total(r4), 0);
  const r5 = R.payCoins(w(3, 7, 1, 2, 1), 1.5, "gp");
  assert.equal(total(r5), 3 + 70 + 50 + 200 + 1000 - 150);
  const r6 = R.payCoins(w(0, 0, 0, 0, 2), 1, "pp");
  assert.equal(total(r6), 1000);
  const r7 = R.payCoins(w(0, 0, 0, 0, 1), 1, "cp");
  assert.equal(total(r7), 999);
  for (const k of ["cp", "sp", "ep", "gp", "pp"]) assert.ok(Number.isInteger(r7[k]) && r7[k] >= 0);
  const r8 = R.payCoins(w(0, 0, 3, 0, 0), 1, "ep");
  assert.equal(total(r8), 100);
  const r9 = R.payCoins(w(0, 0, 0, 0, 1), 1, "ep");
  assert.equal(total(r9), 950);
  assert.deepEqual(R.payCoins(w(1, 2, 3, 4, 5), 0, "gp"), w(1, 2, 3, 4, 5));
});

test("carry capacity Str x 15, coin weight 50 per lb, attunement count", () => {
  const c = R.normalize({ name: "x", abilities: { str: 8 }, coins: { cp: 50, sp: 50, ep: 0, gp: 100, pp: 0 }, items: [{ name: "a", weight: 2.5, qty: 4 }, { name: "b", weight: 1, qty: 0 }, { name: "r", attuned: true, requiresAttunement: true }, { name: "s", attuned: true, requiresAttunement: true }] });
  const d = R.compute(c);
  assert.equal(d.carry, 120);
  assert.equal(d.weight, 10 + 200 / 50);
  assert.equal(d.attuned, 2);
  assert.equal(R.compute(R.normalize({ name: "x", abilities: { str: 20 } })).carry, 300);
});

test("HP max: level 1 full die, average after, min 1 per level, Con retroactive", () => {
  const hp = (die, con, lvl) => R.compute(R.normalize({ name: "x", hitDie: die, info: { level: lvl }, abilities: { con } })).hpMax;
  assert.equal(hp("d10", 14, 1), 12);
  assert.equal(hp("d10", 14, 5), 12 + 4 * 8);
  assert.equal(hp("d6", 10, 20), 6 + 19 * 4);
  assert.equal(hp("d12", 18, 20), 16 + 19 * 11);
  assert.equal(hp("d6", 3, 1), 2);
  assert.equal(hp("d6", 3, 5), 2 + 4 * 1);
  assert.equal(hp("d8", 15, 8) + 8, hp("d8", 16, 8));
});

test("exhaustion 4 halves HP max", () => {
  const d = R.compute(R.normalize(base({ exhaustion: 4 })));
  const full = R.compute(R.normalize(base())).hpMax;
  assert.equal(d.hpMax, Math.floor(full / 2));
});

test("pact slots and slot tables per PHB", () => {
  const pact = [[1, 1, 1], [2, 2, 1], [3, 2, 2], [5, 2, 3], [7, 2, 4], [9, 2, 5], [10, 2, 5], [11, 3, 5], [16, 3, 5], [17, 4, 5], [20, 4, 5]];
  for (const [l, n, s] of pact) assert.deepEqual(R.pactSlots(l), { count: n, level: s }, `warlock ${l}`);
  assert.deepEqual(R.slotTable("half", 1), []);
  assert.deepEqual(R.slotTable("half", 2), [2]);
  assert.deepEqual(R.slotTable("half", 5), [4, 2]);
  assert.deepEqual(R.slotTable("half", 20), [4, 3, 3, 3, 2]);
  assert.deepEqual(R.slotTable("third", 2), []);
  assert.deepEqual(R.slotTable("third", 3), [2]);
  assert.deepEqual(R.slotTable("third", 7), [4, 2]);
  assert.deepEqual(R.slotTable("third", 19), [4, 3, 3, 1]);
  assert.deepEqual(R.slotTable("full", 20), [4, 3, 3, 3, 3, 2, 2, 1, 1]);
});

const PHB = {
  die: { barbarian: 12, bard: 8, cleric: 8, druid: 8, fighter: 10, monk: 8, paladin: 10, ranger: 10, rogue: 8, sorcerer: 6, warlock: 8, wizard: 6 },
  sub: { barbarian: 3, bard: 3, cleric: 1, druid: 2, fighter: 3, monk: 3, paladin: 3, ranger: 3, rogue: 3, sorcerer: 1, warlock: 1, wizard: 2 },
  cantrips: {
    bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
  },
  known: {
    bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
    sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
    warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
  },
  invocations: [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8],
  asi: { default: [4, 8, 12, 16, 19], fighter: [4, 6, 8, 12, 14, 16, 19], rogue: [4, 8, 10, 12, 16, 19] }
};

test("CLASSES hit dice and subclass levels match PHB", () => {
  for (const [k, v] of Object.entries(PHB.die)) assert.equal(C.CLASSES[k].die, v, k);
  for (const [k, v] of Object.entries(PHB.sub)) assert.equal(C.CLASSES[k].sub, v, k);
});

test("CLASSES spells known tables match PHB", () => {
  for (const [k, arr] of Object.entries(PHB.known)) assert.deepEqual(C.CLASSES[k].known, arr, k);
  assert.deepEqual(C.CLASSES.warlock.invocations, PHB.invocations);
  assert.deepEqual(C.CLASSES.warlock.arcanum, { 11: 6, 13: 7, 15: 8, 17: 9 });
});

test("levelUpPlan: cantrip, spell, invocation, arcanum, ASI deltas match PHB for every class and level", () => {
  for (const key of Object.keys(C.CLASSES)) {
    const cls = { key, ...C.CLASSES[key] };
    const asiLv = PHB.asi[key] || PHB.asi.default;
    for (let from = 1; from < 20; from++) {
      const to = from + 1;
      const plan = C.levelUpPlan(R.normalize({ name: "x" }), cls, from);
      assert.equal(plan.to, to);
      assert.equal(plan.asi, asiLv.includes(to), `${key} ${to} asi`);
      const n = kind => plan.choose.filter(x => x.kind === kind).reduce((s, x) => s + x.n, 0);
      const ct = PHB.cantrips[key] ? PHB.cantrips[key][to - 1] - PHB.cantrips[key][from - 1] : 0;
      assert.equal(n("cantrip"), ct, `${key} ${to} cantrips`);
      let sp = PHB.known[key] ? PHB.known[key][to - 1] - PHB.known[key][from - 1] : 0;
      if (key === "wizard") sp += 2;
      if (key === "warlock" && [11, 13, 15, 17].includes(to)) sp += 1;
      assert.equal(n("spell"), sp, `${key} ${to} spells`);
      const inv = key === "warlock" ? PHB.invocations[to - 1] - PHB.invocations[from - 1] : 0;
      assert.equal(n("invocation"), inv, `${key} ${to} invocations`);
      const subNote = plan.notes.some(x => x.startsWith("Выбор подкласса"));
      assert.equal(subNote, PHB.sub[key] === to, `${key} ${to} subclass note`);
      assert.equal(plan.notes.some(x => x.startsWith("Урон заговоров")), [5, 11, 17].includes(to));
    }
  }
});

test("levelUpPlan extra attack levels", () => {
  const has = (k, to) => C.levelUpPlan({}, { key: k, ...C.CLASSES[k] }, to - 1).notes.some(n => /атак/i.test(n));
  for (const k of ["barbarian", "fighter", "monk", "paladin", "ranger"]) assert.ok(has(k, 5), k);
  assert.ok(has("fighter", 11));
  assert.ok(has("fighter", 20));
  for (const k of ["rogue", "bard", "cleric", "wizard"]) assert.ok(!has(k, 5), k);
});

test("short rest: hit die heals roll + Con, minimum 0 per die", () => {
  const X = makeX(base({ hp: { current: 10 } }));
  withRandom([dNis(7, 10)], () => X.spendHitDie());
  assert.equal(X.S.c.hp.current, 10 + 7 + 2);
  assert.equal(X.S.d.hitDice.left, 4);
  const Y = makeX(base({ abilities: { con: 3 }, hp: { current: 5 } }));
  withRandom([dNis(1, 10)], () => Y.spendHitDie());
  assert.equal(Y.S.c.hp.current, 5);
  assert.equal(Y.S.c.hp.hitDiceUsed, 1);
  const Z = makeX(base({ hp: { current: 40 } }));
  const max = Z.S.d.hpMax;
  withRandom([dNis(10, 10)], () => Z.spendHitDie());
  assert.equal(Z.S.c.hp.current, max);
  const E = makeX(base({ hp: { current: 10, hitDiceUsed: 5 } }));
  E.spendHitDie();
  assert.equal(E.S.c.hp.current, 10);
});

test("short rest: pact slots and short-rest uses recover, long-rest and slots do not, temp HP kept", () => {
  const X = makeX(base({
    casterType: "pact", pactUsed: 2, slotsUsed: { 1: 1 },
    hp: { current: 10, temp: 4, hitDiceUsed: 2 },
    features: [{ id: "f1", name: "s", uses: "1", used: 1, recharge: "short" }, { id: "f2", name: "l", uses: "1", used: 1, recharge: "long" }, { id: "f3", name: "d", uses: "3", used: 2, recharge: "dawn" }],
    effects: [{ id: "e1", name: "r", rounds: 5 }, { id: "e2", name: "us", until: "short" }, { id: "e3", name: "ul", until: "long" }]
  }));
  X.shortRest();
  lastReg("[data-ok]").onclick();
  const c = X.S.c;
  assert.equal(c.pactUsed, 0);
  assert.equal(c.features.find(f => f.id === "f1").used, 0);
  assert.equal(c.features.find(f => f.id === "f2").used, 1);
  assert.equal(c.features.find(f => f.id === "f3").used, 2);
  assert.deepEqual(c.slotsUsed, { 1: 1 });
  assert.equal(c.hp.hitDiceUsed, 2);
  assert.equal(c.hp.temp, 4);
  assert.deepEqual(c.effects.map(e => e.id), ["e3"]);
});

async function doLongRest(X) {
  const p = X.longRest();
  await Promise.resolve();
  lastReg("[data-yes]").onclick();
  await p;
}

test("long rest: full HP, temp 0, half hit dice (min 1), slots, uses, exhaustion -1, death saves reset", async () => {
  for (const [lvl, used, after] of [[1, 1, 0], [2, 2, 1], [5, 5, 3], [5, 1, 0], [20, 20, 10], [7, 7, 4]]) {
    const X = makeX(base({ info: { level: lvl }, hp: { current: 3, temp: 6, hitDiceUsed: used }, slotsUsed: { 1: 2, 2: 1 }, casterType: "full", exhaustion: 2, concentration: "Bless",
      features: [{ id: "f1", name: "s", uses: "1", used: 1, recharge: "short" }, { id: "f2", name: "l", uses: "1", used: 1, recharge: "long" }, { id: "f3", name: "d", uses: "3", used: 2, recharge: "dawn" }, { id: "f4", name: "n", uses: "3", used: 2, recharge: "none" }] }));
    await doLongRest(X);
    const c = X.S.c;
    assert.equal(c.hp.current, X.S.d.hpMax, `lvl ${lvl} hp`);
    assert.equal(c.hp.temp, 0);
    assert.equal(c.hp.hitDiceUsed, after, `lvl ${lvl} hd used ${used}`);
    assert.deepEqual(c.slotsUsed, {});
    assert.equal(c.exhaustion, 1);
    assert.equal(c.concentration, "");
    assert.deepEqual(c.features.map(f => f.used), [0, 0, 0, 2]);
    assert.equal(c.hp.deathFail, 0);
  }
});

test("long rest blocked for dead character", async () => {
  const X = makeX(base({ hp: { current: 0, deathFail: 3 } }));
  await doLongRest(X);
  assert.equal(X.S.c.hp.current, 0);
  assert.equal(X.S.c.hp.deathFail, 3);
});

test("long rest at exhaustion 4 ends with full HP of the restored maximum", async () => {
  const X = makeX(base({ exhaustion: 4, hp: { current: 5 } }));
  const fullMax = R.compute(R.normalize(base())).hpMax;
  await doLongRest(X);
  assert.equal(X.S.c.exhaustion, 3);
  assert.equal(X.S.d.hpMax, fullMax);
  assert.equal(X.S.c.hp.current, fullMax, "regains all lost hit points after rest; exhaustion 3 no longer halves max");
});

test("long rest gives no benefits when starting at 0 HP (PHB p.186)", async () => {
  const X = makeX(base({ hp: { current: 0, stable: true, hitDiceUsed: 4 }, slotsUsed: { 1: 1 }, casterType: "full" }));
  await doLongRest(X);
  assert.equal(X.S.c.hp.current, 0, "must have at least 1 HP at the start of the rest");
});

test("death saves: nat 20 regains 1 HP, nat 1 = 2 fails, 10+ success, 9 fail, 3 successes stable, 3 fails dead", () => {
  const roll = (X, v) => withRandom([d20is(v)], () => X.doRoll("death"));
  const X = makeX(base({ hp: { current: 0, deathFail: 1, deathSuccess: 2 } }));
  roll(X, 20);
  assert.equal(X.S.c.hp.current, 1);
  assert.equal(X.S.c.hp.deathFail, 0);
  assert.equal(X.S.c.hp.deathSuccess, 0);
  const Y = makeX(base({ hp: { current: 0 } }));
  roll(Y, 1);
  assert.equal(Y.S.c.hp.deathFail, 2);
  roll(Y, 10);
  assert.equal(Y.S.c.hp.deathSuccess, 1);
  roll(Y, 9);
  assert.equal(Y.S.c.hp.deathFail, 3);
  const before = JSON.stringify(Y.S.c.hp);
  roll(Y, 20);
  assert.equal(JSON.stringify(Y.S.c.hp), before, "dead: no more rolls");
  const Z = makeX(base({ hp: { current: 0, deathSuccess: 2, deathFail: 2 } }));
  roll(Z, 15);
  assert.equal(Z.S.c.hp.stable, true);
  assert.equal(Z.S.c.hp.deathSuccess, 0);
  assert.equal(Z.S.c.hp.deathFail, 0);
  assert.equal(Z.S.c.hp.current, 0);
  const W = makeX(base({ hp: { current: 0, deathFail: 2 } }));
  roll(W, 1);
  assert.equal(W.S.c.hp.deathFail, 3);
});

test("damage: temp HP absorbed first, HP floor 0, heal capped at max", () => {
  const X = makeX(base({ hp: { current: 20, temp: 5 } }));
  X.applyHp("dmg", 8);
  assert.equal(X.S.c.hp.temp, 0);
  assert.equal(X.S.c.hp.current, 17);
  X.applyHp("dmg", 3);
  assert.equal(X.S.c.hp.current, 14);
  X.applyHp("heal", 1000);
  assert.equal(X.S.c.hp.current, X.S.d.hpMax);
  const Y = makeX(base({ hp: { current: 5, temp: 10 } }));
  Y.applyHp("dmg", 7);
  assert.equal(Y.S.c.hp.temp, 3);
  assert.equal(Y.S.c.hp.current, 5);
  Y.applyHp("dmg", 7);
  assert.equal(Y.S.c.hp.temp, 0);
  assert.equal(Y.S.c.hp.current, 1);
  Y.applyHp("dmg", 3);
  assert.equal(Y.S.c.hp.current, 0);
});

test("damage with resistance/immunity/vulnerability applied before temp HP", () => {
  const X = makeX(base({ hp: { current: 20, temp: 3 }, defenses: { resist: ["fire"], vuln: ["cold"], immune: ["poison"] } }));
  X.applyHp("dmg", 11, "fire");
  assert.equal(X.S.c.hp.temp, 0);
  assert.equal(X.S.c.hp.current, 18);
  X.applyHp("dmg", 4, "cold");
  assert.equal(X.S.c.hp.current, 10);
  X.applyHp("dmg", 50, "poison");
  assert.equal(X.S.c.hp.current, 10);
});

test("temp HP do not stack: keep the higher", () => {
  const X = makeX(base({ hp: { current: 20, temp: 7 } }));
  X.applyHp("temp", 5);
  assert.equal(X.S.c.hp.temp, 7);
  X.applyHp("temp", 9);
  assert.equal(X.S.c.hp.temp, 9);
  X.giveTemp(4);
  assert.equal(X.S.c.hp.temp, 9);
  X.giveTemp(12);
  assert.equal(X.S.c.hp.temp, 12);
});

test("Armor of Agathys gives 5 temp HP per slot level", () => {
  for (const lvl of [1, 2, 5]) {
    const X = makeX(base({ hp: { current: 20 } }));
    X.castTemp({ name: "Доспех Агатиса", nameEn: "Armor of Agathys", level: 1 }, lvl);
    assert.equal(X.S.c.hp.temp, 5 * lvl);
  }
});

test("damage at 0 HP adds a death save failure and breaks stability", () => {
  const X = makeX(base({ hp: { current: 0, stable: true } }));
  X.applyHp("dmg", 3);
  assert.equal(X.S.c.hp.deathFail, 1);
  assert.equal(X.S.c.hp.stable, false);
  X.applyHp("dmg", 3);
  assert.equal(X.S.c.hp.deathFail, 2);
});

test("damage at 0 HP from a critical hit counts as two failures", () => {
  const X = makeX(base({ hp: { current: 0 } }));
  X.applyHp("dmg", 3, "", { crit: true });
  assert.equal(X.S.c.hp.deathFail, 2);
});

test("damage at 0 HP that equals or exceeds HP max kills instantly", () => {
  const X = makeX(base({ hp: { current: 0 } }));
  X.applyHp("dmg", X.S.d.hpMax);
  assert.equal(X.S.c.hp.deathFail, 3);
});

test("massive damage: remaining damage after 0 HP >= HP max kills instantly", () => {
  const X = makeX(base({ hp: { current: 10 } }));
  const max = X.S.d.hpMax;
  X.applyHp("dmg", 10 + max);
  assert.equal(X.S.c.hp.current, 0);
  assert.equal(X.S.c.hp.deathFail, 3);
});

test("massive damage boundary: remaining just below max is not death", () => {
  const X = makeX(base({ hp: { current: 10 } }));
  X.applyHp("dmg", 10 + X.S.d.hpMax - 1);
  assert.equal(X.S.c.hp.deathFail, 0);
});

test("healing at 0 HP restores consciousness and resets death saves", () => {
  const X = makeX(base({ hp: { current: 0, deathFail: 2, deathSuccess: 1 } }));
  X.applyHp("heal", 4);
  assert.equal(X.S.c.hp.current, 4);
  assert.equal(X.S.c.hp.deathFail, 0);
  assert.equal(X.S.c.hp.deathSuccess, 0);
});

test("healing a dead character (3 failures) must not revive", () => {
  const X = makeX(base({ hp: { current: 0, deathFail: 3 } }));
  X.applyHp("heal", 10);
  assert.equal(X.S.c.hp.deathFail, 3);
  assert.equal(X.S.c.hp.current, 0);
});

test("concentration DC = max(10, floor(damage/2)) after defenses, lost at 0 HP", () => {
  const dc = (dmg, type = "", hp = 100, o = {}) => {
    TOASTS.length = 0;
    const X = makeX(base({ info: { level: 20 }, abilities: { con: 20 }, hp: { current: hp }, concentration: "Hex", ...o }));
    X.applyHp("dmg", dmg, type);
    const t = TOASTS.find(h => /СЛ \d+/.test(h));
    return { dc: t ? Number(t.match(/СЛ (\d+)/)[1]) : 0, conc: X.S.c.concentration };
  };
  assert.equal(dc(5).dc, 10);
  assert.equal(dc(21).dc, 10);
  assert.equal(dc(22).dc, 11);
  assert.equal(dc(25).dc, 12);
  assert.equal(dc(30).dc, 15);
  assert.equal(dc(30, "fire", 100, { defenses: { resist: ["fire"], vuln: [], immune: [] } }).dc, 10);
  assert.equal(dc(40, "fire", 100, { defenses: { resist: ["fire"], vuln: [], immune: [] } }).dc, 10);
  assert.equal(dc(44, "fire", 100, { defenses: { resist: ["fire"], vuln: [], immune: [] } }).dc, 11);
  assert.equal(dc(30, "fire", 100, { defenses: { resist: [], vuln: [], immune: ["fire"] } }).dc, 0);
  assert.equal(dc(4, "", 100, { hp: { current: 100, temp: 10 } }).dc, 10);
  const down = dc(200, "", 5);
  assert.equal(down.conc, "");
  assert.equal(down.dc, 0);
});

test("concentration replacement drops own effects of the old spell", () => {
  const X = makeX(base({ spells: [{ id: "s9", name: "Bless", level: 1, cost: "free", concentration: true }], concentration: "Hex", effects: [{ id: "e1", name: "Hex", mine: true, concName: "Hex" }, { id: "e2", name: "Bless", mine: false }] }));
  X.castSpell({ id: "s9", name: "Bless", level: 1, cost: "free", concentration: true });
  assert.equal(X.S.c.concentration, "Bless");
  assert.deepEqual(X.S.c.effects.map(e => e.id), ["e2"]);
});

function levelUp(X, { roll = null, asi = null } = {}) {
  X.openLevelUp();
  const bodyEl = [...REG].reverse().find(([s]) => s === ".modal-body");
  const modalBody = bodyEl ? bodyEl[1] : null;
  if (roll != null) withRandom([dNis(roll, R.maxDie(X.S.c.hitDie))], () => lastReg("[data-roll-hp]").onclick());
  if (asi) {
    modalBody.fire("change", { target: { name: "lu-asi", value: "one", matches: () => false } });
    modalBody.fire("change", { target: { name: "", value: asi, matches: s => s === "[data-a1-one]" } });
  }
  lastReg("[data-go]").onclick();
}

test("level up average HP = die/2 + 1 + Con (min 1)", () => {
  for (const [die, con, gain] of [["d10", 14, 8], ["d6", 10, 4], ["d12", 20, 12], ["d8", 8, 4], ["d6", 3, 1], ["d6", 1, 1]]) {
    const X = makeX(base({ hitDie: die, abilities: { con }, info: { level: 3 } }));
    X.S.c.hp.current = X.S.d.hpMax;
    const m0 = X.S.d.hpMax;
    levelUp(X);
    assert.equal(X.S.c.info.level, 4);
    assert.equal(X.S.d.hpMax - m0, gain, `${die} con ${con}`);
    assert.equal(X.S.c.hp.current, X.S.d.hpMax);
  }
});

test("level up rolled HP = roll + Con, positive Con", () => {
  const X = makeX(base({ hitDie: "d10", abilities: { con: 14 }, info: { level: 3 } }));
  const m0 = X.S.d.hpMax;
  levelUp(X, { roll: 3 });
  assert.equal(X.S.d.hpMax - m0, 5);
});

test("level up rolled HP with negative Con: gain is at least 1 (dialog shows +1)", () => {
  const X = makeX(base({ hitDie: "d6", abilities: { con: 6 }, info: { level: 3 } }));
  const m0 = X.S.d.hpMax;
  levelUp(X, { roll: 1 });
  assert.equal(X.S.d.hpMax - m0, 1, "1d6 roll 1 with Con -2 should still give 1 HP");
});

test("level up rolled HP with Con -1 and roll 1: gain is 1", () => {
  const X = makeX(base({ hitDie: "d8", abilities: { con: 8 }, info: { level: 3 } }));
  const m0 = X.S.d.hpMax;
  levelUp(X, { roll: 1 });
  assert.equal(X.S.d.hpMax - m0, 1);
});

test("level up with Con ASI raises HP retroactively by 1 per level", () => {
  const X = makeX(base({ hitDie: "d10", abilities: { con: 15 }, info: { level: 3 } }));
  X.S.c.hp.current = X.S.d.hpMax;
  const m0 = X.S.d.hpMax;
  levelUp(X, { asi: "con" });
  assert.equal(X.S.c.abilities.con, 17);
  assert.equal(X.S.d.hpMax - m0, (6 + 3) + 3 * 1);
  assert.equal(X.S.c.hp.current, X.S.d.hpMax);
});

test("item recharge kinds: dawn recovers on long rest only, none never", async () => {
  const X = makeX(base({ items: [{ id: "w", name: "Wand", uses: "7", used: 5, recharge: "dawn" }, { id: "n", name: "Potion", uses: "1", used: 1, recharge: "none" }] }));
  X.shortRest();
  lastReg("[data-ok]").onclick();
  assert.equal(X.S.c.items[0].used, 5);
  await doLongRest(X);
  assert.equal(X.S.c.items[0].used, 0);
  assert.equal(X.S.c.items[1].used, 1);
});

test("ammo spent on attack decrements quantity", () => {
  const X = makeX(base({ items: [{ id: "bow", name: "Длинный лук", atkAbility: "dex", equipped: true, damage: [{ dice: "1d8", type: "piercing" }] }, { id: "ar", name: "Стрелы", type: "ammo", qty: 20 }] }));
  withRandom([d20is(10)], () => X.doRoll("iattack:bow"));
  assert.equal(X.S.c.items.find(i => i.id === "ar").qty, 19);
  assert.equal(X.S.ui.ammoSpent.ar, 1);
});
