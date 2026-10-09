import fs from "node:fs";
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
const root = new URL("../", import.meta.url);
const P = new URL("js/", root).href;
const R = await import(P + "rules.js");
const B = await import(P + "creator-build.js");
const L = await import(P + "library.js");
const C = await import(P + "classes.js");
const read = f => JSON.parse(fs.readFileSync(new URL(f, root), "utf8"));
const inv = C.INVOCATIONS.map(x => ({ key: "inv-" + x.key, group: "invocation", cls: "warlock", sub: "", subEn: "", race: "", subrace: "", level: x.level || 0, name: x.name, nameEn: "", action: "passive", recharge: "always", uses: "", description: x.description }));
const features = [...read("data/features-srd.json"), ...inv];
const spells = read("data/spells-srd.json").map((x, i) => ({ ...x, key: x.nameEn + "#" + i }));
const sp = en => {
  const x = spells.find(s => s.nameEn === en);
  if (!x) throw new Error("spell " + en);
  return x.key;
};
let n = 0;
const ids = (c, tag) => {
  const map = new Map();
  for (const k of ["attacks", "spells", "features", "items"]) for (const x of c[k] || []) map.set(x.id, x.id.split("-")[0] + "-" + tag + "-" + (++n));
  const ref = v => (v && map.has(v) ? map.get(v) : v);
  for (const k of ["attacks", "spells", "features", "items"]) c[k] = (c[k] || []).map(x => ({ ...x, id: map.get(x.id), ...("ammoId" in x ? { ammoId: ref(x.ammoId) } : {}), ...("itemId" in x ? { itemId: ref(x.itemId) } : {}), ...("container" in x ? { container: ref(x.container) } : {}) }));
  return c;
};
const note = (title, text, extra = {}) => ({ id: "nt-" + (++n), title, text, tags: "", collapsed: false, pinned: false, created: 0, ...extra });

const TEMPLATES = [];

{
  const c = B.buildCharacter({
    name: "Гарвен", race: "human", cls: "fighter", level: 3, subclass: "Чемпион", background: "soldier",
    base: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 }, skills: ["perception", "survival"], options: ["style-defense"], alignment: "Законно-добрый", age: "34"
  }, { features, spells });
  c.personality = {
    appearance: "Широкоплечий, с короткой седеющей бородой и шрамом через левую бровь. Щит в зазубринах, но начищен до блеска.",
    traits: "Сначала прикрывает других, потом думает о себе. Шутит, только когда всё уже позади.",
    ideals: "Долг. Кто держит строй, тот держит мир.",
    bonds: "Ищет сослуживцев, пропавших после битвы у Серого брода.",
    flaws: "Не доверяет магам и с трудом выполняет приказы тех, кто не стоял в строю.",
    backstory: "Десять лет в пограничной страже. Ушёл, когда командир сдал крепость без боя, и с тех пор нанимается охранять караваны.",
    allies: "Старый оружейник Хальд в Северных воротах."
  };
  c.notes.quests = [note("Серый брод", "Узнать, кто выжил из отряда «Каменные щиты». Говорят, двоих видели в [[Портовом квартале]].", { status: "active" })];
  c.notes.places = [note("Портовый квартал", "Шумно, тесно, много наёмников. Таверна «Пьяный якорь».", { aliases: "Портовом квартале" })];
  c.accent = "steel";
  TEMPLATES.push({ key: "fighter", icon: "clsFighter", blurb: "Простой в игре: крепкий доспех, меч и щит, Второе дыхание и Всплеск действий.", c: ids(c, "garven") });
}

{
  const c = B.buildCharacter({
    name: "Бельдра", race: "dwarf", subrace: "hill", cls: "cleric", level: 3, subclass: "Домен жизни", background: "acolyte",
    base: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 }, skills: ["medicine", "persuasion"], alignment: "Нейтрально-добрый", age: "96",
    spells: ["Sacred Flame", "Guidance", "Spare the Dying", "Healing Word", "Shield of Faith", "Guiding Bolt", "Aid", "Prayer of Healing", "Sanctuary"].map(sp)
  }, { features, spells });
  for (const en of ["Bless", "Cure Wounds", "Lesser Restoration", "Spiritual Weapon"]) {
    const x = spells.find(s => s.nameEn === en);
    c.spells.push({ ...L.toSpell(x), source: "Домен жизни", prepared: true });
  }
  c.spells = c.spells.map(s => (s.nameEn === "Sanctuary" ? { ...s, prepared: false } : s));
  c.personality = {
    appearance: "Невысокая, коренастая, косы с бронзовыми кольцами. На груди символ Морадина, отполированный тысячами прикосновений.",
    traits: "Лечит всех, даже врагов, если те сложили оружие. Ворчит, когда её благодарят.",
    ideals: "Милосердие. Каждый заслуживает второго шанса.",
    bonds: "Храм в горной деревне Дунхольм, который она поклялась восстановить.",
    flaws: "Упряма как скала: если решила, переубедить почти невозможно.",
    backstory: "Сорок лет служила при храме, пока обвал не похоронил половину деревни. Теперь странствует, собирая пожертвования и помогая всем по пути.",
    allies: "Настоятель Борин, её наставник."
  };
  c.notes.people = [note("Настоятель Борин", "Наставник. Остался в Дунхольме, пишет раз в месяц.", { attitude: "ally" })];
  c.notes.quests = [note("Храм Дунхольма", "Собрать 500 зм на восстановление храма. Собрано: 40 зм.", { status: "active" })];
  c.accent = "copper";
  TEMPLATES.push({ key: "cleric", icon: "clsCleric", blurb: "Лечит, поддерживает отряд, держит удар в кольчуге.", c: ids(c, "beldra") });
}

{
  const c = B.buildCharacter({
    name: "Каэлен Звездочёт", race: "elf", subrace: "high", raceCantrip: sp("Prestidigitation"), cls: "wizard", level: 3, subclass: "Школа Воплощения", background: "sage",
    base: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, skills: ["investigation", "insight"], alignment: "Хаотично-добрый", age: "127",
    spells: ["Fire Bolt", "Mage Hand", "Light", "Magic Missile", "Shield", "Mage Armor", "Sleep", "Misty Step", "Scorching Ray", "Detect Magic", "Find Familiar", "Burning Hands", "Hold Person"].map(sp)
  }, { features, spells });
  const rest = new Set(["Detect Magic", "Find Familiar", "Burning Hands", "Hold Person"]);
  c.spells = c.spells.map(s => (rest.has(s.nameEn) ? { ...s, prepared: false } : s));
  c.personality = {
    appearance: "Высокий, тонкий, серебряные волосы собраны лентой. Пальцы в чернилах, на поясе связка свитков.",
    traits: "Записывает всё подряд. Не может пройти мимо незнакомой руны.",
    ideals: "Знание. Тайна, которую никто не разгадал, это вызов.",
    bonds: "Ищет украденную страницу из книги своего учителя.",
    flaws: "Сначала колдует, потом думает, особенно если видит что-то интересное.",
    backstory: "Сто лет учился в башне Аэрхен. Когда учитель исчез вместе с частью библиотеки, Каэлен впервые вышел за ворота.",
    allies: "Сова-фамильяр Пергамент (появится после ритуала «Поиск фамильяра»)."
  };
  c.notes.clues = [note("Пропавшая страница", "Страница вырвана аккуратно, ножом. На полях знак, похожий на перевёрнутую звезду.", { state: "lead" })];
  c.notes.quests = [note("Учитель Аэрхен", "Найти, куда исчез учитель. Начать с [[Пропавшая страница|пропавшей страницы]].", { status: "active" })];
  c.accent = "ice";
  TEMPLATES.push({ key: "wizard", icon: "clsWizard", blurb: "Огненный снаряд, Щит, Волшебная стрела и толстая книга заклинаний.", c: ids(c, "kaelen") });
}

const out = TEMPLATES.map(t => {
  const c = R.normalize({ ...t.c, archived: false });
  for (const k of ["id", "createdAt", "updatedAt", "updatedBy", "ownerUid", "ownerName", "visibility"]) delete c[k];
  c.hp.current = R.compute(c).hpMax;
  const files = Object.fromEntries(["art", "board", "portrait"].map(k => [k, `assets/templates/${t.key}-${k}.webp`]).filter(([, f]) => fs.existsSync(new URL(f, root))));
  return { key: t.key, icon: t.icon, blurb: t.blurb, ...files, c };
});
fs.writeFileSync(new URL("data/templates.json", root), JSON.stringify(out));
console.log(out.map(t => `${t.c.name}: ${t.c.info.race} ${t.c.info.cls} ${t.c.info.level}, ${t.c.spells.length} закл., ${t.c.features.length} ум., ${t.c.items.length} предм.`).join("\n"));
console.log(fs.statSync(new URL("data/templates.json", root)).size, "bytes");
