import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = { addEventListener() {}, querySelector() { return null; }, createElement() { return { classList: { add() {} }, appendChild() {}, addEventListener() {} }; }, body: { appendChild() {} } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };

const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const UI = await import(P + "ui.js");

const mk = (o = {}) => R.normalize({ name: "x", ...o });
const lvl = (n, extra = {}) => mk({ info: { level: n }, ...extra });
const comp = c => R.compute(c);

const sum = p => {
  const m = {};
  for (const d of p.dice) m[d.f] = (m[d.f] || 0) + d.n;
  for (const k of Object.keys(m)) if (!m[k]) delete m[k];
  return { m, flat: p.flat };
};
const sameDice = (a, b, msg) => assert.deepEqual(sum(R.parseDice(a)), sum(R.parseDice(b)), `${msg || ""} got "${a}" expected "${b}"`);

const PHB_FULL = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3], 7: [4, 3, 3, 1], 8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2], 11: [4, 3, 3, 3, 2, 1], 12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1], 14: [4, 3, 3, 3, 2, 1, 1], 15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1], 18: [4, 3, 3, 3, 3, 1, 1, 1, 1], 19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
};

const PHB_PALADIN = {
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3], 9: [4, 3, 2], 10: [4, 3, 2],
  11: [4, 3, 3], 12: [4, 3, 3], 13: [4, 3, 3, 1], 14: [4, 3, 3, 1], 15: [4, 3, 3, 2], 16: [4, 3, 3, 2],
  17: [4, 3, 3, 3, 1], 18: [4, 3, 3, 3, 1], 19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2]
};

const PHB_EK = {
  1: [], 2: [], 3: [2], 4: [3], 5: [3], 6: [3], 7: [4, 2], 8: [4, 2], 9: [4, 2], 10: [4, 3], 11: [4, 3], 12: [4, 3],
  13: [4, 3, 2], 14: [4, 3, 2], 15: [4, 3, 2], 16: [4, 3, 3], 17: [4, 3, 3], 18: [4, 3, 3], 19: [4, 3, 3, 1], 20: [4, 3, 3, 1]
};

const PHB_PACT = {
  1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [2, 2], 5: [2, 3], 6: [2, 3], 7: [2, 4], 8: [2, 4], 9: [2, 5], 10: [2, 5],
  11: [3, 5], 12: [3, 5], 13: [3, 5], 14: [3, 5], 15: [3, 5], 16: [3, 5], 17: [4, 5], 18: [4, 5], 19: [4, 5], 20: [4, 5]
};

test("full caster slot table, levels 1..20", () => {
  for (let l = 1; l <= 20; l++) assert.deepEqual(R.slotTable("full", l), PHB_FULL[l], `full ${l}`);
});

test("half caster slot table (paladin/ranger single class), no slots at 1", () => {
  for (let l = 1; l <= 20; l++) assert.deepEqual(R.slotTable("half", l), PHB_PALADIN[l], `half ${l}`);
});

test("third caster slot table (Eldritch Knight / Arcane Trickster), from level 3", () => {
  for (let l = 1; l <= 20; l++) assert.deepEqual(R.slotTable("third", l), PHB_EK[l], `third ${l}`);
});

test("pact magic slots: count and slot level", () => {
  for (let l = 1; l <= 20; l++) {
    const p = R.pactSlots(l);
    assert.deepEqual([p.count, p.level], PHB_PACT[l], `pact ${l}`);
  }
});

test("non-casters and pact casters have no regular slots; compute wires tables", () => {
  for (const l of [1, 10, 20]) {
    assert.deepEqual(R.slotTable("none", l), []);
    assert.deepEqual(R.slotTable("pact", l), []);
  }
  const w = comp(lvl(11, { casterType: "pact" }));
  assert.deepEqual(w.slots, []);
  assert.deepEqual([w.pact.count, w.pact.level], [3, 5]);
  const wiz = comp(lvl(9, { casterType: "full" }));
  assert.equal(wiz.pact, null);
  assert.deepEqual(wiz.slots, [4, 3, 3, 3, 1]);
  const pal = comp(lvl(1, { casterType: "half" }));
  assert.deepEqual(pal.slots, []);
});

test("slot table clamps out of range levels", () => {
  assert.deepEqual(R.slotTable("full", 0), [2]);
  assert.deepEqual(R.slotTable("full", 25), PHB_FULL[20]);
  assert.deepEqual(R.slotTable("full", "abc"), [2]);
});

test("cantrip tiers by character level", () => {
  const exp = { 1: 1, 2: 1, 4: 1, 5: 2, 6: 2, 10: 2, 11: 3, 12: 3, 16: 3, 17: 4, 18: 4, 20: 4 };
  for (const [l, t] of Object.entries(exp)) {
    assert.equal(R.cantripTier(Number(l)), t, `tier at ${l}`);
    assert.equal(comp(lvl(Number(l))).tier, t);
  }
});

const fireBolt = { id: "fb", name: "Огненный снаряд", level: 0, attack: true, damage: [{ dice: "1d10", type: "fire" }], scaling: "cantrip-dice", cost: "free" };
const eb = { id: "eb", name: "Мистический заряд", level: 0, attack: true, damage: [{ dice: "1d10", type: "force" }], scaling: "cantrip-beams", cost: "free" };

test("cantrip dice scaling via spellCast (Fire Bolt)", () => {
  const exp = { 1: "1d10", 4: "1d10", 5: "2d10", 10: "2d10", 11: "3d10", 16: "3d10", 17: "4d10", 20: "4d10" };
  for (const [l, dice] of Object.entries(exp)) {
    const c = lvl(Number(l), { spells: [fireBolt] });
    const d = comp(c);
    const cast = R.spellCast(c, d, c.spells[0]);
    sameDice(cast.lines[0].dice, dice, `level ${l}`);
    assert.equal(cast.beams, 1);
    assert.equal(cast.level, 0);
  }
});

test("Eldritch Blast beams 1/2/3/4 at 1/5/11/17, each beam keeps 1d10", () => {
  const exp = { 1: 1, 4: 1, 5: 2, 10: 2, 11: 3, 16: 3, 17: 4, 20: 4 };
  for (const [l, n] of Object.entries(exp)) {
    const c = lvl(Number(l), { spells: [eb], casterType: "pact", spellAbility: "cha", abilities: { cha: 18 } });
    const d = comp(c);
    const cast = R.spellCast(c, d, c.spells[0]);
    assert.equal(cast.beams, n, `beams at ${l}`);
    sameDice(cast.lines[0].dice, "1d10");
  }
});

test("Agonizing Blast adds Cha mod per beam, not scaled by beams", () => {
  const sp = { ...eb, damage: [{ dice: "1d10", type: "force", addMod: true }] };
  const c = lvl(11, { spells: [sp], casterType: "pact", spellAbility: "cha", abilities: { cha: 18 } });
  const d = comp(c);
  const cast = R.spellCast(c, d, c.spells[0]);
  assert.equal(cast.beams, 3);
  sameDice(cast.lines[0].dice, "1d10+4");
});

test("attackStats cantrip-dice and cantrip-beams follow tiers", () => {
  for (const [l, n] of [[1, 1], [5, 2], [11, 3], [17, 4]]) {
    const c = lvl(l, { spellAbility: "int", abilities: { int: 16 }, attacks: [
      { id: "a1", name: "fb", ability: "spell", damage: "1d10", damageType: "fire", scaling: "cantrip-dice" },
      { id: "a2", name: "eb", ability: "spell", damage: "1d10", damageType: "force", scaling: "cantrip-beams", addMod: true }
    ] });
    const d = comp(c);
    sameDice(d.attacks.a1.dmg, `${n}d10`);
    assert.equal(d.attacks.a1.beams, 1);
    assert.equal(d.attacks.a2.beams, n);
    sameDice(d.attacks.a2.dmg, "1d10+3");
    assert.equal(d.attacks.a1.hit, R.profBonus(l) + 3);
  }
});

test("cantrip-dice scaling does not multiply flat modifier", () => {
  const c = lvl(17, { attacks: [{ id: "a", name: "x", ability: "none", damage: "1d8+2", damageType: "fire", scaling: "cantrip-dice" }] });
  sameDice(comp(c).attacks.a.dmg, "4d8+2");
});

const fireball = { id: "fbl", name: "Огненный шар", level: 3, save: "dex", damage: [{ dice: "8d6", type: "fire" }], upcast: "1d6", cost: "slot" };
const iceStorm = { id: "ice", name: "Град", level: 4, save: "dex", damage: [{ dice: "2d8", type: "bludgeoning" }, { dice: "4d6", type: "cold" }], upcast: "1d8", cost: "slot" };
const cure = { id: "cw", name: "Лечение ран", level: 1, damage: [{ dice: "1d8", type: "healing", addMod: true }], upcast: "1d8", cost: "slot" };
const falseLife = { id: "fl", name: "Ложная жизнь", level: 1, damage: [{ dice: "1d4+4", type: "temp" }], upcast: "5", cost: "slot" };
const disint = { id: "dis", name: "Распад", level: 6, save: "dex", damage: [{ dice: "10d6+40", type: "force" }], upcast: "3d6", cost: "slot" };
const rebuke = { id: "hr", name: "Адское возмездие", level: 1, save: "dex", damage: [{ dice: "2d10", type: "fire" }], upcast: "1d10", cost: "slot" };

test("upcasting adds upcast dice per slot level above base", () => {
  const c = lvl(17, { casterType: "full", spellAbility: "wis", abilities: { wis: 16 }, spells: [fireball, iceStorm, cure, falseLife, disint] });
  const d = comp(c);
  const s = id => c.spells.find(x => x.id === id);
  sameDice(R.spellCast(c, d, s("fbl")).lines[0].dice, "8d6");
  sameDice(R.spellCast(c, d, s("fbl"), 3).lines[0].dice, "8d6");
  sameDice(R.spellCast(c, d, s("fbl"), 4).lines[0].dice, "9d6");
  sameDice(R.spellCast(c, d, s("fbl"), 5).lines[0].dice, "10d6");
  sameDice(R.spellCast(c, d, s("fbl"), 9).lines[0].dice, "14d6");
  assert.equal(R.spellCast(c, d, s("fbl"), 5).level, 5);
  sameDice(R.spellCast(c, d, s("cw"), 2).lines[0].dice, "2d8+3");
  sameDice(R.spellCast(c, d, s("cw"), 5).lines[0].dice, "5d8+3");
  sameDice(R.spellCast(c, d, s("fl"), 3).lines[0].dice, "1d4+14");
  sameDice(R.spellCast(c, d, s("dis"), 7).lines[0].dice, "13d6+40");
});

test("only the first damage line scales on upcast (Ice Storm)", () => {
  const c = lvl(9, { casterType: "full", spells: [iceStorm] });
  const d = comp(c);
  const cast = R.spellCast(c, d, c.spells[0], 6);
  sameDice(cast.lines[0].dice, "4d8");
  sameDice(cast.lines[1].dice, "4d6");
  assert.equal(cast.lines[1].type, "cold");
});

test("spell without upcast field does not change with slot level", () => {
  const sp = { ...fireball, upcast: "" };
  const c = lvl(9, { casterType: "full", spells: [sp] });
  const d = comp(c);
  sameDice(R.spellCast(c, d, c.spells[0], 5).lines[0].dice, "8d6");
});

test("castAt is honoured when no slot is given", () => {
  const sp = { ...fireball, castAt: 5 };
  const c = lvl(9, { casterType: "full", spells: [sp] });
  const d = comp(c);
  const cast = R.spellCast(c, d, c.spells[0]);
  assert.equal(cast.level, 5);
  sameDice(cast.lines[0].dice, "10d6");
});

test("warlock casts slot spells at pact slot level automatically", () => {
  for (const [l, slot, dice] of [[1, 1, "2d10"], [3, 2, "3d10"], [5, 3, "4d10"], [7, 4, "5d10"], [9, 5, "6d10"], [20, 5, "6d10"]]) {
    const c = lvl(l, { casterType: "pact", spells: [rebuke] });
    const d = comp(c);
    const cast = R.spellCast(c, d, c.spells[0]);
    assert.equal(cast.level, slot, `warlock ${l}`);
    sameDice(cast.lines[0].dice, dice, `warlock ${l}`);
  }
});

test("warlock: cantrips and free spells are not lifted to pact level", () => {
  const c = lvl(9, { casterType: "pact", spells: [{ ...rebuke, cost: "uses" }, fireBolt] });
  const d = comp(c);
  assert.equal(R.spellCast(c, d, c.spells[0]).level, 1);
  sameDice(R.spellCast(c, d, c.spells[0]).lines[0].dice, "2d10");
  assert.equal(R.spellCast(c, d, c.spells[1]).level, 0);
});

test("itemCharges: documented house rule (level-1, min 1, +2 extra charges if spell scales)", () => {
  assert.deepEqual(R.itemCharges({ level: 3, damage: [{ dice: "8d6", type: "fire" }], upcast: "1d6" }), { charges: 2, maxCharges: 4, upcast: "1d6" });
  assert.deepEqual(R.itemCharges({ level: 1, damage: [{ dice: "3d6", type: "fire" }], upcast: "1d6" }), { charges: 1, maxCharges: 3, upcast: "1d6" });
  assert.deepEqual(R.itemCharges({ level: 0, damage: [{ dice: "1d10", type: "fire" }] }), { charges: 1, maxCharges: 3, upcast: "1d10" });
  assert.deepEqual(R.itemCharges({ level: 1, damage: [{ dice: "1d4+4", type: "temp" }], upcast: "5" }), { charges: 1, maxCharges: 1, upcast: "" });
  assert.deepEqual(R.itemCharges({ level: 2, damage: [], upcast: "" }), { charges: 1, maxCharges: 1, upcast: "" });
  assert.deepEqual(R.itemCharges({ level: 5, damage: [{ dice: "4d6", type: "fire" }], upcast: "" }), { charges: 4, maxCharges: 4, upcast: "" });
});

test("spellCast with item charges: each extra charge adds upcast dice to the first line", () => {
  const wand = { id: "wand", name: "Палочка", type: "wand", uses: "7" };
  const sp = { ...fireball, id: "ifb", cost: "item", itemId: "wand", charges: 2, maxCharges: 4 };
  const ice = { ...iceStorm, id: "iis", cost: "item", itemId: "wand", charges: 3, maxCharges: 5 };
  const c = lvl(5, { casterType: "full", items: [wand], spells: [sp, ice] });
  const d = comp(c);
  sameDice(R.spellCast(c, d, c.spells[0], null, 0).lines[0].dice, "8d6");
  sameDice(R.spellCast(c, d, c.spells[0], null, 1).lines[0].dice, "9d6");
  sameDice(R.spellCast(c, d, c.spells[0], null, 2).lines[0].dice, "10d6");
  assert.equal(R.spellCast(c, d, c.spells[0], null, 2).level, 3);
  const two = R.spellCast(c, d, c.spells[1], null, 2);
  sameDice(two.lines[0].dice, "4d8");
  sameDice(two.lines[1].dice, "4d6");
});

test("item cantrip: extra charges add base cantrip dice", () => {
  const wand = { id: "wand", name: "Палочка", type: "wand", uses: "7" };
  const sp = { ...fireBolt, id: "ifbolt", cost: "item", itemId: "wand", scaling: "none", charges: 1, maxCharges: 3, upcast: "1d10" };
  const c = lvl(5, { items: [wand], spells: [sp] });
  const d = comp(c);
  sameDice(R.spellCast(c, d, c.spells[0], null, 0).lines[0].dice, "1d10");
  sameDice(R.spellCast(c, d, c.spells[0], null, 2).lines[0].dice, "3d10");
});

test("normalize keeps item charges sane", () => {
  const c = mk({ spells: [{ id: "s", name: "s", level: 3, cost: "item", charges: 0, maxCharges: -2 }] });
  assert.equal(c.spells[0].charges, 1);
  assert.equal(c.spells[0].maxCharges, 1);
});

const W = (o) => ({ id: "w", name: "w", type: "weapon", equipped: true, atkProf: true, atkBonus: 0, ...o });

test("weaponStats: Str melee weapon", () => {
  const c = lvl(1, { abilities: { str: 16, dex: 12 }, items: [W({ atkAbility: "str", damage: [{ dice: "1d8", type: "slashing" }] })] });
  const w = comp(c).weapons.w;
  assert.equal(w.ability, "str");
  assert.equal(w.hit, 5);
  sameDice(w.dmg, "1d8+3");
  assert.equal(w.type, "slashing");
});

test("weaponStats: finesse takes the better of Str and Dex", () => {
  const c1 = lvl(5, { abilities: { str: 10, dex: 18 }, items: [W({ atkAbility: "finesse", damage: [{ dice: "1d8", type: "piercing" }] })] });
  const w1 = comp(c1).weapons.w;
  assert.equal(w1.ability, "dex");
  assert.equal(w1.hit, 7);
  sameDice(w1.dmg, "1d8+4");
  const c2 = lvl(5, { abilities: { str: 18, dex: 14 }, items: [W({ atkAbility: "finesse", damage: [{ dice: "1d4", type: "piercing" }] })] });
  const w2 = comp(c2).weapons.w;
  assert.equal(w2.ability, "str");
  assert.equal(w2.hit, 7);
  sameDice(w2.dmg, "1d4+4");
  const c3 = lvl(1, { abilities: { str: 6, dex: 8 }, items: [W({ atkAbility: "finesse", damage: [{ dice: "1d4", type: "piercing" }] })] });
  const w3 = comp(c3).weapons.w;
  assert.equal(w3.ability, "dex");
  assert.equal(w3.hit, 1);
  sameDice(w3.dmg, "1d4-1");
});

test("weaponStats: ranged uses Dex; heavy Str does not leak", () => {
  const c = lvl(9, { abilities: { str: 20, dex: 14 }, items: [W({ atkAbility: "dex", damage: [{ dice: "1d8", type: "piercing" }], range: "150/600 фт" })] });
  const w = comp(c).weapons.w;
  assert.equal(w.hit, 6);
  sameDice(w.dmg, "1d8+2");
  assert.equal(w.range, "150/600 фт");
});

test("weaponStats: magic +N adds to hit and damage, second line has no modifier", () => {
  const c = lvl(1, { abilities: { str: 16 }, items: [W({ atkAbility: "str", atkBonus: 1, damage: [{ dice: "1d8", type: "slashing" }, { dice: "2d6", type: "fire" }] })] });
  const w = comp(c).weapons.w;
  assert.equal(w.hit, 6);
  sameDice(w.lines[0].dice, "1d8+4");
  sameDice(w.lines[1].dice, "2d6");
  assert.equal(w.lines[1].type, "fire");
});

test("weaponStats: no proficiency removes PB only from attack", () => {
  const c = lvl(13, { abilities: { str: 14 }, items: [W({ atkAbility: "str", atkProf: false, damage: [{ dice: "1d12", type: "slashing" }] })] });
  const w = comp(c).weapons.w;
  assert.equal(w.hit, 2);
  sameDice(w.dmg, "1d12+2");
});

test("weaponStats: proficiency bonus grows by level", () => {
  for (const [l, pb] of [[1, 2], [4, 2], [5, 3], [8, 3], [9, 4], [12, 4], [13, 5], [16, 5], [17, 6], [20, 6]]) {
    const c = lvl(l, { abilities: { str: 10 }, items: [W({ atkAbility: "str", damage: [{ dice: "1d6", type: "slashing" }] })] });
    assert.equal(comp(c).weapons.w.hit, pb, `level ${l}`);
  }
});

test("weaponStats: thrown dagger as finesse, thrown handaxe as Str", () => {
  const c = lvl(1, { abilities: { str: 14, dex: 16 }, items: [
    W({ id: "dg", atkAbility: "finesse", damage: [{ dice: "1d4", type: "piercing" }], range: "5 фт / 20/60 фт" }),
    W({ id: "ax", atkAbility: "str", damage: [{ dice: "1d6", type: "slashing" }], range: "5 фт / 20/60 фт" })
  ] });
  const d = comp(c);
  assert.equal(d.weapons.dg.hit, 5);
  sameDice(d.weapons.dg.dmg, "1d4+3");
  assert.equal(d.weapons.ax.hit, 4);
  sameDice(d.weapons.ax.dmg, "1d6+2");
});

test("weaponStats: spell ability weapon (Pact of the Blade / Shillelagh style)", () => {
  const c = lvl(5, { spellAbility: "cha", abilities: { str: 8, cha: 18 }, items: [W({ atkAbility: "spell", damage: [{ dice: "1d8", type: "slashing" }] })] });
  const w = comp(c).weapons.w;
  assert.equal(w.hit, 7);
  sameDice(w.dmg, "1d8+4");
});

test("weaponStats: blowgun flat 1 damage plus modifier", () => {
  const c = lvl(1, { abilities: { dex: 14 }, items: [W({ atkAbility: "dex", damage: [{ dice: "1", type: "piercing" }] })] });
  sameDice(comp(c).weapons.w.dmg, "3");
});

test("unequipped weapons are not computed in d.weapons", () => {
  const c = lvl(1, { items: [W({ equipped: false, atkAbility: "str", damage: [{ dice: "1d6", type: "slashing" }] })] });
  assert.equal(comp(c).weapons.w, undefined);
});

test("attackStats: manual attack with Str, prof, bonus, addMod, dmgBonus", () => {
  const c = lvl(5, { abilities: { str: 18 }, attacks: [
    { id: "a", name: "a", kind: "attack", ability: "str", proficient: true, bonus: 1, damage: "2d6", addMod: true, dmgBonus: 1, damageType: "slashing" },
    { id: "b", name: "b", kind: "attack", ability: "str", proficient: false, bonus: 0, damage: "1d6", addMod: false, damageType: "slashing" }
  ] });
  const d = comp(c);
  assert.equal(d.attacks.a.hit, 4 + 3 + 1);
  sameDice(d.attacks.a.dmg, "2d6+5");
  assert.equal(d.attacks.b.hit, 4);
  sameDice(d.attacks.b.dmg, "1d6");
});

test("attackStats: save attack uses spell DC", () => {
  const c = lvl(5, { spellAbility: "wis", abilities: { wis: 17 }, attacks: [{ id: "a", name: "a", kind: "save", ability: "spell", damage: "1d8", damageType: "radiant", saveAbility: "dex", scaling: "cantrip-dice" }] });
  const d = comp(c);
  assert.equal(d.attacks.a.dc, 8 + 3 + 3);
  assert.equal(d.attacks.a.save, "dex");
  sameDice(d.attacks.a.dmg, "2d8");
});

test("spell save DC and attack bonus", () => {
  for (const [l, score, dc, atk] of [[1, 10, 10, 2], [1, 16, 13, 5], [5, 18, 15, 7], [17, 20, 19, 11], [1, 8, 9, 1]]) {
    const d = comp(lvl(l, { spellAbility: "int", abilities: { int: score } }));
    assert.equal(d.spell.dc, dc);
    assert.equal(d.spell.atk, atk);
  }
});

test("critical hits double only dice, not modifiers (critExpr)", () => {
  const cases = [["1d8+3", "2d8+3"], ["2d6+1d4-1", "4d6+2d4-1"], ["1d10+4", "2d10+4"], ["8d6", "16d6"], ["1d4+1", "2d4+1"], ["3", "3"], ["1d6-1d4", "2d6-2d4"]];
  for (const [inp, exp] of cases) sameDice(UI.critExpr(inp), exp, `crit ${inp}`);
});

test("weapon crit after weaponStats keeps magic bonus and ability flat", () => {
  const c = lvl(5, { abilities: { dex: 18 }, items: [W({ atkAbility: "finesse", atkBonus: 2, damage: [{ dice: "1d8", type: "piercing" }, { dice: "1d6", type: "fire" }] })] });
  const w = comp(c).weapons.w;
  sameDice(UI.critExpr(w.lines[0].dice), "2d8+6");
  sameDice(UI.critExpr(w.lines[1].dice), "2d6");
});

test("presets: Bless +1d4 attacks and saves, not checks", () => {
  const c = mk({ effects: [R.presetEffect("bless")] });
  assert.deepEqual(R.rollContext(c, "attack").bonus.map(b => b.expr), ["1d4"]);
  assert.deepEqual(R.rollContext(c, "save", "wis").bonus.map(b => b.expr), ["1d4"]);
  assert.deepEqual(R.rollContext(c, "death").bonus.map(b => b.expr), ["1d4"]);
  assert.deepEqual(R.rollContext(c, "check", "str").bonus, []);
  assert.equal(c.effects[0].rounds, 10);
});

test("presets: Bane -1d4 attacks and saves", () => {
  const c = mk({ effects: [R.presetEffect("bane")] });
  const a = R.rollContext(c, "attack").bonus[0].expr;
  const s = R.rollContext(c, "save", "con").bonus[0].expr;
  sameDice(a, "-1d4");
  sameDice(s, "-1d4");
  assert.deepEqual(R.rollContext(c, "check", "str").bonus, []);
});

test("presets: Guidance 1d4 to one check only", () => {
  const c = mk({ effects: [R.presetEffect("guidance")] });
  const b = R.rollContext(c, "check", "wis").bonus;
  assert.equal(b[0].expr, "1d4");
  assert.equal(b[0].once, true);
  assert.deepEqual(R.rollContext(c, "attack").bonus, []);
  assert.deepEqual(R.rollContext(c, "save", "wis").bonus, []);
});

test("presets: Hex and Hunter's Mark 1d6 extra damage, Enlarge 1d4, Reduce -1d4", () => {
  const c = mk({ effects: [R.presetEffect("hex"), R.presetEffect("huntersMark"), R.presetEffect("enlarge"), R.presetEffect("reduce")] });
  const ed = R.effectDamage(c, { weapon: true, ability: "dex" });
  assert.equal(ed.length, 4);
  assert.deepEqual(R.effectDamage(c, { weapon: false }).map(x => x.name), ["Сглаз"]);
  sameDice(ed[0].dice, "1d6");
  assert.equal(ed[0].type, "necrotic");
  sameDice(ed[1].dice, "1d6");
  assert.equal(ed[1].type, "");
  sameDice(ed[2].dice, "1d4");
  sameDice(ed[3].dice, "-1d4");
  assert.equal(R.presetEffect("hex").rounds, 600);
  assert.equal(R.presetEffect("huntersMark").rounds, 600);
});

test("Hex damage dice double on a crit, Rage flat bonus does not", () => {
  sameDice(UI.critExpr("1d6"), "2d6");
  sameDice(UI.critExpr("2"), "2");
});

test("presets: Rage +2 damage, advantage on Str checks and saves, BPS resistance", () => {
  const c = mk({ effects: [R.presetEffect("rage")] });
  sameDice(R.effectDamage(c, { weapon: true, ability: "str" })[0].dice, "2");
  assert.equal(R.effectDamage(c, { weapon: true, ability: "dex" }).length, 0);
  assert.equal(R.effectDamage(c, { weapon: false }).length, 0);
  assert.equal(R.presetEffect("rage", {}, 8).dmg, "2");
  assert.equal(R.presetEffect("rage", {}, 9).dmg, "3");
  assert.equal(R.presetEffect("rage", {}, 16).dmg, "4");
  assert.equal(R.rollContext(c, "check", "str").adv.length, 1);
  assert.equal(R.rollContext(c, "save", "str").adv.length, 1);
  assert.equal(R.rollContext(c, "save", "dex").adv.length, 0);
  const d = comp(c);
  assert.deepEqual([...d.defenses.resist].sort(), ["bludgeoning", "piercing", "slashing"]);
});

test("presets: Enlarge advantage on Str checks and saves; Reduce disadvantage", () => {
  const c = mk({ effects: [R.presetEffect("enlarge")] });
  assert.equal(R.resolveMode("", R.rollContext(c, "check", "str")), "adv");
  assert.equal(R.resolveMode("", R.rollContext(c, "save", "str")), "adv");
  assert.equal(R.resolveMode("", R.rollContext(c, "check", "dex")), "normal");
  const r = mk({ effects: [R.presetEffect("reduce")] });
  assert.equal(R.resolveMode("", R.rollContext(r, "save", "str")), "dis");
});

test("cover: half +2 AC and Dex saves, three-quarters +5", () => {
  const base = comp(mk({ abilities: { dex: 14 } })).ac;
  assert.equal(base, 12);
  const c2 = mk({ abilities: { dex: 14 }, effects: [R.presetEffect("cover2")] });
  assert.equal(comp(c2).ac, 14);
  assert.deepEqual(R.rollContext(c2, "save", "dex").bonus.map(b => Number(b.expr)), [2]);
  assert.deepEqual(R.rollContext(c2, "save", "wis").bonus, []);
  assert.deepEqual(R.rollContext(c2, "attack").bonus, []);
  const c5 = mk({ abilities: { dex: 14 }, effects: [R.presetEffect("cover5")] });
  assert.equal(comp(c5).ac, 17);
  assert.deepEqual(R.rollContext(c5, "save", "dex").bonus.map(b => Number(b.expr)), [5]);
});

test("Shield +5 AC, Shield of Faith +2, Haste +2 AC, double speed, adv Dex saves", () => {
  assert.equal(comp(mk({ effects: [R.presetEffect("shield")] })).ac, 15);
  assert.equal(comp(mk({ effects: [R.presetEffect("shieldOfFaith")] })).ac, 12);
  const h = mk({ speed: 30, effects: [R.presetEffect("haste")] });
  const d = comp(h);
  assert.equal(d.ac, 12);
  assert.equal(d.speed, 60);
  assert.equal(R.resolveMode("", R.rollContext(h, "save", "dex")), "adv");
  assert.equal(R.resolveMode("", R.rollContext(h, "save", "str")), "normal");
});

test("Dodge gives advantage on Dex saves", () => {
  const c = mk({ effects: [R.presetEffect("dodge")] });
  assert.equal(R.resolveMode("", R.rollContext(c, "save", "dex")), "adv");
});

const ctx = (cond, kind, ab, ex = 0, effects = []) => R.rollContext(mk({ conditions: cond, exhaustion: ex, effects }), kind, ab);
const mode = (cond, kind, ab, ex = 0, manual = "", effects = []) => R.resolveMode(manual, ctx(cond, kind, ab, ex, effects));

test("advantage and disadvantage cancel regardless of number of sources", () => {
  assert.equal(R.resolveMode("", { adv: ["a", "b", "c"], dis: ["x"] }), "normal");
  assert.equal(R.resolveMode("", { adv: ["a"], dis: ["x", "y", "z"] }), "normal");
  assert.equal(R.resolveMode("adv", { adv: [], dis: ["x", "y"] }), "normal");
  assert.equal(R.resolveMode("dis", { adv: ["x", "y"], dis: [] }), "normal");
  assert.equal(R.resolveMode("adv", { adv: ["x"], dis: [] }), "adv");
  assert.equal(R.resolveMode("", { adv: [], dis: [] }), "normal");
  assert.equal(mode({ invisible: true, poisoned: true, prone: true }, "attack", ""), "normal");
});

test("poisoned: disadvantage on attacks and ability checks, not saves", () => {
  assert.equal(mode({ poisoned: true }, "attack", ""), "dis");
  assert.equal(mode({ poisoned: true }, "check", "str"), "dis");
  assert.equal(mode({ poisoned: true }, "save", "con"), "normal");
});

test("blinded: disadvantage on attacks; prone: disadvantage on attacks", () => {
  assert.equal(mode({ blinded: true }, "attack", ""), "dis");
  assert.equal(mode({ prone: true }, "attack", ""), "dis");
  assert.equal(mode({ prone: true }, "save", "dex"), "normal");
});

test("restrained: disadvantage on attacks and Dex saves only", () => {
  assert.equal(mode({ restrained: true }, "attack", ""), "dis");
  assert.equal(mode({ restrained: true }, "save", "dex"), "dis");
  assert.equal(mode({ restrained: true }, "save", "str"), "normal");
  assert.equal(mode({ restrained: true }, "check", "dex"), "normal");
});

test("paralyzed, stunned, unconscious, petrified auto-fail Str and Dex saves", () => {
  for (const k of ["paralyzed", "stunned", "unconscious", "petrified"]) {
    assert.ok(ctx({ [k]: true }, "save", "str").autoFail, `${k} str`);
    assert.ok(ctx({ [k]: true }, "save", "dex").autoFail, `${k} dex`);
    assert.equal(ctx({ [k]: true }, "save", "con").autoFail, "", `${k} con`);
    assert.equal(ctx({ [k]: true }, "save", "wis").autoFail, "", `${k} wis`);
  }
  assert.equal(ctx({ incapacitated: true }, "save", "dex").autoFail, "");
});

test("exhaustion: 1 disadvantage on checks, 3 disadvantage on attacks and saves", () => {
  assert.equal(mode({}, "check", "str", 1), "dis");
  assert.equal(mode({}, "attack", "", 1), "normal");
  assert.equal(mode({}, "save", "con", 1), "normal");
  assert.equal(mode({}, "attack", "", 2), "normal");
  assert.equal(mode({}, "attack", "", 3), "dis");
  assert.equal(mode({}, "save", "wis", 3), "dis");
  assert.equal(mode({}, "check", "wis", 3), "dis");
  assert.equal(mode({}, "death", "", 3), "dis");
  assert.equal(mode({}, "attack", "", 6), "dis");
});

test("frightened: disadvantage on checks and attacks; invisible: advantage on attacks", () => {
  assert.equal(mode({ frightened: true }, "attack", ""), "dis");
  assert.equal(mode({ frightened: true }, "check", "cha"), "dis");
  assert.equal(mode({ frightened: true }, "save", "wis"), "normal");
  assert.equal(mode({ invisible: true }, "attack", ""), "adv");
  assert.equal(mode({ invisible: true }, "check", "dex"), "normal");
});

test("conditions without roll effects on the roller do not alter mode", () => {
  for (const k of ["charmed", "deafened", "grappled", "incapacitated"]) {
    assert.equal(mode({ [k]: true }, "attack", ""), "normal", k);
    assert.equal(mode({ [k]: true }, "save", "dex"), "normal", k);
  }
});

test("incapacitating conditions warn on attack", () => {
  for (const k of ["incapacitated", "paralyzed", "stunned", "unconscious", "petrified"]) assert.ok(ctx({ [k]: true }, "attack", "").warn.length, k);
});

test("parseDice basics", () => {
  assert.deepEqual(R.parseDice("2d6+3"), { dice: [{ n: 2, f: 6 }], flat: 3 });
  assert.deepEqual(R.parseDice("d20"), { dice: [{ n: 1, f: 20 }], flat: 0 });
  assert.deepEqual(R.parseDice(" 2к6 − 1 "), { dice: [{ n: 2, f: 6 }], flat: -1 });
  assert.deepEqual(R.parseDice("1d8+1d6+2-1"), { dice: [{ n: 1, f: 8 }, { n: 1, f: 6 }], flat: 1 });
  assert.deepEqual(R.parseDice("-1d4"), { dice: [{ n: -1, f: 4 }], flat: 0 });
  assert.deepEqual(R.parseDice("5"), { dice: [], flat: 5 });
  assert.equal(R.parseDice(""), null);
  assert.equal(R.parseDice("abc"), null);
  assert.equal(R.parseDice("2d"), null);
  assert.equal(R.parseDice("1d6*2"), null);
});

test("parseDice: 0d6 means zero dice", () => {
  const p = R.parseDice("0d6");
  assert.ok(p);
  assert.equal(p.dice.reduce((s, d) => s + d.n, 0), 0);
});

test("scaleDice", () => {
  sameDice(R.scaleDice("1d10", 3), "3d10");
  sameDice(R.scaleDice("1d4+1", 3), "3d4+3");
  sameDice(R.scaleDice("1d4+1", 3, { scaleFlat: false }), "3d4+1");
  sameDice(R.scaleDice("2d6+1d4", 2), "4d6+2d4");
  assert.equal(R.scaleDice("bad", 2), "bad");
  assert.equal(R.scaleDice("1d6", 0), "0");
});

test("addDice merges like faces and flats", () => {
  sameDice(R.addDice("2d6", "1d6"), "3d6");
  sameDice(R.addDice("1d8", 3), "1d8+3");
  sameDice(R.addDice("1d8", -2), "1d8-2");
  sameDice(R.addDice("1d8+2", "1d6-5"), "1d8+1d6-3");
  assert.equal(R.addDice("1d6", "-1d6"), "0");
  sameDice(R.addDice("", "1d4", null, 0), "1d4");
  assert.equal(R.addDice("1d8", 0), "1d8");
});

test("diceToString round-trips through parseDice", () => {
  for (const s of ["1d8", "2d6+3", "1d12-1", "3d6+2d4+1", "-1d4", "7"]) {
    const once = R.diceToString(R.parseDice(s));
    sameDice(once, s);
    assert.equal(R.diceToString(R.parseDice(once)), once);
  }
});

test("effectDamage ignores effects without damage", () => {
  const c = mk({ effects: [R.presetEffect("bless"), R.presetEffect("shield"), R.presetEffect("hex")] });
  assert.equal(R.effectDamage(c).length, 1);
  assert.equal(R.effectDamage(mk({})).length, 0);
});

test("damage swap applies to weapon and spell lines", () => {
  const c = lvl(5, { damageSwap: { enabled: true, from: "fire", to: "cold" }, spells: [fireball], items: [W({ atkAbility: "str", damage: [{ dice: "1d8", type: "fire" }] })] });
  const d = comp(c);
  assert.equal(R.spellCast(c, d, c.spells[0]).lines[0].type, "cold");
  assert.equal(d.weapons.w.type, "cold");
});
