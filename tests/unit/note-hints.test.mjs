import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const P = new URL("../../js/", import.meta.url).href;
const R = await import(P + "rules.js");
const N = await import(P + "notes.js");
const H = await import(P + "note-hints.js");

const sample = () => R.normalize({
  name: "Кирион Торндайк",
  spells: [{ id: "s1", name: "Мистический заряд" }],
  notes: {
    people: [{ id: "p1", title: "Халвар Торндайк" }, { id: "p2", title: "Рэй" }],
    places: [{ id: "pl1", title: "Средний город" }],
    sessions: [{ id: "s1", title: "Сессия 1", created: 1, text: "- **20:00** Халвар просил передать письмо.\n- **20:10** Пили с Рэем в порту." }]
  }
});

const names = (c, t, o) => H.findNames(c, t, o).map(h => `${h.name}:${h.guess}`);

test("new names: mid-sentence runs, leading verb dropped, guesses place after preposition", () => {
  const c = sample();
  assert.deepEqual(names(c, "Встретили Лиару Портир во Вратах Балдура."), ["Лиара Портир:people", "Врата Балдура:places"]);
  assert.deepEqual(names(c, "Сильвира Савикас из Кендлкипа обещала помочь."), ["Сильвира Савикас:people", "Кендлкип:places"]);
});

test("new names: sentence start counts only before a verb", () => {
  const c = sample();
  assert.deepEqual(names(c, "Вааз напал в небе."), ["Вааз:people"]);
  assert.deepEqual(names(c, "Потом пошли спать. Купил хлеб."), []);
});

test("new names: quoted titles, known names, spells and adjectives are skipped or handled", () => {
  const c = sample();
  assert.deepEqual(names(c, "Выпили в трактире «Низкий фонарь»."), ["Низкий фонарь:places"]);
  assert.deepEqual(names(c, "Нашли книгу «Секрет Тевиуса Крига»."), ["Секрет Тевиуса Крига:misc"]);
  assert.deepEqual(names(c, "Говорили с Халваром и Рэем в Среднем городе."), []);
  assert.deepEqual(names(c, "Регул сжёг толпу Огненным шаром."), []);
  assert.deepEqual(names(c, "Кирион кинул Мистический заряд."), []);
  assert.deepEqual(names(c, "Пришли к [[Капитан Сорн]] на корабль."), []);
});

test("new names: ignore list by stem key", () => {
  const c = sample();
  const key = H.nameKey("Вратах Балдура");
  assert.deepEqual(names(c, "Снова во Вратах Балдура.", { ignore: [key] }), []);
});

test("coins: sign from verbs or explicit plus and minus, units", () => {
  const f = t => H.findCoins(t).map(h => `${h.sign}*${h.amount}${h.unit}`);
  assert.deepEqual(f("Она дала нам 300 зм за виверну."), ["1*300gp"]);
  assert.deepEqual(f("Купил зелье за 50 зм."), ["-1*50gp"]);
  assert.deepEqual(f("Нашли 30 зм и 12 см."), ["1*30gp", "1*12sp"]);
  assert.deepEqual(f("+5 пм, −2 мм"), ["1*5pp", "-1*2cp"]);
  assert.deepEqual(f("Сундук стоит 1 000 золотых"), ["0*1000gp"]);
  assert.deepEqual(f("Где-то лежат 40 зм."), ["0*40gp"]);
  assert.deepEqual(f("Прошли 30 футов, кинули 3к6."), []);
});

test("deaths: only known living people, negations ignored", () => {
  const c = sample();
  const f = t => H.findDeaths(c, t).map(h => h.title);
  assert.deepEqual(f("Рэй погиб в бою."), ["Рэй"]);
  assert.deepEqual(f("Культисты чуть не убили Рэя."), []);
  assert.deepEqual(f("Халвар жив, хотя его пытались убить."), []);
  c.notes.people[1].dead = true;
  assert.deepEqual(f("Рэй погиб в бою."), []);
});

test("dead flag survives normalize and only as boolean", () => {
  const c = R.normalize({ notes: { people: [{ id: "p", title: "x", dead: "yes" }, { id: "q", title: "y" }] } });
  assert.equal(c.notes.people[0].dead, true);
  assert.equal("dead" in c.notes.people[1], false);
});

test("journal mentions: lines of sessions that name the note, newest first", () => {
  const c = sample();
  c.notes.sessions.push({ id: "s2", title: "Сессия 2", created: 5, text: "- **19:00** Халвар снова ворчал.\n- **19:30** Ничего." });
  const m = N.journalMentions(c, "p1");
  assert.deepEqual(m.map(x => `${x.title} ${x.time}`), ["Сессия 2 19:00", "Сессия 1 20:00"]);
  assert.deepEqual(N.journalMentions(c, "p2").map(x => x.time), ["20:10"]);
});

test("mergeHints keeps newest first and caps the list", () => {
  const a = [{ key: "a" }, { key: "b" }];
  assert.deepEqual(H.mergeHints(a, [{ key: "b" }, { key: "c" }], 3).map(h => h.key), ["b", "c", "a"]);
});

test("dossier: first and last mention, where seen, who is often near", () => {
  const c = R.normalize({
    notes: {
      people: [{ id: "p1", title: "Халвар Торндайк" }, { id: "p2", title: "Рэй" }, { id: "p3", title: "Лиара" }],
      places: [{ id: "l1", title: "Кендлкип" }, { id: "l2", title: "Средний город" }],
      sessions: [
        { id: "s2", title: "Сессия 2", created: 20, text: "- **19:00** Халвар и Рэй в Кендлкипе.\n- **19:30** Халвар один, без места." },
        { id: "s1", title: "Сессия 1", created: 10, text: "- **20:00** Халвар встретил Рэя в Среднем городе.\nХалвар и Лиара поругались." }
      ]
    }
  });
  const d = N.noteDossier(c, "p1");
  assert.equal(d.count, 4);
  assert.equal(d.first.title, "Сессия 1");
  assert.equal(d.first.place.title, "Средний город");
  assert.equal(d.last.title, "Сессия 2");
  assert.equal(d.last.place, null);
  assert.equal(d.seen.place.title, "Кендлкип");
  assert.deepEqual(d.together.map(x => `${x.title}:${x.n}`), ["Рэй:2", "Кендлкип:1", "Лиара:1", "Средний город:1"]);
  assert.equal(N.noteDossier(c, "nobody"), null);
});

const world = () => R.normalize({
  name: "Кирион Торндайк",
  notes: {
    people: [{ id: "p1", title: "Маргарэт Торндайк" }, { id: "p2", title: "Вааз" }, { id: "p3", title: "Лиара Портир", attitude: "ally" }, { id: "p4", title: "капитан Сорн" }, { id: "p5", title: "Сорн" }, { id: "p6", title: "Регул" }],
    places: [{ id: "l1", title: "Кендлкип" }],
    quests: [{ id: "q1", title: "Найти Тевиуса Крига", status: "active" }, { id: "q2", title: "Вернуть шкатулку", status: "done" }]
  }
});

test("typo of a known name asks about the card instead of a new name", () => {
  const c = world();
  const h = H.findNames(c, "Вчера Маргарет передала пирог.");
  assert.deepEqual(h.map(x => `${x.kind}:${x.name}:${x.title || ""}`), ["alias:Маргарет:Маргарэт Торндайк"]);
  assert.deepEqual(H.findNames(c, "Вчера Маргарет передала пирог.", { ignore: [h[0].key] }).map(x => x.kind), ["name"]);
});

test("doubles: one name inside another or a typo, never two different people with one surname", () => {
  const c = world();
  assert.deepEqual(H.findDoubles(c, "people").map(d => `${d.keepTitle}<-${d.dropTitle}`), ["капитан Сорн<-Сорн"]);
  c.notes.people.push({ id: "p7", title: "Халвар Торндайк" });
  assert.equal(H.findDoubles(c, "people").length, 1);
  assert.deepEqual(H.findDoubles(c, "people", [H.findDoubles(c, "people")[0].key]), []);
});

test("attitude: subject acting on us, states, negations, other targets", () => {
  const c = world();
  const f = t => H.findRelations(c, t).map(h => `${h.title}:${h.att}`);
  assert.deepEqual(f("Вааз напал на нас у моста"), ["Вааз:hostile"]);
  assert.deepEqual(f("Вааз враг, точно"), ["Вааз:hostile"]);
  assert.deepEqual(f("Лиара предала нас"), ["Лиара Портир:hostile"]);
  assert.deepEqual(f("Лиара помогла нам"), []);
  assert.deepEqual(f("Регул спас Лиару"), []);
  assert.deepEqual(f("Вааз не предал нас"), []);
  assert.deepEqual(f("Регул помог нам донести тело"), ["Регул:ally"]);
});

test("quests: created from asks and heads, closed by done verbs or the past tense of the goal", () => {
  const c = world();
  const f = t => H.findQuests(c, t).map(h => h.kind === "quest" ? `new:${h.title}` : `${h.status}:${h.title}`);
  assert.deepEqual(f("Лиара попросила нас найти её брата Маттео за 200 зм"), ["new:Найти брата Маттео"]);
  assert.deepEqual(f("Задание: вернуть кольцо в Кендлкип"), ["new:Вернуть кольцо в Кендлкип"]);
  assert.deepEqual(f("Надо поспать"), []);
  assert.deepEqual(f("Надо найти Тевиуса Крига"), []);
  assert.deepEqual(f("Нашли Тевиуса Крига в подвале!"), ["done:Найти Тевиуса Крига"]);
  assert.deepEqual(f("Не нашли Тевиуса Крига"), []);
  assert.deepEqual(f("Провалили задание с Тевиусом"), ["failed:Найти Тевиуса Крига"]);
  assert.deepEqual(f("Шкатулку вернули"), []);
});

test("live hints drop what is already done by hand", () => {
  const c = world();
  const list = [...H.findRelations(c, "Вааз напал на нас"), ...H.findQuests(c, "Нашли Тевиуса Крига")];
  assert.equal(H.liveHints(c, list).length, 2);
  c.notes.people.find(p => p.id === "p2").attitude = "hostile";
  c.notes.quests[0].status = "done";
  assert.equal(H.liveHints(c, list).length, 0);
});

const bag = () => R.normalize({ info: { level: 5, xp: 6500 }, items: [{ id: "i1", name: "Кинжал", qty: 1 }, { id: "i2", name: "Верёвка пеньковая 50 фт", qty: 1 }, { id: "i3", name: "Книга теней", qty: 1 }] });

test("items: library, inventory, generic, quantities and price", () => {
  const c = bag();
  const f = t => H.findItems(c, t).map(h => `${h.mode}:${h.name}:${h.qty}:${h.lib ? "lib" : h.id ? "inv" : "new"}${h.price ? ":" + h.price.amount : ""}`);
  assert.deepEqual(f("Купили зелье лечения за 50 зм."), ["add:Зелье лечения:1:lib:50"]);
  assert.deepEqual(f("Купил два зелья лечения и верёвку."), ["add:Зелье лечения:2:lib", "add:Верёвка пеньковая 50 фт:1:inv"]);
  assert.deepEqual(f("Нашли в сундуке кинжал и странную книгу."), ["add:Кинжал:1:inv", "add:Странная книга:1:new"]);
  assert.deepEqual(f("Продал кинжал за 8 зм."), ["remove:Кинжал:1:inv:8"]);
  assert.deepEqual(f("Продал длинный меч за 8 зм."), []);
  assert.deepEqual(f("Потерял верёвку в реке."), ["remove:Верёвка пеньковая 50 фт:1:inv"]);
  assert.deepEqual(f("Купил коня за 75 зм"), []);
  assert.deepEqual(f("Не нашли ключ."), []);
});

test("items with a price take over the money hint of the same sentence", () => {
  const kinds = H.entryHints(bag(), "Купили зелье лечения за 50 зм.").map(h => h.kind);
  assert.deepEqual(kinds, ["item"]);
  const potion = H.itemFromHint(H.findItems(bag(), "Купили 3 зелья лечения")[0], () => "x");
  assert.equal(potion.qty, 3);
  assert.equal(potion.type, "consumable");
  assert.equal(potion.damage[0].type, "healing");
});

test("experience and level hints", () => {
  const c = bag();
  const f = t => H.findXp(c, t).map(h => (h.kind === "xp" ? `xp:${h.amount}` : `level:${h.target}`));
  assert.deepEqual(f("Получили по 450 опыта за виверну."), ["xp:450"]);
  assert.deepEqual(f("+300 XP"), ["xp:300"]);
  assert.deepEqual(f("Апнулись! Новый уровень."), ["level:0"]);
  assert.deepEqual(f("Получили 5 уровень"), []);
  assert.deepEqual(f("Получили 6 уровень"), ["level:6"]);
  assert.deepEqual(f("Прошли 300 футов."), []);
});

const letters = () => R.normalize({
  notes: {
    people: [{ id: "p1", title: "Вааз" }, { id: "p2", title: "Изабелла Агосто" }],
    places: [{ id: "l1", title: "Элтурель" }],
    questions: [{ id: "q1", title: "Почему письма Изабеллы перестали приходить?", status: "open" }, { id: "q2", title: "Кто убил старого кузнеца?", status: "answered", answer: "Вааз" }, { id: "q3", title: "Что-то", status: "nonsense" }],
    sessions: [{ id: "s1", title: "Сессия 1", created: 5, text: "- **20:00** Письма Изабеллы нашли в сумке курьера.\n- **20:10** Вааз ушёл в Элтурель.\n- **20:20** Поели." }]
  }
});

test("questions: status is open or answered only, answer is text", () => {
  const c = letters();
  assert.deepEqual(c.notes.questions.map(q => q.status), ["open", "answered", ""]);
  assert.equal(c.notes.questions[1].answer, "Вааз");
});

test("a line ending with a question mark offers a sealed letter, once", () => {
  const c = letters();
  const f = t => H.findAsks(c, t).map(h => h.title);
  assert.deepEqual(f("Кто тот усатый, похожий на Римардо?"), ["Кто тот усатый, похожий на Римардо?"]);
  assert.deepEqual(f("Почему письма Изабеллы перестали приходить??"), []);
  assert.deepEqual(f("Что?"), []);
  assert.deepEqual(f("Вааз ушёл. Куда он делся?"), ["Куда он делся?"].filter(t => t.length >= 12));
});

test("clues gather journal lines with the same people and words", () => {
  const c = letters();
  const clues = N.questionClues(c, c.notes.questions[0]);
  assert.deepEqual(clues.map(x => x.time), ["20:00"]);
});

test("an answer-like line offers to open the matching letter", () => {
  const c = letters();
  const f = t => H.findAnswers(c, t).map(h => h.title);
  assert.deepEqual(f("Оказалось, письма Изабеллы перехватывал курьер культа."), ["Почему письма Изабеллы перестали приходить?"]);
  assert.deepEqual(f("Письма Изабеллы снова пришли."), []);
  assert.deepEqual(f("Оказалось, кузнец просто уехал."), []);
});
