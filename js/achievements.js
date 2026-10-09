import { coinsTotalCp } from "./rules.js";

const n = v => Number(v) || 0;
const gp = c => coinsTotalCp(c.coins || {}) / 100;
const notes = (c, k) => (c.notes && Array.isArray(c.notes[k]) ? c.notes[k] : []);
const allNotes = c => Object.values(c.notes || {}).reduce((a, l) => a + (Array.isArray(l) ? l.length : 0), 0);
const conds = c => Object.values(c.conditions || {}).filter(Boolean).length;
const d20 = (x, test) => x.ev === "d20" && test(x.data, x.st);
const ev = (x, name, test = () => true) => x.ev === name && test(x.data || {}, x.st);
const faces = st => st.faces || {};
export const today = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

export const ACH_CATS = [
  ["dice", "Кубы и судьба"],
  ["fight", "Бой"],
  ["life", "Жизнь и смерть"],
  ["magic", "Магия"],
  ["road", "Дорога и отдых"],
  ["wealth", "Добро и золото"],
  ["story", "История героя"],
  ["secret", "Секреты"]
];

export const ACHIEVEMENTS = [
  { key: "firstRoll", cat: "dice", icon: "tw/dice/d20", name: "Жребий брошен", desc: "Брось первый d20", test: x => n(x.st.rolls) >= 1 },
  { key: "rolls100", cat: "dice", icon: "gi/delapouite/rolling-dices", name: "Кубомёт", desc: "100 бросков d20", test: x => n(x.st.rolls) >= 100 },
  { key: "rolls500", cat: "dice", icon: "gi/delapouite/dice-shield", name: "Ветеран стола", desc: "500 бросков d20", test: x => n(x.st.rolls) >= 500 },
  { key: "rolls1000", cat: "dice", icon: "gi/delapouite/dice-fire", name: "Тысяча граней", desc: "1000 бросков d20", test: x => n(x.st.rolls) >= 1000 },
  { key: "rolls5000", cat: "dice", icon: "gi/lorc/crowned-skull", name: "Повелитель костей", desc: "5000 бросков d20", test: x => n(x.st.rolls) >= 5000 },
  { key: "crit1", cat: "dice", icon: "gi/delapouite/dice-twenty-faces-twenty", name: "Благословение небес", desc: "Первая естественная 20", test: x => n(x.st.crit) >= 1 },
  { key: "crit10", cat: "dice", icon: "gi/lorc/crown-coin", name: "Любимец Тиморы", desc: "10 естественных 20", test: x => n(x.st.crit) >= 10 },
  { key: "crit50", cat: "dice", icon: "gi/caro-asercion/tarot-10-wheel-of-fortune", name: "Избранник судьбы", desc: "50 естественных 20", test: x => n(x.st.crit) >= 50 },
  { key: "crit100", cat: "dice", icon: "gi/lorc/clover", name: "Сама удача", desc: "100 естественных 20", test: x => n(x.st.crit) >= 100 },
  { key: "fumble1", cat: "dice", icon: "gi/delapouite/dice-twenty-faces-one", name: "Ой", desc: "Первая естественная 1", test: x => n(x.st.fumble) >= 1 },
  { key: "fumble10", cat: "dice", icon: "gi/lorc/skull-crossed-bones", name: "Проклятые кости", desc: "10 естественных 1", test: x => n(x.st.fumble) >= 10 },
  { key: "fumble50", cat: "dice", icon: "gi/lorc/cursed-star", name: "Немилость Бешабы", desc: "50 естественных 1", test: x => n(x.st.fumble) >= 50 },
  { key: "twin20", cat: "dice", icon: "gi/delapouite/gemini", name: "Дважды избранный", desc: "Две естественные 20 подряд", test: x => n(x.st.run20) >= 2 },
  { key: "triple20", cat: "dice", icon: "gi/delapouite/stars-stack", name: "Невозможное", desc: "Три естественные 20 подряд", test: x => n(x.st.run20) >= 3 },
  { key: "twin1", cat: "dice", icon: "gi/lorc/broken-heart", name: "Двойная беда", desc: "Две естественные 1 подряд", test: x => n(x.st.run1) >= 2 },
  { key: "triple1", cat: "dice", icon: "gi/lorc/triple-skulls", name: "Кости ненавидят меня", desc: "Три естественные 1 подряд", test: x => n(x.st.run1) >= 3 },
  { key: "adv20", cat: "dice", icon: "gi/lorc/sun", name: "Два солнца", desc: "С преимуществом на обоих d20 выпало 20", test: x => d20(x, r => r.a === 20 && r.b === 20) },
  { key: "dis1", cat: "dice", icon: "gi/delapouite/well", name: "Дно колодца", desc: "С помехой на обоих d20 выпала 1", test: x => d20(x, r => r.a === 1 && r.b === 1) },
  { key: "advSaved", cat: "dice", icon: "gi/delapouite/life-buoy", name: "Запасная кость", desc: "Преимущество спасло от единицы: на одном d20 выпала 1, на другом 15 или больше", test: x => d20(x, r => r.mode === "adv" && Math.min(r.a, r.b) === 1 && Math.max(r.a, r.b) >= 15) },
  { key: "disRobbed", cat: "dice", icon: "gi/lorc/broken-ribbon", name: "Отнятая победа", desc: "Помеха отняла 20: на одном d20 выпала 20, а взять пришлось другую", test: x => d20(x, r => r.mode === "dis" && Math.max(r.a, r.b) === 20 && Math.min(r.a, r.b) < 20) },
  { key: "allFaces", cat: "dice", icon: "tw/dice/d12", name: "Полный набор", desc: "Каждая грань d20 выпала хотя бы раз", test: x => Array.from({ length: 20 }, (_, i) => n(faces(x.st)[i + 1])).every(v => v > 0) },
  { key: "hotStreak", cat: "dice", icon: "gi/carl-olsen/flame", name: "В ударе", desc: "5 бросков d20 подряд с 15 и выше", test: x => n(x.st.bestHigh) >= 5 },
  { key: "coldStreak", cat: "dice", icon: "gi/lorc/raining", name: "Чёрная полоса", desc: "5 бросков d20 подряд ниже 10", test: x => n(x.st.bestLow) >= 5 },
  { key: "coldStreak10", cat: "dice", icon: "gi/delapouite/iceberg", name: "Ледниковый период", desc: "10 бросков d20 подряд ниже 10", test: x => n(x.st.bestLow) >= 10 },
  { key: "total30", cat: "dice", icon: "gi/delapouite/mid-summit", name: "Тридцать!", desc: "Итог броска d20 30 или больше", test: x => d20(x, r => r.total >= 30) },
  { key: "total0", cat: "dice", icon: "gi/delapouite/hole-ladder", name: "Ниже плинтуса", desc: "Итог броска d20 0 или меньше", test: x => d20(x, r => r.total <= 0) },
  { key: "luckyNight", cat: "dice", icon: "gi/delapouite/falling-star", name: "Звёздный вечер", desc: "Три естественные 20 за один день", test: x => n(x.st.dayCrit) >= 3 },
  { key: "cursedNight", cat: "dice", icon: "gi/delapouite/moon-bats", name: "Проклятый вечер", desc: "Три естественные 1 за один день", test: x => n(x.st.dayFumble) >= 3 },
  { key: "marathon", cat: "dice", icon: "gi/lorc/run", name: "Марафон", desc: "50 бросков d20 за один день", test: x => n(x.st.dayRolls) >= 50 },
  { key: "lucky", cat: "dice", icon: "gi/delapouite/horseshoe", name: "Счастливчик", desc: "После 100 бросков средний d20 12 или выше", test: x => n(x.st.rolls) >= 100 && n(x.st.sum) / n(x.st.rolls) >= 12 },
  { key: "unlucky", cat: "dice", icon: "gi/lorc/cat", name: "Неудачник", desc: "После 100 бросков средний d20 9 или ниже", test: x => n(x.st.rolls) >= 100 && n(x.st.sum) / n(x.st.rolls) <= 9 },
  { key: "skin", cat: "dice", icon: "gi/delapouite/perspective-dice-six-faces-random", name: "Новые кости", desc: "Выбери другой материал кубиков", test: x => !!x.c.diceSkin && x.c.diceSkin !== "classic" },

  { key: "init20", cat: "fight", icon: "gi/lorc/power-lightning", name: "Быстрее молнии", desc: "Естественная 20 на инициативе", test: x => d20(x, r => r.kind === "init" && r.pick === 20) },
  { key: "init1", cat: "fight", icon: "gi/delapouite/night-sleep", name: "Проспал начало", desc: "Естественная 1 на инициативе", test: x => d20(x, r => r.kind === "init" && r.pick === 1) },
  { key: "atk20", cat: "fight", icon: "gi/lorc/on-target", name: "Точно в цель", desc: "Естественная 20 на атаке", test: x => d20(x, r => r.kind === "attack" && r.pick === 20) },
  { key: "atk1", cat: "fight", icon: "gi/lorc/arrow-dunk", name: "Мимо, совсем мимо", desc: "Естественная 1 на атаке", test: x => d20(x, r => r.kind === "attack" && r.pick === 1) },
  { key: "firstBlood", cat: "fight", icon: "gi/skoll/blood", name: "Первая кровь", desc: "Брось урон в первый раз", test: x => n(x.st.dmgRolls) >= 1 },
  { key: "hit20", cat: "fight", icon: "gi/lorc/hammer-drop", name: "Сокрушительный удар", desc: "20 урона одним броском", test: x => n(x.st.dmgMax) >= 20 },
  { key: "hit50", cat: "fight", icon: "gi/lorc/bright-explosion", name: "Опустошение", desc: "50 урона одним броском", test: x => n(x.st.dmgMax) >= 50 },
  { key: "hit100", cat: "fight", icon: "gi/lorc/dragon-breath", name: "Драконья ярость", desc: "100 урона одним броском", test: x => n(x.st.dmgMax) >= 100 },
  { key: "dmg500", cat: "fight", icon: "gi/lorc/meat-cleaver", name: "Мясник", desc: "Нанеси 500 урона за всё время", test: x => n(x.st.dmgTotal) >= 500 },
  { key: "dmg2000", cat: "fight", icon: "gi/delapouite/dungeon-gate", name: "Гроза подземелий", desc: "Нанеси 2000 урона за всё время", test: x => n(x.st.dmgTotal) >= 2000 },
  { key: "dmg10000", cat: "fight", icon: "gi/delapouite/castle-ruins", name: "Бедствие королевств", desc: "Нанеси 10 000 урона за всё время", test: x => n(x.st.dmgTotal) >= 10000 },
  { key: "critDmg", cat: "fight", icon: "gi/lorc/crossed-slashes", name: "Двойная порция", desc: "Брось урон критического удара", test: x => ev(x, "dmg", d => d.crit) },
  { key: "allMax", cat: "fight", icon: "gi/delapouite/dice-six-faces-six", name: "Максимум!", desc: "Все кости урона (две и больше) выпали на максимум", test: x => ev(x, "dmg", d => d.allMax) },
  { key: "tickle", cat: "fight", icon: "gi/delapouite/amber-mosquito", name: "Комариный укус", desc: "Бросок урона дал ровно 1", test: x => ev(x, "dmg", d => d.dealt === 1) },
  { key: "round10", cat: "fight", icon: "gi/lorc/hourglass", name: "Затяжной бой", desc: "10 раундов за всё время", test: x => n(x.st.rounds) >= 10 },
  { key: "round100", cat: "fight", icon: "gi/skoll/chess-knight", name: "Тактик", desc: "100 раундов за всё время", test: x => n(x.st.rounds) >= 100 },
  { key: "round500", cat: "fight", icon: "gi/delapouite/knight-banner", name: "Полководец", desc: "500 раундов за всё время", test: x => n(x.st.rounds) >= 500 },
  { key: "combat10", cat: "fight", icon: "gi/lorc/sword-smithing", name: "Закалённый в боях", desc: "Заверши 10 боёв", test: x => n(x.st.combats) >= 10 },
  { key: "combat50", cat: "fight", icon: "gi/skoll/rank-3", name: "Ветеран", desc: "Заверши 50 боёв", test: x => n(x.st.combats) >= 50 },
  { key: "manyEffects", cat: "fight", icon: "gi/lorc/magic-swirl", name: "Окутан магией", desc: "Три эффекта одновременно", test: x => (x.c.effects || []).length >= 3 },
  { key: "manyConds", cat: "fight", icon: "gi/delapouite/knocked-out-stars", name: "Всё и сразу", desc: "Три состояния одновременно", test: x => conds(x.c) >= 3 },
  { key: "inspired", cat: "fight", icon: "gi/lorc/lyre", name: "Вдохновлён", desc: "Потрать вдохновение", test: x => n(x.st.insp) >= 1 },

  { key: "scratch", cat: "life", icon: "gi/lorc/triple-scratches", name: "Это просто царапина", desc: "Получи первый урон", test: x => n(x.st.taken) >= 1 },
  { key: "taken100", cat: "life", icon: "gi/delapouite/shield-impact", name: "Живой щит", desc: "Получи 100 урона за всё время", test: x => n(x.st.taken) >= 100 },
  { key: "taken1000", cat: "life", icon: "gi/delapouite/stone-wall", name: "Несокрушимый", desc: "Получи 1000 урона за всё время", test: x => n(x.st.taken) >= 1000 },
  { key: "bigHit", cat: "life", icon: "gi/zeromancer/heart-minus", name: "Чуть не убили", desc: "Потеряй 20 хитов одним ударом", test: x => n(x.st.takenMax) >= 20 },
  { key: "oneHp", cat: "life", icon: "gi/delapouite/life-bar", name: "На волоске", desc: "После удара остался ровно 1 хит", test: x => ev(x, "hp", d => d.action === "dmg" && d.after === 1) },
  { key: "down1", cat: "life", icon: "gi/lorc/heavy-fall", name: "Пал в бою", desc: "Упади до 0 хитов", test: x => n(x.st.downs) >= 1 },
  { key: "down5", cat: "life", icon: "gi/lorc/grim-reaper", name: "Частый гость у смерти", desc: "Упади до 0 хитов 5 раз", test: x => n(x.st.downs) >= 5 },
  { key: "down20", cat: "life", icon: "gi/delapouite/skeletal-hand", name: "Смерть машет рукой", desc: "Упади до 0 хитов 20 раз", test: x => n(x.st.downs) >= 20 },
  { key: "stable", cat: "life", icon: "gi/delapouite/heart-beats", name: "Не сегодня", desc: "Стабилизируйся спасбросками от смерти", test: x => n(x.st.stabilized) >= 1 },
  { key: "phoenix", cat: "life", icon: "gi/lorc/fire-dash", name: "Феникс", desc: "Естественная 20 на спасброске от смерти", test: x => n(x.st.phoenix) >= 1 },
  { key: "oneFoot", cat: "life", icon: "gi/skoll/hasty-grave", name: "Одной ногой в могиле", desc: "Выкарабкайся, когда уже два провала", test: x => ev(x, "death", d => (d.outcome === "stable" || d.outcome === "up") && d.failBefore >= 2) },
  { key: "save20", cat: "life", icon: "gi/lorc/angel-wings", name: "Спасён судьбой", desc: "Естественная 20 на спасброске", test: x => d20(x, r => r.kind === "save" && r.pick === 20) },
  { key: "healed100", cat: "life", icon: "gi/zeromancer/heart-plus", name: "Живучий", desc: "Восстанови 100 хитов за всё время", test: x => n(x.st.healed) >= 100 },
  { key: "healed1000", cat: "life", icon: "gi/lorc/ankh", name: "Бессмертный", desc: "Восстанови 1000 хитов за всё время", test: x => n(x.st.healed) >= 1000 },
  { key: "temp", cat: "life", icon: "tw/hp/temp", name: "Ещё немного", desc: "Получи временные хиты", test: x => ev(x, "hp", d => d.action === "temp" || d.tempAfter > d.tempBefore) },
  { key: "hd", cat: "life", icon: "gi/delapouite/lungs", name: "Второе дыхание", desc: "Потрать кость хитов", test: x => n(x.st.hd) >= 1 },
  { key: "exh5", cat: "life", icon: "gi/delapouite/half-body-crawling", name: "На последнем издыхании", desc: "Истощение 5", test: x => n(x.c.exhaustion) >= 5 },

  { key: "cast1", cat: "magic", icon: "gi/lorc/fairy-wand", name: "Первые чары", desc: "Сотвори заклинание", test: x => n(x.st.casts) >= 1 },
  { key: "cast50", cat: "magic", icon: "gi/lorc/pointy-hat", name: "Чародей", desc: "50 заклинаний", test: x => n(x.st.casts) >= 50 },
  { key: "cast250", cat: "magic", icon: "gi/lorc/wizard-staff", name: "Архимаг", desc: "250 заклинаний", test: x => n(x.st.casts) >= 250 },
  { key: "cantrip100", cat: "magic", icon: "gi/lorc/magic-palm", name: "Заговорщик", desc: "100 заговоров", test: x => n(x.st.cantrips) >= 100 },
  { key: "high5", cat: "magic", icon: "gi/skoll/pentacle", name: "Сила высших кругов", desc: "Сотвори заклинание 5 круга или выше", test: x => n(x.st.maxCast) >= 5 },
  { key: "high9", cat: "magic", icon: "gi/lorc/sun-radiations", name: "Сила богов", desc: "Сотвори заклинание 9 круга", test: x => n(x.st.maxCast) >= 9 },
  { key: "upcast", cat: "magic", icon: "gi/sbed/level-four-advanced", name: "Сверх меры", desc: "Сотвори заклинание ячейкой выше его круга", test: x => ev(x, "cast", d => d.slot > d.level && d.level > 0) },
  { key: "noSlots", cat: "magic", icon: "gi/lorc/match-tip", name: "До последней искры", desc: "Потрать все ячейки заклинаний", test: x => ev(x, "cast", d => d.slotsLeft === 0) },
  { key: "concLost", cat: "magic", icon: "gi/delapouite/brain-leak", name: "Мысли путаются", desc: "Потеряй концентрацию", test: x => n(x.st.concLost) >= 1 },
  { key: "charges", cat: "magic", icon: "gi/lorc/crystal-wand", name: "Палочка пуста", desc: "Потрать последний заряд предмета", test: x => n(x.st.emptied) >= 1 },
  { key: "broken", cat: "magic", icon: "gi/lorc/stick-splitting", name: "Треснувший жезл", desc: "Предмет разрушился после последнего заряда", test: x => n(x.st.broken) >= 1 },
  { key: "spells20", cat: "magic", icon: "gi/delapouite/spell-book", name: "Книга заклинаний", desc: "20 заклинаний в листе", test: x => (x.c.spells || []).length >= 20 },
  { key: "spells50", cat: "magic", icon: "gi/delapouite/bookshelf", name: "Библиотекарь", desc: "50 заклинаний в листе", test: x => (x.c.spells || []).length >= 50 },

  { key: "shortRest", cat: "road", icon: "gi/delapouite/camping-tent", name: "Привал", desc: "Короткий отдых", test: x => n(x.st.shortRests) >= 1 },
  { key: "longRest", cat: "road", icon: "gi/lorc/campfire", name: "Ночь у костра", desc: "Длинный отдых", test: x => n(x.st.longRests) >= 1 },
  { key: "longRest10", cat: "road", icon: "gi/lorc/walking-boot", name: "Бывалый путник", desc: "10 длинных отдыхов", test: x => n(x.st.longRests) >= 10 },
  { key: "longRest50", cat: "road", icon: "gi/delapouite/mountain-road", name: "Тысяча дорог", desc: "50 длинных отдыхов", test: x => n(x.st.longRests) >= 50 },
  { key: "rough", cat: "road", icon: "gi/lorc/moon-claws", name: "Тяжёлая ночь", desc: "Длинный отдых после падения до 0 хитов в тот же день", test: x => ev(x, "rest", d => d.long) && x.st.downDay === today() },
  { key: "lvl2", cat: "road", icon: "gi/lorc/boot-prints", name: "Первые шаги", desc: "Достигни 2 уровня", test: x => x.d.level >= 2 },
  { key: "lvl5", cat: "road", icon: "gi/delapouite/village", name: "Герой округи", desc: "Достигни 5 уровня", test: x => x.d.level >= 5 },
  { key: "lvl11", cat: "road", icon: "gi/delapouite/castle", name: "Владыка королевства", desc: "Достигни 11 уровня", test: x => x.d.level >= 11 },
  { key: "lvl17", cat: "road", icon: "tw/entity/world", name: "Повелитель миров", desc: "Достигни 17 уровня", test: x => x.d.level >= 17 },
  { key: "lvl20", cat: "road", icon: "gi/lorc/laurel-crown", name: "Легенда", desc: "Достигни 20 уровня", test: x => x.d.level >= 20 },
  { key: "levelUp", cat: "road", icon: "gi/delapouite/upgrade", name: "Сильнее, чем вчера", desc: "Повысь уровень на сайте", test: x => n(x.st.levelUps) >= 1 },

  { key: "gp100", cat: "wealth", icon: "gi/delapouite/two-coins", name: "Карман звенит", desc: "100 золотых в кошельке", test: x => gp(x.c) >= 100 },
  { key: "gp1000", cat: "wealth", icon: "gi/delapouite/coins", name: "Богач", desc: "1000 золотых в кошельке", test: x => gp(x.c) >= 1000 },
  { key: "gp10000", cat: "wealth", icon: "gi/skoll/open-treasure-chest", name: "Казна дракона", desc: "10 000 золотых в кошельке", test: x => gp(x.c) >= 10000 },
  { key: "spender", cat: "wealth", icon: "gi/delapouite/take-my-money", name: "Транжира", desc: "Заплати 100 золотых за раз", test: x => ev(x, "pay", d => d.gp >= 100) },
  { key: "spent1000", cat: "wealth", icon: "gi/delapouite/shop", name: "Лучший покупатель", desc: "Потрать 1000 золотых за всё время", test: x => n(x.st.paidGp) >= 1000 },
  { key: "broke", cat: "wealth", icon: "gi/delapouite/pay-money", name: "Без гроша", desc: "Отдай последнюю монету", test: x => ev(x, "pay", () => gp(x.c) === 0) },
  { key: "items50", cat: "wealth", icon: "gi/lorc/swap-bag", name: "Барахольщик", desc: "50 предметов в снаряжении", test: x => (x.c.items || []).length >= 50 },
  { key: "mule", cat: "wealth", icon: "gi/skoll/donkey", name: "Вьючный мул", desc: "Неси больше, чем можешь", test: x => n(x.d.weight) > n(x.d.carry) && n(x.d.carry) > 0 },
  { key: "attuned3", cat: "wealth", icon: "gi/lorc/linked-rings", name: "Настроенный", desc: "Три настроенных предмета", test: x => n(x.d.attuned) >= 3 },
  { key: "legendary", cat: "wealth", icon: "gi/lorc/sword-in-stone", name: "Легендарная находка", desc: "Легендарный или артефактный предмет в снаряжении", test: x => (x.c.items || []).some(it => it.rarity === "legendary" || it.rarity === "artifact") },

  { key: "notes10", cat: "story", icon: "gi/lorc/quill-ink", name: "Летописец", desc: "10 заметок", test: x => allNotes(x.c) >= 10 },
  { key: "notes50", cat: "story", icon: "gi/delapouite/classical-knowledge", name: "Хранитель знаний", desc: "50 заметок", test: x => allNotes(x.c) >= 50 },
  { key: "people10", cat: "story", icon: "gi/lorc/beer-stein", name: "Душа компании", desc: "10 знакомых в заметках", test: x => notes(x.c, "people").length >= 10 },
  { key: "places10", cat: "story", icon: "gi/lorc/treasure-map", name: "Картограф", desc: "10 мест в заметках", test: x => notes(x.c, "places").length >= 10 },
  { key: "quest1", cat: "story", icon: "gi/delapouite/check-mark", name: "Задание выполнено", desc: "Отметь задание выполненным", test: x => notes(x.c, "quests").some(q => q.status === "done") },
  { key: "quest10", cat: "story", icon: "gi/delapouite/trumpet-flag", name: "Герой молвы", desc: "10 выполненных заданий", test: x => notes(x.c, "quests").filter(q => q.status === "done").length >= 10 },
  { key: "questFail", cat: "story", icon: "gi/lorc/burning-book", name: "Не всё получается", desc: "Проваленное задание", test: x => notes(x.c, "quests").some(q => q.status === "failed") },
  { key: "clue", cat: "story", icon: "gi/lorc/magnifying-glass", name: "Сыщик", desc: "Подтверждённая улика", test: x => notes(x.c, "clues").some(q => q.state === "confirmed") },
  { key: "sessions5", cat: "story", icon: "gi/delapouite/candles", name: "Пять вечеров", desc: "5 записей в журнале сессий", test: x => notes(x.c, "sessions").length >= 5 },
  { key: "sessions25", cat: "story", icon: "gi/delapouite/drakkar-dragon", name: "Сага", desc: "25 записей в журнале сессий", test: x => notes(x.c, "sessions").length >= 25 },
  { key: "portrait", cat: "story", icon: "gi/lorc/visored-helm", name: "Лицо героя", desc: "Портрет в листе", test: x => !!x.c.portrait },
  { key: "board", cat: "story", icon: "gi/delapouite/wood-frame", name: "Доска героя", desc: "Загрузи доску персонажа", test: x => n(x.c.boardAt) > 0 },
  { key: "style", cat: "story", icon: "gi/delapouite/palette", name: "Свой стиль", desc: "Выбери цвет листа", test: x => !!x.c.accent && x.c.accent !== "gold" },
  { key: "ideal", cat: "story", icon: "gi/lorc/templar-heart", name: "Кредо", desc: "Заполни идеалы, привязанности и слабости", test: x => ["ideals", "bonds", "flaws"].every(k => String((x.c.personality || {})[k] || "").trim()) },

  { key: "deathCheat", cat: "secret", secret: true, icon: "gi/skoll/raise-zombie", name: "Вернулся с того света", desc: "Персонаж погиб, а потом снова встал на ноги", test: x => n(x.st.revived) >= 1 },
  { key: "died", cat: "secret", secret: true, icon: "gi/lorc/tombstone", name: "Конец пути", desc: "Персонаж погиб", test: x => n(x.st.deaths) >= 1 },
  { key: "face7", cat: "secret", secret: true, icon: "gi/aussiesim/card-7-spades", name: "Семь удач", desc: "Семёрка выпала на d20 77 раз", test: x => n(faces(x.st)[7]) >= 77 },
  { key: "zeroAvg", cat: "secret", secret: true, icon: "gi/delapouite/yin-yang", name: "Идеальный баланс", desc: "Ровно 10,5 в среднем после 200 бросков", test: x => n(x.st.rolls) >= 200 && n(x.st.sum) * 2 === n(x.st.rolls) * 21 },
  { key: "midnight", cat: "secret", secret: true, icon: "gi/lorc/owl", name: "Полуночник", desc: "Брось d20 после полуночи", test: x => ev(x, "d20") && new Date().getHours() < 4 },
  { key: "nat20death", cat: "secret", secret: true, icon: "gi/lorc/life-in-the-balance", name: "Не время умирать", desc: "Естественная 20 на спасброске от смерти с двумя провалами", test: x => ev(x, "death", d => d.outcome === "up" && d.failBefore >= 2) },
  { key: "trophies25", cat: "secret", secret: true, icon: "gi/delapouite/ribbon-medal", name: "Охотник за трофеями", desc: "Получи 25 достижений", test: x => x.count >= 25 },
  { key: "trophies75", cat: "secret", secret: true, icon: "gi/delapouite/diamond-trophy", name: "Совершенство", desc: "Получи 75 достижений", test: x => x.count >= 75 }
];

export const DICE_SKINS = [
  { key: "classic", theme: "default", name: "Классика", tint: true },
  { key: "smooth", theme: "smooth", name: "Гладкие", tint: true },
  { key: "gem", theme: "gemstone", name: "Самоцвет", tint: true },
  { key: "rock", theme: "rock", name: "Камень", color: "#b7aca1" },
  { key: "rust", theme: "rust", name: "Ржавое железо", color: "#aa4f4a", unlock: "down5" },
  { key: "wood", theme: "wooden", name: "Дерево" },
  { key: "patina", theme: "blueGreenMetal", name: "Патина" },
  { key: "marble", theme: "gemstoneMarble", name: "Мрамор", unlock: "crit10" },
  { key: "rainbow", theme: "diceOfRolling", name: "Радуга", unlock: "trophies25" }
];

export function skinFor(key) {
  return DICE_SKINS.find(s => s.key === key) || DICE_SKINS[0];
}
