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

const step = (table, level) => {
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
  return { to, asi, notes, choose: choose.filter((x, i, a) => x.kind !== "swap" || a.findIndex(y => y.text === x.text) === i) };
}
