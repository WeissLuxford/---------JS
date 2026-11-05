const n = v => Number(v) || 0;

const COIN_CP = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
const STAT_KEYS = ["rolls", "sum", "crit", "fumble", "dmgRolls", "dmgTotal", "taken", "healed", "downs", "casts", "rounds", "combats"];

export function takeSnap(c) {
  const notes = (c && c.notes) || {};
  const st = (c && c.stats) || {};
  const snap = {
    lv: n(c && c.info && c.info.level),
    cp: Object.entries(COIN_CP).reduce((s, [k, m]) => s + n(c && c.coins && c.coins[k]) * m, 0),
    pe: (notes.people || []).length,
    dead: (notes.people || []).filter(p => p.dead).length,
    ans: (notes.questions || []).filter(q => q.status === "answered").length
  };
  for (const k of STAT_KEYS) snap[k] = n(st[k]);
  return snap;
}

export function cleanSnap(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return undefined;
  const out = {};
  for (const k of ["lv", "cp", "pe", "dead", "ans", ...STAT_KEYS]) out[k] = n(x[k]);
  return out;
}

export function sessionEnd(c, ses, live) {
  if (live) return takeSnap(c);
  return ses.snapEnd || null;
}

export function sessionTotals(c, ses, live) {
  const a = ses && ses.snap;
  const b = a && sessionEnd(c, ses, live);
  if (!a || !b) return [];
  const d = k => n(b[k]) - n(a[k]);
  const out = [];
  if (b.lv !== a.lv) out.push({ key: "level", text: `Уровень ${a.lv} → ${b.lv}` });
  const gp = Math.round(d("cp") / 100);
  if (gp) out.push({ key: "money", text: `${gp > 0 ? "+" : "−"}${Math.abs(gp)} зм`, bad: gp < 0 });
  if (d("pe") > 0) out.push({ key: "people", text: `Новых людей: ${d("pe")}` });
  if (d("dead") > 0) out.push({ key: "dead", text: `Погибших: ${d("dead")}`, bad: true });
  if (d("ans") > 0) out.push({ key: "letters", text: `Вскрыто писем: ${d("ans")}` });
  const rolls = d("rolls");
  if (rolls > 0) {
    const avg = Math.round((d("sum") / rolls) * 10) / 10;
    out.push({ key: "rolls", text: `d20: ${rolls}, среднее ${String(avg).replace(".", ",")}` });
  }
  if (d("crit") > 0) out.push({ key: "crit", text: `Критов: ${d("crit")}` });
  if (d("fumble") > 0) out.push({ key: "fumble", text: `Провалов: ${d("fumble")}`, bad: true });
  const dmg = d("dmgTotal");
  if (dmg > 0) {
    const r = d("rounds");
    const per = r > 0 ? `, ${String(Math.round((dmg / r) * 10) / 10).replace(".", ",")} за раунд` : "";
    out.push({ key: "dmg", text: `Урон: ${dmg}${per}` });
  }
  if (d("taken") > 0) out.push({ key: "taken", text: `Получено урона: ${d("taken")}`, bad: true });
  if (d("healed") > 0) out.push({ key: "healed", text: `Исцелено: ${d("healed")}` });
  if (d("downs") > 0) out.push({ key: "downs", text: `Падений: ${d("downs")}`, bad: true });
  if (d("casts") > 0) out.push({ key: "casts", text: `Заклинаний: ${d("casts")}` });
  if (d("combats") > 0) out.push({ key: "combats", text: `Боёв: ${d("combats")}` });
  return out;
}
