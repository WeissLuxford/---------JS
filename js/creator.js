import { ABILITIES, SKILLS, SCHOOLS, ALIGNMENTS, DAMAGE, compute, fmt, normalize, slotTable, pactSlots } from "./rules.js";
import { icon } from "./icons.js";
import { esc, openModal, toast, rich } from "./ui.js";
import { CLASSES, step as tableStep, learnLevel, spellCandidates, invocationOptions } from "./classes.js";
import { loadFeatures, loadSpells } from "./library.js";
import { RACES, BACKGROUNDS, CLASS_START, DRAGONS, ABILITY_KEYS, STANDARD_ARRAY, POINT_COST, POINT_BUDGET, raceAsi, pointsSpent, suggestArray, roll4d6, asiLevels } from "./creator-data.js";
import { buildCharacter, optionChildren, classFeaturesUpTo } from "./creator-build.js";

const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || k;
const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || k;
const skName = k => (SKILLS.find(s => s.key === k) || {}).name || k;
const lower = s => String(s || "").toLowerCase().replace(/ё/g, "е");
const mod = v => Math.floor((v - 10) / 2);

export function creatorCounts(st) {
  const t = CLASSES[st.cls];
  const s = CLASS_START[st.cls];
  const lvl = Math.max(1, Math.min(20, Number(st.level) || 1));
  if (!t) return { cantrips: 0, spells: 0, invocations: 0, arcanum: [], expertise: 0, asi: 0, skills: 0 };
  const cantrips = tableStep(t.cantrips, lvl);
  const spells = t.known ? t.known[lvl - 1] : t.book ? 6 + 2 * (lvl - 1) : 0;
  const invocations = t.invocations ? t.invocations[lvl - 1] : 0;
  const arcanum = t.arcanum ? Object.entries(t.arcanum).filter(([l]) => Number(l) <= lvl).map(([, v]) => v) : [];
  const expertise = st.cls === "rogue" ? (lvl >= 6 ? 4 : 2) : st.cls === "bard" ? (lvl >= 10 ? 4 : lvl >= 3 ? 2 : 0) : 0;
  return { cantrips, spells, invocations, arcanum, expertise, asi: asiLevels(st.cls, lvl, CLASSES), skills: s ? s.skills : 0 };
}

export function baseScores(st) {
  const out = {};
  for (const k of ABILITY_KEYS) {
    if (st.method === "standard") out[k] = st.assign[k] >= 0 ? STANDARD_ARRAY[st.assign[k]] : null;
    else if (st.method === "roll") out[k] = st.rollAssign[k] >= 0 && st.rolls[st.rollAssign[k]] ? st.rolls[st.rollAssign[k]].total : null;
    else if (st.method === "point") out[k] = st.points[k];
    else out[k] = st.manual[k];
  }
  return out;
}

function probeChar(st) {
  return normalize({ name: "x", info: { cls: (CLASSES[st.cls] || {}).name || "", subclass: st.subclass, level: st.level } });
}

export function creatorChoices(st) {
  const opts = {};
  for (const [k, set] of Object.entries(st.options || {})) opts[k] = [...set];
  return {
    name: st.name, race: st.race, subrace: st.subrace, plusTwo: st.plusTwo, dragon: st.dragon, cls: st.cls, level: st.level, subclass: st.subclass,
    background: st.background, bgName: st.bgName, bgSkills: st.bgSkills, base: baseScores(st), bonus: st.bonus, skills: st.skills, raceSkills: st.raceSkills,
    expertise: st.expertise, options: Object.values(opts).flat(), spells: [...st.spells], raceCantrip: st.raceCantrip, invocations: st.invList || [],
    alignment: st.alignment, age: st.age, equipment: st.equipment
  };
}

function freshState() {
  const zeros = Object.fromEntries(ABILITY_KEYS.map(k => [k, 0]));
  return {
    step: 0, name: "", race: "", subrace: "", plusTwo: [], dragon: "", raceCantrip: "", cls: "", level: 1, subclass: "",
    background: "", bgName: "", bgSkills: [], method: "standard", assign: Object.fromEntries(ABILITY_KEYS.map(k => [k, -1])), rolls: [], rollAssign: Object.fromEntries(ABILITY_KEYS.map(k => [k, -1])),
    points: Object.fromEntries(ABILITY_KEYS.map(k => [k, 8])), manual: Object.fromEntries(ABILITY_KEYS.map(k => [k, 10])), bonus: { ...zeros },
    skills: [], raceSkills: [], expertise: [], options: {}, spells: new Set(), inv: new Set(), invList: [], alignment: "", age: "", equipment: true, q: {}, open: ""
  };
}

export async function openCreator({ onCreate, onBlank }) {
  const m = openModal({ title: "Создание персонажа", wide: true, cls: "creator", body: `<div class="loading small">${icon("hourglass")} Готовлю расы, классы и заклинания...</div>` });
  let features = [];
  let spells = [];
  try {
    [features, spells] = await Promise.all([loadFeatures(), loadSpells()]);
  } catch {
    m.body.innerHTML = `<p class="empty">Не удалось загрузить библиотеки. Проверь интернет или создай пустой лист и заполни сам.</p><div class="form-actions"><button class="btn gold" data-blank>Пустой лист</button></div>`;
    m.body.querySelector("[data-blank]").onclick = () => {
      m.close();
      onBlank();
    };
    return;
  }
  const st = freshState();
  const race = () => RACES[st.race] || null;
  const sub = () => (race() && race().subraces ? race().subraces[st.subrace] || null : null);
  const table = () => CLASSES[st.cls] || null;
  const start = () => CLASS_START[st.cls] || null;
  const bg = () => BACKGROUNDS[st.background] || null;
  const counts = () => creatorCounts(st);
  const needsSub = () => table() && table().sub <= st.level;
  const subOptions = () => [...new Set(features.filter(x => x.group === "class" && x.cls === st.cls && x.sub).map(x => x.sub))];
  const granted = () => {
    const out = new Map();
    for (const k of (race() && race().skills) || []) out.set(k, race().name);
    for (const k of (bg() && bg().skills) || []) out.set(k, "предыстория");
    return out;
  };
  const choiceGroups = () => (table() ? optionChildren(features, probeChar(st), st.cls, st.level) : []);
  const invPick = () => {
    const probe = normalize({ name: "x", info: { pactBoon: (features.find(x => [...(st.options.boon || [])].includes(x.key)) || {}).name || "" }, spells: [...st.spells].map(k => spells.find(s => s.key === k)).filter(Boolean).map(s => ({ name: s.name, nameEn: s.nameEn, level: s.level })) });
    return invocationOptions(probe, st.level);
  };
  const spellNeeds = () => {
    const c = counts();
    return [c.cantrips ? ["cantrips", "Заговоры", c.cantrips] : null, c.spells ? ["spells", table() && table().book ? "Заклинания в книге" : "Заклинания", c.spells] : null, ...c.arcanum.map((lvl, i) => [`arc${lvl}`, `Таинственный арканум ${lvl} круга`, 1, i])].filter(Boolean);
  };
  const spellPool = key => {
    const probe = probeChar(st);
    const cls = table() ? { key: st.cls, ...table() } : null;
    if (!cls) return [];
    if (key === "cantrips") return spellCandidates(spells, probe, cls, 0, { cantrips: true });
    if (key.startsWith("arc")) return spells.filter(s => s.level === Number(key.slice(3)) && (s.classes || []).includes(st.cls));
    return spellCandidates(spells, probe, cls, learnLevel(probe, cls, st.level, slotTable, pactSlots));
  };
  const pickedIn = key => [...st.spells].filter(k => spellPool(key).some(s => s.key === k));
  const isCaster = () => spellNeeds().length > 0;
  const steps = [
    { id: "race", title: "Раса", ic: "gi/delapouite/elf-ear", done: () => !!race() && (!race().subraces || !!sub()) && (!race().dragon || !!st.dragon) && (!race().plusTwo || st.plusTwo.length === 2) && (!(sub() && sub().cantrip) || !!st.raceCantrip) },
    { id: "class", title: "Класс", ic: "gi/delapouite/sword-altar", done: () => !!table() && (!needsSub() || !!String(st.subclass).trim()) },
    { id: "bg", title: "Предыстория", ic: "gi/lorc/scroll-unfurled", done: () => !!bg() && (!bg().anySkills || st.bgSkills.length === bg().anySkills) },
    { id: "abil", title: "Характеристики", ic: "gi/delapouite/stars-stack", done: () => ABILITY_KEYS.every(k => Number.isFinite(baseScores(st)[k])) && (st.method !== "point" || pointsSpent(st.points) <= POINT_BUDGET) },
    { id: "skills", title: "Навыки", ic: "tw/attribute/skillcheck", done: () => st.skills.length === counts().skills && st.raceSkills.length === ((race() && race().anySkills) || 0) && st.expertise.length === counts().expertise },
    { id: "spells", title: "Заклинания", ic: "gi/delapouite/spell-book", show: isCaster, done: () => spellNeeds().every(([k, , n]) => pickedIn(k).length === n) },
    { id: "feats", title: "Умения", ic: "gi/lorc/book-aura", done: () => choiceGroups().every(g => (st.options[g.key] || new Set()).size === g.max) && st.inv.size === counts().invocations },
    { id: "final", title: "Итог", ic: "gi/delapouite/checklist", done: () => true }
  ];
  const visible = () => steps.filter(s => !s.show || s.show());
  const cur = () => visible()[Math.min(st.step, visible().length - 1)];
  const card = (on, attr, ic, title, sub2, extra = "") => `<button class="cr-card ${on ? "on" : ""}" ${attr} aria-pressed="${on ? "true" : "false"}"><span class="cr-ic">${icon(ic)}</span><span class="cr-t"><b>${esc(title)}</b><small>${esc(sub2)}</small>${extra}</span></button>`;
  const asiText = a => Object.entries(a).filter(([, v]) => v).map(([k, v]) => `${abShort(k)} +${v}`).join(", ");
  const chip = (on, attr, label, disabled = false, note = "") => `<button class="chip toggle ${on ? "on" : ""}" ${attr} ${disabled ? "disabled" : ""} aria-pressed="${on ? "true" : "false"}">${esc(label)}${note ? `<small>${esc(note)}</small>` : ""}</button>`;

  const raceStep = () => {
    const r = race();
    const traits = r ? features.filter(f => f.group === "race" && f.race === r.name && (!f.subrace || (sub() && f.subrace === sub().name))) : [];
    const cantrips = sub() && sub().cantrip ? spells.filter(s => s.level === 0 && (s.classes || []).includes(sub().cantrip)) : [];
    return `<div class="cr-cards">${Object.entries(RACES).map(([k, x]) => card(st.race === k, `data-race="${k}"`, x.icon, x.name, asiText(x.asi) + (x.plusTwo ? ", +1 к двум другим" : ""))).join("")}</div>
      ${r ? `<section class="cr-detail"><h3>${esc(r.name)}</h3><p>${esc(r.blurb)}</p>
        <ul class="cr-facts"><li>Скорость ${r.speed} фт${r.size ? `, размер ${esc(r.size.toLowerCase())}` : ""}</li>${r.dark ? `<li>Тёмное зрение ${r.dark} фт</li>` : ""}<li>Языки: ${esc(r.langs)}</li>${(r.skills || []).length ? `<li>Навык: ${r.skills.map(skName).join(", ")}</li>` : ""}${r.resist ? `<li>Сопротивление: ${r.resist.map(t => DAMAGE[t].name.toLowerCase()).join(", ")}</li>` : ""}</ul>
        ${r.subraces ? `<p class="cr-h">Подраса</p><div class="chips">${Object.entries(r.subraces).map(([k, s]) => chip(st.subrace === k, `data-subrace="${k}"`, s.name, false, s.blurb)).join("")}</div>` : ""}
        ${r.dragon ? `<p class="cr-h">Драконий предок</p><div class="chips">${Object.entries(DRAGONS).map(([k, d]) => chip(st.dragon === k, `data-dragon="${k}"`, d.name, false, DAMAGE[d.type].name.toLowerCase())).join("")}</div>` : ""}
        ${r.plusTwo ? `<p class="cr-h">+1 к двум характеристикам (кроме Харизмы): ${st.plusTwo.length} из 2</p><div class="chips">${ABILITY_KEYS.filter(k => k !== "cha").map(k => chip(st.plusTwo.includes(k), `data-plus="${k}"`, abName(k))).join("")}</div>` : ""}
        ${cantrips.length ? `<label class="fld cr-sel"><span>Заговор волшебника (Высший эльф)</span><select data-race-cantrip><option value="">Выбери заговор</option>${cantrips.map(s => `<option value="${esc(s.key)}" ${st.raceCantrip === s.key ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>` : ""}
        ${traits.length ? `<p class="cr-h">Черты расы</p><div class="cr-traits">${traits.map(t => `<details><summary>${esc(t.name)}</summary><div class="note-text">${rich(t.description)}</div></details>`).join("")}</div>` : ""}
      </section>` : `<p class="hint">Выбери расу: от неё зависят бонусы к характеристикам, скорость, зрение и врождённые черты.</p>`}`;
  };

  const classStep = () => {
    const t = table();
    const s = start();
    const subs = subOptions();
    const other = st.subclass && !subs.includes(st.subclass);
    return `<div class="cr-cards">${Object.entries(CLASSES).map(([k, x]) => card(st.cls === k, `data-cls="${k}"`, "cls" + k[0].toUpperCase() + k.slice(1), x.name, `кость хитов d${x.die}`)).join("")}</div>
      <div class="cr-row"><label class="fld cr-lvl"><span>Начальный уровень</span><input type="number" min="1" max="20" inputmode="numeric" data-level value="${st.level}"></label><p class="hint">Обычно игра начинается с 1 уровня. Если Мастер сказал начать выше, укажи: сайт сам добавит умения, хиты и ячейки, а заклинания и выборы предложит дальше.</p></div>
      ${t ? `<section class="cr-detail"><h3>${esc(t.name)}</h3><p>${esc(s.blurb)}</p>
        <ul class="cr-facts"><li>Спасброски: ${s.saves.map(abName).join(", ")}</li><li>Доспехи: ${esc(s.armor || "нет")}</li><li>Оружие: ${esc(s.weapons)}</li>${s.tools ? `<li>Инструменты: ${esc(s.tools)}</li>` : ""}<li>Навыки: ${s.skills} на выбор</li>${s.caster ? `<li>Заклинательная характеристика: ${abName(s.ability)}</li>` : ""}</ul>
        ${needsSub() ? `<p class="cr-h">Подкласс (с ${t.sub} уровня)</p><div class="chips">${subs.map(x => chip(st.subclass === x, `data-sub="${esc(x)}"`, x, false, "из SRD")).join("")}${chip(other, "data-sub-other", "Другой")}</div>${other || st.subOther ? `<label class="fld cr-sel"><span>Название подкласса</span><input type="text" data-sub-name value="${esc(other ? st.subclass : "")}" placeholder="Например: Исчадие, Путь тотема"></label><p class="hint">Умения подкласса не из SRD добавишь вручную или попросишь у Мастера текст.</p>` : ""}` : ""}
      </section>` : `<p class="hint">Класс определяет кость хитов, владения, навыки на выбор и стиль игры.</p>`}`;
  };

  const bgStep = () => {
    const b = bg();
    return `<div class="cr-list">${Object.entries(BACKGROUNDS).map(([k, x]) => card(st.background === k, `data-bg="${k}"`, k === "custom" ? "edit" : "scroll", x.name, x.skills.length ? x.skills.map(skName).join(", ") : "два любых навыка")).join("")}</div>
      ${b ? `<section class="cr-detail"><h3>${esc(b.name)}</h3><ul class="cr-facts">${b.skills.length ? `<li>Навыки: ${b.skills.map(skName).join(", ")}</li>` : ""}${b.tools ? `<li>Инструменты: ${esc(b.tools)}</li>` : ""}${b.langs ? `<li>Языки: ${b.langs} на выбор</li>` : ""}<li>Стартовые деньги: ${b.gp} зм</li></ul>
        ${st.background === "custom" ? `<label class="fld cr-sel"><span>Название</span><input type="text" data-bg-name value="${esc(st.bgName)}" placeholder="Например: Механик"></label><p class="cr-h">Два навыка: ${st.bgSkills.length} из 2</p><div class="chips">${SKILLS.map(s => chip(st.bgSkills.includes(s.key), `data-bg-skill="${s.key}"`, s.name)).join("")}</div>` : ""}
        ${b.srd ? `<p class="hint">Умение предыстории «Приют верующих» добавится само.</p>` : `<p class="hint">Умение этой предыстории есть в книге игрока: впиши его сам во вкладке «Умения», если Мастер использует.</p>`}
      </section>` : `<p class="hint">Предыстория даёт два навыка, инструменты или языки и стартовые деньги.</p>`}`;
  };

  const abilStep = () => {
    const base = baseScores(st);
    const ra = raceAsi(st.race, st.subrace, st.plusTwo);
    const c = counts();
    const bonusLeft = c.asi * 2 - ABILITY_KEYS.reduce((s, k) => s + st.bonus[k], 0);
    const methods = [["standard", "Стандартный набор"], ["point", "Покупка очков"], ["roll", "Бросок 4d6"], ["manual", "Вручную"]];
    const usedStd = new Set(ABILITY_KEYS.map(k => st.assign[k]).filter(i => i >= 0));
    const usedRoll = new Set(ABILITY_KEYS.map(k => st.rollAssign[k]).filter(i => i >= 0));
    const control = k => {
      if (st.method === "standard") return `<select data-std="${k}"><option value="-1">-</option>${STANDARD_ARRAY.map((v, i) => `<option value="${i}" ${st.assign[k] === i ? "selected" : ""} ${usedStd.has(i) && st.assign[k] !== i ? "disabled" : ""}>${v}</option>`).join("")}</select>`;
      if (st.method === "roll") return st.rolls.length ? `<select data-roll="${k}"><option value="-1">-</option>${st.rolls.map((r, i) => `<option value="${i}" ${st.rollAssign[k] === i ? "selected" : ""} ${usedRoll.has(i) && st.rollAssign[k] !== i ? "disabled" : ""}>${r.total}</option>`).join("")}</select>` : "-";
      if (st.method === "point") return `<span class="cr-pb"><button class="qbtn minus" data-pt="${k}" data-d="-1" ${st.points[k] <= 8 ? "disabled" : ""}>−</button><b>${st.points[k]}</b><button class="qbtn plus" data-pt="${k}" data-d="1" ${st.points[k] >= 15 ? "disabled" : ""}>+</button></span>`;
      return `<input type="number" min="3" max="20" data-man="${k}" value="${st.manual[k]}">`;
    };
    const rows = ABILITY_KEYS.map(k => {
      const total = Number.isFinite(base[k]) ? Math.min(20, base[k] + ra[k] + st.bonus[k]) : null;
      return `<tr><th>${esc(abName(k))}${start() && start().primary.slice(0, 2).includes(k) ? ` <small class="cr-key">важно для класса</small>` : ""}</th><td>${control(k)}</td><td>${ra[k] ? "+" + ra[k] : ""}</td>${c.asi ? `<td><span class="cr-pb"><button class="qbtn minus" data-asi="${k}" data-d="-1" ${st.bonus[k] <= 0 ? "disabled" : ""}>−</button><b>${st.bonus[k] ? "+" + st.bonus[k] : "0"}</b><button class="qbtn plus" data-asi="${k}" data-d="1" ${bonusLeft <= 0 || total >= 20 ? "disabled" : ""}>+</button></span></td>` : ""}<td class="cr-total">${total ?? "-"}</td><td>${total != null ? fmt(mod(total)) : ""}</td></tr>`;
    }).join("");
    return `<div class="chips cr-methods">${methods.map(([k, l]) => chip(st.method === k, `data-method="${k}"`, l)).join("")}</div>
      ${st.method === "standard" ? `<p class="hint">Раздай числа 15, 14, 13, 12, 10, 8 по одному на каждую характеристику.</p>` : ""}
      ${st.method === "point" ? `<p class="hint">27 очков: значения от 8 до 15, высокие стоят дороже. Потрачено: <b class="${pointsSpent(st.points) > POINT_BUDGET ? "bad" : ""}">${pointsSpent(st.points)} из ${POINT_BUDGET}</b></p>` : ""}
      ${st.method === "roll" ? `<div class="cr-row"><button class="btn sm" data-roll-all>${icon("d20")}${st.rolls.length ? "Перебросить всё" : "Бросить 4d6 шесть раз"}</button><span class="hint">Отбрасывается меньший куб.${st.rolls.length ? " Выпало: " + st.rolls.map(r => `${r.total} [${r.dice.join(", ")}]`).join(" · ") : ""}</span></div>` : ""}
      ${st.cls && st.method !== "manual" && st.method !== "roll" ? `<button class="btn ghost sm" data-suggest>${icon("sparkle")}Расставить для класса «${esc(table().name)}»</button>` : ""}
      ${st.cls && st.method === "roll" && st.rolls.length ? `<button class="btn ghost sm" data-suggest-roll>${icon("sparkle")}Расставить броски для класса</button>` : ""}
      <table class="cr-abil"><thead><tr><th></th><th>Основа</th><th>Раса</th>${c.asi ? "<th>Увеличения</th>" : ""}<th>Итог</th><th>Мод.</th></tr></thead><tbody>${rows}</tbody></table>
      ${c.asi ? `<p class="hint">Увеличения характеристик за уровни: ${c.asi} × 2 очка, осталось ${bonusLeft}. Вместо увеличения можно взять черту: впиши её потом во вкладке «Умения».</p>` : ""}`;
  };

  const skillsStep = () => {
    const g = granted();
    const s = start();
    const c = counts();
    const from = s ? (s.from === "any" ? SKILLS.map(x => x.key) : s.from) : [];
    const anyRace = (race() && race().anySkills) || 0;
    const prof = new Set([...g.keys(), ...st.skills, ...st.raceSkills, ...st.bgSkills]);
    return `${g.size ? `<p class="cr-h">Уже есть</p><div class="chips">${[...g].map(([k, src]) => chip(true, "disabled", skName(k), true, src)).join("")}</div>` : ""}
      ${s ? `<p class="cr-h">От класса: ${st.skills.length} из ${c.skills}</p><div class="chips">${from.map(k => chip(st.skills.includes(k), `data-skill="${k}"`, skName(k), g.has(k) || st.raceSkills.includes(k) || st.bgSkills.includes(k))).join("")}</div>` : `<p class="hint">Сначала выбери класс.</p>`}
      ${anyRace ? `<p class="cr-h">От расы, любые: ${st.raceSkills.length} из ${anyRace}</p><div class="chips">${SKILLS.map(x => chip(st.raceSkills.includes(x.key), `data-rskill="${x.key}"`, x.name, g.has(x.key) || st.skills.includes(x.key) || st.bgSkills.includes(x.key))).join("")}</div>` : ""}
      ${c.expertise ? `<p class="cr-h">Компетентность (двойной бонус мастерства): ${st.expertise.length} из ${c.expertise}</p><div class="chips">${[...prof].map(k => chip(st.expertise.includes(k), `data-exp="${k}"`, skName(k))).join("") || `<span class="hint">Сначала выбери навыки выше.</span>`}</div>` : ""}`;
  };

  const spellRows = key => {
    const q = lower(st.q[key] || "");
    const pool = spellPool(key).filter(s => !q || lower(s.name).includes(q) || lower(s.nameEn).includes(q));
    return pool.slice(0, 300).map(s => {
      const on = st.spells.has(s.key);
      const open = st.open === s.key;
      return `<div class="lu-opt ${on ? "on" : ""}"><button class="lu-pick" data-spk="${esc(key)}" data-sp="${esc(s.key)}" aria-pressed="${on ? "true" : "false"}"><span class="lib-lvl">${s.level}</span><span class="lu-name"><b>${esc(s.name)}</b><small>${esc((SCHOOLS[s.school] || {}).name || "")}${s.expanded ? " · расширенный список" : ""}${s.concentration ? " · концентрация" : ""}</small></span><span class="lu-mark">${on ? icon("check") : ""}</span></button><button class="icon-btn lu-info" data-sp-info="${esc(s.key)}" title="Описание">${icon(open ? "down" : "info")}</button>${open ? `<div class="lu-desc">${rich(s.description || "")}</div>` : ""}</div>`;
    }).join("") || `<p class="hint">Ничего не нашлось</p>`;
  };

  const spellsStep = () => spellNeeds().map(([key, title, n]) => `<div class="lu-picker" data-picker="${key}"><div class="lu-picker-h"><span>${esc(title)}</span><b class="${pickedIn(key).length >= n ? "done" : ""}">${pickedIn(key).length} из ${n}</b></div><label class="search-box">${icon("search")}<input type="search" data-spq="${key}" value="${esc(st.q[key] || "")}" placeholder="Поиск"></label><div class="lu-opts" data-opts="${key}">${spellRows(key)}</div></div>`).join("") + (["cleric", "druid", "paladin"].includes(st.cls) ? `<p class="hint">${esc(table().name)} готовит заклинания каждый день из всего списка класса: добавь нужные потом из «Библиотеки».</p>` : "");

  const featsStep = () => {
    const probe = probeChar(st);
    const raceList = race() ? features.filter(f => f.group === "race" && f.race === race().name && (!f.subrace || (sub() && f.subrace === sub().name))) : [];
    const clsList = table() ? classFeaturesUpTo(features, probe, st.cls, st.level) : [];
    const groups = choiceGroups();
    const c = counts();
    const invs = c.invocations ? invPick().filter(x => !x.have).sort((a, b) => Number(b.ok) - Number(a.ok)) : [];
    const list = (title, arr) => arr.length ? `<p class="cr-h">${esc(title)}</p><div class="cr-traits">${arr.map(t => `<details><summary>${esc(t.name)}${t.level ? ` <small>${t.level} ур.</small>` : ""}</summary><div class="note-text">${rich(t.description)}</div></details>`).join("")}</div>` : "";
    return `<p class="hint">Всё это добавится в лист само. Ниже выбери варианты, где они есть.</p>
      ${list("От расы", raceList)}${list("От класса" + (st.subclass ? ` и подкласса «${st.subclass}»` : ""), clsList)}
      ${groups.map(g => `<section class="lu-sec"><h3>${icon("star")}${esc(g.title)}: ${g.max > 1 ? `выбери ${g.max}` : "выбери один"}</h3>${g.list.map(x => `<label class="lu-feat"><input type="${g.max > 1 ? "checkbox" : "radio"}" name="cr-${esc(g.key)}" data-opt="${esc(g.key)}" value="${esc(x.key)}" ${(st.options[g.key] || new Set()).has(x.key) ? "checked" : ""}><span><b>${esc(x.name)}</b><span class="lu-feat-d">${rich(x.description)}</span></span></label>`).join("")}</section>`).join("")}
      ${c.invocations ? `<section class="lu-sec"><h3>${icon("eye")}Таинственные воззвания: ${st.inv.size} из ${c.invocations}</h3>${invs.map(x => `<label class="lu-feat ${x.ok ? "" : "locked"}"><input type="checkbox" data-inv="${esc(x.key)}" ${st.inv.has(x.key) ? "checked" : ""} ${x.ok ? "" : "disabled"}><span><b>${esc(x.name)}</b>${x.ok ? "" : `<small>${esc(x.why)}</small>`}<span class="lu-feat-d">${esc(x.description)}</span></span></label>`).join("")}</section>` : ""}`;
  };

  const finalStep = () => {
    st.invList = [...st.inv].map(k => features.find(x => x.key === "inv-" + k)).filter(Boolean);
    const ch = creatorChoices(st);
    let c = null;
    try {
      c = buildCharacter(ch, { features, spells });
    } catch {
      c = null;
    }
    const d = c ? compute(c) : null;
    const missing = visible().filter(s => s.id !== "final" && !s.done()).map(s => s.title);
    return `<div class="cr-final">
      <label class="fld"><span>Имя</span><input type="text" data-name value="${esc(st.name)}" maxlength="120" placeholder="Как зовут героя?"></label>
      <div class="cr-row2"><label class="fld"><span>Мировоззрение</span><select data-align><option value="">Не выбрано</option>${ALIGNMENTS.map(a => `<option ${st.alignment === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label><label class="fld"><span>Возраст</span><input type="text" data-age value="${esc(st.age)}" maxlength="20"></label></div>
      <label class="fld chk"><input type="checkbox" data-equip ${st.equipment ? "checked" : ""}><span>Стартовое снаряжение класса и деньги предыстории</span></label>
      ${missing.length ? `<p class="cr-warn">${icon("info")}Не закончено: ${esc(missing.join(", "))}. Можно создать и так, а дозаполнить потом в листе.</p>` : ""}
      ${d ? `<div class="cr-sum">
        <div class="cr-stat"><b>${d.hpMax}</b><small>хиты</small></div><div class="cr-stat"><b>${d.ac}</b><small>КД</small></div><div class="cr-stat"><b>${fmt(d.pb)}</b><small>мастерство</small></div><div class="cr-stat"><b>${fmt(d.init)}</b><small>инициатива</small></div><div class="cr-stat"><b>${d.speed}</b><small>скорость</small></div>
      </div>
      <ul class="cr-facts"><li><b>${esc([c.info.race, c.info.subrace].filter(Boolean).join(", ") || "Раса не выбрана")}</b> · <b>${esc(c.info.cls || "Класс не выбран")}${c.info.subclass ? ", " + esc(c.info.subclass) : ""}</b> · ${c.info.level} уровень · ${esc(c.info.background || "без предыстории")}</li>
        <li>Характеристики: ${ABILITY_KEYS.map(k => `${abShort(k)} ${c.abilities[k]}`).join(", ")}</li>
        <li>Спасброски: ${Object.keys(c.saves).map(abName).join(", ") || "нет"}</li>
        <li>Навыки: ${Object.entries(c.skills).map(([k, v]) => skName(k) + (v === 2 ? " (комп.)" : "")).join(", ") || "нет"}</li>
        <li>Умений: ${c.features.length}, заклинаний: ${c.spells.length}, предметов: ${c.items.length}${c.coins.gp ? `, ${c.coins.gp} зм` : ""}</li></ul>` : ""}
    </div>`;
  };

  const RENDER = { race: raceStep, class: classStep, bg: bgStep, abil: abilStep, skills: skillsStep, spells: spellsStep, feats: featsStep, final: finalStep };
  const render = () => {
    const vs = visible();
    if (st.step >= vs.length) st.step = vs.length - 1;
    const s = cur();
    const y = m.body.querySelector(".cr-body") ? m.body.querySelector(".cr-body").scrollTop : 0;
    m.body.innerHTML = `<nav class="cr-steps">${vs.map((x, i) => `<button class="cr-step ${i === st.step ? "on" : ""} ${x.done() ? "done" : ""}" data-step="${i}">${icon(x.done() && i !== st.step ? "check" : x.ic)}<span>${esc(x.title)}</span></button>`).join("")}</nav>
      <div class="cr-body">${RENDER[s.id]()}</div>
      <div class="form-actions cr-foot"><button class="link-btn" data-blank>Пустой лист</button><span class="spacer"></span>${st.step > 0 ? `<button class="btn ghost" data-prev>${icon("back")}Назад</button>` : ""}${s.id === "final" ? `<button class="btn gold" data-create>${icon("star")}Создать персонажа</button>` : `<button class="btn ${s.done() ? "gold" : ""}" data-next>Далее${icon("next")}</button>`}</div>`;
    if (y) m.body.querySelector(".cr-body").scrollTop = y;
    const on = m.body.querySelector(".cr-step.on");
    if (on) on.scrollIntoView({ block: "nearest", inline: "center" });
  };
  const go = i => {
    st.step = Math.max(0, Math.min(visible().length - 1, i));
    render();
    const b = m.body.querySelector(".cr-body");
    if (b) b.scrollTop = 0;
  };
  const toggle = (arr, k, max) => {
    const i = arr.indexOf(k);
    if (i >= 0) arr.splice(i, 1);
    else if (arr.length < max) arr.push(k);
    else if (max === 1) arr.splice(0, 1, k);
    else toast(`Можно выбрать только ${max}`, { kind: "info", timeout: 1600 });
  };
  const resetClassDeps = () => {
    st.skills = [];
    st.expertise = [];
    st.options = {};
    st.spells = new Set();
    st.inv = new Set();
    st.invList = [];
  };
  m.body.addEventListener("click", e => {
    const t = e.target.closest("button, [data-sp]");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.step != null) return go(Number(d.step));
    if ("next" in d) return go(st.step + 1);
    if ("prev" in d) return go(st.step - 1);
    if ("blank" in d) {
      m.close();
      return onBlank();
    }
    if ("create" in d) {
      const ch = creatorChoices(st);
      st.invList = [...st.inv].map(k => features.find(x => x.key === "inv-" + k)).filter(Boolean);
      ch.invocations = st.invList;
      const c = buildCharacter(ch, { features, spells });
      m.close();
      return onCreate(c);
    }
    if (d.race) {
      if (st.race !== d.race) {
        st.race = d.race;
        const subs = Object.keys((RACES[d.race] && RACES[d.race].subraces) || {});
        st.subrace = subs.length === 1 ? subs[0] : "";
        st.plusTwo = [];
        st.dragon = "";
        st.raceCantrip = "";
        st.raceSkills = [];
      }
      return render();
    }
    if (d.subrace) {
      st.subrace = d.subrace;
      return render();
    }
    if (d.dragon) {
      st.dragon = d.dragon;
      return render();
    }
    if (d.plus) {
      toggle(st.plusTwo, d.plus, 2);
      return render();
    }
    if (d.cls) {
      if (st.cls !== d.cls) {
        st.cls = d.cls;
        st.subclass = "";
        st.subOther = false;
        resetClassDeps();
        const subs = subOptions();
        if (needsSub() && subs.length === 1) st.subclass = subs[0];
      }
      return render();
    }
    if (d.sub) {
      st.subclass = d.sub;
      st.subOther = false;
      st.options = {};
      return render();
    }
    if ("subOther" in d) {
      st.subOther = true;
      st.subclass = "";
      st.options = {};
      return render();
    }
    if (d.bg) {
      if (st.background !== d.bg) {
        st.background = d.bg;
        st.bgSkills = [];
        st.skills = st.skills.filter(k => !((BACKGROUNDS[d.bg] || {}).skills || []).includes(k));
      }
      return render();
    }
    if (d.bgSkill) {
      toggle(st.bgSkills, d.bgSkill, 2);
      return render();
    }
    if (d.method) {
      st.method = d.method;
      return render();
    }
    if (d.pt) {
      st.points[d.pt] = Math.max(8, Math.min(15, st.points[d.pt] + Number(d.d)));
      return render();
    }
    if (d.asi) {
      st.bonus[d.asi] = Math.max(0, st.bonus[d.asi] + Number(d.d));
      return render();
    }
    if ("rollAll" in d) {
      st.rolls = ABILITY_KEYS.map(() => roll4d6());
      st.rollAssign = Object.fromEntries(ABILITY_KEYS.map(k => [k, -1]));
      return render();
    }
    if ("suggest" in d) {
      const sug = suggestArray(st.cls);
      if (st.method === "standard") st.assign = Object.fromEntries(ABILITY_KEYS.map(k => [k, STANDARD_ARRAY.indexOf(sug[k])]));
      else if (st.method === "point") st.points = Object.fromEntries(ABILITY_KEYS.map(k => [k, { 15: 15, 14: 14, 13: 13, 12: 12, 10: 10, 8: 8 }[sug[k]]]));
      return render();
    }
    if ("suggestRoll" in d) {
      const order = start().primary;
      const idx = st.rolls.map((r, i) => i).sort((a, b) => st.rolls[b].total - st.rolls[a].total);
      st.rollAssign = Object.fromEntries(order.map((k, i) => [k, idx[i]]));
      return render();
    }
    if (d.skill) {
      toggle(st.skills, d.skill, counts().skills);
      st.expertise = st.expertise.filter(k => granted().has(k) || st.skills.includes(k) || st.raceSkills.includes(k) || st.bgSkills.includes(k));
      return render();
    }
    if (d.rskill) {
      toggle(st.raceSkills, d.rskill, (race() && race().anySkills) || 0);
      return render();
    }
    if (d.exp) {
      toggle(st.expertise, d.exp, counts().expertise);
      return render();
    }
    if (d.spInfo) {
      st.open = st.open === d.spInfo ? "" : d.spInfo;
      return render();
    }
    if (d.sp) {
      const key = d.spk;
      const need = (spellNeeds().find(x => x[0] === key) || [])[2] || 0;
      if (st.spells.has(d.sp)) st.spells.delete(d.sp);
      else if (pickedIn(key).length < need) st.spells.add(d.sp);
      else if (need === 1) {
        pickedIn(key).forEach(k => st.spells.delete(k));
        st.spells.add(d.sp);
      } else toast(`Можно выбрать только ${need}`, { kind: "info", timeout: 1600 });
      return render();
    }
  });
  m.body.addEventListener("change", e => {
    const t = e.target;
    const d = t.dataset;
    if (d.raceCantrip != null) st.raceCantrip = t.value;
    else if (d.std) st.assign[d.std] = Number(t.value);
    else if (d.roll) st.rollAssign[d.roll] = Number(t.value);
    else if (d.man) st.manual[d.man] = Math.max(3, Math.min(20, Math.round(Number(t.value) || 10)));
    else if (d.level != null) {
      st.level = Math.max(1, Math.min(20, Math.round(Number(t.value) || 1)));
      resetClassDeps();
      st.bonus = Object.fromEntries(ABILITY_KEYS.map(k => [k, 0]));
      if (needsSub() && !st.subclass && subOptions().length === 1) st.subclass = subOptions()[0];
    } else if (d.opt) {
      const g = choiceGroups().find(x => x.key === d.opt);
      const set = st.options[d.opt] || (st.options[d.opt] = new Set());
      if (g && g.max === 1) set.clear();
      if (t.checked) {
        if (g && set.size >= g.max) {
          t.checked = false;
          return toast(`Можно выбрать только ${g.max}`, { kind: "info", timeout: 1600 });
        }
        set.add(t.value);
      } else set.delete(t.value);
    } else if (d.inv) {
      if (t.checked) {
        if (st.inv.size >= counts().invocations) {
          t.checked = false;
          return toast(`Можно выбрать только ${counts().invocations}`, { kind: "info", timeout: 1600 });
        }
        st.inv.add(d.inv);
      } else st.inv.delete(d.inv);
    } else if (d.align != null) st.alignment = t.value;
    else if (d.equip != null) st.equipment = t.checked;
    else return;
    render();
  });
  m.body.addEventListener("input", e => {
    const t = e.target;
    const d = t.dataset;
    if (d.name != null) st.name = t.value;
    else if (d.age != null) st.age = t.value;
    else if (d.bgName != null) st.bgName = t.value;
    else if (d.subName != null) st.subclass = t.value;
    else if (d.spq) {
      st.q[d.spq] = t.value;
      const box = m.body.querySelector(`[data-opts="${CSS.escape(d.spq)}"]`);
      if (box) box.innerHTML = spellRows(d.spq);
    }
  });
  render();
}
