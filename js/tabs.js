import { COINS, ABILITIES, SKILLS, DAMAGE, ACTIONS, FEATURE_CATS, RARITY, CONDITIONS, DEFENSE_KINDS, containerTree, fmt, usesInfo, spellCast, effectSummary, spellInCombat, itemInCombat, featureInCombat, xpInfo, ammoFor, sceneInfo } from "./rules.js";
import { icon, actionMark, acIcon, hpIcon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, pips, rich, artFx } from "./ui.js";
import { DOLL_SLOTS, dollLayout, SILHOUETTE } from "./doll.js";
import { spellIcon, itemIcon, featureIcon, attackIcon, spellAtk, spellDc, fmtNum, purseGp, PROF_KINDS, classOf, featureColor, itemGlows, fxOf } from "./entities.js";
import { NOTE_SECTIONS, SECTION_NAME, NOTE_STATUS, NOTE_ATTITUDE, CLUE_STATE, noteTagsOf, searchNotes, queryStems, highlight, snippetHtml, plainText, richLinks, backlinks, currentSession, pinnedNotes, linkTargets, noteDates, shortDate } from "./notes.js";

export const TABS = [
  { key: "char", name: "Персонаж", short: "Герой", icon: "tabChar" },
  { key: "combat", name: "Бой", icon: "tabCombat" },
  { key: "spells", name: "Магия", icon: "tabSpells" },
  { key: "features", name: "Умения", icon: "tabFeatures" },
  { key: "inventory", name: "Снаряжение", short: "Вещи", icon: "tabInventory" },
  { key: "notes", name: "Заметки", icon: "tabNotes" }
];

const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || "";

function panel(title, body, { ic, actions = "", cls = "" } = {}) {
  return `<section class="panel ${cls}"><header class="panel-h">${ic ? icon(ic) : ""}<h3>${esc(title)}</h3><span class="spacer"></span>${actions}</header><div class="panel-b">${body}</div></section>`;
}

export function orderBtn(ctx) {
  const on = !!(ctx.ui && ctx.ui.ordering);
  return `<button class="btn ${on ? "gold" : "ghost"} sm order-btn" data-act="toggle-order" aria-pressed="${on ? "true" : "false"}">${icon(on ? "check" : "menu")}${on ? "Готово" : "Порядок"}</button>`;
}

export function helpBtn(ref, label = "Как это работает") {
  return `<button class="help-q" data-act="help-card" data-card="${esc(ref)}" title="${esc(label)}" aria-label="${esc(label)}">?</button>`;
}

function addBtn(act, label, extra = "") {
  return `<button class="btn ghost sm" data-act="${act}" ${extra}>${icon("plus")}${esc(label)}</button>`;
}

export { classOf };

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
      : `<button class="btn sm" data-roll="death">${icon("gi/lorc/tombstone")} Спасбросок от смерти</button>`;
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
    </div>`, { ic: hpIcon(c.hp.current, d.hpMax), cls: "hp-panel" });
}

function xpRow(c) {
  const x = xpInfo(c);
  if (!x.next) return "";
  return `<div class="xp-row ${x.canLevel ? "ready" : ""}"><div class="xp-bar"><i style="width:${x.pct}%"></i></div><span class="xp-t">${x.canLevel ? `Опыта хватает на ${x.levelByXp} уровень!` : `Опыт ${x.xp} / ${x.next} до ${x.level + 1} уровня`}</span><span class="xp-acts">${x.canLevel ? `<button class="btn gold sm" data-act="level-up">${icon("star")}Повысить уровень</button>` : ""}<button class="btn ghost sm" data-act="add-xp">${icon("plus")}Опыт</button></span></div>`;
}

function inspirationBtn(c, compact = false) {
  return `<button class="insp ${compact ? "compact" : ""} ${c.inspiration ? "on" : ""}" data-act="inspiration" data-card="stat:inspiration" aria-pressed="${c.inspiration ? "true" : "false"}">${icon("gi/lorc/sunbeams")}<span>${c.inspiration ? "Вдохновение есть" : "Нет вдохновения"}</span></button>`;
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
  return `<div class="conc-bar">${icon("gi/lorc/candle-light", "flicker")}<span>Концентрация: <b>${esc(c.concentration)}</b></span><span class="spacer"></span><button class="btn ghost sm" data-roll="save:con" title="Спасбросок Телосложения">${icon("d20")}Спасбросок</button><button class="btn ghost sm" data-act="drop-conc">Снять</button></div>`;
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
  const abColor = k => (ABILITIES.find(a => a.key === k) || {}).color || "var(--gold-2)";
  const sense = (k, calc, v) => { const s = SKILLS.find(x => x.key === k); return `<div style="--ac:${abColor(s.ab)}" data-card="stat:passive-${k}"><span>${icon(s.icon)}${s.name}</span><b data-calc="${calc}">${v}</b></div>`; };
  const abil = ABILITIES.map(a => `
    <div class="abil" data-card="ability:${a.key}">
      <button class="abil-top" data-roll="check:${a.key}" style="--ac:${a.color}">${icon(a.icon, "abil-ic")}<span class="abil-mod" data-calc="mod.${a.key}">${fmt(d.mods[a.key])}</span><span class="abil-name">${a.key === "con" ? "Телосл." : a.name} <b class="abil-num" data-calc="score.${a.key}">${esc(c.abilities[a.key])}</b></span></button>
    </div>`).join("");
  const saves = ABILITIES.map(a => `
    <div class="row">
      <button class="prof prof-ic ${c.saves[a.key] ? "p1" : "p0"}" style="--ac:${a.color}" data-act="toggle-save" data-k="${a.key}" title="Владение" aria-label="Владение спасброском: ${a.name}" aria-pressed="${c.saves[a.key] ? "true" : "false"}">${icon(a.icon)}</button>
      <button class="row-name" data-roll="save:${a.key}">${a.name}</button>
      <span class="row-val" data-calc="save.${a.key}">${fmt(d.saves[a.key])}</span>
    </div>`).join("");
  const skills = SKILLS.map(s => {
    const p = Number(c.skills[s.key]) || 0;
    return `<div class="row" data-card="skill:${s.key}">
      <button class="prof prof-ic p${p}" style="--ac:${(ABILITIES.find(a => a.key === s.ab) || {}).color || "var(--gold-2)"}" data-act="cycle-skill" data-k="${s.key}" title="Нет / владение / компетентность" aria-label="${s.name}: ${["нет владения", "владение", "компетентность"][p]}">${icon(s.icon)}</button>
      <button class="row-name" data-roll="skill:${s.key}">${s.name}<small>${abShort(s.ab)}</small></button>
      <span class="row-val" data-calc="skill.${s.key}">${fmt(d.skills[s.key])}</span>
    </div>`;
  }).join("");
  const prof = PROF_KINDS.map(([k, l]) => {
    const list = String(c.proficiencies[k] || "").split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
    return `<div class="prof-line"><span class="prof-l">${l}</span><span class="prof-chips">${list.length ? list.map(x => `<span class="prof-chip">${esc(x)}</span>`).join("") : `<span class="dim">Нет</span>`}</span></div>`;
  }).join("");
  const caster = c.spellAbility && ((c.spells || []).length || (c.casterType && c.casterType !== "none"));
  const spellLine = caster ? `<button class="spell-line" data-act="go-tab" data-to="spells" style="--ac:${abColor(c.spellAbility)}">${icon("book")}<span>Заклинания: СЛ <b data-calc="dc">${d.spell.dc}</b> · атака <b data-calc="satk">${fmt(d.spell.atk)}</b></span></button>` : "";

  return `
  <div class="char-grid">
    <div class="col col-left">
      ${panel("Характеристики", `<div class="abil-grid">${abil}</div>`, { ic: "gi/delapouite/stars-stack", cls: "p-abil", actions: `<button class="btn ghost sm" data-act="edit-abilities">${icon("edit")}Изменить</button>` })}
      ${panel("Спасброски", `<div class="rows">${saves}</div>`, { ic: "gi/lorc/surrounded-shield", cls: "p-saves" })}
    </div>
    <div class="col col-center">
      <section class="hero">
        ${(k => `<button class="hero-portrait" data-act="profile" title="Профиль персонажа"${k ? ` style="--k:${k.color}"` : ""}><span class="hero-pic">${portraitHtml(c)}</span>${k ? `<span class="hero-cls" title="${esc(k.name)}">${icon(k.icon)}</span>` : ""}</button>`)(classOf(c))}
        <button class="hero-id" data-act="profile">
          <span class="hero-name" data-calc="name">${esc(c.name)}</span>
          <span class="hero-sub">${esc([c.info.race, c.info.subrace].filter(Boolean).join(", "))}</span>
          <span class="hero-sub">${esc([c.info.cls, c.info.subclass].filter(Boolean).join(", "))} · <span data-calc="level">${d.level}</span> уровень</span>
          <span class="hero-sub dim">${esc([c.info.background, c.info.alignment, c.info.age ? c.info.age + " лет" : ""].filter(Boolean).join(" · "))}</span>
        </button>
      </section>
      <div class="scene-row">${sceneChip(c)}</div>
      ${xpRow(c)}
      <div class="medals">
        ${statMedal("КД", d.ac, { calc: "ac", act: "edit-armor", ic: acIcon(d.ac), card: "stat:ac" })}
        ${statMedal("Инициатива", fmt(d.init), { calc: "init", roll: "init", ic: "tw/combat/initiative", card: "stat:init" })}
        ${statMedal("Скорость", d.speed + " фт", { calc: "speed", act: "edit-mech", ic: "gi/lorc/wingfoot", card: "stat:speed", slow: d.speed < d.baseSpeed })}
        ${statMedal("Мастерство", fmt(d.pb), { calc: "pb", ic: "gi/delapouite/star-medal", card: "stat:pb" })}
      </div>
      ${spellLine}
      ${inspirationBtn(c)}
      ${concentrationBar(c)}
      ${activeConditions(c)}
      ${hpPanel(ctx)}
      ${panel("Чувства", `
        <div class="senses">
          <div class="full senses-h">Пассивные проверки</div>
          ${sense("perception", "pp", d.passive.perception)}
          ${sense("insight", "pi", d.passive.insight)}
          ${sense("investigation", "pinv", d.passive.investigation)}
          ${c.senses ? `<div class="full"><span>${esc(c.senses)}</span></div>` : ""}
          ${defenseLines(c)}
        </div>`, { ic: "tw/attribute/vision", cls: "p-senses" })}
    </div>
    <div class="col col-right">
      ${panel("Навыки", `<div class="rows">${skills}</div>`, { ic: "tw/attribute/skillcheck", cls: "p-skills" })}
    </div>
  </div>
  ${panel("Владения и языки", `<div class="prof-grid">${prof}</div>`, { ic: "gi/lorc/anvil", actions: `<button class="btn ghost sm" data-act="edit-prof">${icon("edit")}Изменить</button>` })}`;
}

export function icBox(ic, color, fx) {
  const f = fx ? artFx(fx, color, .3) : "";
  return `<i class="ic-box"${f ? ` style="--fx:url(#${f})"` : ""}>${icon(ic)}</i>`;
}

function combatRow({ rid, open, name, sub, color, ic, hit, dmg, fx }) {
  return `<div class="atk-row" data-rid="${esc(rid)}">
    <button class="atk-name" data-open="${esc(open)}" data-card="${esc(open)}" style="--c:${color}">${icBox(ic, color, fx)}<span><b>${esc(name)}</b><small>${esc(sub || "")}</small></span></button>
    ${hit}
    ${dmg}
  </div>`;
}

function abMark(key) {
  const a = ABILITIES.find(x => x.key === key);
  return a ? `<i class="hit-ab" style="--ac:${a.color}" title="${esc(a.name)}">${icon(a.icon)}</i>` : "";
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
  const hit = `<button class="chip hit" data-roll="iattack:${esc(it.id)}">${abMark(w.ability === "spell" ? ctx.c.spellAbility : w.ability)}${fmt(w.hit)}</button>`;
  return combatRow({ rid: it.id, open: "item:" + it.id, name: it.name, sub: (w.range || "") + ammoNote(ctx.c, it), color: dt.color, ic: itemIcon(it), hit, dmg: dmgChip("idmg:" + it.id, 1, w.dmg + (w.lines.length > 1 ? " + …" : ""), w.type) });
}

function spellRow(ctx, sp) {
  const { c, d } = ctx;
  const cast = spellCast(c, d, sp);
  const first = cast.lines.find(l => l.type !== "healing" && l.type !== "temp") || cast.lines[0];
  const ic = spellIcon(c, sp);
  const hit = sp.attack
    ? `<button class="chip hit" data-roll="sattack:${esc(sp.id)}">${abMark(c.spellAbility)}${cast.beams > 1 ? `<small>${cast.beams}×</small>` : ""}${fmt(spellAtk(d, sp))}</button>`
    : sp.save ? `<span class="chip dc">СЛ ${spellDc(d, sp)} ${abShort(sp.save)}</span>` : `<span></span>`;
  return combatRow({ rid: sp.id, open: "spell:" + sp.id, name: sp.name, sub: [Number(sp.level) ? `${sp.level} круг` : "заговор", sp.range].filter(Boolean).join(" · "), color: ic.color, ic: ic.icon, fx: fxOf(sp), hit, dmg: first ? dmgChip("sdmg:" + sp.id, cast.beams, first.dice, first.type) : "" });
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
  const collect = spent ? `<div class="ammo-bar">${icon("gi/delapouite/quiver")}<span>Выпущено боеприпасов: ${spent}. После боя можно собрать половину.</span><button class="btn ghost sm" data-act="collect-ammo">Собрать ${Math.floor(spent / 2)}</button></div>` : "";
  const dupes = src.dupes.length ? `<div class="dupe-bar" title="${esc(src.dupes.map(a => a.name).join(", "))}">${icon("info")}<span>Спрятаны повторы: ${src.dupes.length}</span><button class="btn ghost sm" data-act="dedupe-attacks">${icon("trash")}Удалить копии</button></div>` : "";
  return panel("Атаки", `${dupes}${body || emptyState("Атак пока нет")}${collect}`, { ic: "gi/lorc/crossed-swords", actions: helpBtn("stat:attacks") + orderBtn(ctx) + addBtn("add-attack", "Атака"), cls: "p-attacks" });
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
  }).join("")}<button class="turn-slot move" data-act="turn-open" data-k="move" style="--c:#c9b48a" title="Движение и прыжки"><span class="turn-mark">${icon("gi/lorc/boot-prints")}</span><span>Движение</span></button>${ctx.c ? inspirationBtn(ctx.c, true) : ""}<button class="btn sm turn-new" data-act="new-turn" title="Вернуть действия и отсчитать раунд у эффектов">${icon("history")}Новый ход</button></div>`;
}

function combatStrip(ctx) {
  const { c, d } = ctx;
  const caster = c.casterType !== "none" || c.spells.length;
  return `<div class="combat-strip">
    ${statMedal("КД", d.ac, { calc: "ac", act: "edit-armor", ic: acIcon(d.ac), card: "stat:ac" })}
    ${statMedal("Инициатива", fmt(d.init), { calc: "init", roll: "init", ic: "tw/combat/initiative", card: "stat:init" })}
    ${statMedal("Скорость", d.speed + " фт", { calc: "speed", ic: "gi/lorc/wingfoot", card: "stat:speed", slow: d.speed < d.baseSpeed })}
    ${caster ? statMedal("СЛ закл.", d.spell.dc, { calc: "dc", ic: "tw/attribute/test" }) : statMedal("Внимат.", d.passive.perception, { calc: "pp", ic: "gi/delapouite/eye-target" })}
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
  const actions = `${helpBtn("stat:effects")}${timed ? `<button class="btn ghost sm" data-act="next-round" title="Уменьшить длительность эффектов на 1 раунд">${icon("hourglass")}Раунд</button>` : ""}<button class="btn ghost sm" data-act="add-effect">${icon("plus")}Эффект</button>`;
  const has = k => list.some(e => e.preset === k);
  const cover = `<div class="cover-row"><span>Укрытие:</span><button class="chip toggle ${has("cover2") ? "on" : ""}" data-act="cover" data-k="cover2" aria-pressed="${has("cover2")}">½ · +2 КД</button><button class="chip toggle ${has("cover5") ? "on" : ""}" data-act="cover" data-k="cover5" aria-pressed="${has("cover5")}">¾ · +5 КД</button></div>`;
  return panel("Эффекты", `${cover}${rows ? `<div class="eff-list">${rows}</div>${timed ? `<div class="eff-foot"><button class="btn ghost sm" data-act="end-combat">${icon("gi/delapouite/sparkles")}Бой окончен: снять эффекты до минуты</button></div>` : ""}` : ""}`, { ic: "gi/delapouite/sparkles", cls: `effects-panel ${rows ? "" : "empty"}`, actions });
}

function conditionsPanel(ctx) {
  const { c, ui } = ctx;
  const active = CONDITIONS.filter(k => c.conditions[k.key]);
  const open = ui.condOpen != null ? ui.condOpen : active.length > 0 || c.exhaustion > 0;
  const conds = CONDITIONS.map(k => `<button class="chip toggle ${c.conditions[k.key] ? "on bad" : ""}" data-act="toggle-cond" data-k="${k.key}" data-card="condition:${k.key}" aria-pressed="${c.conditions[k.key] ? "true" : "false"}">${icon(k.icon || "skull")}${esc(k.name)}</button>`).join("");
  const exh = `<div class="exh"><span data-card="stat:exhaustion">Истощение</span>${[0, 1, 2, 3, 4, 5, 6].map(i => `<button class="chip toggle ${c.exhaustion === i ? "on" : ""}" data-act="exhaustion" data-i="${i}" aria-pressed="${c.exhaustion === i ? "true" : "false"}" aria-label="Истощение ${i}">${i}</button>`).join("")}</div>`;
  const summary = [...active.map(k => [k.icon, k.name]), c.exhaustion ? ["sleep", `Истощение ${c.exhaustion}`] : null].filter(Boolean);
  return `<details class="panel cond-panel" data-ui-open="condOpen" ${open ? "open" : ""}>
    <summary class="panel-h">${icon("gi/delapouite/half-dead")}<h3>Состояния</h3><span class="cond-sum">${summary.length ? summary.map(([ic, t]) => `<span class="chip bad">${icon(ic || "skull")}${esc(t)}</span>`).join("") : `<span class="dim">нет</span>`}</span><span class="spacer"></span>${helpBtn("stat:conditions")}<span class="cond-chev">${icon("down")}</span></summary>
    <div class="panel-b"><div class="chips">${conds}</div>${exh}</div>
  </details>`;
}

export function tabCombat(ctx) {
  const { c } = ctx;
  const slots = slotsBlock(ctx);
  const res = resourceRows(ctx);
  return `
  ${combatStrip(ctx)}
  <div class="turn-wrap">${turnBar(ctx)}</div>
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
      ${slots || res ? panel("Ресурсы", `${slots}${res}`, { ic: "gi/lorc/empty-hourglass", cls: "p-res" }) : ""}
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
  const flags = [sp.concentration ? `<i class="flag" title="Концентрация">К</i>` : "", sp.ritual ? `<i class="flag" title="Ритуал">Р</i>` : "", unprep ? `<i class="flag off" title="Не подготовлено">н/п</i>` : "", sp.cost === "item" ? `<i class="flag green" title="Тратит заряды предмета">${icon("gi/lorc/candle-light")}</i>` : ""].join("");
  const search = [sp.name, sp.nameEn, sp.source].filter(Boolean).join(" ").toLowerCase();
  return `<button class="tile ${unprep ? "unprep" : ""}" data-rid="${esc(sp.id)}" data-open="spell:${esc(sp.id)}" data-card="spell:${esc(sp.id)}" data-search="${esc(search)}" style="--c:${ic.color}">
    <span class="tile-ic fx"${(f => f ? ` style="--fx:url(#${f})"` : "")(artFx(fxOf(sp), ic.color, .35))}>${icon(ic.icon)}</span>
    <span class="tile-main"><span class="tile-name">${esc(sp.name)}</span><span class="tile-sub">${actionMark(a.shape, a.color)}<span class="tile-sub-t">${esc(sp.castTime || a.name)}${dmg ? ` · <span class="tile-dmg">${esc(dmg)}</span>` : ""}</span></span></span>
    <span class="tile-side">${flags}${u ? pips(u.max, u.left, "#e9a54a") : ""}</span>
  </button>`;
}

export function tabSpells(ctx) {
  const { c, d } = ctx;
  const sa = ABILITIES.find(a => a.key === c.spellAbility) || {};
  const abil = sa.name || "не выбрана";
  const head = `
    <div class="spell-head" style="--ac:${sa.color || "var(--gold)"}">
      ${statMedal("СЛ спасброска", d.spell.dc, { calc: "dc", ic: "tw/attribute/test" })}
      ${statMedal("Бонус атаки", fmt(d.spell.atk), { calc: "satk", roll: "spellatk", ic: "gi/lorc/target-arrows" })}
      ${statMedal("Модификатор", fmt(d.spell.mod), { ic: "tw/attribute/bonus" })}
    </div>
    <button class="spell-abil" data-act="spell-ability" title="Изменить заклинательную характеристику" style="--ac:${sa.color || "var(--gold-2)"}">Заклинательная характеристика: <b>${esc(abil)}</b>${icon("edit")}</button>
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
  const lists = levels.map(l => panel(l === 0 ? "Заговоры" : `${l} круг`, `<div class="tiles" data-reorder="spells">${groups[l].map(s => spellTile(ctx, s)).join("")}</div>`, { ic: l === 0 ? "gi/lorc/magic-palm" : "gi/lorc/open-book" })).join("") +
    c.items.filter(it => fromItems[it.id]).map(it => {
      const u = usesInfo(d, it);
      return panel(it.name || "Предмет", `<p class="hint item-panel-hint explain">Тратит заряды предмета, а не твои ячейки. Круг заклинания не важен.</p><div class="tiles" data-reorder="spells">${fromItems[it.id].map(s => spellTile(ctx, s)).join("")}</div>`, { ic: itemIcon(it), cls: "item-spells-panel", actions: `${u ? `<span class="item-charges">${pips(u.max, u.left, "#4fcf6a")}<b>${u.left}/${u.max}</b></span>` : ""}<button class="btn ghost sm" data-open="item:${esc(it.id)}">${icon("edit")}Предмет</button>` });
    }).join("");
  return `
    ${panel("Заклинательство", head, { ic: "gi/delapouite/spell-book", actions: orderBtn(ctx) + `<button class="btn ghost sm" data-act="spell-library">${icon("book")}Библиотека</button>` + addBtn("add-spell", "Своё") })}
    ${concentrationBar(c)}
    ${tools}
    <div class="spell-lists">${lists || (c.spells.length ? `<p class="empty">Под этот фильтр ничего не подходит</p>` : emptyState("Заклинаний пока нет. Выбери их в «Библиотеке» или добавь своё."))}</div>
    <p class="empty" data-search-empty hidden>Ничего не нашлось</p>`;
}

function featureTile(ctx, f) {
  const { c, d } = ctx;
  const a = ACTIONS[f.action] || ACTIONS.passive;
  const u = usesInfo(d, f);
  const color = featureColor(c, f);
  const search = [f.name, f.nameEn, f.effect].filter(Boolean).join(" ").toLowerCase();
  const fx = artFx(fxOf(f, "feature"), color, .35);
  return `<button class="tile" data-rid="${esc(f.id)}" data-open="feature:${esc(f.id)}" data-card="feature:${esc(f.id)}" data-search="${esc(search)}" style="--c:${color}">
    <span class="tile-ic fx"${fx ? ` style="--fx:url(#${fx})"` : ""}>${icon(featureIcon(f))}</span>
    <span class="tile-main"><span class="tile-name">${esc(f.name)}</span><span class="tile-sub">${actionMark(a.shape, a.color)}<span class="tile-sub-t">${esc(a.name)}${f.effect ? ` · ${esc(f.effect)}` : ""}</span></span></span>
    <span class="tile-side">${u ? pips(u.max, u.left, "#e9a54a") : ""}</span>
  </button>`;
}

const FEAT_FILTERS = [["all", "Все"], ["active", "Действия"], ["passive", "Пассивные"], ["uses", "С зарядами"]];

function featPass(d, f, k) {
  if (k === "active") return ["action", "bonus", "reaction"].includes(f.action);
  if (k === "passive") return !["action", "bonus", "reaction"].includes(f.action);
  if (k === "uses") return !!usesInfo(d, f);
  return true;
}

export function tabFeatures(ctx) {
  const { c, d, ui } = ctx;
  const cls = classOf(c);
  const who = [cls ? `<b>${esc(cls.name)}</b> ${d.level} уровня` : `<b>${d.level}</b> уровень`, c.info.patron ? `покровитель <b>${esc(c.info.patron)}</b>` : "", c.info.pactBoon ? esc(c.info.pactBoon) : ""].filter(Boolean).join(" · ");
  const ident = `<div class="feat-who" style="--ac:${(cls && cls.color) || "var(--gold)"}">${icon(cls ? cls.icon : "pact")}<span>${who}</span><button class="icon-btn" data-act="edit-info" title="Изменить" aria-label="Изменить">${icon("edit")}</button></div>`;
  const charges = c.features.map(f => {
    const u = usesInfo(d, f);
    if (!u) return "";
    return `<div class="res-row"><button class="res-name" data-open="feature:${esc(f.id)}" data-card="feature:${esc(f.id)}">${esc(f.name)}<small>${esc(rechargeShort(f.recharge))}</small></button><span class="pips big">${Array.from({ length: Math.min(u.max, 30) }, (_, i) => `<button class="pip ${i < u.left ? "on" : ""}" data-act="use-pip" data-ref="feature:${esc(f.id)}" data-i="${i}" style="--c:#e9a54a"></button>`).join("")}</span><span class="slot-n">${u.left}/${u.max}</span></div>`;
  }).join("");
  const head = ident + (charges ? `<div class="feat-charges">${charges}</div>` : "");
  const has = k => c.features.some(f => featPass(d, f, k));
  const k = FEAT_FILTERS.some(([x]) => x === ui.featFilter) && has(ui.featFilter) ? ui.featFilter : "all";
  const filters = FEAT_FILTERS.filter(([x]) => x === "all" || has(x));
  const tools = c.features.length > 5 && !ui.ordering ? `<div class="spell-tools"><label class="search-box">${icon("search")}<input type="search" data-ui="feat-q" placeholder="Найти умение" value="${esc(ui.featQ || "")}" aria-label="Найти умение"></label><div class="chips filter">${filters.map(([x, l]) => `<button class="chip toggle ${k === x ? "on" : ""}" data-act="feat-filter" data-k="${x}" aria-pressed="${k === x ? "true" : "false"}">${l}</button>`).join("")}</div></div>` : "";
  const sections = Object.entries(FEATURE_CATS).map(([key, cat]) => {
    const list = c.features.filter(f => (f.category || "other") === key && (ui.ordering || featPass(d, f, k)));
    if (!list.length) return "";
    return panel(cat.name, `<div class="tiles" data-reorder="features">${list.map(f => featureTile(ctx, f)).join("")}</div>`, { ic: cat.icon, actions: addBtn("add-feature", "", `data-cat="${key}" title="Добавить" aria-label="Добавить"`) });
  }).join("");
  return `
    ${panel("Умения", head, { ic: "gi/lorc/laurels", cls: "feat-head", actions: helpBtn("stat:features") + orderBtn(ctx) + `<button class="btn ghost sm" data-act="feature-library">${icon("book")}Библиотека</button>` + addBtn("add-feature", "Умение", 'data-cat="other"') })}
    ${tools}
    <div class="feat-lists">${sections || (c.features.length ? `<p class="empty">Под этот фильтр ничего не подходит</p>` : emptyState("Умений пока нет. Выбери их в «Библиотеке» или добавь своё."))}</div>
    <p class="empty" data-search-empty hidden>Ничего не нашлось</p>`;
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

const INV_FILTERS = [["all", "Все"], ["magic", "Магические"], ["weapon", "Оружие"], ["armor", "Броня"], ["consumable", "Расходники"], ["tool", "Инструменты"], ["other", "Прочее"]];
const INV_MAIN = ["weapon", "ammo", "armor", "consumable", "tool"];

export function isMagicItem(it) {
  return it.type === "artifact" || it.type === "wand" || (!!it.rarity && it.rarity !== "common") || !!it.requiresAttunement;
}

export function invFilterPass(it, f) {
  if (f === "magic") return isMagicItem(it);
  if (f === "weapon") return it.type === "weapon" || it.type === "ammo";
  if (f === "other") return !INV_MAIN.includes(it.type) && !isMagicItem(it);
  if (INV_MAIN.includes(f)) return it.type === f;
  return true;
}

const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

const glows = itemGlows;

function invSlot(it, tree, open) {
  const r = RARITY[it.rarity] || RARITY.common;
  const search = [it.name, it.nameEn].filter(Boolean).join(" ").toLowerCase();
  const box = it.isContainer;
  const isOpen = box && open && open.includes(it.id);
  const act = box ? `data-act="box-toggle" data-id="${esc(it.id)}" aria-expanded="${isOpen ? "true" : "false"}"` : `data-open="item:${esc(it.id)}"`;
  return `<button class="slot ${it.equipped ? "eq" : ""} ${box ? "box" : ""} ${isOpen ? "open" : ""} ${it.stored ? "stored" : ""} ${isMagicItem(it) ? "magic" : ""} ${glows(it) ? "glow" : ""}" data-rid="${esc(it.id)}" ${act} data-card="item:${esc(it.id)}" data-search="${esc(search)}" data-drag="${esc(it.id)}" data-dz="item:${esc(it.id)}" style="--c:${r.color}">
      <span class="slot-ic${glows(it) ? "" : " flat"}"${(f => f ? ` style="--fx:url(#${f})"` : "")(r.fx === "hot" ? artFx("hot", r.color, .45) : "")}>${icon(itemIcon(it))}</span>
      ${Number(it.qty) > 1 ? `<span class="slot-qty">${it.qty}</span>` : ""}
      ${it.attuned ? `<span class="slot-att" title="Настроено">${icon("sparkle")}</span>` : ""}
      ${box && tree[it.id] && tree[it.id].count ? `<span class="slot-box" title="Внутри">${tree[it.id].count}</span>` : ""}
      <span class="slot-name">${esc(it.name)}</span>
    </button>`;
}

function boxPop(ctx, b, list, tree, depth = 0) {
  const { c, ui } = ctx;
  const open = ui.openBoxes || [];
  const t = tree[b.id] || { inside: 0, capacity: 0, count: 0 };
  const inside = list.filter(it => it.container === b.id);
  const cpct = t.capacity ? Math.min(100, (t.inside / t.capacity) * 100) : 0;
  const sub = [t.count ? `${t.count} ${plural(t.count, "вещь", "вещи", "вещей")}` : "пусто", b.stored ? "не при мне" : "", b.weightless ? "вес внутри не считается" : ""].filter(Boolean).join(" · ");
  return `<div class="box-pop box-sec ${b.stored ? "stored" : ""}" data-box="${esc(b.id)}"${open.includes(b.id) ? "" : " hidden"}>
      <header class="box-pop-h"><button class="box-h" data-open="item:${esc(b.id)}" data-card="item:${esc(b.id)}"><span><b>${esc(b.name)}</b><small>${esc(sub)}</small></span></button>
      <span class="box-w">${fmtNum(t.inside)}${t.capacity ? ` / ${t.capacity}` : ""} фнт</span>
      <button class="btn ghost sm" data-act="box-stored" data-id="${esc(b.id)}" title="${b.stored ? "Взять с собой" : "Оставить: вес не считается"}">${icon(b.stored ? "bag" : "door")}${b.stored ? "Взять" : "Оставить"}</button>
      <button class="icon-btn" data-act="box-toggle" data-id="${esc(b.id)}" title="Закрыть" aria-label="Закрыть">${icon("close")}</button></header>
      ${t.capacity ? `<div class="wbar thin ${t.inside > t.capacity ? "over" : ""}"><i style="width:${cpct}%"></i></div>` : ""}
      ${slotGrid(ctx, inside, list, tree, { drop: "bag:" + b.id, empty: `<p class="hint box-empty">Пусто. Перетащи сюда вещи.</p>`, depth: depth + 1 })}
    </div>`;
}

function slotGrid(ctx, show, list, tree, { drop = "", empty = "", depth = 0, cls = "" } = {}) {
  const open = ctx.ui.openBoxes || [];
  const cells = show.map(it => invSlot(it, tree, open) + (it.isContainer && depth < 4 ? boxPop(ctx, it, list, tree, depth) : "")).join("");
  return `<div class="inv-grid ${cls}" data-reorder="items"${drop !== null ? ` data-dz="${esc(drop)}"` : ""}>${cells || empty}</div>`;
}

function dollCell(c, slot, it, { two = false } = {}) {
  const s = DOLL_SLOTS[slot];
  if (!it) return `<button class="dslot empty" data-act="doll-slot" data-slot="${slot}" data-dz="slot:${slot}" title="${esc(s.name)}: пусто"><span class="dslot-ic">${icon(s.icon)}</span><span class="dslot-n">${esc(s.name)}</span></button>`;
  const r = RARITY[it.rarity] || RARITY.common;
  const search = [it.name, it.nameEn].filter(Boolean).join(" ").toLowerCase();
  const fx = r.fx === "hot" ? artFx("hot", r.color, .45) : "";
  return `<button class="dslot ${two ? "two" : ""} ${r.fx === "flat" ? "" : "magic"} ${glows(it) ? "glow" : ""}" data-act="doll-slot" data-slot="${slot}" data-drag="${esc(it.id)}" data-dz="slot:${slot}" data-card="item:${esc(it.id)}" data-search="${esc(search)}" style="--c:${r.color}"><span class="dslot-ic${glows(it) ? "" : " flat"}"${fx ? ` style="--fx:url(#${fx})"` : ""}>${icon(itemIcon(it))}</span>${it.attuned ? `<span class="slot-att" title="Настроено">${icon("sparkle")}</span>` : ""}<span class="dslot-n">${esc(it.name)}</span>${two ? `<small class="dslot-two">Двуручное</small>` : ""}</button>`;
}

export function artStyle(p) {
  const x = Number(p && p.x) || 0;
  const y = Number(p && p.y) || 0;
  const z = Number(p && p.z) || 1;
  return `object-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%`;
}

function dollPanel(ctx, tree) {
  const { c, d } = ctx;
  const L = dollLayout(c);
  const col = side => Object.keys(DOLL_SLOTS).filter(k => DOLL_SLOTS[k].side === side).map(k => dollCell(c, k, L.cells[k])).join("");
  const hands = (m, o) => L.two[m] ? dollCell(c, m, L.cells[m], { two: true }) : dollCell(c, m, L.cells[m]) + dollCell(c, o, L.cells[o]);
  const hasSwap = !!(L.cells.main2 || L.cells.off2);
  const extra = `<div class="doll-extra${L.extra.length ? "" : " empty"}"><p class="inv-h">${icon("plus")}Ещё надето</p>${slotGrid(ctx, L.extra, ctx.c.items, tree, { drop: "extra", empty: `<p class="hint box-empty">Перетащи сюда, чтобы носить без ячейки</p>` })}</div>`;
  const body = `
    <div class="doll${c.fullArt ? " has-art" : ""}">
      ${c.fullArt ? `<img class="doll-art" src="${esc(c.fullArt)}" alt="" style="${artStyle(c.fullArtPos)}">` : ""}
      <div class="doll-col">${col("left")}</div>
      <div class="doll-mid">${c.fullArt ? `<button class="doll-art-btn" data-act="art-frame" title="Поправить картинку" aria-label="Поправить картинку">${icon("target")}Кадр</button>` : `${SILHOUETTE}<button class="doll-add" data-act="art-add" title="Картинка во весь рост" aria-label="Добавить картинку во весь рост">${icon("plus")}<span>Картинка<br>во весь рост</span></button>`}<div class="doll-ac" data-card="stat:ac">${icon(acIcon(d.ac))}<b data-calc="ac">${d.ac}</b><small>КД</small></div></div>
      <div class="doll-col">${col("right")}</div>
    </div>
    <div class="doll-arms">
      <div class="doll-set on"><span class="doll-set-h">Основное</span><div class="doll-hands">${hands("main", "off")}</div></div>
      <button class="doll-swap" data-act="doll-swap" title="Поменять основное и сменное оружие" aria-label="Поменять основное и сменное оружие"${hasSwap || L.cells.main || L.cells.off ? "" : " disabled"}>${icon("tw/util/trade")}</button>
      <div class="doll-set"><span class="doll-set-h">Сменное</span><div class="doll-hands">${hands("main2", "off2")}</div></div>
    </div>
    ${extra}`;
  return panel("Надето", body, { ic: "gi/lorc/battle-gear", cls: "inv-worn doll-panel", actions: helpBtn("stat:doll") });
}

function invHead(ctx) {
  const { c, d } = ctx;
  const L = d.load || { light: 0, heavy: 0, max: d.carry };
  const pct = Math.min(100, (d.weight / Math.max(1, d.carry)) * 100);
  const loadState = d.weight > L.max ? ["over", `Перегруз: больше ${L.max} фнт не унести`] : d.weight > L.heavy ? ["heavy", "Очень тяжело"] : d.weight > L.light ? ["mid", "Тяжеловато"] : ["ok", "Налегке"];
  const mark = (v, label) => `<span class="wmark" style="left:${Math.min(100, (v / Math.max(1, L.max)) * 100)}%" title="${esc(label)}"></span>`;
  const coins = COINS.map(k => `
    <label class="coin ${Number(c.coins[k.key]) ? "" : "zero"}" style="--c:${k.color}" title="${esc(k.name)}: ${esc(k.rate)}">${icon("coin")}<input type="number" inputmode="numeric" min="0" data-path="coins.${k.key}" data-num value="${esc(c.coins[k.key])}" aria-label="${esc(k.name)}"><span class="coin-n">${esc(k.name)}</span><small class="coin-r">${esc(k.rate)}</small></label>`).join("");
  return `
    <div class="spell-head inv-head">
      ${statMedal(`Вес из ${d.carry} фнт`, fmtNum(d.weight), { calc: "weight", ic: "gi/delapouite/weight", card: "stat:weight" })}
      ${statMedal("Настройка", `${d.attuned}/3`, { calc: "attune", ic: "tw/attribute/attunement", card: "stat:attune" })}
      ${statMedal("Казна, зм", fmtNum(purseGp(c.coins)), { calc: "purse", ic: "gi/lorc/shiny-purse", card: "stat:purse" })}
    </div>
    <div class="inv-load">
      <div class="wbar ${d.weight > d.carry ? "over" : ""}" data-wbar><i style="width:${pct}%"></i>${mark(L.light, `${L.light} фнт: обременён`)}${mark(L.heavy, `${L.heavy} фнт: сильно обременён`)}</div>
      <span class="load-t load-${loadState[0]}">${esc(loadState[1])}</span>
    </div>
    <div class="coins">${coins}</div>
    <div class="coin-acts"><button class="btn ghost sm" data-act="coin-pay">${icon("minus")}Заплатить</button><button class="btn ghost sm" data-act="coin-get">${icon("plus")}Получить</button></div>`;
}

export function tabInventory(ctx) {
  const { c, ui } = ctx;
  const f = ui.invFilter || "all";
  const doll = f === "all" && !ui.ordering;
  const sorted = ui.ordering ? c.items.slice() : sortItems(c.items, ui.invSort || "added", false);
  const items = sorted.filter(it => invFilterPass(it, f));
  const tree = containerTree(c);
  const boxIds = new Set(c.items.filter(it => it.isContainer).map(it => it.id));
  const top = f === "all" ? items.filter(it => !it.container || !boxIds.has(it.container)) : items;
  const worn = top.filter(it => it.equipped);
  const onDoll = new Set(doll ? Object.values(dollLayout(c).cells).map(it => it.id) : []);
  const carried = top.filter(it => !it.equipped && !onDoll.has(it.id));
  const filters = `<div class="chips filter">${INV_FILTERS.map(([k, l]) => `<button class="chip toggle ${f === k ? "on" : ""}" data-act="inv-filter" data-k="${k}" aria-pressed="${f === k ? "true" : "false"}">${l}</button>`).join("")}</div>`;
  const sortSel = `<label class="search-box sort-box" title="Сортировка"><select data-ui="inv-sort" aria-label="Сортировка">${INV_SORTS.map(([k, l]) => `<option value="${k}" ${(ui.invSort || "added") === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  const search = c.items.length > 5 ? `<label class="search-box">${icon("search")}<input type="search" data-ui="inv-q" placeholder="Найти предмет" value="${esc(ui.invQ || "")}" aria-label="Найти предмет"></label>` : "";
  const tools = c.items.length && !ui.ordering ? `<div class="spell-tools inv-tools">${search}${sortSel}${filters}</div>` : "";
  const bagGrid = f === "all" ? slotGrid(ctx, carried, items, tree, { drop: "bag:", empty: `<p class="hint box-empty">Перетащи сюда, чтобы снять</p>` }) : slotGrid(ctx, carried, items, tree, { drop: "bag:", depth: 9 });
  const lists = [
    doll ? dollPanel(ctx, tree) : worn.length ? panel("Надето", slotGrid(ctx, worn, items, tree, { drop: null, depth: 9 }), { ic: "gi/lorc/battle-gear", cls: "inv-worn" }) : "",
    carried.length || doll ? panel("При себе", bagGrid, { ic: "gi/delapouite/backpack", cls: "inv-carried" }) : ""
  ].join("");
  const none = !c.items.length ? emptyState("Пусто, даже паук заскучал") : !lists ? `<p class="empty">Под этот фильтр ничего не подходит</p>` : "";
  return `
    ${panel("Снаряжение", invHead(ctx), { ic: "gi/delapouite/two-coins", actions: orderBtn(ctx) + `<button class="btn ghost sm" data-act="gear-table">${icon("book")}Библиотека</button>` + addBtn("add-item", "Предмет") })}
    ${tools}
    <div class="inv-lists">${lists}${none}</div>
    <p class="empty" data-search-empty hidden>Ничего не нашлось</p>`;
}

export const noteTags = noteTagsOf;

const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function noteBadge(n, sec) {
  const st = sec === "quests" ? NOTE_STATUS[n.status] : sec === "people" ? NOTE_ATTITUDE[n.attitude] : sec === "clues" ? CLUE_STATE[n.state] : null;
  return st ? `<span class="badge" style="--c:${st[1]}">${st[0]}</span>` : "";
}

const STAMPED = { quests: ["done", "failed"], clues: ["confirmed", "false"] };

function noteStamp(n, sec, big = false) {
  const g = NOTE_GROUPS[sec];
  const st = g && (STAMPED[sec] || []).includes(n[g.field]) ? g.states[n[g.field]] : null;
  return st ? `<span class="stamp ${big ? "big" : ""} ${n[g.field]}" style="--c:${st[1]}">${st[0]}</span>` : "";
}

function noteDatesHtml(n) {
  const d = noteDates(n);
  if (!d.made && !d.edit) return "";
  return `<p class="nr-dates">${d.made ? `<span>записано ${shortDate(d.made)}</span>` : ""}${d.edit ? `<span class="edited">правлено ${shortDate(d.edit)}</span>` : ""}</p>`;
}

function sessionDateCol(n) {
  const d = noteDates(n).made;
  return d ? `<time class="ses-date" datetime="${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}"><b>${d.getDate()}</b><small>${shortDate(d).split(" ")[1]}</small></time>` : `<span class="ses-date none"></span>`;
}

const ENTRY = /^\s*- \*\*(\d\d:\d\d)\*\*\s?(.*)$/;

function sessionEntries(text) {
  const parts = [];
  let free = [];
  let cur = null;
  const flushFree = () => {
    if (free.join("").trim()) parts.push({ free: free.join("\n") });
    free = [];
  };
  for (const l of String(text || "").replace(/\r/g, "").split("\n")) {
    const m = l.match(ENTRY);
    if (m) {
      flushFree();
      cur = { time: m[1], text: m[2] };
      parts.push(cur);
    } else if (cur && /^\s{2,}\S/.test(l)) cur.text += "\n" + l.trim();
    else {
      cur = null;
      free.push(l);
    }
  }
  flushFree();
  return parts;
}

export function sessionHtml(text, links) {
  let html = "";
  let open = false;
  for (const p of sessionEntries(text)) {
    if (p.time) {
      if (!open) html += `<ol class="tl">`;
      open = true;
      html += `<li class="tl-e"><time>${esc(p.time)}</time><div class="tl-t">${rich(p.text, links)}</div></li>`;
    } else {
      if (open) html += "</ol>";
      open = false;
      html += rich(p.free, links);
    }
  }
  return html + (open ? "</ol>" : "");
}

const entriesWord = n => (n % 10 === 1 && n % 100 !== 11 ? "запись" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "записи" : "записей");

function noteCard(n, sec, ctx, o = {}) {
  const { ui } = ctx;
  const local = ui.noteOpen || {};
  const shut = n.id in local ? !local[n.id] : !!n.collapsed;
  const stems = o.stems || [];
  const title = n.title || "Без названия";
  const entries = sec === "sessions" ? sessionEntries(n.text).filter(p => p.time) : [];
  const preview = shut ? (stems.length ? snippetHtml(n.text, stems) : entries.length ? esc(`${entries.length} ${entriesWord(entries.length)}, последняя в ${entries[entries.length - 1].time}: ${cut(plainText(entries[entries.length - 1].text), 70)}`) : esc(cut(plainText(n.text), 90))) : "";
  const tags = noteTagsOf(n);
  const back = !shut && o.back ? o.back.get(n.id) || [] : [];
  const linkOpts = o.links ? o.links(n.id) : undefined;
  return `<article data-rid="${esc(n.id)}" data-sec="${sec}" class="note ${sec === "sessions" ? "session" : ""} ${shut ? "collapsed" : ""} ${n.pinned ? "pinned" : ""} ${n.status === "done" || n.status === "failed" || n.state === "false" ? "dim" : ""}">
    <header>${sec === "sessions" ? sessionDateCol(n) : ""}<button class="note-toggle" data-act="toggle-note" data-sec="${sec}" data-id="${esc(n.id)}" aria-expanded="${shut ? "false" : "true"}"><span class="note-chev">${icon("down")}</span><span class="note-titles"><h4>${stems.length ? highlight(title, stems) : esc(title)}</h4>${n.subtitle ? `<span class="note-sub">${stems.length ? highlight(n.subtitle, stems) : esc(n.subtitle)}</span>` : ""}${preview ? `<span class="note-prev">${preview}</span>` : ""}</span></button>${o.showSec ? `<span class="badge sec">${esc(SECTION_NAME[sec] || "")}</span>` : ""}${noteBadge(n, sec)}<button class="icon-btn note-pin ${n.pinned ? "on" : ""}" data-act="pin-note" data-sec="${sec}" data-id="${esc(n.id)}" title="${n.pinned ? "Открепить из «Важного»" : "Закрепить в «Важном»"}" aria-pressed="${n.pinned ? "true" : "false"}">${icon("star")}</button><button class="icon-btn" data-act="edit-note" data-sec="${sec}" data-id="${esc(n.id)}" title="Изменить" aria-label="Изменить «${esc(title)}»">${icon("edit")}</button></header>
    ${tags.length ? `<div class="note-tags">${tags.map(t => `<button class="tag ${ui.noteTag === t ? "on" : ""}" data-act="note-tag" data-k="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : ""}
    ${shut ? "" : `<div class="note-text">${(sec === "sessions" ? sessionHtml(n.text, linkOpts) : rich(n.text, linkOpts)) || `<p class="dim">Пусто</p>`}</div>`}
    ${back.length ? `<div class="note-back"><span>${icon("link")}Упоминается:</span>${back.map(b => `<button class="tag" data-act="open-note" data-sec="${b.sec}" data-id="${esc(b.id)}">${esc(b.title)}</button>`).join("")}</div>` : ""}
  </article>`;
}

const NOTE_GROUPS = {
  people: { field: "attitude", states: NOTE_ATTITUDE, order: [["ally", "Союзники"], ["neutral", "Нейтральные"], ["hostile", "Враги"], ["", "Пока не ясно"]] },
  quests: { field: "status", states: NOTE_STATUS, order: [["active", "Активные"], ["", "Без статуса"], ["done", "Выполненные"], ["failed", "Проваленные"]] },
  clues: { field: "state", states: CLUE_STATE, order: [["confirmed", "Подтверждено"], ["lead", "Зацепки"], ["", "Не проверено"], ["false", "Ложные следы"]] }
};

export function noteState(n, sec) {
  const g = NOTE_GROUPS[sec];
  return g ? g.states[n[g.field]] || null : null;
}

const secIcon = sec => (NOTE_SECTIONS.find(x => x.key === sec) || {}).icon || "scroll";

function initials(t) {
  const w = String(t || "").replace(/[^\p{L}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean);
  return ((w[0] || "?")[0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
}

export function noteMedal(n, sec, big = false) {
  const st = noteState(n, sec);
  const c = st ? st[1] : "var(--gold)";
  return sec === "people"
    ? `<span class="jr-medal person ${big ? "big" : ""}" style="--c:${c}">${esc(initials(n.title))}</span>`
    : `<span class="jr-medal ${big ? "big" : ""}" style="--c:${c}">${icon(secIcon(sec))}</span>`;
}

function noteEntry(n, sec, o = {}) {
  const stems = o.stems || [];
  const title = n.title || "Без названия";
  const prev = stems.length ? snippetHtml(n.text, stems, 110) : esc(cut(plainText(n.text), 110));
  const st = noteState(n, sec);
  const dim = n.status === "done" || n.status === "failed" || n.state === "false";
  const todo = String(n.text || "").match(/^\s*[-*] \[[ xXхХ]\]/gm) || [];
  const done = todo.filter(t => /\[[xXхХ]\]/.test(t)).length;
  const dates = noteDates(n);
  const when = dates.edit ? shortDate(dates.edit) : shortDate(dates.made);
  const goal = todo.length ? `<span class="jr-goal ${done === todo.length ? "all" : ""}" title="Выполнено целей">${done} из ${todo.length}</span>` : "";
  return `<button class="jr-entry ${dim ? "dim" : ""}" style="--c:${st ? st[1] : "var(--gold)"}" data-rid="${esc(n.id)}" data-act="read-note" data-sec="${sec}" data-id="${esc(n.id)}">
    ${noteMedal(n, sec)}
    <span class="jr-t"><b>${stems.length ? highlight(title, stems) : esc(title)}</b>${n.subtitle ? `<small>${stems.length ? highlight(n.subtitle, stems) : esc(n.subtitle)}</small>` : ""}${prev ? `<span class="jr-prev">${prev}</span>` : ""}</span>
    <span class="jr-side">${goal}${n.pinned ?`<i class="jr-pin" title="В «Важном»">${icon("star")}</i>` : ""}${o.showSec ? `<span class="badge sec">${esc(SECTION_NAME[sec] || "")}</span>` : ""}${o.showSec && st ? `<span class="badge" style="--c:${st[1]}">${st[0]}</span>` : ""}${when ? `<time class="jr-date">${when}</time>` : ""}</span>
  </button>`;
}

function groupedEntries(list, sec, ui) {
  const g = NOTE_GROUPS[sec];
  if (!g || ui.ordering) return `<div class="jr-list" data-reorder="notes.${sec}">${list.map(n => noteEntry(n, sec)).join("")}</div>`;
  const keyOf = n => (g.order.some(([k]) => k === (n[g.field] || "")) ? n[g.field] || "" : "");
  return g.order.map(([k, label]) => {
    const items = list.filter(n => keyOf(n) === k);
    if (!items.length) return "";
    const st = g.states[k];
    return `<section class="jr-group" style="--c:${st ? st[1] : "var(--dim)"}"><h4 class="jr-gh"><span>${label}</span><small>${items.length}</small></h4><div class="jr-list">${items.map(n => noteEntry(n, sec)).join("")}</div></section>`;
  }).join("");
}

export function noteReadHtml(c, sec, n, { readOnly = false } = {}) {
  const st = noteState(n, sec);
  const back = backlinks(c).get(n.id) || [];
  const tags = noteTagsOf(n);
  const s = NOTE_SECTIONS.find(x => x.key === sec) || {};
  const stamp = noteStamp(n, sec, true);
  return `<article class="nr" style="--c:${st ? st[1] : "var(--gold-2)"}">
    <header class="nr-h">${noteMedal(n, sec, true)}<div class="nr-ti"><span class="nr-sec">${icon(s.icon || "scroll")}${esc(s.name || "")}${st && !stamp ? ` · <b>${st[0]}</b>` : ""}</span><h2>${esc(n.title || "Без названия")}</h2>${n.subtitle ? `<p class="nr-sub">${esc(n.subtitle)}</p>` : ""}${noteDatesHtml(n)}${stamp}</div></header>
    <div class="nr-orn" aria-hidden="true"><i></i></div>
    <div class="nr-text note-text">${rich(n.text, richLinks(c)(n.id)) || `<p class="dim">Пока пусто. Нажми «Изменить», чтобы записать.</p>`}</div>
    ${tags.length ? `<div class="nr-tags">${tags.map(t => `<button class="tag" data-act="note-tag" data-k="${esc(t)}">#${esc(t)}</button>`).join("")}</div>` : ""}
    ${back.length ? `<div class="nr-back"><span>${icon("link")}Упоминается</span>${back.map(b => `<button class="tag" data-act="open-note" data-sec="${b.sec}" data-id="${esc(b.id)}">${esc(b.title)}</button>`).join("")}</div>` : ""}
    ${readOnly ? "" : `<footer class="nr-foot"><button class="btn ghost sm ${n.pinned ? "on" : ""}" data-act="pin-note" data-sec="${sec}" data-id="${esc(n.id)}" aria-pressed="${n.pinned ? "true" : "false"}">${icon("star")}${n.pinned ? "В «Важном»" : "В «Важное»"}</button><button class="btn gold sm" data-act="edit-note" data-sec="${sec}" data-id="${esc(n.id)}">${icon("edit")}Изменить</button></footer>`}
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
    return `<p class="hint">Найдено: ${found.length}. Сначала самое подходящее.</p><div class="jr-list">` + found.map(r => r.sec === "sessions" ? noteCard(r.n, r.sec, ctx, { stems, links, back, showSec: true }) : noteEntry(r.n, r.sec, { stems, showSec: true })).join("") + "</div>";
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
  if (!list.length) return (c.notes[s] || []).length ? `<p class="empty">${empty}</p>` : emptyState(empty);
  if (s === "sessions") return `<div class="notes single" data-reorder="notes.sessions">${list.map(n => noteCard(n, s, ctx, { links, back })).join("")}</div>`;
  return groupedEntries(list, s, ui);
}

function journalBox(c) {
  const cur = currentSession(c);
  return `<div class="journal-add">
    <div class="ja-h">${icon("quill")}<span><b>${cur ? esc(cur.title) : "Новая сессия"}</b><small>${cur ? esc(cur.subtitle || "") : "начнётся с первой записи"}</small></span><span class="spacer"></span><button class="btn ghost sm" data-act="session-new">${icon("plus")}Новая сессия</button></div>
    <textarea data-journal rows="2" placeholder="Что случилось? Набери [[, чтобы сослаться на человека или место" aria-label="Запись в журнал"></textarea>
    <div class="ja-foot"><span class="hint explain">Enter: записать со временем, Shift+Enter: новая строка.</span><button class="btn ghost sm" data-act="writing-help" data-k="journal">${icon("book")}Как записывать</button><button class="btn gold sm" data-act="journal-add">${icon("check")}Записать</button></div>
  </div>`;
}

export function pinnedStrip(c, cls = "") {
  const list = pinnedNotes(c);
  if (!list.length) return "";
  return `<div class="pinned-strip ${cls}"><span class="ps-h">${icon("gi/delapouite/pin")}Важное</span>${list.map(({ sec, n }) => `<button class="pin-chip" data-act="open-note" data-sec="${sec}" data-id="${esc(n.id)}" title="${esc(SECTION_NAME[sec] || "")}"><b>${esc(n.title || "Без названия")}</b>${n.subtitle ? `<small>${esc(n.subtitle)}</small>` : ""}</button>`).join("")}</div>`;
}

export function importantPanel(c) {
  const list = pinnedNotes(c);
  if (!list.length) return "";
  const rows = list.map(({ sec, n }) => `<button class="imp-row" data-act="open-note" data-sec="${sec}" data-id="${esc(n.id)}"><b>${esc(n.title || "Без названия")}</b><small>${esc(SECTION_NAME[sec] || "")}${n.subtitle ? " · " + esc(n.subtitle) : ""}</small><span>${esc(cut(plainText(n.text), 110))}</span></button>`).join("");
  return panel("Важное", `<div class="imp-list">${rows}</div>`, { ic: "gi/delapouite/pin", cls: "p-important" });
}

export function tabNotes(ctx) {
  const { c, ui } = ctx;
  const s = ui.notesSection || "sessions";
  const searching = !!String(ui.notesQ || "").trim();
  const sec = NOTE_SECTIONS.find(x => x.key === s) || NOTE_SECTIONS[0];
  const nav = `<nav class="jr-tabs" aria-label="Разделы заметок">${NOTE_SECTIONS.map(x => `<button class="jr-tab ${s === x.key && !searching ? "on" : ""}" data-act="notes-section" data-k="${x.key}" aria-pressed="${s === x.key && !searching ? "true" : "false"}">${icon(x.icon)}<span>${x.name}</span>${(c.notes[x.key] || []).length ? `<small>${c.notes[x.key].length}</small>` : ""}</button>`).join("")}<button class="jr-tab board" data-act="board">${icon("web")}<span>Доска связей</span></button></nav>`;
  const recent = (ui.notesRecent || []).filter(Boolean);
  const titles = linkTargets(c).map(t => t.title);
  const options = [...new Set([...recent, ...titles])].slice(0, 60);
  const search = `<label class="search-box notes-search">${icon("search")}<input type="search" data-ui="notes-q" list="notes-q-list" placeholder="Найти в любой заметке: имя, место, слово" value="${esc(ui.notesQ || "")}" aria-label="Поиск по всем заметкам" autocomplete="off"></label><datalist id="notes-q-list">${options.map(o => `<option value="${esc(o)}"></option>`).join("")}</datalist>`;
  const tags = [...new Set((c.notes[s] || []).flatMap(noteTagsOf))].sort((a, b) => a.localeCompare(b, "ru"));
  const filters = tags.length ? `<div class="note-filters" ${searching ? "hidden" : ""}>${tags.map(t => `<button class="tag ${ui.noteTag === t ? "on" : ""}" data-act="note-tag" data-k="${esc(t)}" aria-pressed="${ui.noteTag === t ? "true" : "false"}">#${esc(t)}</button>`).join("")}</div>` : "";
  const journal = s === "sessions" && !searching ? journalBox(c) : "";
  const count = (c.notes[s] || []).length;
  const head = `<div class="notes-head" ${searching ? "hidden" : ""}><h3 class="jr-title">${icon(sec.icon)}${esc(sec.name)}${count ? `<small>${count}</small>` : ""}</h3><span class="spacer"></span>${s === "sessions" ? "" : `<button class="btn ghost sm" data-act="writing-help">${icon("book")}Как записывать</button>`}${count > 1 ? orderBtn(ctx) : ""}${s === "sessions" ? "" : addBtn("add-note", sec.add, `data-sec="${s}"`)}</div>`;
  return pinnedStrip(c) + nav + search + `<div class="journal-slot" ${searching ? "hidden" : ""}>${journal}</div>` + head + filters + `<div class="jr-body" data-notes-list>${notesList(ctx)}</div>`;
}

export const RENDER = { char: tabChar, combat: tabCombat, spells: tabSpells, features: tabFeatures, inventory: tabInventory, notes: tabNotes };
