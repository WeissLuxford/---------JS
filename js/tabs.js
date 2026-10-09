import { ABILITIES, SKILLS, DAMAGE, ACTIONS, FEATURE_CATS, RARITY, CONDITIONS, DEFENSE_KINDS, containerTree, fmt, usesInfo, spellCast, effectSummary, spellInCombat, itemInCombat, featureInCombat, xpInfo, ammoFor, sceneInfo } from "./rules.js";
import { icon, actionMark, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, pips, rich } from "./ui.js";
import { spellIcon, itemIcon, featureIcon, attackIcon, spellAtk, spellDc, fmtNum, PROF_KINDS } from "./entities.js";
import { NOTE_SECTIONS, SECTION_NAME, NOTE_STATUS, NOTE_ATTITUDE, CLUE_STATE, noteTagsOf, searchNotes, queryStems, highlight, snippetHtml, plainText, richLinks, backlinks, currentSession, pinnedNotes, linkTargets } from "./notes.js";

export const TABS = [
  { key: "char", name: "Персонаж", short: "Герой", icon: "user" },
  { key: "combat", name: "Бой", icon: "swords" },
  { key: "spells", name: "Магия", icon: "book" },
  { key: "features", name: "Умения", icon: "pact" },
  { key: "inventory", name: "Снаряжение", short: "Вещи", icon: "bag" },
  { key: "notes", name: "Заметки", icon: "scroll" },
  { key: "story", name: "Личность", icon: "feather" }
];

const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || "";

function panel(title, body, { ic, actions = "", cls = "" } = {}) {
  return `<section class="panel ${cls}"><header class="panel-h">${ic ? icon(ic) : ""}<h3>${esc(title)}</h3><span class="spacer"></span>${actions}</header><div class="panel-b">${body}</div></section>`;
}

export function orderBtn(ctx) {
  const on = !!(ctx.ui && ctx.ui.ordering);
  return `<button class="btn ${on ? "gold" : "ghost"} sm order-btn" data-act="toggle-order" aria-pressed="${on ? "true" : "false"}">${icon(on ? "check" : "menu")}${on ? "Готово" : "Порядок"}</button>`;
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
    ? `<span class="death-state bad">${icon("coffin")} Персонаж погиб</span>`
    : stable
      ? `<span class="death-state ok">${icon("sleep")} Стабилизирован, без сознания</span>`
      : `<button class="btn sm" data-roll="death">${icon("d20")} Спасбросок от смерти</button>`;
  const death = dying ? `<div class="death">
      <div class="death-row"><span>Успехи</span>${[0, 1, 2].map(i => `<button class="ds ok ${i < c.hp.deathSuccess ? "on" : ""}" data-act="death" data-k="deathSuccess" data-i="${i}" aria-label="Успех ${i + 1}"><i class="sc-flame"></i></button>`).join("")}</div>
      <div class="death-row"><span>Провалы</span>${[0, 1, 2].map(i => `<button class="ds bad ${i < c.hp.deathFail ? "on" : ""}" data-act="death" data-k="deathFail" data-i="${i}" aria-label="Провал ${i + 1}">${icon("skull")}</button>`).join("")}</div>
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

function xpRow(c) {
  const x = xpInfo(c);
  if (!x.next) return "";
  return `<div class="xp-row ${x.canLevel ? "ready" : ""}"><div class="xp-bar"><i style="width:${x.pct}%"></i></div><span class="xp-t">${x.canLevel ? `Опыта хватает на ${x.levelByXp} уровень!` : `Опыт ${x.xp} / ${x.next} до ${x.level + 1} уровня`}</span>${x.canLevel ? `<button class="btn gold sm" data-act="level-up">${icon("star")}Повысить уровень</button>` : ""}<button class="btn ghost sm" data-act="add-xp">${icon("plus")}Опыт</button></div>`;
}

function inspirationBtn(c, compact = false) {
  return `<button class="insp ${compact ? "compact" : ""} ${c.inspiration ? "on" : ""}" data-act="inspiration" data-card="stat:inspiration" aria-pressed="${c.inspiration ? "true" : "false"}">${icon("sun")}<span>${c.inspiration ? "Вдохновение есть" : "Нет вдохновения"}</span></button>`;
}

function statMedal(label, value, { calc, act, roll, ic, card, slow } = {}) {
  const tag = act || roll ? "button" : "div";
  return `<${tag} class="medal ${slow ? "slow" : ""}" ${act ? `data-act="${act}"` : ""} ${roll ? `data-roll="${roll}"` : ""} ${card ? `data-card="${card}"` : ""}>${ic ? icon(ic) : ""}<span class="medal-v" ${calc ? `data-calc="${calc}"` : ""}>${esc(value)}</span><span class="medal-l">${esc(label)}</span></${tag}>`;
}

export function emptyState(text) {
  return `<div class="empty-state"><span class="es-art">${icon("web")}<i class="es-spider">${icon("spider")}</i></span><p class="empty">${esc(text)}</p></div>`;
}

export function sceneChip(c) {
  const s = sceneInfo(c);
  return `<button class="scene-chip ${s.set ? "" : "off"}" data-act="scene" title="Время суток и погода">${icon(s.icon)}<span>${s.set ? esc(s.text) : "Обстановка"}</span></button>`;
}

function concentrationBar(c) {
  if (!c.concentration) return "";
  return `<div class="conc-bar">${icon("candle", "flicker")}<span>Концентрация: <b>${esc(c.concentration)}</b></span><span class="spacer"></span><button class="btn ghost sm" data-roll="save:con" title="Спасбросок Телосложения">${icon("d20")}Спасбросок</button><button class="btn ghost sm" data-act="drop-conc">Снять</button></div>`;
}

function activeConditions(c) {
  const list = CONDITIONS.filter(k => c.conditions[k.key]);
  if (!list.length && !c.exhaustion && !(c.effects || []).length) return "";
  return `<div class="cond-active">${list.map(k => `<span class="chip bad" data-card="condition:${k.key}">${icon(k.icon || "skull")}${esc(k.name)}</span>`).join("")}${c.exhaustion ? `<span class="chip bad" data-card="stat:exhaustion">Истощение ${esc(c.exhaustion)}</span>` : ""}${(c.effects || []).map(e => `<span class="chip eff" data-card="effect:${esc(e.id)}">${icon("sparkle")}${esc(e.name)}</span>`).join("")}</div>`;
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
      <button class="abil-top" data-roll="check:${a.key}"><span class="abil-name">${a.short}</span><span class="abil-mod" data-calc="mod.${a.key}">${fmt(d.mods[a.key])}</span><span class="abil-score" data-calc="score.${a.key}">${esc(c.abilities[a.key])}</span></button>
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
  const prof = PROF_KINDS.map(([k, l]) => {
    const list = String(c.proficiencies[k] || "").split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
    return `<div class="prof-line"><span class="prof-l">${l}</span><span class="prof-chips">${list.length ? list.map(x => `<span class="prof-chip">${esc(x)}</span>`).join("") : `<span class="dim">Нет</span>`}</span></div>`;
  }).join("");
  const caster = c.spellAbility && ((c.spells || []).length || (c.casterType && c.casterType !== "none"));
  const spellLine = caster ? `<button class="spell-line" data-act="go-tab" data-to="spells">${icon("book")}<span>Заклинания: СЛ <b data-calc="dc">${d.spell.dc}</b> · атака <b data-calc="satk">${fmt(d.spell.atk)}</b></span></button>` : "";

  return `
  <div class="char-grid">
    <div class="col col-left">
      ${panel("Характеристики", `<div class="abil-grid">${abil}</div>`, { ic: "star", cls: "p-abil", actions: `<button class="btn ghost sm" data-act="edit-abilities">${icon("edit")}Изменить</button>` })}
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
      <div class="scene-row">${sceneChip(c)}</div>
      ${xpRow(c)}
      <div class="medals">
        ${statMedal("КД", d.ac, { calc: "ac", act: "edit-armor", ic: "shield", card: "stat:ac" })}
        ${statMedal("Инициатива", fmt(d.init), { calc: "init", roll: "init", ic: "bolt", card: "stat:init" })}
        ${statMedal("Скорость", d.speed + " фт", { calc: "speed", act: "edit-info", ic: "boot", card: "stat:speed", slow: d.speed < d.baseSpeed })}
        ${statMedal("Мастерство", fmt(d.pb), { calc: "pb", ic: "star", card: "stat:pb" })}
      </div>
      ${spellLine}
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
  ${panel("Владения и языки", `<div class="prof-grid">${prof}</div>`, { ic: "wrench", actions: `<button class="btn ghost sm" data-act="edit-prof">${icon("edit")}Изменить</button>` })}`;
}

function combatRow({ rid, open, name, sub, color, ic, hit, dmg }) {
  return `<div class="atk-row" data-rid="${esc(rid)}">
    <button class="atk-name" data-open="${esc(open)}" data-card="${esc(open)}" style="--c:${color}">${icon(ic)}<span><b>${esc(name)}</b><small>${esc(sub || "")}</small></span></button>
    ${hit}
    ${dmg}
  </div>`;
}

function dmgChip(roll, beams, dice, type) {
  if (!dice) return "";
  const dt = DAMAGE[type] || DAMAGE.bludgeoning;
  return `<button class="chip dmg" data-roll="${esc(roll)}" style="--c:${dt.color}">${beams > 1 ? beams + "× " : ""}${esc(dice)} <span>${esc(dt.name.toLowerCase())}</span></button>`;
}

function attackRow(ctx, at) {
  const s = ctx.d.attacks[at.id];
  const dt = DAMAGE[s.type] || DAMAGE.bludgeoning;
  const hit = s.kind === "save"
    ? `<span class="chip dc">СЛ ${s.dc} ${abShort(s.save)}</span>`
    : `<button class="chip hit" data-roll="attack:${esc(at.id)}">${s.beams > 1 ? `<small>${s.beams}×</small>` : ""}${fmt(s.hit)}</button>`;
  return combatRow({ rid: at.id, open: "attack:" + at.id, name: at.name, sub: (at.range || "") + ammoNote(ctx.c, at), color: dt.color, ic: at.icon || attackIcon(at.name) || dt.icon, hit, dmg: dmgChip("dmg:" + at.id, s.beams, s.dmg, s.type) });
}

function weaponRow(ctx, it) {
  const w = ctx.d.weapons[it.id];
  const dt = DAMAGE[w.type] || DAMAGE.bludgeoning;
  const hit = `<button class="chip hit" data-roll="iattack:${esc(it.id)}">${fmt(w.hit)}</button>`;
  return combatRow({ rid: it.id, open: "item:" + it.id, name: it.name, sub: (w.range || "") + ammoNote(ctx.c, it), color: dt.color, ic: itemIcon(it), hit, dmg: dmgChip("idmg:" + it.id, 1, w.dmg + (w.lines.length > 1 ? " + …" : ""), w.type) });
}

function spellRow(ctx, sp) {
  const { c, d } = ctx;
  const cast = spellCast(c, d, sp);
  const first = cast.lines.find(l => l.type !== "healing" && l.type !== "temp") || cast.lines[0];
  const ic = spellIcon(c, sp);
  const hit = sp.attack
    ? `<button class="chip hit" data-roll="sattack:${esc(sp.id)}">${cast.beams > 1 ? `<small>${cast.beams}×</small>` : ""}${fmt(spellAtk(d, sp))}</button>`
    : sp.save ? `<span class="chip dc">СЛ ${spellDc(d, sp)} ${abShort(sp.save)}</span>` : `<span></span>`;
  return combatRow({ rid: sp.id, open: "spell:" + sp.id, name: sp.name, sub: [Number(sp.level) ? `${sp.level} круг` : "заговор", sp.range].filter(Boolean).join(" · "), color: ic.color, ic: ic.icon, hit, dmg: first ? dmgChip("sdmg:" + sp.id, cast.beams, first.dice, first.type) : "" });
}

const nameKey = s => String(s || "").trim().toLowerCase().replace(/ё/g, "е");

export function combatSources(c, d) {
  const weapons = (c.items || []).filter(it => d.weapons[it.id]);
  const spells = (c.spells || []).filter(spellInCombat);
  const pinned = [...(c.features || []).filter(featureInCombat).map(e => ({ kind: "feature", e })), ...(c.items || []).filter(it => !d.weapons[it.id] && itemInCombat(it, d)).map(e => ({ kind: "item", e }))];
  const taken = new Set([...weapons, ...spells].map(x => nameKey(x.name)));
  const dupes = c.attacks.filter(a => taken.has(nameKey(a.name)));
  return { weapons, spells, pinned, own: c.attacks.filter(a => !dupes.includes(a)), dupes };
}

function ammoNote(c, holder) {
  const a = ammoFor(c, holder);
  return a ? ` · ${a.name}: ${a.qty}` : "";
}

function pinnedRow(ctx, { kind, e }) {
  const { c, d } = ctx;
  const u = usesInfo(d, e);
  const ic = kind === "item" ? itemIcon(e) : featureIcon(e);
  const color = kind === "item" ? (RARITY[e.rarity] || RARITY.common).color : "#c9a0ff";
  const hit = u ? `<button class="chip hit pin-use ${u.left ? "" : "off"}" data-act="pin-use" data-ref="${kind}:${esc(e.id)}" title="Использовать">${icon("check")}${u.left}/${u.max}</button>` : `<span></span>`;
  const first = (e.damage || [])[0];
  const dmg = first ? `<button class="chip dmg" data-act="pin-dmg" data-ref="${kind}:${esc(e.id)}" style="--c:${(DAMAGE[first.type] || DAMAGE.bludgeoning).color}">${esc(first.dice)} <span>${esc(((DAMAGE[first.type] || {}).name || "").toLowerCase())}</span></button>` : "";
  return combatRow({ rid: e.id, open: kind + ":" + e.id, name: e.name, sub: (ACTIONS[e.action] || {}).name || "", color, ic, hit, dmg });
}

function attacksPanel(ctx) {
  const { c, d } = ctx;
  const src = combatSources(c, d);
  const group = (title, key, html) => (html ? `${title ? `<div class="atk-group">${title}</div>` : ""}<div class="atk-list" data-reorder="${key}">${html}</div>` : "");
  const body = group(src.weapons.length && (src.spells.length || src.own.length) ? "Оружие" : "", "items", src.weapons.map(it => weaponRow(ctx, it)).join("")) +
    group(src.spells.length && (src.weapons.length || src.own.length) ? "Заклинания" : "", "spells", src.spells.map(sp => spellRow(ctx, sp)).join("")) +
    group(src.own.length && (src.weapons.length || src.spells.length) ? "Свои атаки" : "", "attacks", src.own.map(a => attackRow(ctx, a)).join("")) +
    group(src.pinned.length ? "Закреплено" : "", "pinned", src.pinned.map(p => pinnedRow(ctx, p)).join(""));
  const spent = Object.values((ctx.ui && ctx.ui.ammoSpent) || {}).reduce((a, b) => a + b, 0);
  const collect = spent ? `<div class="ammo-bar">${icon("arrow")}<span>Выпущено боеприпасов: ${spent}. После боя можно собрать половину.</span><button class="btn ghost sm" data-act="collect-ammo">Собрать ${Math.floor(spent / 2)}</button></div>` : "";
  const dupes = src.dupes.length ? `<div class="dupe-bar">${icon("info")}<span>${esc(src.dupes.map(a => a.name).join(", "))}: эти записи атак повторяют заклинания или оружие, поэтому спрятаны.</span><button class="btn ghost sm" data-act="dedupe-attacks">${icon("trash")}Удалить копии</button></div>` : "";
  const hint = `<p class="hint atk-hint explain">Сюда само попадает надетое оружие, заклинания с уроном (у тех, кто готовит заклинания, только подготовленные), надетые вещи с действием и зарядами и умения с уроном. Убрать или закрепить: «В панели боя» в настройках записи.</p>`;
  return panel("Атаки", `${dupes}${body || emptyState("Атак пока нет")}${collect}${hint}`, { ic: "swords", actions: orderBtn(ctx) + addBtn("add-attack", "Атака"), cls: "p-attacks" });
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

const TURN = [["action", "Действие"], ["bonus", "Бонусное"], ["reaction", "Реакция"]];

export function turnBar(ctx) {
  const t = (ctx.ui && ctx.ui.turn) || {};
  return `<div class="turn-bar ${ctx.c ? "with-insp" : ""}" data-turn>${TURN.map(([k, l]) => {
    const a = ACTIONS[k];
    const used = !!t[k];
    return `<button class="turn-slot ${used ? "used" : ""}" data-act="turn-open" data-k="${k}" style="--c:${a.color}" aria-label="${l}: ${used ? "потрачено" : "доступно"}. Показать, что можно сделать" title="Что можно сделать"><span class="turn-mark">${actionMark(a.shape, a.color)}</span><span>${l}</span></button>`;
  }).join("")}<button class="turn-slot move" data-act="turn-open" data-k="move" style="--c:#c9b48a" title="Движение и прыжки"><span class="turn-mark">${icon("boot")}</span><span>Движение</span></button>${ctx.c ? inspirationBtn(ctx.c, true) : ""}<button class="btn sm turn-new" data-act="new-turn" title="Вернуть действия и отсчитать раунд у эффектов">${icon("history")}Новый ход</button></div>`;
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

export function roundsText(n) {
  if (n == null) return "пока не снимешь";
  if (n >= 600) return `${Math.round(n / 600)} ч`;
  if (n >= 10) return `${Math.round(n / 10)} мин`;
  return `${n} ${n === 1 ? "раунд" : n < 5 ? "раунда" : "раундов"}`;
}

function effectsPanel(ctx) {
  const { c } = ctx;
  const list = c.effects || [];
  const rows = list.map(e => `<div class="eff-row" data-rid="${esc(e.id)}" data-card="effect:${esc(e.id)}">
      <button class="eff-name" data-act="edit-effect" data-id="${esc(e.id)}"><b>${esc(e.name)}</b><small>${esc(effectSummary(e) || e.note || "без чисел")}</small></button>
      <span class="eff-left ${e.rounds != null && e.rounds <= 1 ? "low" : ""}">${esc(roundsText(e.rounds))}${e.once ? " · 1 раз" : ""}${e.mine ? " · К" : ""}</span>
      <button class="icon-btn" data-act="remove-effect" data-id="${esc(e.id)}" title="Снять" aria-label="Снять «${esc(e.name)}»">${icon("close")}</button>
    </div>`).join("");
  const timed = list.some(e => e.rounds != null);
  const actions = `${timed ? `<button class="btn ghost sm" data-act="next-round" title="Уменьшить длительность эффектов на 1 раунд">${icon("hourglass")}Раунд</button>` : ""}<button class="btn ghost sm" data-act="add-effect">${icon("plus")}Эффект</button>`;
  const has = k => list.some(e => e.preset === k);
  const cover = `<div class="cover-row"><span>Укрытие:</span><button class="chip toggle ${has("cover2") ? "on" : ""}" data-act="cover" data-k="cover2" aria-pressed="${has("cover2")}">½ · +2 КД</button><button class="chip toggle ${has("cover5") ? "on" : ""}" data-act="cover" data-k="cover5" aria-pressed="${has("cover5")}">¾ · +5 КД</button></div>`;
  return panel("Эффекты", `${cover}${rows ? `<div class="eff-list">${rows}</div>${timed ? `<div class="eff-foot"><button class="btn ghost sm" data-act="end-combat">${icon("check")}Бой окончен: снять эффекты до минуты</button></div>` : ""}` : `<p class="hint eff-empty explain">Благословение, Сглаз, Щит и другие: прибавляются к броскам, КД и урону сами.</p>`}`, { ic: "sparkle", cls: `effects-panel ${rows ? "" : "empty"}`, actions });
}

function conditionsPanel(ctx) {
  const { c, ui } = ctx;
  const active = CONDITIONS.filter(k => c.conditions[k.key]);
  const open = ui.condOpen != null ? ui.condOpen : active.length > 0 || c.exhaustion > 0;
  const conds = CONDITIONS.map(k => `<button class="chip toggle ${c.conditions[k.key] ? "on bad" : ""}" data-act="toggle-cond" data-k="${k.key}" data-card="condition:${k.key}" aria-pressed="${c.conditions[k.key] ? "true" : "false"}">${icon(k.icon || "skull")}${esc(k.name)}</button>`).join("");
  const exh = `<div class="exh"><span data-card="stat:exhaustion">Истощение</span>${[0, 1, 2, 3, 4, 5, 6].map(i => `<button class="chip toggle ${c.exhaustion === i ? "on" : ""}" data-act="exhaustion" data-i="${i}" aria-pressed="${c.exhaustion === i ? "true" : "false"}" aria-label="Истощение ${i}">${i}</button>`).join("")}</div>`;
  const summary = [...active.map(k => [k.icon, k.name]), c.exhaustion ? ["sleep", `Истощение ${c.exhaustion}`] : null].filter(Boolean);
  return `<details class="panel cond-panel" data-ui-open="condOpen" ${open ? "open" : ""}>
    <summary class="panel-h">${icon("skull")}<h3>Состояния</h3><span class="cond-sum">${summary.length ? summary.map(([ic, t]) => `<span class="chip bad">${icon(ic || "skull")}${esc(t)}</span>`).join("") : `<span class="dim">нет</span>`}</span><span class="spacer"></span><span class="cond-chev">${icon("down")}</span></summary>
    <div class="panel-b"><p class="hint explain">Отмеченные состояния сами дают помеху или преимущество на броски. Зажми или наведи, чтобы прочитать описание.</p><div class="chips">${conds}</div>${exh}</div>
  </details>`;
}

export function tabCombat(ctx) {
  const { c } = ctx;
  const slots = slotsBlock(ctx);
  const res = resourceRows(ctx);
  return `
  ${combatStrip(ctx)}
  ${turnBar(ctx)}
  <div class="combat-grid">
    <div class="col">
      <div class="rest-row">
        <button class="btn" data-act="dice">${icon("d20")}Кубы</button>
        <button class="btn" data-act="short-rest">${icon("campfire")}Короткий</button>
        <button class="btn" data-act="long-rest">${icon("moon")}Длинный</button>
      </div>
      <div class="combat-scene">${sceneChip(c)}</div>
      ${concentrationBar(c)}
      ${hpPanel(ctx)}
      ${effectsPanel(ctx)}
      ${conditionsPanel(ctx)}
    </div>
    <div class="col">
      ${attacksPanel(ctx)}
      ${slots || res ? panel("Ресурсы", `${slots}${res}`, { ic: "hourglass", cls: "p-res" }) : ""}
      ${importantPanel(c)}
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
  return `<button class="tile ${unprep ? "unprep" : ""}" data-rid="${esc(sp.id)}" data-open="spell:${esc(sp.id)}" data-card="spell:${esc(sp.id)}" data-search="${esc(search)}" style="--c:${ic.color}">
    <span class="tile-ic">${icon(ic.icon)}</span>
    <span class="tile-main"><span class="tile-name">${esc(sp.name)}</span><span class="tile-sub">${actionMark(a.shape, a.color)}<span class="tile-sub-t">${esc(sp.castTime || a.name)}${dmg ? ` · <span class="tile-dmg">${esc(dmg)}</span>` : ""}</span></span></span>
    <span class="tile-side">${flags}${u ? pips(u.max, u.left, "#e9a54a") : ""}</span>
  </button>`;
}

export function tabSpells(ctx) {
  const { c, d } = ctx;
  const abil = (ABILITIES.find(a => a.key === c.spellAbility) || {}).name || "не выбрана";
  const head = `
    <div class="spell-head">
      ${statMedal("СЛ спасброска", d.spell.dc, { calc: "dc", ic: "drop" })}
      ${statMedal("Бонус атаки", fmt(d.spell.atk), { calc: "satk", roll: "spellatk", ic: "target" })}
      ${statMedal("Модификатор", fmt(d.spell.mod), { ic: "star" })}
    </div>
    <button class="spell-abil" data-act="spell-ability" title="Изменить заклинательную характеристику">Заклинательная характеристика: <b>${esc(abil)}</b>${icon("edit")}</button>
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
  const fromItems = {};
  c.spells.filter(pass).forEach(s => {
    if (s.cost === "item" && c.items.some(it => it.id === s.itemId)) {
      (fromItems[s.itemId] = fromItems[s.itemId] || []).push(s);
      return;
    }
    const l = Number(s.level) || 0;
    (groups[l] = groups[l] || []).push(s);
  });
  const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const lists = levels.map(l => panel(l === 0 ? "Заговоры" : `${l} круг`, `<div class="tiles" data-reorder="spells">${groups[l].map(s => spellTile(ctx, s)).join("")}</div>`, { ic: l === 0 ? "sparkle" : "book" })).join("") +
    c.items.filter(it => fromItems[it.id]).map(it => {
      const u = usesInfo(d, it);
      return panel(it.name || "Предмет", `<p class="hint item-panel-hint explain">Тратит заряды предмета, а не твои ячейки. Круг заклинания не важен.</p><div class="tiles" data-reorder="spells">${fromItems[it.id].map(s => spellTile(ctx, s)).join("")}</div>`, { ic: itemIcon(it), cls: "item-spells-panel", actions: `${u ? `<span class="item-charges">${pips(u.max, u.left, "#4fcf6a")}<b>${u.left}/${u.max}</b></span>` : ""}<button class="btn ghost sm" data-open="item:${esc(it.id)}">${icon("edit")}Предмет</button>` });
    }).join("");
  return `
    ${panel("Заклинательство", head, { ic: "book", actions: orderBtn(ctx) + `<button class="btn ghost sm" data-act="spell-library">${icon("book")}Библиотека</button>` + addBtn("add-spell", "Своё") })}
    ${concentrationBar(c)}
    ${tools}
    <div class="spell-lists">${lists || (c.spells.length ? `<p class="empty">Под этот фильтр ничего не подходит</p>` : emptyState("Заклинаний пока нет. Выбери их в «Библиотеке» или добавь своё."))}</div>
    <p class="empty" data-search-empty hidden>Ничего не нашлось</p>`;
}

function featureTile(ctx, f) {
  const { d } = ctx;
  const cat = FEATURE_CATS[f.category] || FEATURE_CATS.other;
  const a = ACTIONS[f.action] || ACTIONS.passive;
  const u = usesInfo(d, f);
  const color = f.source === "dm" ? "#f0c46a" : f.source === "own" ? "#6fd3c4" : "#c9a0ff";
  const src = f.source === "dm" ? `<i class="flag gold" title="От Мастера">М</i>` : f.source === "own" ? `<i class="flag teal" title="Своё">С</i>` : "";
  return `<button class="tile" data-rid="${esc(f.id)}" data-open="feature:${esc(f.id)}" data-card="feature:${esc(f.id)}" style="--c:${color}">
    <span class="tile-ic">${icon(featureIcon(f))}</span>
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
    return panel(cat.name, `<div class="tiles" data-reorder="features">${list.map(f => featureTile(ctx, f)).join("")}</div>`, { ic: cat.icon, actions: addBtn("add-feature", "", `data-cat="${key}" title="Добавить"`) });
  }).join("");
  return `${pact}
    <div class="legend"><span><i class="flag gold">М</i> от Мастера</span><span><i class="flag teal">С</i> своё</span><span class="spacer"></span>${orderBtn(ctx)}<button class="btn ghost sm" data-act="feature-library">${icon("book")}Библиотека</button>${addBtn("add-feature", "Умение", 'data-cat="other"')}</div>
    ${sections || emptyState("Умений пока нет")}`;
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
  const items = ui.ordering ? filtered : sortItems(filtered, ui.invSort || "added", ui.invEqFirst !== false);
  const pct = Math.min(100, (d.weight / Math.max(1, d.carry)) * 100);
  const tree = containerTree(c);
  const boxes = c.items.filter(it => it.isContainer);
  const grouped = !ui.ordering && f === "all" && boxes.length > 0;
  const L = d.load || { light: 0, heavy: 0, max: d.carry };
  const loadState = d.weight > L.max ? ["over", `Перегруз: больше ${L.max} фнт ты не унесёшь`] : ["ok", `В пределах нормы: до ${L.max} фнт (Сила × 15)`];
  const variant = d.weight > L.heavy ? "сильно обременён: скорость −20 фт, помеха на проверки, атаки и спасброски Сил, Лов, Тел" : d.weight > L.light ? "обременён: скорость −10 фт" : "";
  const mark = (v, label) => `<span class="wmark" style="left:${Math.min(100, (v / Math.max(1, L.max)) * 100)}%" title="${esc(label)}"></span>`;
  const coins = [["pp", "ПМ", "#d7e3ef"], ["gp", "ЗМ", "#e9c77a"], ["ep", "ЭМ", "#bfd0d6"], ["sp", "СМ", "#c9c9c9"], ["cp", "ММ", "#c7864f"]].map(([k, l, col]) => `
    <label class="coin" style="--c:${col}">${icon("coin")}<input type="number" inputmode="numeric" min="0" data-path="coins.${k}" data-num value="${esc(c.coins[k])}"><span>${l}</span></label>`).join("");
  const slot = it => {
    const r = RARITY[it.rarity] || RARITY.common;
    return `<button class="slot ${it.equipped ? "eq" : ""} ${it.isContainer ? "box" : ""}" data-rid="${esc(it.id)}" data-open="item:${esc(it.id)}" data-card="item:${esc(it.id)}" style="--c:${r.color}">
      <span class="slot-ic">${icon(itemIcon(it))}</span>
      ${Number(it.qty) > 1 ? `<span class="slot-qty">${it.qty}</span>` : ""}
      ${it.attuned ? `<span class="slot-att" title="Настроено">${icon("sparkle")}</span>` : ""}
      ${it.isContainer && tree[it.id] && tree[it.id].count ? `<span class="slot-box" title="Внутри">${tree[it.id].count}</span>` : ""}
      <span class="slot-name">${esc(it.name)}</span>
    </button>`;
  };
  const grid = grouped ? items.filter(it => !it.container).map(slot).join("") : items.map(slot).join("");
  const boxSections = grouped ? boxes.map(b => {
    const t = tree[b.id] || { inside: 0, capacity: 0, count: 0, parent: "" };
    const inside = items.filter(it => it.container === b.id);
    const parent = t.parent ? c.items.find(x => x.id === t.parent) : null;
    const cpct = t.capacity ? Math.min(100, (t.inside / t.capacity) * 100) : 0;
    return `<section class="box-sec ${b.stored ? "stored" : ""}" data-box="${esc(b.id)}">
      <header><button class="box-h" data-open="item:${esc(b.id)}">${icon(itemIcon(b))}<span><b>${esc(b.name)}</b><small>${t.count ? `${t.count} ${t.count === 1 ? "вещь" : t.count < 5 ? "вещи" : "вещей"}` : "пусто"}${parent ? ` · в «${esc(parent.name)}»` : ""}${b.stored ? " · не при мне" : ""}${b.weightless ? " · вес внутри не считается" : ""}</small></span></button>
      <span class="box-w">${fmtNum(t.inside)}${t.capacity ? ` / ${t.capacity}` : ""} фнт</span>
      <button class="btn ghost sm" data-act="box-stored" data-id="${esc(b.id)}" title="${b.stored ? "Взять с собой" : "Оставить: вес не считается"}">${icon(b.stored ? "bag" : "door")}${b.stored ? "Взять" : "Оставить"}</button></header>
      ${t.capacity ? `<div class="wbar thin ${t.inside > t.capacity ? "over" : ""}"><i style="width:${cpct}%"></i></div>` : ""}
      <div class="inv-grid">${inside.map(slot).join("") || `<p class="hint box-empty">Пусто. Открой контейнер и нажми «Сложить набор» или переложи сюда вещи кнопкой «Переложить».</p>`}</div>
    </section>`;
  }).join("") : "";
  return `
    ${panel("Кошель и вес", `
      <div class="coins">${coins}</div>
      <div class="coin-acts"><button class="btn ghost sm" data-act="coin-pay">${icon("minus")}Заплатить</button><button class="btn ghost sm" data-act="coin-get">${icon("plus")}Получить</button></div>
      <div class="weight"><span>Вес: <b data-calc="weight">${fmtNum(d.weight)}</b> / <span data-calc="carry">${d.carry}</span> фнт</span><div class="wbar ${d.weight > d.carry ? "over" : ""}" data-wbar><i style="width:${pct}%"></i>${mark(L.light, `${L.light} фнт: обременён`)}${mark(L.heavy, `${L.heavy} фнт: сильно обременён`)}</div><span class="load-t load-${loadState[0]}">${esc(loadState[1])}</span>${variant && d.weight <= L.max ? `<span class="load-v">По варианту правил с обременением (если Мастер его использует): ${esc(variant)}</span>` : ""}<span>Настройка: <b data-calc="attuned">${d.attuned}</b> / 3</span></div>`, { ic: "coin" })}
    ${panel("Предметы", `
      <div class="chips filter">${INV_FILTERS.map(([k, l]) => `<button class="chip toggle ${f === k ? "on" : ""}" data-act="inv-filter" data-k="${k}">${l}</button>`).join("")}</div>
      <div class="inv-sort"><label class="fld compact"><span>Сортировка</span><select data-ui="inv-sort">${INV_SORTS.map(([k, l]) => `<option value="${k}" ${(ui.invSort || "added") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label><button class="chip toggle ${ui.invEqFirst !== false ? "on" : ""}" data-act="inv-eq-first" aria-pressed="${ui.invEqFirst !== false ? "true" : "false"}">Надетое сначала</button></div>
      ${grouped ? `<p class="inv-h">${icon("user")}При себе</p>` : ""}
      <div class="inv-grid" data-reorder="items">${grid || (grouped ? `<p class="hint">Всё разложено по контейнерам.</p>` : emptyState("Пусто, даже паук заскучал"))}</div>
      ${boxSections}`, { ic: "bag", actions: orderBtn(ctx) + `<button class="btn ghost sm" data-act="gear-table">${icon("book")}Библиотека</button>` + addBtn("add-item", "Предмет") })}`;
}

export const noteTags = noteTagsOf;

const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function noteBadge(n, sec) {
  const st = sec === "quests" ? NOTE_STATUS[n.status] : sec === "people" ? NOTE_ATTITUDE[n.attitude] : sec === "clues" ? CLUE_STATE[n.state] : null;
  return st ? `<span class="badge" style="--c:${st[1]}">${st[0]}</span>` : "";
}

function noteCard(n, sec, ctx, o = {}) {
  const { ui } = ctx;
  const local = ui.noteOpen || {};
  const shut = n.id in local ? !local[n.id] : !!n.collapsed;
  const stems = o.stems || [];
  const title = n.title || "Без названия";
  const preview = shut ? (stems.length ? snippetHtml(n.text, stems) : esc(cut(plainText(n.text), 90))) : "";
  const tags = noteTagsOf(n);
  const back = !shut && o.back ? o.back.get(n.id) || [] : [];
  const linkOpts = o.links ? o.links(n.id) : undefined;
  return `<article data-rid="${esc(n.id)}" data-sec="${sec}" class="note ${shut ? "collapsed" : ""} ${n.pinned ? "pinned" : ""} ${n.status === "done" || n.status === "failed" || n.state === "false" ? "dim" : ""}">
    <header><button class="note-toggle" data-act="toggle-note" data-sec="${sec}" data-id="${esc(n.id)}" aria-expanded="${shut ? "false" : "true"}"><span class="note-chev">${icon("down")}</span><span class="note-titles"><h4>${stems.length ? highlight(title, stems) : esc(title)}</h4>${n.subtitle ? `<span class="note-sub">${stems.length ? highlight(n.subtitle, stems) : esc(n.subtitle)}</span>` : ""}${preview ? `<span class="note-prev">${preview}</span>` : ""}</span></button>${o.showSec ? `<span class="badge sec">${esc(SECTION_NAME[sec] || "")}</span>` : ""}${noteBadge(n, sec)}<button class="icon-btn note-pin ${n.pinned ? "on" : ""}" data-act="pin-note" data-sec="${sec}" data-id="${esc(n.id)}" title="${n.pinned ? "Открепить из «Важного»" : "Закрепить в «Важном»"}" aria-pressed="${n.pinned ? "true" : "false"}">${icon("star")}</button><button class="icon-btn" data-act="edit-note" data-sec="${sec}" data-id="${esc(n.id)}" title="Изменить" aria-label="Изменить «${esc(title)}»">${icon("edit")}</button></header>
    ${tags.length ? `<div class="note-tags">${tags.map(t => `<button class="tag ${ui.noteTag === t ? "on" : ""}" data-act="note-tag" data-k="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : ""}
    ${shut ? "" : `<div class="note-text">${rich(n.text, linkOpts) || `<p class="dim">Пусто</p>`}</div>`}
    ${back.length ? `<div class="note-back"><span>${icon("link")}Упоминается:</span>${back.map(b => `<button class="tag" data-act="open-note" data-sec="${b.sec}" data-id="${esc(b.id)}">${esc(b.title)}</button>`).join("")}</div>` : ""}
  </article>`;
}

export function notesList(ctx) {
  const { c, ui } = ctx;
  const s = ui.notesSection || "sessions";
  const q = String(ui.notesQ || "").trim();
  const links = richLinks(c);
  const back = backlinks(c);
  if (q) {
    const stems = queryStems(q);
    const found = searchNotes(c, q);
    if (!found.length) return `<p class="empty">Ничего не нашлось. Попробуй часть имени или другое слово: поиск понимает формы слов («Бенедикта» найдёт «Бенедикт»).</p>`;
    return `<p class="hint">Найдено: ${found.length}. Сначала самое подходящее.</p>` + found.map(r => noteCard(r.n, r.sec, ctx, { stems, links, back, showSec: true })).join("");
  }
  let list = (c.notes[s] || []).slice();
  if (!ui.ordering) {
    if (s === "quests") {
      const order = { active: 0, "": 1, done: 2, failed: 3 };
      list.sort((a, b) => (order[a.status] ?? 1) - (order[b.status] ?? 1));
    }
    if (s === "clues") {
      const order = { confirmed: 0, lead: 1, "": 2, false: 3 };
      list.sort((a, b) => (order[a.state] ?? 2) - (order[b.state] ?? 2));
    }
    if (s === "sessions") list.sort((a, b) => (Number(b.created) || 0) - (Number(a.created) || 0));
    list.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }
  if (s === "people" && ui.peopleAtt && ui.peopleAtt !== "all") list = list.filter(n => (n.attitude || "") === (ui.peopleAtt === "unknown" ? "" : ui.peopleAtt));
  if (s === "clues" && ui.clueState && ui.clueState !== "all") list = list.filter(n => (n.state || "") === (ui.clueState === "unknown" ? "" : ui.clueState));
  if (ui.noteTag) list = list.filter(n => noteTagsOf(n).includes(ui.noteTag));
  const hints = {
    sessions: "Журнал пуст. Запиши первое событие в поле выше: сессия создастся сама, с датой и временем.",
    people: "Здесь пока никого. Добавь человека, и его имя начнёт подсвечиваться во всех заметках.",
    places: "Мест пока нет: города, районы, таверны, тайные ходы.",
    quests: "Заданий пока нет.",
    clues: "Улик пока нет. Для расследований: что нашли, где, и насколько это верно.",
    patron: "Здесь пока пусто",
    misc: "Здесь можно хранить что угодно: законы мира, слухи, план города, правила Мастера."
  };
  const empty = (c.notes[s] || []).length ? "Под этот фильтр ничего не подходит" : hints[s] || "Здесь пока пусто";
  return list.map(n => noteCard(n, s, ctx, { links, back })).join("") || ((c.notes[s] || []).length ? `<p class="empty">${empty}</p>` : emptyState(empty));
}

function journalBox(c) {
  const cur = currentSession(c);
  return `<div class="journal-add">
    <div class="ja-h">${icon("quill")}<span><b>${cur ? esc(cur.title) : "Новая сессия"}</b><small>${cur ? esc(cur.subtitle || "") : "начнётся с первой записи"}</small></span><span class="spacer"></span><button class="btn ghost sm" data-act="session-new">${icon("plus")}Новая сессия</button></div>
    <textarea data-journal rows="2" placeholder="Что случилось? [[ : ссылка на человека или место" aria-label="Запись в журнал"></textarea>
    <div class="ja-foot"><span class="hint explain">Enter: записать, Shift+Enter: новая строка. Время подставится само; через 12 часов без записей начнётся новая сессия.</span><button class="btn gold sm" data-act="journal-add">${icon("check")}Записать</button></div>
  </div>`;
}

export function pinnedStrip(c, cls = "") {
  const list = pinnedNotes(c);
  if (!list.length) return "";
  return `<div class="pinned-strip ${cls}"><span class="ps-h">${icon("star")}Важное</span>${list.map(({ sec, n }) => `<button class="pin-chip" data-act="open-note" data-sec="${sec}" data-id="${esc(n.id)}" title="${esc(SECTION_NAME[sec] || "")}"><b>${esc(n.title || "Без названия")}</b>${n.subtitle ? `<small>${esc(n.subtitle)}</small>` : ""}</button>`).join("")}</div>`;
}

export function importantPanel(c) {
  const list = pinnedNotes(c);
  if (!list.length) return "";
  const rows = list.map(({ sec, n }) => `<button class="imp-row" data-act="open-note" data-sec="${sec}" data-id="${esc(n.id)}"><b>${esc(n.title || "Без названия")}</b><small>${esc(SECTION_NAME[sec] || "")}${n.subtitle ? " · " + esc(n.subtitle) : ""}</small><span>${esc(cut(plainText(n.text), 110))}</span></button>`).join("");
  return panel("Важное", `<div class="imp-list">${rows}</div>`, { ic: "star", cls: "p-important" });
}

export function tabNotes(ctx) {
  const { c, ui } = ctx;
  const s = ui.notesSection || "sessions";
  const searching = !!String(ui.notesQ || "").trim();
  const sec = NOTE_SECTIONS.find(x => x.key === s) || NOTE_SECTIONS[0];
  const nav = `<div class="subtabs notes-tabs">${NOTE_SECTIONS.map(x => `<button class="subtab ${s === x.key && !searching ? "on" : ""}" data-act="notes-section" data-k="${x.key}">${icon(x.icon)}${x.name}${(c.notes[x.key] || []).length ? `<small>${c.notes[x.key].length}</small>` : ""}</button>`).join("")}</div>`;
  const recent = (ui.notesRecent || []).filter(Boolean);
  const titles = linkTargets(c).map(t => t.title);
  const options = [...new Set([...recent, ...titles])].slice(0, 60);
  const search = `<label class="search-box notes-search">${icon("search")}<input type="search" data-ui="notes-q" list="notes-q-list" placeholder="Найти в любой заметке: имя, место, слово" value="${esc(ui.notesQ || "")}" aria-label="Поиск по всем заметкам" autocomplete="off"></label><datalist id="notes-q-list">${options.map(o => `<option value="${esc(o)}"></option>`).join("")}</datalist>`;
  const tags = [...new Set((c.notes[s] || []).flatMap(noteTagsOf))].sort((a, b) => a.localeCompare(b, "ru"));
  const att = s === "people" ? [["all", "Все"], ["ally", "Союзники"], ["neutral", "Нейтральные"], ["hostile", "Враги"], ["unknown", "Неизвестно"]] : [];
  const cl = s === "clues" ? [["all", "Все"], ["confirmed", "Подтверждено"], ["lead", "Зацепки"], ["false", "Ложные"], ["unknown", "Не знаю"]] : [];
  const pa = ui.peopleAtt || "all";
  const cs = ui.clueState || "all";
  const filters = `<div class="note-filters" ${searching ? "hidden" : ""}>${att.map(([k, l]) => `<button class="chip toggle ${pa === k ? "on" : ""}" data-act="people-att" data-k="${k}" aria-pressed="${pa === k ? "true" : "false"}">${l}</button>`).join("")}${cl.map(([k, l]) => `<button class="chip toggle ${cs === k ? "on" : ""}" data-act="clue-state" data-k="${k}" aria-pressed="${cs === k ? "true" : "false"}">${l}</button>`).join("")}${tags.map(t => `<button class="tag ${ui.noteTag === t ? "on" : ""}" data-act="note-tag" data-k="${esc(t)}" aria-pressed="${ui.noteTag === t ? "true" : "false"}">#${esc(t)}</button>`).join("")}</div>`;
  const fold = (c.notes[s] || []).length > 1 ? `<button class="btn ghost sm" data-act="fold-notes" data-sec="${s}" data-v="1">${icon("minus")}Свернуть все</button><button class="btn ghost sm" data-act="fold-notes" data-sec="${s}" data-v="0">${icon("plus")}Развернуть все</button>` : "";
  const journal = s === "sessions" && !searching ? journalBox(c) : "";
  return pinnedStrip(c) + search + nav + filters + `<div class="journal-slot" ${searching ? "hidden" : ""}>${journal}</div><div class="notes-head" ${searching ? "hidden" : ""}><button class="btn sm board-btn" data-act="board">${icon("web")}Доска связей</button>${fold}<span class="spacer"></span>${orderBtn(ctx)}${s === "sessions" ? "" : addBtn("add-note", sec.add, `data-sec="${s}"`)}</div><div class="notes ${s === "misc" || s === "sessions" ? "single" : ""}" data-notes-list data-reorder="notes.${s}">${notesList(ctx)}</div>`;
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
