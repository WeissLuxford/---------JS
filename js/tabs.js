import { ABILITIES, SKILLS, DAMAGE, ACTIONS, FEATURE_CATS, RARITY, CONDITIONS, DEFENSE_KINDS, fmt, usesInfo, spellCast } from "./rules.js";
import { icon, actionMark, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, pips, rich, plainPreview } from "./ui.js";
import { spellIcon, itemIcon, fmtNum } from "./entities.js";

export const TABS = [
  { key: "char", name: "Персонаж", short: "Герой", icon: "user" },
  { key: "combat", name: "Бой", icon: "swords" },
  { key: "spells", name: "Магия", icon: "book" },
  { key: "features", name: "Умения", icon: "pact" },
  { key: "inventory", name: "Снаряжение", short: "Вещи", icon: "bag" },
  { key: "notes", name: "Заметки", icon: "scroll" },
  { key: "story", name: "История", icon: "feather" }
];

const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || "";

function panel(title, body, { ic, actions = "", cls = "" } = {}) {
  return `<section class="panel ${cls}"><header class="panel-h">${ic ? icon(ic) : ""}<h3>${esc(title)}</h3><span class="spacer"></span>${actions}</header><div class="panel-b">${body}</div></section>`;
}

function addBtn(act, label, extra = "") {
  return `<button class="btn ghost sm" data-act="${act}" ${extra}>${icon("plus")}${esc(label)}</button>`;
}

export function subtitle(c) {
  const race = [c.info.race].filter(Boolean).join(" ");
  const cls = [c.info.cls, c.info.level ? c.info.level : ""].filter(Boolean).join(" ");
  return [race, cls].filter(Boolean).join(" · ") || "Нажми, чтобы заполнить";
}

function portraitHtml(c) {
  return c.portrait ? `<img src="${esc(c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER;
}

export function hpState(cur, max) {
  const pct = (cur / Math.max(1, max)) * 100;
  return cur <= 0 ? "down" : pct <= 25 ? "low" : pct <= 50 ? "mid" : "ok";
}

export function hpPanel(ctx) {
  const { c, d } = ctx;
  const cur = Math.max(0, Math.min(d.hpMax, Number(c.hp.current) || 0));
  const pct = Math.max(0, Math.min(100, (cur / Math.max(1, d.hpMax)) * 100));
  const tmp = Number(c.hp.temp) || 0;
  const dying = cur <= 0;
  const dead = c.hp.deathFail >= 3;
  const stable = !dead && (c.hp.stable || c.hp.deathSuccess >= 3);
  const deathBtn = dead
    ? `<span class="death-state bad">${icon("skull")} Персонаж погиб</span>`
    : stable
      ? `<span class="death-state ok">${icon("heart")} Стабилизирован, без сознания</span>`
      : `<button class="btn sm" data-roll="death">${icon("d20")} Спасбросок от смерти</button>`;
  const death = dying ? `<div class="death">
      <div class="death-row"><span>Успехи</span>${[0, 1, 2].map(i => `<button class="ds ok ${i < c.hp.deathSuccess ? "on" : ""}" data-act="death" data-k="deathSuccess" data-i="${i}" aria-label="Успех ${i + 1}"></button>`).join("")}</div>
      <div class="death-row"><span>Провалы</span>${[0, 1, 2].map(i => `<button class="ds bad ${i < c.hp.deathFail ? "on" : ""}" data-act="death" data-k="deathFail" data-i="${i}" aria-label="Провал ${i + 1}"></button>`).join("")}</div>
      ${deathBtn}
    </div>` : "";
  return panel("Хиты", `
    <div class="hp-wrap ${dying ? "dying" : ""}" data-hpstate="${hpState(cur, d.hpMax)}">
      <button class="hp-big" data-act="hp" data-card="stat:hp">
        <span class="hp-nums"><span data-calc="hp">${cur}</span><small>/ <span data-calc="hpmax">${d.hpMax}</span></small></span>
        ${tmp ? `<span class="hp-temp">+${tmp} врем.</span>` : ""}
      </button>
      <div class="hp-bar"><i data-hpbar style="width:${pct}%"></i>${tmp ? `<b style="width:${Math.min(100, (tmp / Math.max(1, d.hpMax)) * 100)}%"></b>` : ""}</div>
      <div class="hp-actions">
        <button class="btn danger sm" data-act="hp" data-mode="dmg">${icon("swords")}Урон</button>
        <button class="btn heal sm" data-act="hp" data-mode="heal">${icon("heart")}Лечение</button>
        <button class="btn ghost sm" data-act="hp" data-mode="temp">${icon("shield")}Врем.</button>
      </div>
      <div class="hp-quick" aria-label="Быстро изменить хиты">${[-10, -5, -1, 1, 5, 10].map(n => `<button class="qbtn ${n < 0 ? "minus" : "plus"}" data-act="hp-quick" data-n="${n}" aria-label="${n < 0 ? "Урон" : "Лечение"} ${Math.abs(n)}">${n < 0 ? "−" + Math.abs(n) : "+" + n}</button>`).join("")}</div>
      <div class="hd-row">
        <span>Кости хитов: <b data-calc="hd">${d.hitDice.left}/${d.hitDice.total}</b> ${esc(c.hitDie)}</span>
        <button class="btn ghost sm" data-act="spend-hd" ${d.hitDice.left ? "" : "disabled"}>${icon("d20")}Потратить</button>
      </div>
      ${death}
    </div>`, { ic: "heart", cls: "hp-panel" });
}

function inspirationBtn(c) {
  return `<button class="insp ${c.inspiration ? "on" : ""}" data-act="inspiration" data-card="stat:inspiration" aria-pressed="${c.inspiration ? "true" : "false"}">${icon("sun")}<span>${c.inspiration ? "Вдохновение есть" : "Нет вдохновения"}</span></button>`;
}

function statMedal(label, value, { calc, act, roll, ic, card, slow } = {}) {
  const tag = act || roll ? "button" : "div";
  return `<${tag} class="medal ${slow ? "slow" : ""}" ${act ? `data-act="${act}"` : ""} ${roll ? `data-roll="${roll}"` : ""} ${card ? `data-card="${card}"` : ""}>${ic ? icon(ic) : ""}<span class="medal-v" ${calc ? `data-calc="${calc}"` : ""}>${esc(value)}</span><span class="medal-l">${esc(label)}</span></${tag}>`;
}

function concentrationBar(c) {
  if (!c.concentration) return "";
  return `<div class="conc-bar">${icon("spiral")}<span>Концентрация: <b>${esc(c.concentration)}</b></span><span class="spacer"></span><button class="btn ghost sm" data-roll="save:con" title="Спасбросок Телосложения">${icon("d20")}Спасбросок</button><button class="btn ghost sm" data-act="drop-conc">Снять</button></div>`;
}

function activeConditions(c) {
  const list = CONDITIONS.filter(k => c.conditions[k.key]);
  if (!list.length && !c.exhaustion) return "";
  return `<div class="cond-active">${list.map(k => `<span class="chip bad" data-card="condition:${k.key}">${esc(k.name)}</span>`).join("")}${c.exhaustion ? `<span class="chip bad" data-card="stat:exhaustion">Истощение ${esc(c.exhaustion)}</span>` : ""}</div>`;
}

function defenseLines(c) {
  const rows = Object.entries(DEFENSE_KINDS).filter(([k]) => c.defenses[k].length).map(([k, label]) => `<div class="full def-row"><span>${label}:</span>${c.defenses[k].map(t => {
    const dt = DAMAGE[t] || {};
    return `<span class="def-chip" style="--c:${dt.color || "#cbbfa8"}">${icon(dt.icon || "sparkle")}${esc(dt.name || t)}</span>`;
  }).join("")}</div>`).join("");
  return rows + (c.resistances ? `<div class="full"><span class="dim">${esc(c.resistances)}</span></div>` : "");
}

export function tabChar(ctx) {
  const { c, d } = ctx;
  const abil = ABILITIES.map(a => `
    <div class="abil" data-card="ability:${a.key}">
      <button class="abil-top" data-roll="check:${a.key}"><span class="abil-name">${a.short}</span><span class="abil-mod" data-calc="mod.${a.key}">${fmt(d.mods[a.key])}</span></button>
      <input class="abil-score" type="number" inputmode="numeric" min="1" max="30" data-path="abilities.${a.key}" data-num value="${esc(c.abilities[a.key])}" aria-label="${a.name}">
    </div>`).join("");
  const saves = ABILITIES.map(a => `
    <div class="row">
      <button class="prof ${c.saves[a.key] ? "p1" : ""}" data-act="toggle-save" data-k="${a.key}" title="Владение" aria-label="Владение спасброском: ${a.name}" aria-pressed="${c.saves[a.key] ? "true" : "false"}"></button>
      <button class="row-name" data-roll="save:${a.key}">${a.name}</button>
      <span class="row-val" data-calc="save.${a.key}">${fmt(d.saves[a.key])}</span>
    </div>`).join("");
  const skills = SKILLS.map(s => {
    const p = Number(c.skills[s.key]) || 0;
    return `<div class="row" data-card="skill:${s.key}">
      <button class="prof p${p}" data-act="cycle-skill" data-k="${s.key}" title="Нет / владение / компетентность" aria-label="${s.name}: ${["нет владения", "владение", "компетентность"][p]}"></button>
      <button class="row-name" data-roll="skill:${s.key}">${s.name}<small>${abShort(s.ab)}</small></button>
      <span class="row-val" data-calc="skill.${s.key}">${fmt(d.skills[s.key])}</span>
    </div>`;
  }).join("");
  const prof = [["armor", "Доспехи"], ["weapons", "Оружие"], ["tools", "Инструменты"], ["languages", "Языки"]].map(([k, l]) => `
    <label class="fld inline"><span>${l}</span><textarea class="autogrow" rows="1" data-path="proficiencies.${k}">${esc(c.proficiencies[k])}</textarea></label>`).join("");

  return `
  <div class="char-grid">
    <div class="col col-left">
      ${panel("Характеристики", `<div class="abil-grid">${abil}</div>`, { ic: "star", cls: "p-abil" })}
      ${panel("Спасброски", `<div class="rows">${saves}</div>`, { ic: "shield", cls: "p-saves" })}
    </div>
    <div class="col col-center">
      <section class="hero">
        <button class="hero-portrait" data-act="portrait" title="Портрет">${portraitHtml(c)}<span class="hero-cam">${icon("camera")}</span></button>
        <button class="hero-id" data-act="edit-info">
          <span class="hero-name" data-calc="name">${esc(c.name)}</span>
          <span class="hero-sub">${esc([c.info.race, c.info.subrace].filter(Boolean).join(", "))}</span>
          <span class="hero-sub">${esc([c.info.cls, c.info.subclass].filter(Boolean).join(", "))} · <span data-calc="level">${d.level}</span> уровень</span>
          <span class="hero-sub dim">${esc([c.info.background, c.info.alignment, c.info.age ? c.info.age + " лет" : ""].filter(Boolean).join(" · "))}</span>
        </button>
      </section>
      <div class="medals">
        ${statMedal("КД", d.ac, { calc: "ac", act: "edit-armor", ic: "shield", card: "stat:ac" })}
        ${statMedal("Инициатива", fmt(d.init), { calc: "init", roll: "init", ic: "bolt", card: "stat:init" })}
        ${statMedal("Скорость", d.speed + " фт", { calc: "speed", act: "edit-info", ic: "boot", card: "stat:speed", slow: d.speed < d.baseSpeed })}
        ${statMedal("Мастерство", fmt(d.pb), { calc: "pb", ic: "star", card: "stat:pb" })}
      </div>
      ${inspirationBtn(c)}
      ${concentrationBar(c)}
      ${activeConditions(c)}
      ${hpPanel(ctx)}
      ${panel("Чувства", `
        <div class="senses">
          <div><span>Пассивная Внимательность</span><b data-calc="pp">${d.passive.perception}</b></div>
          <div><span>Пассивная Проницательность</span><b data-calc="pi">${d.passive.insight}</b></div>
          <div><span>Пассивный Анализ</span><b data-calc="pinv">${d.passive.investigation}</b></div>
          ${c.senses ? `<div class="full"><span>${esc(c.senses)}</span></div>` : ""}
          ${defenseLines(c)}
        </div>`, { ic: "eye", cls: "p-senses" })}
    </div>
    <div class="col col-right">
      ${panel("Навыки", `<div class="rows">${skills}</div>`, { ic: "d20", cls: "p-skills" })}
    </div>
  </div>
  ${panel("Владения и языки", `<div class="prof-grid">${prof}</div>`, { ic: "wrench" })}`;
}

function attackRow(ctx, at) {
  const s = ctx.d.attacks[at.id];
  const dt = DAMAGE[s.type] || DAMAGE.bludgeoning;
  const hit = s.kind === "save"
    ? `<span class="chip dc">СЛ ${s.dc} ${abShort(s.save)}</span>`
    : `<button class="chip hit" data-roll="attack:${esc(at.id)}">${s.beams > 1 ? `<small>${s.beams}×</small>` : ""}${fmt(s.hit)}</button>`;
  return `<div class="atk-row">
    <button class="atk-name" data-open="attack:${esc(at.id)}" data-card="attack:${esc(at.id)}" style="--c:${dt.color}">${icon(dt.icon)}<span><b>${esc(at.name)}</b><small>${esc(at.range || "")}</small></span></button>
    ${hit}
    <button class="chip dmg" data-roll="dmg:${esc(at.id)}" style="--c:${dt.color}">${s.beams > 1 ? s.beams + "× " : ""}${esc(s.dmg)} <span>${esc(dt.name.toLowerCase())}</span></button>
  </div>`;
}

function slotsBlock(ctx) {
  const { c, d } = ctx;
  if (d.pact) {
    const left = Math.max(0, d.pact.count - (Number(c.pactUsed) || 0));
    return `<div class="slot-line pact"><span class="slot-l">Ячейки договора <b>${d.pact.level} круга</b></span><span class="pips big">${Array.from({ length: d.pact.count }, (_, i) => `<button class="pip ${i < left ? "on" : ""}" data-act="pact-pip" data-i="${i}" style="--c:#c07cff"></button>`).join("")}</span><span class="slot-n">${left}/${d.pact.count}</span></div>`;
  }
  if (!d.slots.length) return "";
  return d.slots.map((n, i) => {
    const lvl = i + 1;
    const left = Math.max(0, n - (Number(c.slotsUsed[lvl]) || 0));
    return `<div class="slot-line"><span class="slot-l">${lvl} круг</span><span class="pips big">${Array.from({ length: n }, (_, j) => `<button class="pip ${j < left ? "on" : ""}" data-act="slot-pip" data-lvl="${lvl}" data-i="${j}" style="--c:#5fc7ff"></button>`).join("")}</span><span class="slot-n">${left}/${n}</span></div>`;
  }).join("");
}

function resourceRows(ctx) {
  const { c, d } = ctx;
  const rows = [];
  const push = (kind, e, color) => {
    const u = usesInfo(d, e);
    if (!u || (kind === "spell" && e.cost !== "uses")) return;
    rows.push(`<div class="res-row"><button class="res-name" data-open="${kind}:${esc(e.id)}" data-card="${kind}:${esc(e.id)}">${esc(e.name)}<small>${esc(rechargeShort(e.recharge))}</small></button><span class="pips big">${Array.from({ length: Math.min(u.max, 30) }, (_, i) => `<button class="pip ${i < u.left ? "on" : ""}" data-act="use-pip" data-ref="${kind}:${esc(e.id)}" data-i="${i}" style="--c:${color}"></button>`).join("")}</span><span class="slot-n">${u.left}/${u.max}</span></div>`);
  };
  c.features.forEach(f => push("feature", f, "#e9a54a"));
  c.spells.forEach(s => push("spell", s, "#ff9d5c"));
  c.items.forEach(i => push("item", i, "#4fcf6a"));
  return rows.join("");
}

function rechargeShort(r) {
  return { short: "кор. отдых", long: "длин. отдых", dawn: "рассвет", none: "не восст.", always: "" }[r] || "";
}

function combatStrip(ctx) {
  const { c, d } = ctx;
  const caster = c.casterType !== "none" || c.spells.length;
  return `<div class="combat-strip">
    ${statMedal("КД", d.ac, { calc: "ac", act: "edit-armor", ic: "shield", card: "stat:ac" })}
    ${statMedal("Инициатива", fmt(d.init), { calc: "init", roll: "init", ic: "bolt", card: "stat:init" })}
    ${statMedal("Скорость", d.speed + " фт", { calc: "speed", ic: "boot", card: "stat:speed", slow: d.speed < d.baseSpeed })}
    ${caster ? statMedal("СЛ закл.", d.spell.dc, { calc: "dc", ic: "drop" }) : statMedal("Внимат.", d.passive.perception, { calc: "pp", ic: "eye" })}
  </div>`;
}

function conditionsPanel(ctx) {
  const { c, ui } = ctx;
  const active = CONDITIONS.filter(k => c.conditions[k.key]);
  const open = ui.condOpen != null ? ui.condOpen : active.length > 0 || c.exhaustion > 0;
  const conds = CONDITIONS.map(k => `<button class="chip toggle ${c.conditions[k.key] ? "on bad" : ""}" data-act="toggle-cond" data-k="${k.key}" data-card="condition:${k.key}" aria-pressed="${c.conditions[k.key] ? "true" : "false"}">${esc(k.name)}</button>`).join("");
  const exh = `<div class="exh"><span data-card="stat:exhaustion">Истощение</span>${[0, 1, 2, 3, 4, 5, 6].map(i => `<button class="chip toggle ${c.exhaustion === i ? "on" : ""}" data-act="exhaustion" data-i="${i}" aria-pressed="${c.exhaustion === i ? "true" : "false"}" aria-label="Истощение ${i}">${i}</button>`).join("")}</div>`;
  const summary = [...active.map(k => k.name), c.exhaustion ? `Истощение ${c.exhaustion}` : ""].filter(Boolean);
  return `<details class="panel cond-panel" data-ui-open="condOpen" ${open ? "open" : ""}>
    <summary class="panel-h">${icon("skull")}<h3>Состояния</h3><span class="cond-sum">${summary.length ? summary.map(t => `<span class="chip bad">${esc(t)}</span>`).join("") : `<span class="dim">нет</span>`}</span><span class="spacer"></span><span class="cond-chev">${icon("down")}</span></summary>
    <div class="panel-b"><p class="hint">Отмеченные состояния сами дают помеху или преимущество на броски. Зажми или наведи, чтобы прочитать описание.</p><div class="chips">${conds}</div>${exh}</div>
  </details>`;
}

export function tabCombat(ctx) {
  const { c } = ctx;
  const attacks = c.attacks.map(a => attackRow(ctx, a)).join("") || `<p class="empty">Атак пока нет</p>`;
  const slots = slotsBlock(ctx);
  const res = resourceRows(ctx);
  return `
  ${combatStrip(ctx)}
  <div class="combat-grid">
    <div class="col">
      <div class="rest-row">
        <button class="btn" data-act="short-rest">${icon("campfire")}Короткий отдых</button>
        <button class="btn" data-act="long-rest">${icon("moon")}Длинный отдых</button>
      </div>
      ${concentrationBar(c)}
      ${hpPanel(ctx)}
      ${conditionsPanel(ctx)}
    </div>
    <div class="col">
      ${inspirationBtn(c)}
      ${panel("Атаки", `<div class="atk-list">${attacks}</div>`, { ic: "swords", actions: addBtn("add-attack", "Атака"), cls: "p-attacks" })}
      ${slots || res ? panel("Ресурсы", `${slots}${res}`, { ic: "hourglass", cls: "p-res" }) : ""}
    </div>
  </div>`;
}

function spellTile(ctx, sp) {
  const { c, d } = ctx;
  const ic = spellIcon(c, sp);
  const cast = spellCast(c, d, sp);
  const a = ACTIONS[sp.action] || ACTIONS.action;
  const dmg = cast.lines[0] ? `${cast.beams > 1 ? cast.beams + "× " : ""}${cast.lines[0].dice} ${(DAMAGE[cast.lines[0].type] || {}).name || ""}`.toLowerCase() : "";
  const u = sp.cost === "uses" ? usesInfo(d, sp) : null;
  const unprep = Number(sp.level) > 0 && sp.prepared === false && sp.cost !== "item";
  const flags = [sp.concentration ? `<i class="flag" title="Концентрация">К</i>` : "", sp.ritual ? `<i class="flag" title="Ритуал">Р</i>` : "", unprep ? `<i class="flag off" title="Не подготовлено">н/п</i>` : "", sp.cost === "item" ? `<i class="flag green" title="Тратит заряды предмета">${icon("wand")}</i>` : ""].join("");
  const search = [sp.name, sp.nameEn, sp.source].filter(Boolean).join(" ").toLowerCase();
  return `<button class="tile ${unprep ? "unprep" : ""}" data-open="spell:${esc(sp.id)}" data-card="spell:${esc(sp.id)}" data-search="${esc(search)}" style="--c:${ic.color}">
    <span class="tile-ic">${icon(ic.icon)}</span>
    <span class="tile-main"><span class="tile-name">${esc(sp.name)}</span><span class="tile-sub">${actionMark(a.shape, a.color)}<span class="tile-sub-t">${esc(sp.castTime || a.name)}${dmg ? ` · <span class="tile-dmg">${esc(dmg)}</span>` : ""}</span></span></span>
    <span class="tile-side">${flags}${u ? pips(u.max, u.left, "#e9a54a") : ""}</span>
  </button>`;
}

export function tabSpells(ctx) {
  const { c, d } = ctx;
  const abilOpts = ABILITIES.map(a => `<option value="${a.key}" ${c.spellAbility === a.key ? "selected" : ""}>${a.name}</option>`).join("");
  const head = `
    <div class="spell-head">
      <label class="fld compact"><span>Характеристика</span><select data-path="spellAbility" data-rerender>${abilOpts}</select></label>
      ${statMedal("СЛ спасброска", d.spell.dc, { calc: "dc", ic: "drop" })}
      ${statMedal("Бонус атаки", fmt(d.spell.atk), { calc: "satk", roll: "spellatk", ic: "target" })}
      ${statMedal("Модификатор", fmt(d.spell.mod), { ic: "star" })}
    </div>
    ${slotsBlock(ctx)}`;
  const f = ctx.ui.spellFilter || "all";
  const hasUnprep = c.spells.some(sp => Number(sp.level) > 0 && sp.prepared === false);
  const pass = sp => {
    if (f === "prepared") return Number(sp.level) === 0 || sp.prepared !== false;
    if (f === "conc") return !!sp.concentration;
    if (f === "ritual") return !!sp.ritual;
    if (f === "damage") return (sp.damage || []).some(x => x.type !== "healing" && x.type !== "temp");
    return true;
  };
  const filters = [["all", "Все"], ...(hasUnprep ? [["prepared", "Подготовленные"]] : []), ["damage", "С уроном"], ["conc", "Концентрация"], ["ritual", "Ритуалы"]];
  const tools = c.spells.length > 5 ? `<div class="spell-tools"><label class="search-box">${icon("search")}<input type="search" data-ui="spell-q" placeholder="Найти заклинание" value="${esc(ctx.ui.spellQ || "")}" aria-label="Найти заклинание"></label><div class="chips filter">${filters.map(([k, l]) => `<button class="chip toggle ${f === k ? "on" : ""}" data-act="spell-filter" data-k="${k}" aria-pressed="${f === k ? "true" : "false"}">${l}</button>`).join("")}</div></div>` : "";
  const groups = {};
  c.spells.filter(pass).forEach(s => {
    const l = Number(s.level) || 0;
    (groups[l] = groups[l] || []).push(s);
  });
  const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const lists = levels.map(l => panel(l === 0 ? "Заговоры" : `${l} круг`, `<div class="tiles">${groups[l].sort((a, b) => a.name.localeCompare(b.name, "ru")).map(s => spellTile(ctx, s)).join("")}</div>`, { ic: l === 0 ? "sparkle" : "book" })).join("");
  return `
    ${panel("Заклинательство", head, { ic: "book", actions: `<button class="btn ghost sm" data-act="spell-library">${icon("book")}Библиотека</button>` + addBtn("add-spell", "Своё") })}
    ${concentrationBar(c)}
    ${tools}
    <div class="spell-lists">${lists || (c.spells.length ? `<p class="empty">Под этот фильтр ничего не подходит</p>` : `<p class="empty">Заклинаний пока нет. Выбери их в «Библиотеке» или добавь своё.</p>`)}</div>
    <p class="empty" data-search-empty hidden>Ничего не нашлось</p>`;
}

function featureTile(ctx, f) {
  const { d } = ctx;
  const cat = FEATURE_CATS[f.category] || FEATURE_CATS.other;
  const a = ACTIONS[f.action] || ACTIONS.passive;
  const u = usesInfo(d, f);
  const color = f.source === "dm" ? "#f0c46a" : f.source === "own" ? "#6fd3c4" : "#c9a0ff";
  const src = f.source === "dm" ? `<i class="flag gold" title="От Мастера">М</i>` : f.source === "own" ? `<i class="flag teal" title="Своё">С</i>` : "";
  return `<button class="tile" data-open="feature:${esc(f.id)}" data-card="feature:${esc(f.id)}" style="--c:${color}">
    <span class="tile-ic">${icon(cat.icon)}</span>
    <span class="tile-main"><span class="tile-name">${esc(f.name)}</span><span class="tile-sub">${actionMark(a.shape, a.color)}<span class="tile-sub-t">${esc(a.name)}${f.effect ? ` · ${esc(f.effect)}` : ""}</span></span></span>
    <span class="tile-side">${src}${u ? pips(u.max, u.left, "#e9a54a") : ""}</span>
  </button>`;
}

export function tabFeatures(ctx) {
  const { c } = ctx;
  const pact = c.info.patron || c.info.pactBoon ? `<div class="pact-line">${icon("pact")}<span>${c.info.patron ? `Покровитель: <b>${esc(c.info.patron)}</b>` : ""}${c.info.patron && c.info.pactBoon ? " · " : ""}${c.info.pactBoon ? esc(c.info.pactBoon) : ""}</span><button class="icon-btn" data-act="edit-info" title="Изменить">${icon("edit")}</button></div>` : "";
  const sections = Object.entries(FEATURE_CATS).map(([key, cat]) => {
    const list = c.features.filter(f => (f.category || "other") === key);
    if (!list.length) return "";
    return panel(cat.name, `<div class="tiles">${list.map(f => featureTile(ctx, f)).join("")}</div>`, { ic: cat.icon, actions: addBtn("add-feature", "", `data-cat="${key}" title="Добавить"`) });
  }).join("");
  return `${pact}
    <div class="legend"><span><i class="flag gold">М</i> от Мастера</span><span><i class="flag teal">С</i> своё</span><span class="spacer"></span>${addBtn("add-feature", "Умение", 'data-cat="other"')}</div>
    ${sections || `<p class="empty">Умений пока нет</p>`}`;
}

const RARITY_ORDER = ["common", "uncommon", "rare", "veryRare", "legendary", "artifact", "story"];
const COIN_GP = { пм: 10, pp: 10, зм: 1, з: 1, gp: 1, эм: 0.5, ep: 0.5, см: 0.1, с: 0.1, sp: 0.1, мм: 0.01, м: 0.01, cp: 0.01 };

export function priceGp(value) {
  const m = String(value || "").toLowerCase().replace(/\s+/g, "").replace(",", ".").match(/(\d+(?:\.\d+)?)([а-яa-z]*)/);
  if (!m) return -1;
  const unit = Object.keys(COIN_GP).find(k => m[2].startsWith(k) && (m[2].length === k.length || k.length === 2)) || "зм";
  return Number(m[1]) * COIN_GP[unit];
}

export const INV_SORTS = [["added", "Как добавлено"], ["recent", "Сначала новые"], ["name", "По названию"], ["price", "Дороже выше"], ["rarity", "Редкие выше"], ["weight", "Тяжёлые выше"], ["type", "По типу"]];

export function sortItems(items, sort, equippedFirst) {
  const list = items.map((it, i) => ({ it, i }));
  const by = {
    added: (a, b) => a.i - b.i,
    recent: (a, b) => b.i - a.i,
    name: (a, b) => a.it.name.localeCompare(b.it.name, "ru"),
    price: (a, b) => priceGp(b.it.value) - priceGp(a.it.value) || a.i - b.i,
    rarity: (a, b) => RARITY_ORDER.indexOf(b.it.rarity) - RARITY_ORDER.indexOf(a.it.rarity) || a.i - b.i,
    weight: (a, b) => (Number(b.it.weight) || 0) * (Number(b.it.qty) || 0) - (Number(a.it.weight) || 0) * (Number(a.it.qty) || 0) || a.i - b.i,
    type: (a, b) => String(a.it.type).localeCompare(String(b.it.type)) || a.it.name.localeCompare(b.it.name, "ru")
  }[sort] || ((a, b) => a.i - b.i);
  list.sort((a, b) => (equippedFirst ? (b.it.equipped ? 1 : 0) - (a.it.equipped ? 1 : 0) : 0) || by(a, b));
  return list.map(x => x.it);
}

const INV_FILTERS = [["all", "Все"], ["equipped", "Надето"], ["artifact", "Артефакты"], ["weapon", "Оружие"], ["armor", "Броня"], ["consumable", "Расходники"], ["other", "Прочее"]];

export function tabInventory(ctx) {
  const { c, d, ui } = ctx;
  const f = ui.invFilter || "all";
  const filtered = c.items.filter(it => {
    if (f === "all") return true;
    if (f === "equipped") return it.equipped;
    if (f === "other") return !["artifact", "weapon", "armor", "consumable"].includes(it.type);
    return it.type === f;
  });
  const items = sortItems(filtered, ui.invSort || "added", ui.invEqFirst !== false);
  const pct = Math.min(100, (d.weight / Math.max(1, d.carry)) * 100);
  const coins = [["pp", "ПМ", "#d7e3ef"], ["gp", "ЗМ", "#e9c77a"], ["ep", "ЭМ", "#bfd0d6"], ["sp", "СМ", "#c9c9c9"], ["cp", "ММ", "#c7864f"]].map(([k, l, col]) => `
    <label class="coin" style="--c:${col}">${icon("coin")}<input type="number" inputmode="numeric" min="0" data-path="coins.${k}" data-num value="${esc(c.coins[k])}"><span>${l}</span></label>`).join("");
  const grid = items.map(it => {
    const r = RARITY[it.rarity] || RARITY.common;
    return `<button class="slot ${it.equipped ? "eq" : ""}" data-open="item:${esc(it.id)}" data-card="item:${esc(it.id)}" style="--c:${r.color}">
      <span class="slot-ic">${icon(itemIcon(it))}</span>
      ${Number(it.qty) > 1 ? `<span class="slot-qty">${it.qty}</span>` : ""}
      ${it.attuned ? `<span class="slot-att" title="Настроено">${icon("sparkle")}</span>` : ""}
      <span class="slot-name">${esc(it.name)}</span>
    </button>`;
  }).join("");
  return `
    ${panel("Кошель и вес", `
      <div class="coins">${coins}</div>
      <div class="weight"><span>Вес: <b data-calc="weight">${fmtNum(d.weight)}</b> / <span data-calc="carry">${d.carry}</span> фнт</span><div class="wbar ${d.weight > d.carry ? "over" : ""}" data-wbar><i style="width:${pct}%"></i></div><span>Настройка: <b data-calc="attuned">${d.attuned}</b> / 3</span></div>`, { ic: "coin" })}
    ${panel("Предметы", `
      <div class="chips filter">${INV_FILTERS.map(([k, l]) => `<button class="chip toggle ${f === k ? "on" : ""}" data-act="inv-filter" data-k="${k}">${l}</button>`).join("")}</div>
      <div class="inv-sort"><label class="fld compact"><span>Сортировка</span><select data-ui="inv-sort">${INV_SORTS.map(([k, l]) => `<option value="${k}" ${(ui.invSort || "added") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label><button class="chip toggle ${ui.invEqFirst !== false ? "on" : ""}" data-act="inv-eq-first" aria-pressed="${ui.invEqFirst !== false ? "true" : "false"}">Надетое сначала</button></div>
      <div class="inv-grid">${grid || `<p class="empty">Пусто</p>`}</div>`, { ic: "bag", actions: addBtn("add-item", "Предмет") })}`;
}

const NOTE_SECTIONS = [["patron", "Покровитель", "pact"], ["quests", "Задания", "flag"], ["people", "Люди", "people"], ["misc", "Прочее", "notebook"]];
const STATUS = { active: ["Активно", "#e9c77a"], done: ["Выполнено", "#4fcf6a"], failed: ["Провалено", "#e5533d"] };
const ATTITUDE = { ally: ["Союзник", "#4fcf6a"], neutral: ["Нейтрально", "#c9b48a"], hostile: ["Враг", "#e5533d"] };

export const noteTags = n => String(n.tags || "").split(",").map(t => t.trim()).filter(Boolean);

function noteMatches(n, q) {
  return [n.title, n.subtitle, n.text, n.tags].some(v => String(v || "").toLowerCase().includes(q));
}

function snippet(text, q) {
  const plain = plainPreview(text, 100000);
  const i = plain.toLowerCase().indexOf(q);
  if (i < 0) return plainPreview(text);
  const from = Math.max(0, i - 40);
  return (from ? "…" : "") + plain.slice(from, i + q.length + 60) + (i + q.length + 60 < plain.length ? "…" : "");
}

function noteCard(n, sec, ui, q) {
  const st = sec === "quests" ? STATUS[n.status] : sec === "people" ? ATTITUDE[n.attitude] : null;
  const local = ui.noteOpen || {};
  const shut = n.id in local ? !local[n.id] : !!n.collapsed;
  const preview = shut ? (q ? snippet(n.text, q) : plainPreview(n.text)) : "";
  const tags = noteTags(n);
  const secName = q ? (NOTE_SECTIONS.find(x => x[0] === sec) || [])[1] : "";
  return `<article class="note ${shut ? "collapsed" : ""} ${n.status === "done" || n.status === "failed" ? "dim" : ""}">
    <header><button class="note-toggle" data-act="toggle-note" data-sec="${sec}" data-id="${esc(n.id)}" aria-expanded="${shut ? "false" : "true"}"><span class="note-chev">${icon("down")}</span><span class="note-titles"><h4>${esc(n.title || "Без названия")}</h4>${n.subtitle ? `<span class="note-sub">${esc(n.subtitle)}</span>` : ""}${preview ? `<span class="note-prev">${esc(preview)}</span>` : ""}</span></button>${secName ? `<span class="badge">${esc(secName)}</span>` : ""}${st ? `<span class="badge" style="--c:${st[1]}">${st[0]}</span>` : ""}<button class="icon-btn" data-act="edit-note" data-sec="${sec}" data-id="${esc(n.id)}" title="Изменить" aria-label="Изменить «${esc(n.title || "Без названия")}»">${icon("edit")}</button></header>
    ${tags.length ? `<div class="note-tags">${tags.map(t => `<button class="tag ${ui.noteTag === t ? "on" : ""}" data-act="note-tag" data-k="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : ""}
    ${shut ? "" : `<div class="note-text">${rich(n.text) || `<p class="dim">Пусто</p>`}</div>`}
  </article>`;
}

export function notesList(ctx) {
  const { c, ui } = ctx;
  const s = ui.notesSection || "patron";
  const q = String(ui.notesQ || "").trim().toLowerCase();
  if (q) {
    const found = NOTE_SECTIONS.flatMap(([k]) => c.notes[k].filter(n => noteMatches(n, q)).map(n => noteCard(n, k, ui, q)));
    return found.length ? `<p class="hint">Найдено во всех разделах: ${found.length}</p>${found.join("")}` : `<p class="empty">Ничего не нашлось</p>`;
  }
  let list = c.notes[s].slice();
  if (s === "quests") {
    const order = { active: 0, "": 1, done: 2, failed: 3 };
    list.sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
  }
  if (s === "people" && ui.peopleAtt && ui.peopleAtt !== "all") list = list.filter(n => (n.attitude || "") === (ui.peopleAtt === "unknown" ? "" : ui.peopleAtt));
  if (ui.noteTag) list = list.filter(n => noteTags(n).includes(ui.noteTag));
  const empty = s === "misc" && !c.notes.misc.length ? "Здесь можно хранить что угодно: законы мира, слухи, план города, правила Мастера. Каждую заметку можно свернуть до названия." : c.notes[s].length ? "Под этот фильтр ничего не подходит" : "Здесь пока пусто";
  return list.map(n => noteCard(n, s, ui, "")).join("") || `<p class="empty">${empty}</p>`;
}

export function tabNotes(ctx) {
  const { c, ui } = ctx;
  const s = ui.notesSection || "patron";
  const searching = !!String(ui.notesQ || "").trim();
  const nav = `<div class="subtabs">${NOTE_SECTIONS.map(([k, l, ic]) => `<button class="subtab ${s === k && !searching ? "on" : ""}" data-act="notes-section" data-k="${k}">${icon(ic)}${l}${c.notes[k].length ? `<small>${c.notes[k].length}</small>` : ""}</button>`).join("")}</div>`;
  const search = `<label class="search-box notes-search">${icon("search")}<input type="search" data-ui="notes-q" placeholder="Поиск по всем заметкам" value="${esc(ui.notesQ || "")}" aria-label="Поиск по всем заметкам"></label>`;
  const tags = [...new Set(c.notes[s].flatMap(noteTags))].sort((a, b) => a.localeCompare(b, "ru"));
  const att = s === "people" ? [["all", "Все"], ["ally", "Союзники"], ["neutral", "Нейтральные"], ["hostile", "Враги"], ["unknown", "Неизвестно"]] : [];
  const pa = ui.peopleAtt || "all";
  const filters = `<div class="note-filters" ${searching ? "hidden" : ""}>${att.map(([k, l]) => `<button class="chip toggle ${pa === k ? "on" : ""}" data-act="people-att" data-k="${k}" aria-pressed="${pa === k ? "true" : "false"}">${l}</button>`).join("")}${tags.map(t => `<button class="tag ${ui.noteTag === t ? "on" : ""}" data-act="note-tag" data-k="${esc(t)}" aria-pressed="${ui.noteTag === t ? "true" : "false"}">#${esc(t)}</button>`).join("")}</div>`;
  const label = { patron: "Запись", quests: "Задание", people: "Человек", misc: "Заметка" }[s];
  const fold = c.notes[s].length > 1 ? `<button class="btn ghost sm" data-act="fold-notes" data-sec="${s}" data-v="1">${icon("minus")}Свернуть все</button><button class="btn ghost sm" data-act="fold-notes" data-sec="${s}" data-v="0">${icon("plus")}Развернуть все</button>` : "";
  return nav + search + filters + `<div class="notes-head" ${searching ? "hidden" : ""}>${fold}<span class="spacer"></span>${addBtn("add-note", label, `data-sec="${s}"`)}</div><div class="notes ${s === "misc" ? "single" : ""}" data-notes-list>${notesList(ctx)}</div>`;
}

export function tabStory(ctx) {
  const { c } = ctx;
  const idFields = [["info.race", "Раса"], ["info.subrace", "Подраса"], ["info.cls", "Класс"], ["info.subclass", "Подкласс"], ["info.background", "Предыстория"], ["info.alignment", "Мировоззрение"], ["info.age", "Возраст"], ["info.patron", "Покровитель"], ["info.setting", "Сеттинг"], ["info.player", "Игрок"]];
  const val = p => p.split(".").reduce((o, k) => (o ? o[k] : ""), c);
  const ids = idFields.map(([p, l]) => `<label class="fld compact"><span>${l}</span><input type="text" data-path="${p}" value="${esc(val(p) ?? "")}"></label>`).join("");
  const blocks = [["appearance", "Внешность", "eye"], ["traits", "Черты характера", "mask"], ["ideals", "Идеалы", "star"], ["bonds", "Привязанности", "heart"], ["flaws", "Слабости", "skull"], ["backstory", "Предыстория", "scroll"], ["allies", "Союзники и организации", "people"]];
  return panel("Кто это", `<div class="id-grid">${ids}</div>`, { ic: "user" }) +
    `<div class="story-grid">${blocks.map(([k, l, ic]) => panel(l, `<textarea class="autogrow parchment" rows="3" data-path="personality.${k}" placeholder="${l}">${esc(c.personality[k])}</textarea>`, { ic, cls: k === "backstory" ? "wide" : "" })).join("")}</div>`;
}

export const RENDER = { char: tabChar, combat: tabCombat, spells: tabSpells, features: tabFeatures, inventory: tabInventory, notes: tabNotes, story: tabStory };
