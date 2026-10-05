const ASI = [4, 8, 12, 16, 19];

export const CLASSES = {
  barbarian: { name: "Варвар", match: /варвар/, die: 12, sub: 3, extra: { 5: "Дополнительная атака: две атаки за действие «Атака»" } },
  bard: { name: "Бард", match: /бард/, die: 8, sub: 3, caster: "full", cantrips: { 1: 2, 4: 3, 10: 4 }, known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22] },
  cleric: { name: "Жрец", match: /жрец|клирик/, die: 8, sub: 1, caster: "full", cantrips: { 1: 3, 4: 4, 10: 5 }, prepared: "wis" },
  druid: { name: "Друид", match: /друид/, die: 8, sub: 2, caster: "full", cantrips: { 1: 2, 4: 3, 10: 4 }, prepared: "wis" },
  fighter: { name: "Воин", match: /воин|боец/, die: 10, sub: 3, asi: [4, 6, 8, 12, 14, 16, 19], extra: { 5: "Дополнительная атака: две атаки за действие «Атака»", 11: "Три атаки за действие «Атака»", 20: "Четыре атаки за действие «Атака»" } },
  monk: { name: "Монах", match: /монах/, die: 8, sub: 3, extra: { 5: "Дополнительная атака: две атаки за действие «Атака»" } },
  paladin: { name: "Паладин", match: /паладин/, die: 10, sub: 3, caster: "half", prepared: "cha", halfPrep: true, extra: { 5: "Дополнительная атака: две атаки за действие «Атака»" } },
  ranger: { name: "Следопыт", match: /следопыт|рейнджер/, die: 10, sub: 3, caster: "half", known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11], extra: { 5: "Дополнительная атака: две атаки за действие «Атака»" } },
  rogue: { name: "Плут", match: /плут|разбойник/, die: 8, sub: 3, asi: [4, 8, 10, 12, 16, 19], extra: {} },
  sorcerer: { name: "Чародей", match: /чародей/, die: 6, sub: 1, caster: "full", cantrips: { 1: 4, 4: 5, 10: 6 }, known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15] },
  warlock: { name: "Колдун", match: /колдун/, die: 8, sub: 1, caster: "pact", cantrips: { 1: 2, 4: 3, 10: 4 }, known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15], invocations: [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8], arcanum: { 11: 6, 13: 7, 15: 8, 17: 9 }, extra: { 3: "Дар договора (гримуар, клинок или цепь)", 6: "Умение покровителя 6 уровня", 10: "Умение покровителя 10 уровня", 14: "Умение покровителя 14 уровня", 20: "Мастер таинств" } },
  wizard: { name: "Волшебник", match: /волшебн|маг(?![а-яё])/, die: 6, sub: 2, caster: "full", cantrips: { 1: 3, 4: 4, 10: 5 }, prepared: "int", book: 2 }
};

export function detectClass(c) {
  const s = String((c.info && c.info.cls) || "").toLowerCase();
  const key = Object.keys(CLASSES).find(k => CLASSES[k].match.test(s));
  return key ? { key, ...CLASSES[key] } : null;
}

export const step = (table, level) => {
  let v = 0;
  for (const [l, n] of Object.entries(table || {})) if (level >= Number(l)) v = n;
  return v;
};

export function levelUpPlan(c, cls, from) {
  const to = from + 1;
  const notes = [];
  const choose = [];
  const asiLevels = (cls && cls.asi) || ASI;
  const asi = asiLevels.includes(to);
  if (cls) {
    const ct = step(cls.cantrips, to) - step(cls.cantrips, from);
    if (ct > 0) choose.push({ kind: "cantrip", n: ct, text: `Новый заговор: +${ct}` });
    if (cls.known) {
      const k = cls.known[to - 1] - cls.known[from - 1];
      if (k > 0) choose.push({ kind: "spell", n: k, text: `Новое известное заклинание: +${k}` });
      choose.push({ kind: "swap", n: 0, text: "Можно заменить одно известное заклинание на другое" });
    }
    if (cls.book) choose.push({ kind: "spell", n: cls.book, text: `В книгу заклинаний: +${cls.book}` });
    if (cls.prepared) notes.push("Число подготовленных заклинаний выросло вместе с уровнем");
    if (cls.invocations) {
      const inv = cls.invocations[to - 1] - cls.invocations[from - 1];
      if (inv > 0) choose.push({ kind: "invocation", n: inv, text: `Новое таинственное воззвание: +${inv}` });
      if (to >= 2) choose.push({ kind: "swap", n: 0, text: "Можно заменить одно воззвание на другое" });
    }
    if (cls.arcanum && cls.arcanum[to]) choose.push({ kind: "spell", n: 1, text: `Таинственный арканум: одно заклинание ${cls.arcanum[to]} круга раз в день` });
    if (cls.sub === to) notes.push(`Выбор подкласса (${cls.name})`);
    if (cls.extra && cls.extra[to]) notes.push(cls.extra[to]);
  }
  if ([5, 11, 17].includes(to)) notes.push("Урон заговоров растёт: сайт посчитает сам");
  const picks = {
    cantrips: cls ? Math.max(0, step(cls.cantrips, to) - step(cls.cantrips, from)) : 0,
    spells: cls ? (cls.known ? Math.max(0, cls.known[to - 1] - cls.known[from - 1]) : cls.book || 0) : 0,
    invocations: cls && cls.invocations ? Math.max(0, cls.invocations[to - 1] - cls.invocations[from - 1]) : 0,
    arcanum: cls && cls.arcanum ? cls.arcanum[to] || 0 : 0,
    swapSpell: !!(cls && cls.known),
    swapInvocation: !!(cls && cls.invocations && to >= 2)
  };
  return { to, asi, notes, picks, choose: choose.filter((x, i, a) => x.kind !== "swap" || a.findIndex(y => y.text === x.text) === i) };
}

const F = (name, description, extra = {}) => ({ name, description, category: "class", source: "class", action: "passive", recharge: "always", uses: "", ...extra });

export const CLASS_FEATURES = {
  warlock: {
    2: [F("Таинственные воззвания", "Ты знаешь таинственные воззвания: особые умения, полученные от покровителя. Их число растёт с уровнем, при повышении уровня одно можно заменить.")],
    3: [F("Дар договора", "Покровитель даёт дар за верную службу: Договор гримуара (Книга теней с тремя заговорами любых классов), Договор клинка (оружие договора) или Договор цепи (особый фамильяр).")],
    11: [F("Таинственный арканум", "Покровитель даёт тайну, которую называют арканумом. Выбери одно заклинание колдуна 6 круга: его можно наложить раз в день без ячейки. На 13, 15 и 17 уровнях появляются арканумы 7, 8 и 9 круга.", { recharge: "long" })],
    20: [F("Мастер таинств", "Раз за длинный отдых можно минуту молить покровителя и восстановить все потраченные ячейки договора.", { action: "special", recharge: "long", uses: "1" })]
  }
};

export const SUBCLASS_FEATURES = {
  fiend: {
    cls: "warlock",
    match: /исчади|fiend/i,
    name: "Исчадие",
    features: {
      1: [F("Благословение Тёмного", "Когда ты опускаешь хиты враждебного существа до 0, получаешь временные хиты, равные модификатору заклинательной характеристики + уровень колдуна (минимум 1).")],
      6: [F("Удача Тёмного", "Когда совершаешь проверку характеристики или спасбросок, можешь добавить к броску d10. Можно решить уже после броска, но до того, как станут известны последствия. Восстанавливается коротким или длинным отдыхом.", { action: "special", recharge: "short", uses: "1" })],
      10: [F("Дьявольская стойкость", "После каждого короткого или длинного отдыха выбери один вид урона: до следующего выбора у тебя к нему сопротивление. Урон магическим или серебряным оружием сопротивление не уменьшает.")],
      14: [F("Бросок через ад", "Когда попадаешь атакой по существу, можешь мгновенно протащить его через нижние планы. Оно исчезает до конца твоего следующего хода, а вернувшись, если это не исчадие, получает 10d10 психического урона от пережитого ужаса. Раз за длинный отдых.", { action: "special", recharge: "long", uses: "1", damage: [{ dice: "10d10", type: "psychic", addMod: false }] })]
    },
    spells: { 1: ["Burning Hands", "Command"], 2: ["Blindness/Deafness", "Scorching Ray"], 3: ["Fireball", "Stinking Cloud"], 4: ["Fire Shield", "Wall of Fire"], 5: ["Flame Strike", "Hallow"] }
  }
};

const I = (key, name, description, req = {}) => ({ key, name, description, ...req });

export const INVOCATIONS = [
  I("agonizing", "Мучительный заряд", "К урону каждого луча Мистического заряда прибавляется модификатор заклинательной характеристики.", { cantrip: "Eldritch Blast" }),
  I("armorShadows", "Доспех теней", "Можешь неограниченно накладывать на себя Доспехи мага без ячейки и материалов."),
  I("ascendantStep", "Шаг вознесения", "Можешь неограниченно накладывать на себя Левитацию без ячейки и материалов.", { level: 9 }),
  I("beastSpeech", "Язык зверей", "Можешь неограниченно накладывать Разговор с животными без ячейки."),
  I("beguiling", "Чарующее влияние", "Получаешь владение навыками Обман и Убеждение."),
  I("bewitching", "Колдовской шёпот", "Раз за длинный отдых можешь наложить Принуждение ячейкой договора.", { level: 7 }),
  I("bookAncient", "Книга древних тайн", "В Книгу теней можно записывать ритуалы любых классов и накладывать их как ритуалы.", { pact: "tome" }),
  I("chainsCarceri", "Цепи Карцери", "Можешь неограниченно накладывать Удержание чудовища на исчадие, небожителя или элементаля без ячейки. Цель, освободившись, неуязвима к этому до твоего длинного отдыха.", { level: 15, pact: "chain" }),
  I("devilsSight", "Взор дьявола", "Видишь в обычной и магической темноте на 120 фт, как при ярком свете."),
  I("dreadfulWord", "Страшное слово", "Раз за длинный отдых можешь наложить Смятение ячейкой договора.", { level: 7 }),
  I("eldritchSight", "Мистическое зрение", "Можешь неограниченно накладывать Обнаружение магии без ячейки."),
  I("eldritchSpear", "Мистическое копьё", "Дистанция Мистического заряда становится 300 фт.", { cantrip: "Eldritch Blast" }),
  I("runeKeeper", "Глаза хранителя рун", "Ты можешь читать любую письменность."),
  I("fiendishVigor", "Дьявольская живучесть", "Можешь неограниченно накладывать на себя Псевдожизнь как заклинание 1 круга без ячейки и материалов."),
  I("twoMinds", "Взгляд двух разумов", "Действием касаешься согласного гуманоида и до конца своего следующего хода видишь его глазами и слышишь его ушами. Каждым следующим действием связь продлевается."),
  I("lifedrinker", "Пьющий жизнь", "Попадание оружием договора наносит дополнительный некротический урон, равный модификатору заклинательной характеристики (минимум 1).", { level: 12, pact: "blade" }),
  I("maskFaces", "Маска многих лиц", "Можешь неограниченно накладывать Маскировку без ячейки."),
  I("myriadForms", "Мастер множества обличий", "Можешь неограниченно накладывать Смену обличья без ячейки.", { level: 15 }),
  I("minionsChaos", "Приспешники хаоса", "Раз за длинный отдых можешь наложить Призыв элементаля ячейкой договора.", { level: 9 }),
  I("mireMind", "Трясина разума", "Раз за длинный отдых можешь наложить Замедление ячейкой договора.", { level: 5 }),
  I("mistyVisions", "Туманные видения", "Можешь неограниченно накладывать Безмолвный образ без ячейки и материалов."),
  I("oneShadows", "Единство с тенями", "В тусклом свете или темноте действием становишься невидимым, пока не сдвинешься или не совершишь действие или реакцию.", { level: 5 }),
  I("otherworldlyLeap", "Потусторонний прыжок", "Можешь неограниченно накладывать на себя Прыжок без ячейки и материалов.", { level: 9 }),
  I("repellingBlast", "Отталкивающий заряд", "Каждый попавший луч Мистического заряда может оттолкнуть существо на 10 фт от тебя по прямой.", { cantrip: "Eldritch Blast" }),
  I("sculptorFlesh", "Ваятель плоти", "Раз за длинный отдых можешь наложить Превращение ячейкой договора.", { level: 7 }),
  I("signIllOmen", "Знак дурного предзнаменования", "Раз за длинный отдых можешь наложить Проклятие ячейкой договора.", { level: 5 }),
  I("thiefFates", "Похититель пяти судеб", "Раз за длинный отдых можешь наложить Порчу ячейкой договора."),
  I("thirstingBlade", "Жаждущий клинок", "Действием Атака можешь атаковать оружием договора дважды.", { level: 5, pact: "blade" }),
  I("distantRealms", "Видения далёких миров", "Можешь неограниченно накладывать Магический глаз без ячейки.", { level: 15 }),
  I("chainMaster", "Голос повелителя цепи", "Можешь телепатически говорить с фамильяром и смотреть его глазами на любом расстоянии в пределах одного плана.", { pact: "chain" }),
  I("whispersGrave", "Шёпот могилы", "Можешь неограниченно накладывать Разговор с мёртвыми без ячейки.", { level: 9 }),
  I("witchSight", "Ведьмин взор", "Видишь истинный облик перевёртышей и существ, скрытых иллюзией или превращением, в пределах 30 фт.", { level: 15 })
];

const PACT_NAMES = { tome: "Договор гримуара", blade: "Договор клинка", chain: "Договор цепи" };

export function pactKind(c) {
  const s = String((c.info && c.info.pactBoon) || "").toLowerCase();
  if (/гримуар|книг|tome/.test(s)) return "tome";
  if (/клин|blade/.test(s)) return "blade";
  if (/цеп|chain/.test(s)) return "chain";
  return "";
}

export function detectSubclass(c, cls) {
  if (!cls) return null;
  const s = `${(c.info && c.info.subclass) || ""} ${(c.info && c.info.patron) || ""}`;
  const key = Object.keys(SUBCLASS_FEATURES).find(k => SUBCLASS_FEATURES[k].cls === cls.key && SUBCLASS_FEATURES[k].match.test(s));
  return key ? { key, ...SUBCLASS_FEATURES[key] } : null;
}

const lower = s => String(s || "").toLowerCase().replace(/ё/g, "е");

export function knowsSpell(c, nameEn, name = "") {
  return (c.spells || []).some(s => (nameEn && lower(s.nameEn) === lower(nameEn)) || (name && lower(s.name) === lower(name)));
}

export function invocationOptions(c, level) {
  const pact = pactKind(c);
  const have = new Set((c.features || []).filter(f => f.category === "invocation").map(f => lower(f.name)));
  return INVOCATIONS.map(x => {
    const why = [];
    if (x.level && level < x.level) why.push(`нужен ${x.level} уровень`);
    if (x.pact && pact !== x.pact) why.push(`нужен ${PACT_NAMES[x.pact].toLowerCase()}`);
    if (x.cantrip && !knowsSpell(c, x.cantrip)) why.push("нужен заговор Мистический заряд");
    return { ...x, have: have.has(lower(x.name)), ok: !why.length, why: why.join(", ") };
  });
}

export function newFeatures(c, cls, level) {
  if (!cls) return [];
  const sub = detectSubclass(c, cls);
  const list = [...((CLASS_FEATURES[cls.key] || {})[level] || []), ...((sub && sub.features[level]) || [])];
  const have = new Set((c.features || []).map(f => lower(f.name)));
  return list.filter(f => !have.has(lower(f.name)));
}

export function learnLevel(c, cls, level, slotTable, pactSlots) {
  if (!cls) return 0;
  if (cls.caster === "pact") return pactSlots(level).level;
  const type = cls.caster === "half" ? "half" : cls.caster === "full" ? "full" : c.casterType;
  return slotTable(type, level).length;
}

export function spellCandidates(lib, c, cls, maxLevel, { cantrips = false } = {}) {
  if (!cls) return [];
  const sub = detectSubclass(c, cls);
  const extra = new Set(sub && sub.spells ? Object.entries(sub.spells).filter(([l]) => Number(l) <= maxLevel).flatMap(([, v]) => v) : []);
  return lib
    .filter(x => (cantrips ? x.level === 0 : x.level >= 1 && x.level <= maxLevel))
    .filter(x => (x.classes || []).includes(cls.key) || extra.has(x.nameEn))
    .filter(x => !knowsSpell(c, x.nameEn, x.name))
    .map(x => ({ ...x, expanded: !(x.classes || []).includes(cls.key) }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "ru"));
}
