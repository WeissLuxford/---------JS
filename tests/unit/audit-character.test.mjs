import { test } from "node:test";
import assert from "node:assert/strict";
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");

const mk = (o = {}) => R.normalize({ name: "x", ...o });
const D = o => R.compute(mk(o));
const ab = (o = {}) => ({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...o });

test("ability modifiers for scores 1..30", () => {
  const table = { 1: -5, 2: -4, 3: -4, 4: -3, 5: -3, 6: -2, 7: -2, 8: -1, 9: -1, 10: 0, 11: 0, 12: 1, 13: 1, 14: 2, 15: 2, 16: 3, 17: 3, 18: 4, 19: 4, 20: 5, 21: 5, 22: 6, 23: 6, 24: 7, 25: 7, 26: 8, 27: 8, 28: 9, 29: 9, 30: 10 };
  for (const [s, m] of Object.entries(table)) {
    assert.equal(R.mod(Number(s)), m, "mod " + s);
    assert.equal(D({ abilities: ab({ str: Number(s) }) }).mods.str, m, "compute mod " + s);
  }
});

test("normalize clamps scores to 1..30 and level to 1..20", () => {
  const c = mk({ abilities: ab({ str: 0, dex: 31, con: -4 }), info: { level: 25 } });
  assert.equal(c.abilities.str, 1);
  assert.equal(c.abilities.dex, 30);
  assert.equal(c.abilities.con, 1);
  assert.equal(c.info.level, 20);
  assert.equal(mk({ info: { level: 0 } }).info.level, 1);
});

test("proficiency bonus by level 1..20", () => {
  const exp = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];
  for (let l = 1; l <= 20; l++) {
    assert.equal(R.profBonus(l), exp[l - 1], "pb " + l);
    assert.equal(D({ info: { level: l } }).pb, exp[l - 1], "compute pb " + l);
  }
});

test("saving throws: proficient and not", () => {
  const d = D({ info: { level: 1 }, abilities: ab({ str: 16, dex: 8, con: 14, int: 12, wis: 13, cha: 18 }), saves: { con: true, cha: true } });
  assert.deepEqual(d.saves, { str: 3, dex: -1, con: 4, int: 1, wis: 1, cha: 6 });
  const d17 = D({ info: { level: 17 }, abilities: ab({ wis: 20, dex: 6 }), saves: { wis: true, dex: true } });
  assert.equal(d17.saves.wis, 11);
  assert.equal(d17.saves.dex, 4);
  assert.equal(d17.saves.str, 0);
});

test("skills: none, proficient, expertise", () => {
  const d = D({ info: { level: 5 }, abilities: ab({ dex: 16, wis: 14, int: 8, cha: 7 }), skills: { stealth: 2, perception: 1, investigation: 1 } });
  assert.equal(d.skills.stealth, 3 + 6);
  assert.equal(d.skills.acrobatics, 3);
  assert.equal(d.skills.perception, 2 + 3);
  assert.equal(d.skills.insight, 2);
  assert.equal(d.skills.investigation, -1 + 3);
  assert.equal(d.skills.persuasion, -2);
  assert.equal(d.skills.arcana, -1);
  const d20 = D({ info: { level: 20 }, abilities: ab({ dex: 20 }), skills: { sleightOfHand: 2 } });
  assert.equal(d20.skills.sleightOfHand, 5 + 12);
});

test("skill governing abilities match PHB", () => {
  const exp = { acrobatics: "dex", animalHandling: "wis", arcana: "int", athletics: "str", deception: "cha", history: "int", insight: "wis", intimidation: "cha", investigation: "int", medicine: "wis", nature: "int", perception: "wis", performance: "cha", persuasion: "cha", religion: "int", sleightOfHand: "dex", stealth: "dex", survival: "wis" };
  assert.equal(R.SKILLS.length, 18);
  for (const s of R.SKILLS) assert.equal(s.ab, exp[s.key], s.key);
});

test("passive Perception, Insight, Investigation = 10 + skill", () => {
  const d = D({ info: { level: 9 }, abilities: ab({ wis: 15, int: 6 }), skills: { perception: 2, insight: 1 } });
  assert.equal(d.passive.perception, 10 + 2 + 8);
  assert.equal(d.passive.insight, 10 + 2 + 4);
  assert.equal(d.passive.investigation, 10 - 2);
});

test("AC: unarmored default 10 + Dex", () => {
  assert.equal(D({ abilities: ab({ dex: 14 }) }).ac, 12);
  assert.equal(D({ abilities: ab({ dex: 6 }) }).ac, 8);
  assert.equal(D({}).ac, 10);
});

test("AC: manual light armor full Dex", () => {
  assert.equal(D({ abilities: ab({ dex: 20 }), armor: { name: "Проклёпанная кожа", base: 12, dexCap: "full" } }).ac, 17);
  assert.equal(D({ abilities: ab({ dex: 8 }), armor: { base: 11, dexCap: "full" } }).ac, 10);
});

test("AC: manual medium armor Dex capped at +2, negative Dex applies", () => {
  assert.equal(D({ abilities: ab({ dex: 18 }), armor: { base: 14, dexCap: "2" } }).ac, 16);
  assert.equal(D({ abilities: ab({ dex: 14 }), armor: { base: 14, dexCap: "2" } }).ac, 16);
  assert.equal(D({ abilities: ab({ dex: 12 }), armor: { base: 15, dexCap: "2" } }).ac, 16);
  assert.equal(D({ abilities: ab({ dex: 8 }), armor: { base: 13, dexCap: "2" } }).ac, 12);
});

test("AC: manual heavy armor ignores Dex, positive and negative", () => {
  assert.equal(D({ abilities: ab({ dex: 18 }), armor: { base: 18, dexCap: "0" } }).ac, 18);
  assert.equal(D({ abilities: ab({ dex: 6 }), armor: { base: 16, dexCap: "0" } }).ac, 16);
});

test("AC: shield +2 and magic bonus", () => {
  assert.equal(D({ abilities: ab({ dex: 10 }), armor: { base: 18, dexCap: "0", shield: true } }).ac, 20);
  assert.equal(D({ abilities: ab({ dex: 10 }), armor: { base: 18, dexCap: "0", shield: true, bonus: 3 } }).ac, 23);
});

test("AC: unarmored defense Barbarian (Con) and Monk (Wis)", () => {
  assert.equal(D({ abilities: ab({ dex: 14, con: 16 }), armor: { base: 10, dexCap: "full", addAbility: "con" } }).ac, 15);
  assert.equal(D({ abilities: ab({ dex: 14, con: 16 }), armor: { base: 10, dexCap: "full", addAbility: "con", shield: true } }).ac, 17);
  assert.equal(D({ abilities: ab({ dex: 16, wis: 16 }), armor: { base: 10, dexCap: "full", addAbility: "wis" } }).ac, 16);
  assert.equal(D({ abilities: ab({ dex: 16, wis: 8 }), armor: { base: 10, dexCap: "full", addAbility: "wis" } }).ac, 12);
});

const armorItem = (name, acBase, acDex, extra = {}) => ({ id: "it-" + name, name, type: "armor", equipped: true, acBase, acDex, ...extra });

test("AC: armor items from SRD table (acBase/acDex)", () => {
  const cases = [
    ["Padded", 11, "full", 16, 14], ["Leather", 11, "full", 16, 14], ["Studded", 12, "full", 16, 15],
    ["Hide", 12, "2", 16, 14], ["ChainShirt", 13, "2", 16, 15], ["Scale", 14, "2", 8, 13], ["Breastplate", 14, "2", 20, 16], ["HalfPlate", 15, "2", 14, 17],
    ["RingMail", 14, "0", 20, 14], ["ChainMail", 16, "0", 8, 16], ["Splint", 17, "0", 14, 17], ["Plate", 18, "0", 16, 18]
  ];
  for (const [n, base, dex, score, expAc] of cases) {
    assert.equal(D({ abilities: ab({ dex: score }), items: [armorItem(n, base, dex)] }).ac, expAc, n);
  }
});

test("AC: armor item overrides manual armor block", () => {
  const d = D({ abilities: ab({ dex: 16 }), armor: { base: 13, dexCap: "full" }, items: [armorItem("Plate", 18, "0")] });
  assert.equal(d.ac, 18);
  assert.equal(d.armorItem, "it-Plate");
});

test("AC: unequipped armor item ignored", () => {
  assert.equal(D({ abilities: ab({ dex: 14 }), items: [armorItem("Plate", 18, "0", { equipped: false })] }).ac, 12);
});

test("AC: shield item, magic armor acBonus, attunement gating", () => {
  const shield = { id: "it-sh", name: "Щит", type: "armor", equipped: true, acBonus: 2 };
  const plate1 = armorItem("Plate1", 18, "0", { acBonus: 1 });
  const ring = { id: "it-ring", name: "Кольцо защиты", type: "ring", equipped: true, requiresAttunement: true, attuned: true, acBonus: 1 };
  const ringOff = { ...ring, id: "it-ring2", attuned: false };
  const d = D({ abilities: ab({ dex: 14 }), items: [plate1, shield, ring, ringOff] });
  assert.equal(d.ac, 18 + 1 + 2 + 1);
  assert.equal(D({ abilities: ab({ dex: 14 }), items: [shield] }).ac, 14);
});

test("AC: effects Shield of Faith, Shield spell, Haste, cover add on top", () => {
  const base = { abilities: ab({ dex: 14 }), armor: { base: 14, dexCap: "2" } };
  assert.equal(D({ ...base, effects: [R.presetEffect("shieldOfFaith")] }).ac, 18);
  assert.equal(D({ ...base, effects: [R.presetEffect("shield")] }).ac, 21);
  assert.equal(D({ ...base, effects: [R.presetEffect("haste")] }).ac, 18);
  assert.equal(D({ ...base, effects: [R.presetEffect("cover2")] }).ac, 18);
  assert.equal(D({ ...base, effects: [R.presetEffect("cover5")] }).ac, 21);
  const d = D({ ...base, effects: [R.presetEffect("shield"), R.presetEffect("shieldOfFaith")] });
  assert.equal(d.ac, 23);
  assert.equal(d.baseAc, 16);
});

test("AC: effect presets carry the PHB values", () => {
  assert.equal(R.EFFECT_PRESETS.shieldOfFaith.ac, 2);
  assert.equal(R.EFFECT_PRESETS.shield.ac, 5);
  assert.equal(R.EFFECT_PRESETS.haste.ac, 2);
  assert.equal(R.EFFECT_PRESETS.cover2.ac, 2);
  assert.equal(R.EFFECT_PRESETS.cover2.dexSave, 2);
  assert.equal(R.EFFECT_PRESETS.cover5.ac, 5);
  assert.equal(R.EFFECT_PRESETS.cover5.dexSave, 5);
});

test("unarmored defense (Con/Wis) must not apply while wearing body armor", () => {
  const barb = D({ abilities: ab({ dex: 14, con: 18 }), armor: { base: 10, dexCap: "full", addAbility: "con" }, items: [armorItem("Plate", 18, "0")] });
  assert.equal(barb.ac, 18, "Barbarian in plate: Unarmored Defense ends, AC 18");
  const monk = D({ abilities: ab({ dex: 16, wis: 16 }), armor: { base: 10, dexCap: "full", addAbility: "wis" }, items: [armorItem("Leather", 11, "full")] });
  assert.equal(monk.ac, 14, "Monk in leather: 11 + Dex 3");
});

test("HP level 1 = max hit die + Con for every die", () => {
  for (const [die, n] of [["d6", 6], ["d8", 8], ["d10", 10], ["d12", 12]]) {
    assert.equal(D({ hitDie: die, info: { level: 1 } }).hpMax, n, die);
    assert.equal(D({ hitDie: die, info: { level: 1 }, abilities: ab({ con: 14 }) }).hpMax, n + 2, die + " con14");
  }
});

test("HP later levels use fixed average die/2+1 per level", () => {
  const avg = { d6: 4, d8: 5, d10: 6, d12: 7 };
  for (const [die, top] of [["d6", 6], ["d8", 8], ["d10", 10], ["d12", 12]]) {
    for (const l of [1, 2, 3, 5, 10, 20]) {
      const exp = top + (l - 1) * avg[die];
      assert.equal(D({ hitDie: die, info: { level: l } }).hpMax, exp, `${die} L${l}`);
      const expCon = top + 3 + (l - 1) * (avg[die] + 3);
      assert.equal(D({ hitDie: die, info: { level: l }, abilities: ab({ con: 16 }) }).hpMax, expCon, `${die} L${l} con16`);
    }
  }
});

test("HP negative Con: at least 1 per level", () => {
  assert.equal(D({ hitDie: "d6", info: { level: 1 }, abilities: ab({ con: 1 }) }).hpMax, 1);
  assert.equal(D({ hitDie: "d6", info: { level: 3 }, abilities: ab({ con: 1 }) }).hpMax, 3);
  assert.equal(D({ hitDie: "d8", info: { level: 5 }, abilities: ab({ con: 3 }) }).hpMax, 4 + 4 * 1);
  assert.equal(D({ hitDie: "d8", info: { level: 4 }, abilities: ab({ con: 8 }) }).hpMax, 7 + 3 * 4);
  assert.equal(D({ hitDie: "d12", info: { level: 20 }, abilities: ab({ con: 1 }) }).hpMax, 7 + 19 * 2);
});

test("HP bonusPerLevel (Hill Dwarf, Tough) and rollAdj", () => {
  assert.equal(D({ hitDie: "d8", info: { level: 5 }, abilities: ab({ con: 14 }), hp: { bonusPerLevel: 1 } }).hpMax, 10 + 4 * 7 + 5);
  assert.equal(D({ hitDie: "d10", info: { level: 4 }, hp: { bonusPerLevel: 2 } }).hpMax, 10 + 3 * 6 + 8);
  assert.equal(D({ hitDie: "d8", info: { level: 3 }, hp: { rollAdj: -2 } }).hpMax, 8 + 10 - 2);
  assert.equal(D({ hitDie: "d8", info: { level: 3 }, hp: { rollAdj: 3 } }).hpMax, 21);
});

test("HP maxOverride respected", () => {
  assert.equal(D({ hitDie: "d8", info: { level: 3 }, hp: { maxOverride: 30 } }).hpMax, 30);
});

test("Exhaustion 4+ halves HP max (round down), 3 does not", () => {
  const base = { hitDie: "d8", info: { level: 5 }, abilities: ab({ con: 12 }) };
  const full = 9 + 4 * 6;
  assert.equal(D(base).hpMax, full);
  assert.equal(D({ ...base, exhaustion: 3 }).hpMax, full);
  assert.equal(D({ ...base, exhaustion: 4 }).hpMax, Math.floor(full / 2));
  assert.equal(D({ ...base, exhaustion: 4 }).fullMax, full);
  assert.equal(D({ ...base, exhaustion: 5 }).hpMax, Math.floor(full / 2));
  assert.equal(D({ ...base, exhaustion: 4, hp: { maxOverride: 45 } }).hpMax, 22);
});

test("Initiative = Dex mod + bonus (Alert +5)", () => {
  assert.equal(D({ abilities: ab({ dex: 16 }) }).init, 3);
  assert.equal(D({ abilities: ab({ dex: 7 }) }).init, -2);
  assert.equal(D({ abilities: ab({ dex: 14 }), initBonus: 5 }).init, 7);
});

test("Initiative roll is a Dex check: exhaustion 1 imposes disadvantage", () => {
  const ctx = R.rollContext(mk({ exhaustion: 1 }), "check", "dex");
  assert.equal(R.resolveMode("", ctx), "dis");
});

test("Speed: base, effects, haste, exhaustion, conditions", () => {
  assert.equal(D({ speed: 30 }).speed, 30);
  assert.equal(D({ speed: 25 }).speed, 25);
  assert.equal(D({ speed: 30, effects: [{ name: "Longstrider", speed: 10 }] }).speed, 40);
  assert.equal(D({ speed: 30, effects: [R.presetEffect("haste")] }).speed, 60);
  assert.equal(D({ speed: 30, effects: [{ name: "Longstrider", speed: 10 }, R.presetEffect("haste")] }).speed, 80);
  assert.equal(D({ speed: 30, exhaustion: 1 }).speed, 30);
  assert.equal(D({ speed: 30, exhaustion: 2 }).speed, 15);
  assert.equal(D({ speed: 30, exhaustion: 4 }).speed, 15);
  assert.equal(D({ speed: 30, exhaustion: 2, effects: [R.presetEffect("haste")] }).speed, 30);
  assert.equal(D({ speed: 30, exhaustion: 5 }).speed, 0);
  assert.equal(D({ speed: 30, exhaustion: 5, effects: [R.presetEffect("haste")] }).speed, 0);
  for (const k of ["grappled", "restrained", "paralyzed", "stunned", "unconscious", "petrified"]) {
    assert.equal(D({ speed: 30, conditions: { [k]: true }, effects: [R.presetEffect("haste")] }).speed, 0, k);
  }
  for (const k of ["prone", "poisoned", "blinded", "frightened", "charmed", "deafened", "invisible", "incapacitated"]) {
    assert.equal(D({ speed: 30, conditions: { [k]: true } }).speed, 30, k);
  }
  assert.equal(D({ speed: 30, effects: [{ name: "Slow", speed: -40 }] }).speed, 0);
  assert.equal(D({ speed: 30, conditions: { grappled: true } }).baseSpeed, 30);
});

test("Exhaustion roll effects (2014): 1 checks, 3 attacks and saves", () => {
  const c1 = mk({ exhaustion: 1 });
  assert.equal(R.resolveMode("", R.rollContext(c1, "check", "str")), "dis");
  assert.equal(R.resolveMode("", R.rollContext(c1, "attack")), "normal");
  assert.equal(R.resolveMode("", R.rollContext(c1, "save", "con")), "normal");
  const c3 = mk({ exhaustion: 3 });
  assert.equal(R.resolveMode("", R.rollContext(c3, "attack")), "dis");
  assert.equal(R.resolveMode("", R.rollContext(c3, "save", "wis")), "dis");
  assert.equal(R.resolveMode("", R.rollContext(c3, "death")), "dis");
});

test("Petrified: resistance to all damage types", () => {
  const d = D({ conditions: { petrified: true } });
  assert.deepEqual([...d.defenses.resist].sort(), [...R.DAMAGE_TYPES].sort());
  assert.equal(R.DAMAGE_TYPES.length, 13);
  assert.equal(R.applyDefenses(15, "force", d.defenses).amount, 7);
});

test("Petrified keeps immunities and vulnerabilities", () => {
  const d = D({ conditions: { petrified: true }, defenses: { resist: [], vuln: ["bludgeoning"], immune: ["poison"] } });
  assert.equal(R.applyDefenses(10, "poison", d.defenses).amount, 0);
  assert.equal(R.applyDefenses(11, "bludgeoning", d.defenses).amount, 10);
});

test("Rage effect adds BPS resistance, merges with own", () => {
  const d = D({ defenses: { resist: ["fire"], vuln: [], immune: [] }, effects: [R.presetEffect("rage")] });
  assert.deepEqual([...d.defenses.resist].sort(), ["bludgeoning", "fire", "piercing", "slashing"]);
});

test("Text defenses parsed into types", () => {
  const c = mk({ resistances: "сопротивление огню, иммунитет к яду; уязвимость к дробящему" });
  assert.deepEqual(c.defenses.resist, ["fire"]);
  assert.deepEqual(c.defenses.immune, ["poison"]);
  assert.deepEqual(c.defenses.vuln, ["bludgeoning"]);
});

test("applyDefenses: resistance halves rounding down", () => {
  const df = { resist: ["fire"], vuln: [], immune: [] };
  assert.deepEqual(R.applyDefenses(10, "fire", df), { amount: 5, kind: "resist" });
  assert.equal(R.applyDefenses(7, "fire", df).amount, 3);
  assert.equal(R.applyDefenses(1, "fire", df).amount, 0);
  assert.equal(R.applyDefenses(0, "fire", df).amount, 0);
  assert.equal(R.applyDefenses(7, "cold", df).amount, 7);
});

test("applyDefenses: vulnerability doubles", () => {
  const df = { resist: [], vuln: ["radiant"], immune: [] };
  assert.deepEqual(R.applyDefenses(7, "radiant", df), { amount: 14, kind: "vuln" });
  assert.equal(R.applyDefenses(7, "necrotic", df).amount, 7);
});

test("applyDefenses: immunity zeroes and beats resistance", () => {
  const df = { resist: ["poison"], vuln: ["poison"], immune: ["poison"] };
  assert.deepEqual(R.applyDefenses(30, "poison", df), { amount: 0, kind: "immune" });
});

test("applyDefenses: resistance and vulnerability both apply, resistance first", () => {
  const df = { resist: ["fire"], vuln: ["fire"], immune: [] };
  assert.equal(R.applyDefenses(25, "fire", df).amount, 24);
  assert.equal(R.applyDefenses(7, "fire", df).amount, 6);
  assert.equal(R.applyDefenses(1, "fire", df).amount, 0);
  assert.equal(R.applyDefenses(10, "fire", df).kind, "both");
});

test("applyDefenses: no type or no defenses passes through, negatives clamp", () => {
  assert.equal(R.applyDefenses(9, "", { resist: ["fire"] }).amount, 9);
  assert.equal(R.applyDefenses(9, "fire", null).amount, 9);
  assert.equal(R.applyDefenses(-4, "fire", { resist: [] }).amount, 0);
});

test("Carry capacity = Str x 15, coins 50 per lb", () => {
  assert.equal(D({ abilities: ab({ str: 8 }) }).carry, 120);
  assert.equal(D({ abilities: ab({ str: 15 }) }).carry, 225);
  assert.equal(D({ abilities: ab({ str: 30 }) }).carry, 450);
  const d = D({ items: [{ id: "a", name: "Латы", weight: 65, qty: 1 }, { id: "b", name: "Стрелы", weight: 0.05, qty: 20 }], coins: { gp: 100, sp: 50 } });
  assert.equal(d.weight, 65 + 1 + 3);
});

test("Spell save DC = 8 + PB + mod, spell attack = PB + mod", () => {
  const w1 = D({ info: { level: 1 }, casterType: "full", spellAbility: "int", abilities: ab({ int: 16 }) });
  assert.equal(w1.spell.dc, 13);
  assert.equal(w1.spell.atk, 5);
  const w17 = D({ info: { level: 17 }, casterType: "full", spellAbility: "int", abilities: ab({ int: 20 }) });
  assert.equal(w17.spell.dc, 19);
  assert.equal(w17.spell.atk, 11);
  const p5 = D({ info: { level: 5 }, casterType: "half", spellAbility: "cha", abilities: ab({ cha: 8 }) });
  assert.equal(p5.spell.dc, 10);
  assert.equal(p5.spell.atk, 2);
  const k9 = D({ info: { level: 9 }, casterType: "pact", spellAbility: "cha", abilities: ab({ cha: 18 }) });
  assert.equal(k9.spell.dc, 16);
  assert.equal(k9.spell.atk, 8);
  const c13 = D({ info: { level: 13 }, casterType: "full", spellAbility: "wis", abilities: ab({ wis: 17 }) });
  assert.equal(c13.spell.dc, 16);
});

test("Hit dice pool equals level", () => {
  const d = D({ info: { level: 7 }, hitDie: "d10", hp: { hitDiceUsed: 3 } });
  assert.equal(d.hitDice.total, 7);
  assert.equal(d.hitDice.left, 4);
});

test("Conditions roll effects", () => {
  const ctx = c => R.resolveMode("", c);
  assert.equal(ctx(R.rollContext(mk({ conditions: { poisoned: true } }), "attack")), "dis");
  assert.equal(ctx(R.rollContext(mk({ conditions: { poisoned: true } }), "check", "wis")), "dis");
  assert.equal(ctx(R.rollContext(mk({ conditions: { restrained: true } }), "save", "dex")), "dis");
  assert.equal(ctx(R.rollContext(mk({ conditions: { restrained: true } }), "save", "str")), "normal");
  assert.equal(ctx(R.rollContext(mk({ conditions: { invisible: true } }), "attack")), "adv");
  assert.equal(ctx(R.rollContext(mk({ conditions: { invisible: true, poisoned: true } }), "attack")), "normal");
  for (const k of ["paralyzed", "stunned", "unconscious", "petrified"]) {
    assert.ok(R.rollContext(mk({ conditions: { [k]: true } }), "save", "dex").autoFail, k + " dex");
    assert.ok(R.rollContext(mk({ conditions: { [k]: true } }), "save", "str").autoFail, k + " str");
    assert.equal(R.rollContext(mk({ conditions: { [k]: true } }), "save", "con").autoFail, "", k + " con");
  }
});

test("Cover adds to Dex saves only", () => {
  const c = mk({ effects: [R.presetEffect("cover5")] });
  assert.equal(R.rollContext(c, "save", "dex").bonus.reduce((s, b) => s + Number(b.expr), 0), 5);
  assert.equal(R.rollContext(c, "save", "wis").bonus.length, 0);
});
