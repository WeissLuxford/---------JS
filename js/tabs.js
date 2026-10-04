import { ABILITIES, SKILLS, DAMAGE, ACTIONS, FEATURE_CATS, RARITY, CONDITIONS, fmt, usesInfo, spellCast } from "./rules.js";
import { icon, actionMark, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, pips, rich } from "./ui.js";
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
    <div class="hp-wrap ${dying ? "dying" : ""}">
      <button class="hp-big" data-act="hp">
        <span class="hp-nums"><span data-calc="hp">${cur}</span><small>/ <span data-calc="hpmax">${d.hpMax}</span></small></span>
        ${tmp ? `<span class="hp-temp">+${tmp} врем.</span>` : ""}
      </button>
      <div class="hp-bar"><i data-hpbar style="width:${pct}%"></i>${tmp ? `<b style="width:${Math.min(100, (tmp / Math.max(1, d.hpMax)) * 100)}%"></b>` : ""}</div>
      <div class="hp-actions">
        <button class="btn danger sm" data-act="hp" data-mode="dmg">${icon("swords")}Урон</button>
        <button class="btn heal sm" data-act="hp" data-mode="heal">${icon("heart")}Лечение</button>
        <button class="btn ghost sm" data-act="hp" data-mode="temp">${icon("shield")}Врем.</button>
      </div>
      <div class="hd-row">
        <span>Кости хитов: <b data-calc="hd">${d.hitDice.left}/${d.hitDice.total}</b> ${esc(c.hitDie)}</span>
        <button class="btn ghost sm" data-act="spend-hd" ${d.hitDice.left ? "" : "disabled"}>${icon("d20")}Потратить</button>
      </div>
      ${death}
    </div>`, { ic: "heart", cls: "hp-panel" });
}

function statMedal(label, value, { calc, act, roll, ic, card } = {}) {
  const tag = act || roll ? "button" : "div";
  return `<${tag} class="medal" ${act ? `data-act="${act}"` : ""} ${roll ? `data-roll="${roll}"` : ""} ${card ? `data-card="${card}"` : ""}>${ic ? icon(ic) : ""}<span class="medal-v" ${calc ? `data-calc="${calc}"` : ""}>${esc(value)}</span><span class="medal-l">${esc(label)}</span></${tag}>`;
}

function concentrationBar(c) {
  if (!c.concentration) return "";
  return `<div class="conc-bar">${icon("spiral")}<span>Концентрация: <b>${esc(c.concentration)}</b></span><span class="spacer"></span><button class="btn ghost sm" data-roll="save:con" title="Спасбросок Телосложения">${icon("d20")}Спасбросок</button><button class="btn ghost sm" data-act="drop-conc">Снять</button></div>`;
}

function activeConditions(c) {
  const list = CONDITIONS.filter(k => c.conditions[k.key]);
  if (!list.length && !c.exhaustion) return "";
  return `<div class="cond-active">${list.map(k => `<span class="chip bad" data-card="condition:${k.key}">${esc(k.name)}</span>`).join("")}${c.exhaustion ? `<span class="chip bad">Истощение ${esc(c.exhaustion)}</span>` : ""}</div>`;
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
      <button class="prof ${c.saves[a.key] ? "p1" : ""}" data-act="toggle-save" data-k="${a.key}" title="Владение"></button>
      <button class="row-name" data-roll="save:${a.key}">${a.name}</button>
      <span class="row-val" data-calc="save.${a.key}">${fmt(d.saves[a.key])}</span>
    </div>`).join("");
  const skills = SKILLS.map(s => {
    const p = Number(c.skills[s.key]) || 0;
    return `<div class="row" data-card="skill:${s.key}">
      <button class="prof p${p}" data-act="cycle-skill" data-k="${s.key}" title="Нет / владение / компетентность"></button>
      <button class="row-name" data-roll="skill:${s.key}">${s.name}<small>${abShort(s.ab)}</small></button>
      <span class="row-val" data-calc="skill.${s.key}">${fmt(d.skills[s.key])}</span>
    </div>`;
  }).join("");
  const prof = [["armor", "Доспехи"], ["weapons", "Оружие"], ["tools", "Инструменты"], ["languages", "Языки"]].map(([k, l]) => `
    <label class="fld inline"><span>${l}</span><textarea class="autogrow" rows="1" data-path="proficiencies.${k}">${esc(c.proficiencies[k])}</textarea></label>`).join("");

  return `
  <div class="char-grid">
    <div class="col col-left">
      ${panel("Характеристики", `<div class="abil-grid">${abil}</div>`, { ic: "star" })}
      ${panel("Спасброски", `<div class="rows">${saves}</div>`, { ic: "shield" })}
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
        ${statMedal("КД", d.ac, { calc: "ac", act: "edit-armor", ic: "shield" })}
        ${statMedal("Инициатива", fmt(d.init), { calc: "init", roll: "init", ic: "bolt" })}
        ${statMedal("Скорость", c.speed + " фт", { calc: "speed", act: "edit-info", ic: "boot" })}
        ${statMedal("Мастерство", fmt(d.pb), { calc: "pb", ic: "star" })}
      </div>
      ${concentrationBar(c)}
      ${activeConditions(c)}
      ${hpPanel(ctx)}
      ${panel("Чувства", `
        <div class="senses">
          <div><span>Пассивная Внимательность</span><b data-calc="pp">${d.passive.perception}</b></div>
          <div><span>Пассивная Проницательность</span><b data-calc="pi">${d.passive.insight}</b></div>
          <div><span>Пассивный Анализ</span><b data-calc="pinv">${d.passive.investigation}</b></div>
          ${c.senses ? `<div class="full"><span>${esc(c.senses)}</span></div>` : ""}
          ${c.resistances ? `<div class="full"><span>Сопротивления: ${esc(c.resistances)}</span></div>` : ""}
        </div>`, { ic: "eye" })}
    </div>
    <div class="col col-right">
      ${panel("Навыки", `<div class="rows">${skills}</div>`, { ic: "d20" })}
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

export function tabCombat(ctx) {
  const { c } = ctx;
  const attacks = c.attacks.map(a => attackRow(ctx, a)).join("") || `<p class="empty">Атак пока нет</p>`;
  const conds = CONDITIONS.map(k => `<button class="chip toggle ${c.conditions[k.key] ? "on bad" : ""}" data-act="toggle-cond" data-k="${k.key}" data-card="condition:${k.key}">${esc(k.name)}</button>`).join("");
  const exh = `<div class="exh"><span>Истощение</span>${[0, 1, 2, 3, 4, 5, 6].map(i => `<button class="chip toggle ${c.exhaustion === i ? "on" : ""}" data-act="exhaustion" data-i="${i}">${i}</button>`).join("")}</div>`;
  const slots = slotsBlock(ctx);
  const res = resourceRows(ctx);
  return `
  <div class="combat-grid">
    <div class="col">
      <div class="rest-row">
        <button class="btn" data-act="short-rest">${icon("campfire")}Короткий отдых</button>
        <button class="btn" data-act="long-rest">${icon("moon")}Длинный отдых</button>
      </div>
      ${concentrationBar(c)}
      ${hpPanel(ctx)}
      ${panel("Состояния", `<div class="chips">${conds}</div>${exh}`, { ic: "skull" })}
    </div>
    <div class="col">
      ${panel("Атаки", `<div class="atk-list">${attacks}</div>`, { ic: "swords", actions: addBtn("add-attack", "Атака") })}
      ${slots || res ? panel("Ресурсы", `${slots}${res}`, { ic: "hourglass" }) : ""}
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
  const flags = [sp.concentration ? `<i class="flag" title="Концентрация">К</i>` : "", sp.ritual ? `<i class="flag" title="Ритуал">Р</i>` : ""].join("");
  return `<button class="tile" data-open="spell:${esc(sp.id)}" data-card="spell:${esc(sp.id)}" style="--c:${ic.color}">
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
  const groups = {};
  c.spells.forEach(s => {
    const l = Number(s.level) || 0;
    (groups[l] = groups[l] || []).push(s);
  });
  const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const lists = levels.map(l => panel(l === 0 ? "Заговоры" : `${l} круг`, `<div class="tiles">${groups[l].sort((a, b) => a.name.localeCompare(b.name, "ru")).map(s => spellTile(ctx, s)).join("")}</div>`, { ic: l === 0 ? "sparkle" : "book" })).join("");
  return `
    ${panel("Заклинательство", head, { ic: "book", actions: addBtn("add-spell", "Заклинание") })}
    ${concentrationBar(c)}
    ${lists || `<p class="empty">Заклинаний пока нет. Нажми «Заклинание», чтобы добавить.</p>`}`;
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

const INV_FILTERS = [["all", "Все"], ["equipped", "Надето"], ["artifact", "Артефакты"], ["weapon", "Оружие"], ["armor", "Броня"], ["consumable", "Расходники"], ["other", "Прочее"]];

export function tabInventory(ctx) {
  const { c, d, ui } = ctx;
  const f = ui.invFilter || "all";
  const items = c.items.filter(it => {
    if (f === "all") return true;
    if (f === "equipped") return it.equipped;
    if (f === "other") return !["artifact", "weapon", "armor", "consumable"].includes(it.type);
    return it.type === f;
  });
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
      <div class="inv-grid">${grid || `<p class="empty">Пусто</p>`}</div>`, { ic: "bag", actions: addBtn("add-item", "Предмет") })}`;
}

const NOTE_SECTIONS = [["patron", "Покровитель", "pact"], ["quests", "Задания", "flag"], ["people", "Люди", "people"], ["misc", "Прочее", "notebook"]];
const STATUS = { active: ["Активно", "#e9c77a"], done: ["Выполнено", "#4fcf6a"], failed: ["Провалено", "#e5533d"] };
const ATTITUDE = { ally: ["Союзник", "#4fcf6a"], neutral: ["Нейтрально", "#c9b48a"], hostile: ["Враг", "#e5533d"] };

export function tabNotes(ctx) {
  const { c, ui } = ctx;
  const s = ui.notesSection || "patron";
  const nav = `<div class="subtabs">${NOTE_SECTIONS.map(([k, l, ic]) => `<button class="subtab ${s === k ? "on" : ""}" data-act="notes-section" data-k="${k}">${icon(ic)}${l}${k !== "misc" && c.notes[k].length ? `<small>${c.notes[k].length}</small>` : ""}</button>`).join("")}</div>`;
  if (s === "misc") {
    return nav + panel("Прочие заметки", `<textarea class="autogrow big-text" rows="10" data-path="notes.misc" placeholder="Всё, что не влезло в другие разделы">${esc(c.notes.misc)}</textarea>`, { ic: "notebook" });
  }
  let list = c.notes[s].slice();
  if (s === "quests") {
    const order = { active: 0, "": 1, done: 2, failed: 3 };
    list.sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
  }
  const cards = list.map(n => {
    const st = s === "quests" ? STATUS[n.status] : s === "people" ? ATTITUDE[n.attitude] : null;
    return `<article class="note ${n.status === "done" || n.status === "failed" ? "dim" : ""}">
      <header><div><h4>${esc(n.title || "Без названия")}</h4>${n.subtitle ? `<div class="note-sub">${esc(n.subtitle)}</div>` : ""}</div><span class="spacer"></span>${st ? `<span class="badge" style="--c:${st[1]}">${st[0]}</span>` : ""}<button class="icon-btn" data-act="edit-note" data-sec="${s}" data-id="${esc(n.id)}" title="Изменить">${icon("edit")}</button></header>
      <div class="note-text">${rich(n.text)}</div>
    </article>`;
  }).join("");
  const label = { patron: "Запись", quests: "Задание", people: "Человек" }[s];
  return nav + `<div class="notes-head">${addBtn("add-note", label, `data-sec="${s}"`)}</div><div class="notes">${cards || `<p class="empty">Здесь пока пусто</p>`}</div>`;
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
