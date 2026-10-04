import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const { rich } = await import(P + "ui.js");
const { describeChanges } = await import(P + "changes.js");
const { kirion } = await import(P + "seed.js");
const clone = v => JSON.parse(JSON.stringify(v));
const withCond = (conds, ex = 0) => R.normalize({ name: "T", conditions: Object.fromEntries(conds.map(k => [k, true])), exhaustion: ex });

test("conditions give advantage or disadvantage to the right rolls", () => {
  const mode = (c, kind, ab, manual = "normal") => R.resolveMode(manual, R.rollContext(c, kind, ab));
  assert.equal(mode(withCond(["poisoned"]), "attack"), "dis");
  assert.equal(mode(withCond(["poisoned"]), "check", "int"), "dis");
  assert.equal(mode(withCond(["poisoned"]), "save", "con"), "normal");
  assert.equal(mode(withCond(["invisible"]), "attack"), "adv");
  assert.equal(mode(withCond(["invisible", "poisoned"]), "attack"), "normal");
  assert.equal(mode(withCond(["restrained"]), "save", "dex"), "dis");
  assert.equal(mode(withCond(["restrained"]), "save", "wis"), "normal");
  assert.equal(mode(withCond(["prone"]), "attack"), "dis");
  assert.equal(mode(withCond([]), "attack", "", "adv"), "adv");
  assert.equal(mode(withCond(["frightened"]), "attack", "", "adv"), "normal");
  assert.equal(R.rollContext(withCond(["paralyzed"]), "save", "dex").autoFail, "Парализован");
  assert.equal(R.rollContext(withCond(["paralyzed"]), "save", "wis").autoFail, "");
  assert.ok(R.rollReasons("adv", R.rollContext(withCond(["poisoned"]), "attack")).some(t => t.includes("гасят")));
});

test("exhaustion levels stack (2014 rules)", () => {
  const mode = (ex, kind, ab) => R.resolveMode("normal", R.rollContext(withCond([], ex), kind, ab));
  assert.equal(mode(1, "check", "str"), "dis");
  assert.equal(mode(1, "attack"), "normal");
  assert.equal(mode(2, "attack"), "normal");
  assert.equal(mode(3, "attack"), "dis");
  assert.equal(mode(3, "save", "con"), "dis");
  const base = R.normalize(kirion());
  const at = ex => R.compute({ ...base, exhaustion: ex });
  assert.equal(at(0).speed, 30);
  assert.equal(at(2).speed, 15);
  assert.equal(at(5).speed, 0);
  assert.equal(at(0).hpMax, 43);
  assert.equal(at(4).hpMax, 21);
  assert.equal(at(4).fullMax, 43);
  assert.equal(R.compute({ ...base, conditions: { grappled: true } }).speed, 0);
});

test("damage after resistance, vulnerability and immunity", () => {
  const def = { resist: ["fire"], vuln: ["radiant", "fire"], immune: ["poison"] };
  assert.deepEqual(R.applyDefenses(13, "fire", { resist: ["fire"], vuln: [], immune: [] }), { amount: 6, kind: "resist" });
  assert.deepEqual(R.applyDefenses(7, "radiant", def), { amount: 14, kind: "vuln" });
  assert.deepEqual(R.applyDefenses(9, "poison", def), { amount: 0, kind: "immune" });
  assert.deepEqual(R.applyDefenses(13, "fire", def), { amount: 12, kind: "both" });
  assert.deepEqual(R.applyDefenses(10, "cold", def), { amount: 10, kind: "" });
  assert.deepEqual(R.applyDefenses(10, "", def), { amount: 10, kind: "" });
  const stone = R.compute(R.normalize({ name: "S", conditions: { petrified: true } }));
  assert.ok(stone.defenses.resist.includes("slashing") && stone.defenses.resist.includes("fire"));
});

test("defenses: legacy text is understood, explicit lists win, garbage is dropped", () => {
  const k = R.normalize(kirion());
  assert.deepEqual(k.defenses, { resist: ["fire"], vuln: [], immune: [] });
  assert.deepEqual(R.normalize({ ...kirion(), defenses: { resist: [], vuln: [], immune: [] } }).defenses.resist, []);
  assert.deepEqual(R.normalize({ name: "x", defenses: { resist: ["fire", "fire", "healing", 5, "nope"], vuln: "cold", immune: null } }).defenses, { resist: ["fire"], vuln: [], immune: [] });
  assert.deepEqual(R.parseDefenses("Иммунитет к яду; сопротивление огню и холоду, уязвимость к излучению"), { resist: ["cold", "fire"], vuln: ["radiant"], immune: ["poison"] });
  assert.deepEqual(R.parseDefenses("Ядро механизма"), { resist: [], vuln: [], immune: [] });
  const n = R.normalize(k);
  assert.deepEqual(R.normalize(n), n);
});

test("unarmored defense and inspiration", () => {
  const c = R.normalize({ name: "B", abilities: { str: 16, dex: 14, con: 16, int: 8, wis: 10, cha: 10 }, armor: { name: "Без доспеха", base: 10, dexCap: "full", addAbility: "con" } });
  assert.equal(R.compute(c).ac, 15);
  assert.equal(R.normalize({ name: "x", armor: { addAbility: "evil" } }).armor.addAbility, "");
  assert.equal(R.normalize({ name: "x", inspiration: "yes" }).inspiration, true);
  assert.equal(R.normalize({ name: "x" }).inspiration, false);
});

test("misc notes: old single text becomes one note, lists are kept", () => {
  assert.deepEqual(R.normalize({ name: "x", notes: { misc: "Старый текст" } }).notes.misc, [{ id: "nt-misc-legacy", title: "Заметки", subtitle: "", text: "Старый текст" }]);
  assert.deepEqual(R.normalize({ name: "x", notes: { misc: "  " } }).notes.misc, []);
  const list = [{ id: "nt-a", title: "Законы", text: "## Лицензия", collapsed: true }];
  const n = R.normalize({ name: "x", notes: { misc: list } });
  assert.deepEqual(n.notes.misc, list);
  assert.deepEqual(R.normalize(n), n);
});

test("rich text: formatting works and stays escaped", () => {
  const html = rich("## Законы\n**Лицензия**: до *2 круга*\n\n- первое\n- [x] сделано\n1. раз\n> цитата\n---\n==важно== ~~нет~~ __да__");
  for (const part of ['<h5 class="rt-h">Законы</h5>', "<b>Лицензия</b>", "<i>2 круга</i>", "<ul><li>первое</li>", 'rt-todo done', "<ol><li>раз</li></ol>", "<blockquote>цитата</blockquote>", "<hr>", "<mark>важно</mark>", "<s>нет</s>", "<u>да</u>"]) assert.ok(html.includes(part), part);
  const evil = rich('**<img src=x onerror=alert(1)>** "><script>x</script> *<b>*');
  assert.ok(!evil.includes("<img") && !evil.includes("<script") && !evil.includes("<b><b>"));
  assert.equal(rich("5 * 3 * 2"), "<p>5 * 3 * 2</p>");
  assert.equal(rich(""), "");
});

test("history: folding a note is not a change, defenses are", () => {
  const a = R.normalize({ ...kirion(), notes: { ...kirion().notes, misc: [{ id: "nt-a", title: "Мир", text: "т" }] } });
  const b = clone(a);
  b.notes.misc[0].collapsed = true;
  assert.deepEqual(describeChanges(a, b), []);
  b.defenses.resist = ["cold"];
  assert.ok(describeChanges(a, b).some(t => t.includes("Сопротивление") && t.includes("Холод")));
  b.notes.misc[0].text = "новый";
  assert.ok(describeChanges(a, b).some(t => t.startsWith("Прочие заметки: изменено")));
});

test("spells paid with item charges: more charges, more dice", () => {
  const c = R.normalize({ name: "W", items: [{ id: "it-w", name: "Палочка холода", uses: "7", used: 0, breakOn: "20" }], spells: [{ id: "sp-c", name: "Луч", level: 1, cost: "item", itemId: "it-w", charges: 1, maxCharges: 3, upcast: "1d8", damage: [{ dice: "1d8", type: "cold" }] }] });
  const d = R.compute(c);
  assert.equal(R.spellCast(c, d, c.spells[0], null, 0).lines[0].dice, "1d8");
  assert.equal(R.spellCast(c, d, c.spells[0], null, 2).lines[0].dice, "3d8");
  assert.equal(c.items[0].breakOn, 20);
  assert.equal(R.normalize({ name: "x", items: [{ name: "a", breakOn: "" }] }).items[0].breakOn, null);
  assert.equal(R.normalize({ name: "x", items: [{ name: "a" }] }).items[0].breakOn, undefined);
  assert.equal(R.normalize({ name: "x", spells: [{ name: "s", cost: "item", charges: "0", maxCharges: "x" }] }).spells[0].charges, 1);
});

test("notes search finds across sections and tags filter", async () => {
  const { notesList } = await import(P + "tabs.js");
  const c = R.normalize({ name: "N", notes: { patron: [{ id: "a", title: "Голос", text: "лицензия на магию", tags: "закон" }], people: [{ id: "b", title: "Рэй", attitude: "ally", text: "", tags: "должник, порт" }], misc: [{ id: "c", title: "Законы", text: "**Лицензия** до 2 круга" }] } });
  const d = R.compute(c);
  const found = notesList({ c, d, ui: { notesQ: "лиценз", notesSection: "people" } });
  assert.ok(found.includes("Голос") && found.includes("Законы") && !found.includes("Рэй"));
  const tagged = notesList({ c, d, ui: { notesSection: "people", noteTag: "порт" } });
  assert.ok(tagged.includes("Рэй") && tagged.includes("#должник"));
  assert.ok(!notesList({ c, d, ui: { notesSection: "people", peopleAtt: "hostile" } }).includes("Рэй"));
});

test("inventory sorting and prices", async () => {
  const { priceGp, sortItems } = await import(P + "tabs.js");
  assert.equal(priceGp("2000з"), 2000);
  assert.equal(priceGp("25 зм"), 25);
  assert.equal(priceGp("5 см"), 0.5);
  assert.equal(priceGp("1,5 пм"), 15);
  assert.equal(priceGp("3 мм"), 0.03);
  assert.equal(priceGp(""), -1);
  const items = [{ name: "Б", value: "5 зм", rarity: "common" }, { name: "А", value: "2000з", rarity: "rare", equipped: true }, { name: "В", value: "1 пм", rarity: "uncommon" }];
  assert.deepEqual(sortItems(items, "price", false).map(x => x.name), ["А", "В", "Б"]);
  assert.deepEqual(sortItems(items, "recent", false).map(x => x.name), ["В", "А", "Б"]);
  assert.deepEqual(sortItems(items, "name", true).map(x => x.name), ["А", "Б", "В"]);
  assert.deepEqual(sortItems(items, "added", true).map(x => x.name), ["А", "Б", "В"]);
  assert.deepEqual(sortItems(items, "rarity", false).map(x => x.name), ["А", "В", "Б"]);
});

test("library spell bound to an item gets sensible charges", async () => {
  const { toSpell, itemCharges } = await import(P + "library.js");
  const lib = JSON.parse((await import("node:fs")).readFileSync(new URL("../../data/spells-srd.json", import.meta.url), "utf8"));
  const get = n => lib.find(x => x.nameEn === n);
  assert.deepEqual(itemCharges(get("Ray of Frost")), { charges: 1, maxCharges: 3, upcast: "1d8" });
  assert.deepEqual(itemCharges(get("Sleet Storm")), { charges: 2, maxCharges: 2, upcast: "" });
  assert.deepEqual(itemCharges(get("Ice Storm")), { charges: 3, maxCharges: 5, upcast: "1d8" });
  const sp = toSpell(get("Ray of Frost"), { id: "it-w", name: "Палочка холода" });
  assert.equal(sp.cost, "item");
  assert.equal(sp.itemId, "it-w");
  assert.equal(sp.scaling, "none");
  const c = R.normalize({ name: "x", info: { level: 5 }, items: [{ id: "it-w", name: "П", uses: "7" }], spells: [sp] });
  assert.equal(R.spellCast(c, R.compute(c), c.spells[0], null, 2).lines[0].dice, "3d8");
});

test("reorder: subset keeps other items in place and survives a rebase", async () => {
  const { diffPaths, applyPaths } = await import(P + "sync.js");
  const L = ids => ids.map(id => ({ id, name: id }));
  const ids = l => l.map(x => x.id).join("");
  assert.equal(ids(R.reorderSubset(L(["a", "b", "c", "d", "e"]), ["d", "b"])), "adcbe");
  assert.equal(ids(R.reorderSubset(L(["a", "b", "c"]), ["c", "a", "zz"])), "cba");
  const base = { items: L(["a", "b", "c", "d"]) };
  const local = { items: L(["c", "a", "b", "d"]) };
  const remote = { items: [...L(["a", "b", "c", "d"]), { id: "e", name: "new" }] };
  remote.items[3].name = "D2";
  const merged = applyPaths(JSON.parse(JSON.stringify(remote)), diffPaths(base, local));
  assert.equal(ids(merged.items), "cabde");
  assert.equal(merged.items.find(x => x.id === "d").name, "D2");
  const edit = { items: L(["a", "b", "c", "d"]) };
  edit.items[0].name = "A2";
  const remoteOrder = { items: L(["d", "c", "b", "a"]) };
  assert.equal(ids(applyPaths(JSON.parse(JSON.stringify(remoteOrder)), diffPaths(base, edit)).items), "dcba");
});

test("effects: bonuses, AC, speed, resistances and cleaning", () => {
  const base = R.normalize(kirion());
  const c = R.normalize({ ...base, effects: [R.presetEffect("bless"), R.presetEffect("shieldOfFaith"), R.presetEffect("haste"), R.presetEffect("hex"), R.presetEffect("rage")] });
  const d = R.compute(c);
  assert.equal(d.ac, 14 + 2 + 2);
  assert.equal(d.baseAc, 14);
  assert.equal(d.speed, 60);
  assert.ok(d.defenses.resist.includes("slashing") && d.defenses.resist.includes("fire"));
  const atk = R.rollContext(c, "attack");
  assert.deepEqual(atk.bonus.map(b => b.expr), ["1d4"]);
  assert.equal(R.rollContext(c, "check", "int").bonus.length, 0);
  assert.equal(R.rollContext(c, "death").bonus[0].name, "Благословение");
  assert.equal(R.resolveMode("normal", R.rollContext(c, "save", "dex")), "adv");
  assert.equal(R.resolveMode("normal", R.rollContext(c, "save", "wis")), "normal");
  assert.deepEqual(R.effectDamage(c, { weapon: true, ability: "str" }).map(x => x.dice + x.type), ["1d6necrotic", "2"]);
  assert.deepEqual(R.effectDamage(c, { weapon: true, ability: "dex" }).map(x => x.dice + x.type), ["1d6necrotic"]);
  assert.deepEqual(R.effectDamage(c).map(x => x.dice + x.type), ["1d6necrotic"]);
  const dirty = R.normalize({ name: "x", effects: [{ name: "<b>", attack: "abc", ac: "3", adv: ["attack", "evil", "save:dex"], resist: ["fire", "nope"], rounds: "-5", dmgType: "zzz" }, "junk"] }).effects;
  assert.equal(dirty.length, 2);
  assert.equal(dirty[0].attack, "");
  assert.equal(dirty[0].ac, 3);
  assert.deepEqual(dirty[0].adv, ["attack", "save:dex"]);
  assert.deepEqual(dirty[0].resist, ["fire"]);
  assert.equal(dirty[0].rounds, 0);
  assert.equal(dirty[0].dmgType, "");
  const n = R.normalize(c);
  assert.deepEqual(R.normalize(n), n);
  assert.ok(R.effectSummary(c.effects[0]).includes("+1d4 атаки"));
});

test("weapons and armor from items, combat panel sources without duplicates", async () => {
  const { GEAR, gearToItem } = await import(P + "gear.js");
  const { combatSources } = await import(P + "tabs.js");
  const base = R.normalize(kirion());
  const g = name => GEAR.find(x => x.name === name);
  const dagger = { ...gearToItem(g("Кинжал"), R.uid), equipped: true };
  const chain = { ...gearToItem(g("Кольчуга"), R.uid), equipped: true };
  const shield = { ...gearToItem(g("Щит"), R.uid), equipped: true };
  const c = R.normalize({ ...base, items: [...base.items.filter(it => it.type !== "armor"), dagger, chain, shield] });
  const d = R.compute(c);
  assert.equal(d.ac, 16 + 2);
  const w = d.weapons[c.items.find(x => x.name === "Кинжал" && x.atkAbility).id];
  assert.equal(w.hit, 2 + 3);
  assert.equal(w.dmg, "1d4+2");
  const magic = R.weaponStats(c, d, { ...dagger, atkBonus: 1, atkAbility: "str", atkProf: false });
  assert.equal(magic.hit, -1 + 1);
  assert.equal(magic.dmg, "1d4");
  assert.ok(R.spellInCombat(c.spells.find(s => s.name === "Мистический заряд")));
  assert.ok(R.spellInCombat(c.spells.find(s => s.name === "Обморожение")));
  assert.ok(!R.spellInCombat(c.spells.find(s => s.name === "Огненный шар")));
  assert.ok(R.spellInCombat({ ...c.spells.find(s => s.name === "Огненный шар"), combat: "yes" }));
  const src = combatSources(c, d);
  assert.deepEqual(src.dupes.map(a => a.name).sort(), ["Кинжал", "Мистический заряд", "Обморожение"]);
  assert.deepEqual(src.own.map(a => a.name), ["Лёгкий арбалет"]);
  assert.equal(R.normalize({ name: "x", items: [{ name: "a", atkAbility: "evil", acBase: "99", acDex: "x" }] }).items[0].atkAbility, "");
  assert.equal(R.normalize({ name: "x", items: [{ name: "a", acBase: "99" }] }).items[0].acBase, 30);
});

test("coins: pay with change, refuse when short; XP progress; ammo link; accent", () => {
  const coins = { pp: 0, gp: 15, ep: 0, sp: 8, cp: 0 };
  assert.deepEqual(R.payCoins(coins, 3, "sp"), { pp: 0, gp: 15, ep: 0, sp: 5, cp: 0 });
  assert.deepEqual(R.payCoins(coins, 2, "cp"), { pp: 0, gp: 15, ep: 0, sp: 7, cp: 8 });
  assert.equal(R.payCoins(coins, 16, "gp"), null);
  assert.equal(R.coinsTotalCp(R.payCoins(coins, 10, "sp")), R.coinsTotalCp(coins) - 100);
  assert.equal(R.coinsTotalCp(R.payCoins({ pp: 1, gp: 0, ep: 0, sp: 0, cp: 0 }, 1, "cp")), 999);
  const x = R.xpInfo(R.normalize({ name: "x", info: { level: 5, xp: 10250 } }));
  assert.equal(x.next, 14000);
  assert.equal(Math.round(x.pct), 50);
  assert.equal(x.canLevel, false);
  assert.equal(R.xpInfo(R.normalize({ name: "x", info: { level: 5, xp: 23000 } })).levelByXp, 7);
  const c = R.normalize({ name: "x", items: [{ id: "it-b", name: "Арбалетные болты", type: "ammo", qty: 20 }, { id: "it-a", name: "Стрелы", qty: 5 }] });
  assert.equal(R.ammoFor(c, { name: "Лёгкий арбалет" }).id, "it-b");
  assert.equal(R.ammoFor(c, { name: "Длинный лук" }).id, "it-a");
  assert.equal(R.ammoFor(c, { name: "Кинжал" }), null);
  assert.equal(R.ammoFor(c, { name: "Лёгкий арбалет", ammoId: "none" }), null);
  assert.equal(R.ammoFor(c, { name: "Кинжал", ammoId: "it-a" }).id, "it-a");
  assert.equal(R.normalize({ name: "x", accent: "neon" }).accent, "gold");
  assert.equal(R.normalize({ name: "x", accent: "ice" }).accent, "ice");
  const cov = R.normalize({ name: "x", effects: [R.presetEffect("cover5")] });
  assert.equal(R.compute(cov).ac, 15);
  assert.deepEqual(R.rollContext(cov, "save", "dex").bonus.map(b => b.expr), ["5"]);
  assert.equal(R.rollContext(cov, "save", "wis").bonus.length, 0);
});

test("level up plan for a warlock and rolled hit points", async () => {
  const { detectClass, levelUpPlan, CLASSES } = await import(P + "classes.js");
  const c = R.normalize(kirion());
  const cls = detectClass(c);
  assert.equal(cls.key, "warlock");
  const p6 = levelUpPlan(c, cls, 5);
  assert.equal(p6.to, 6);
  assert.equal(p6.asi, false);
  assert.ok(p6.choose.some(x => x.kind === "spell" && x.n === 1));
  assert.ok(p6.notes.some(n => n.includes("покровителя 6")));
  const p7 = levelUpPlan(c, cls, 6);
  assert.ok(p7.choose.some(x => x.kind === "invocation" && x.n === 1));
  const p8 = levelUpPlan(c, cls, 7);
  assert.equal(p8.asi, true);
  const p4 = levelUpPlan(c, cls, 3);
  assert.ok(p4.choose.some(x => x.kind === "cantrip"));
  assert.ok(levelUpPlan(c, cls, 10).choose.some(x => x.text.includes("арканум")));
  assert.equal(levelUpPlan(c, { key: "fighter", ...CLASSES.fighter }, 5).asi, true);
  assert.ok(levelUpPlan(c, { key: "fighter", ...CLASSES.fighter }, 4).notes.some(n => n.includes("Дополнительная атака")));
  assert.equal(detectClass(R.normalize({ name: "x", info: { cls: "Волшебница" } })).key, "wizard");
  assert.equal(detectClass(R.normalize({ name: "x", info: { cls: "Механик" } })), null);
  assert.equal(R.compute(c).hpMax, 43);
  assert.equal(R.compute({ ...c, hp: { ...c.hp, rollAdj: -3 } }).hpMax, 40);
  assert.equal(R.compute({ ...c, info: { ...c.info, level: 6 } }).hpMax, 51);
});
