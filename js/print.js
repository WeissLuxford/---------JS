import { ABILITIES, SKILLS, DAMAGE, SCHOOLS, ACTIONS, FEATURE_CATS, ITEM_TYPES, CONDITIONS, DEFENSE_KINDS, NOTE_KEYS, fmt, spellCast, usesInfo, spellInCombat, effectSummary } from "./rules.js";
import { esc, rich, openModal } from "./ui.js";
import { spellAtk, spellDc, fmtNum } from "./entities.js";
import { combatSources } from "./tabs.js";

const SECTIONS = [
  ["main", "Основное: характеристики, навыки, хиты, атаки", true],
  ["spells", "Заклинания", true],
  ["features", "Умения и черты с описаниями", true],
  ["items", "Снаряжение", true],
  ["story", "Личность и предыстория", true],
  ["notes", "Заметки", false],
  ["portrait", "Портрет", true]
];

const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || "";
const dmgName = t => ((DAMAGE[t] || {}).name || "").toLowerCase();
const box = (label, value, cls = "") => `<div class="p-box ${cls}"><b>${value}</b><span>${esc(label)}</span></div>`;
const sec = (title, body, cls = "") => (body ? `<section class="p-sec ${cls}"><h2>${esc(title)}</h2>${body}</section>` : "");

function mainPart(c, d, withPortrait) {
  const info = c.info;
  const head = `<header class="p-head">
    ${withPortrait && c.portrait ? `<img class="p-portrait" src="${esc(c.portrait)}" alt="">` : ""}
    <div class="p-title"><h1>${esc(c.name)}</h1>
      <div class="p-sub">${esc([info.race, info.subrace].filter(Boolean).join(", "))} · ${esc([info.cls, info.subclass].filter(Boolean).join(", "))} · ${d.level} уровень</div>
      <div class="p-sub">${esc([info.background, info.alignment, info.age ? info.age + " лет" : "", info.player ? "Игрок: " + info.player : ""].filter(Boolean).join(" · "))}</div>
    </div>
  </header>`;
  const abil = `<div class="p-abils">${ABILITIES.map(a => `<div class="p-abil"><span>${a.short}</span><b>${fmt(d.mods[a.key])}</b><i>${esc(c.abilities[a.key])}</i></div>`).join("")}</div>`;
  const stats = `<div class="p-boxes">${box("КД", d.ac)}${box("Инициатива", fmt(d.init))}${box("Скорость", d.speed + " фт")}${box("Мастерство", fmt(d.pb))}${box("Хиты", `${Math.min(d.hpMax, Number(c.hp.current) || 0)} / ${d.hpMax}`)}${box("Кости хитов", `${d.hitDice.left}/${d.hitDice.total} ${esc(c.hitDie)}`)}${box("Пасс. Внимат.", d.passive.perception)}${c.casterType !== "none" || c.spells.length ? box("СЛ заклинаний", d.spell.dc) + box("Атака закл.", fmt(d.spell.atk)) : ""}</div>`;
  const saves = `<ul class="p-list">${ABILITIES.map(a => `<li><span class="p-dot ${c.saves[a.key] ? "on" : ""}"></span>${a.name}<b>${fmt(d.saves[a.key])}</b></li>`).join("")}</ul>`;
  const skills = `<ul class="p-list cols">${SKILLS.map(s => {
    const p = Number(c.skills[s.key]) || 0;
    return `<li><span class="p-dot ${p ? "on" : ""} ${p === 2 ? "x2" : ""}"></span>${s.name} <small>${abShort(s.ab)}</small><b>${fmt(d.skills[s.key])}</b></li>`;
  }).join("")}</ul>`;
  const src = combatSources(c, d);
  const rows = [
    ...src.weapons.map(it => {
      const w = d.weapons[it.id];
      return [it.name, fmt(w.hit), `${w.dmg} ${dmgName(w.type)}`, w.range];
    }),
    ...src.spells.map(sp => {
      const cast = spellCast(c, d, sp);
      const l = cast.lines[0];
      return [sp.name, sp.attack ? fmt(spellAtk(d, sp)) : sp.save ? `СЛ ${spellDc(d, sp)} ${abShort(sp.save)}` : "", l ? `${cast.beams > 1 ? cast.beams + "× " : ""}${l.dice} ${dmgName(l.type)}` : "", sp.range];
    }),
    ...src.own.map(at => {
      const s = d.attacks[at.id];
      return [at.name, s.kind === "save" ? `СЛ ${s.dc} ${abShort(s.save)}` : `${s.beams > 1 ? s.beams + "× " : ""}${fmt(s.hit)}`, `${s.dmg} ${dmgName(s.type)}`, at.range];
    })
  ];
  const attacks = rows.length ? `<table class="p-table"><thead><tr><th>Атака</th><th>Попадание</th><th>Урон</th><th>Дистанция</th></tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${esc(x || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const defs = Object.entries(DEFENSE_KINDS).filter(([k]) => d.defenses[k].length).map(([k, l]) => `${l}: ${d.defenses[k].map(dmgName).join(", ")}`);
  const prof = [["Доспехи", c.proficiencies.armor], ["Оружие", c.proficiencies.weapons], ["Инструменты", c.proficiencies.tools], ["Языки", c.proficiencies.languages], ["Чувства", c.senses], ...defs.map(t => ["Защита", t])].filter(([, v]) => v).map(([l, v]) => `<p><b>${esc(l)}:</b> ${esc(v)}</p>`).join("");
  const conds = [...CONDITIONS.filter(k => c.conditions[k.key]).map(k => k.name), c.exhaustion ? `Истощение ${c.exhaustion}` : "", ...(c.effects || []).map(e => `${e.name} (${effectSummary(e)})`)].filter(Boolean);
  const coins = Object.entries({ ПМ: c.coins.pp, ЗМ: c.coins.gp, ЭМ: c.coins.ep, СМ: c.coins.sp, ММ: c.coins.cp }).filter(([, v]) => Number(v)).map(([k, v]) => `${v} ${k}`).join(", ");
  return head + `<div class="p-grid">
    <div>${sec("Характеристики", abil)}${sec("Спасброски", saves)}</div>
    <div>${sec("Бой", stats)}${conds.length ? sec("Сейчас действует", `<p>${esc(conds.join(", "))}</p>`) : ""}${sec("Атаки", attacks)}</div>
  </div>${sec("Навыки", skills)}${sec("Владения и защита", prof)}${coins ? sec("Деньги", `<p>${esc(coins)}</p>`) : ""}`;
}

function spellsPart(c, d) {
  if (!c.spells.length) return "";
  const slots = d.pact ? `<p>Ячейки договора: ${d.pact.count} × ${d.pact.level} круг (восстанавливаются коротким отдыхом)</p>` : d.slots.length ? `<p>Ячейки: ${d.slots.map((n, i) => `${i + 1} круг × ${n}`).join(", ")}</p>` : "";
  const groups = {};
  c.spells.forEach(sp => (groups[Number(sp.level) || 0] = groups[Number(sp.level) || 0] || []).push(sp));
  const body = Object.keys(groups).map(Number).sort((a, b) => a - b).map(l => `<h3>${l ? l + " круг" : "Заговоры"}</h3>${groups[l].map(sp => {
    const cast = spellCast(c, d, sp);
    const meta = [ACTIONS[sp.action] ? sp.castTime || ACTIONS[sp.action].name : sp.castTime, sp.range, sp.duration, sp.concentration ? "концентрация" : "", sp.ritual ? "ритуал" : "", sp.components].filter(Boolean).join(" · ");
    const dmg = cast.lines.map(x => `${x.dice} ${dmgName(x.type)}`).join(" + ");
    const roll = [sp.attack ? `атака ${fmt(spellAtk(d, sp))}` : "", sp.save ? `спасбросок ${abShort(sp.save)} СЛ ${spellDc(d, sp)}` : "", dmg ? (cast.beams > 1 ? cast.beams + " × " : "") + dmg : ""].filter(Boolean).join(", ");
    return `<div class="p-item"><div class="p-item-h"><b>${esc(sp.name)}</b>${sp.nameEn ? ` <small>${esc(sp.nameEn)}</small>` : ""}<span>${esc((SCHOOLS[sp.school] || {}).name || "")}</span></div><div class="p-meta">${esc(meta)}${roll ? ` · <b>${esc(roll)}</b>` : ""}</div>${sp.description ? `<div class="p-desc">${rich(sp.description)}</div>` : ""}</div>`;
  }).join("")}`).join("");
  return sec("Заклинания", `<p>Характеристика: ${esc((ABILITIES.find(a => a.key === c.spellAbility) || {}).name || "")} · СЛ ${d.spell.dc} · атака ${fmt(d.spell.atk)}</p>${slots}${body}`, "p-break");
}

function featuresPart(c, d) {
  if (!c.features.length) return "";
  const body = Object.entries(FEATURE_CATS).map(([key, cat]) => {
    const list = c.features.filter(f => (f.category || "other") === key);
    if (!list.length) return "";
    return `<h3>${esc(cat.name)}</h3>${list.map(f => {
      const u = usesInfo(d, f);
      return `<div class="p-item"><div class="p-item-h"><b>${esc(f.name)}</b>${u ? `<span>${u.max} раз</span>` : ""}</div>${f.effect ? `<div class="p-meta"><b>${esc(f.effect)}</b></div>` : ""}${f.description ? `<div class="p-desc">${rich(f.description)}</div>` : ""}</div>`;
    }).join("")}`;
  }).join("");
  return sec("Умения и черты", body, "p-break");
}

function itemsPart(c, d) {
  if (!c.items.length) return "";
  const rows = c.items.map(it => `<tr><td>${it.equipped ? "✓" : ""}</td><td><b>${esc(it.name)}</b>${it.effect ? `<br><small>${esc(it.effect)}</small>` : ""}</td><td>${esc((ITEM_TYPES[it.type] || {}).name || "")}</td><td>${esc(it.qty)}</td><td>${Number(it.weight) ? esc(fmtNum(it.weight)) : ""}</td><td>${esc(it.value || "")}</td></tr>`).join("");
  return sec("Снаряжение", `<p>Вес: ${esc(fmtNum(d.weight))} / ${d.carry} фнт · настроено ${d.attuned} / 3</p><table class="p-table"><thead><tr><th></th><th>Предмет</th><th>Тип</th><th>Кол.</th><th>Вес</th><th>Цена</th></tr></thead><tbody>${rows}</tbody></table>`);
}

function storyPart(c) {
  const p = c.personality;
  const parts = [["Внешность", p.appearance], ["Черты характера", p.traits], ["Идеалы", p.ideals], ["Привязанности", p.bonds], ["Слабости", p.flaws], ["Союзники и организации", p.allies], ["Предыстория", p.backstory]].filter(([, v]) => v);
  return parts.length ? sec("Личность и предыстория", parts.map(([l, v]) => `<h3>${esc(l)}</h3><div class="p-desc">${rich(v)}</div>`).join(""), "p-break") : "";
}

function notesPart(c) {
  const titles = { patron: "Покровитель", quests: "Задания", people: "Люди", misc: "Прочее" };
  const body = NOTE_KEYS.map(k => (c.notes[k].length ? `<h3>${titles[k]}</h3>${c.notes[k].map(n => `<div class="p-item"><div class="p-item-h"><b>${esc(n.title || "Без названия")}</b>${n.subtitle ? `<span>${esc(n.subtitle)}</span>` : ""}</div>${n.text ? `<div class="p-desc">${rich(n.text)}</div>` : ""}</div>`).join("")}` : "")).join("");
  return sec("Заметки", body, "p-break");
}

export function printHtml(c, d, chosen) {
  const on = k => chosen.includes(k);
  return [on("main") ? mainPart(c, d, on("portrait")) : "", on("spells") ? spellsPart(c, d) : "", on("features") ? featuresPart(c, d) : "", on("items") ? itemsPart(c, d) : "", on("story") ? storyPart(c) : "", on("notes") ? notesPart(c) : ""].join("") + `<footer class="p-foot">${esc(c.name)} · лист персонажа D&amp;D 5e</footer>`;
}

export function openPrint(c, d) {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("dnd.print") || "null") || [];
  } catch {}
  const isOn = (k, def) => (saved.length ? saved.includes(k) : def);
  const m = openModal({
    title: "Печать и PDF",
    cls: "small",
    body: `<p class="hint">Отметь, что попадёт на бумагу. Чтобы получить PDF, в окне печати выбери «Сохранить как PDF».</p><div class="print-opts">${SECTIONS.map(([k, l, def]) => `<label class="fld chk"><input type="checkbox" value="${k}" ${isOn(k, def) ? "checked" : ""}><span>${esc(l)}</span></label>`).join("")}</div><div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn gold" data-go>Печать</button></div>`
  });
  m.body.querySelector("[data-go]").onclick = () => {
    const chosen = Array.from(m.body.querySelectorAll("input:checked")).map(i => i.value);
    try {
      localStorage.setItem("dnd.print", JSON.stringify(chosen));
    } catch {}
    m.close();
    let host = document.getElementById("print-root");
    if (!host) {
      host = document.createElement("div");
      host.id = "print-root";
      document.body.appendChild(host);
    }
    host.innerHTML = printHtml(c, d, chosen);
    const title = document.title;
    document.title = c.name;
    window.addEventListener("afterprint", () => {
      document.title = title;
      host.innerHTML = "";
    }, { once: true });
    setTimeout(() => window.print(), 250);
  };
}
