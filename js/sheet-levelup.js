import { ABILITIES, SCHOOLS, compute, fmt, maxDie, rollDice, uid, normalize, slotTable, pactSlots } from "./rules.js";
import { icon } from "./icons.js";
import { esc, toast, openModal, rich, playSound, fxSettings, reducedMotion } from "./ui.js";
import { detectClass, levelUpPlan, detectSubclass, newFeatures, invocationOptions, learnLevel, spellCandidates } from "./classes.js";
import { spellIcon, featureIcon } from "./entities.js";
import { loadSpells, toSpell, loadFeatures, classFeaturesAt, featureFromLib } from "./library.js";
import { clone } from "./sheet-util.js";

const lower = s => String(s || "").toLowerCase().replace(/ё/g, "е");

function featureEntity(f) {
  return { id: "ft-" + uid(), name: f.name, nameEn: "", category: f.category || "class", source: f.source || "class", action: f.action || "passive", recharge: f.recharge || "always", uses: f.uses || "", used: 0, slot: "none", range: "", duration: "", save: "", damage: f.damage || [], description: f.description || "", effect: "" };
}

function invocationEntity(x) {
  const once = /раз за длинный отдых/i.test(x.description);
  const atWill = /неограниченно/i.test(x.description);
  return featureEntity({ name: x.name, category: "invocation", description: x.description, action: once || atWill ? "action" : "passive", recharge: once ? "long" : "always", uses: once ? "1" : "" });
}

export function installLevelUp(X) {
  const { S } = X;

  function slotsText(d) {
    if (d.pact) return `${d.pact.count} × ${d.pact.level} круг (договор)`;
    return d.slots.length ? d.slots.map((n, i) => `${i + 1}: ${n}`).join(", ") : "нет";
  }

  async function openLevelUp() {
    const c = S.c;
    const from = S.d.level;
    if (from >= 20) return toast("Это уже 20 уровень, выше некуда", { kind: "info" });
    const cls = detectClass(c);
    const sub = detectSubclass(c, cls);
    const plan = levelUpPlan(c, cls, from);
    const pk = plan.picks;
    const libAll = cls ? await loadFeatures().catch(() => null) : null;
    const ownNames = new Set(c.features.map(f => lower(f.name)));
    const fromLib = libAll ? classFeaturesAt(libAll, c, cls.key, plan.to).filter(x => !ownNames.has(lower(x.name))) : [];
    const boons = fromLib.filter(x => /^pact of /i.test(x.nameEn || ""));
    const styleFeat = fromLib.find(x => /^fighting style$/i.test(x.nameEn || ""));
    const styles = styleFeat && libAll ? libAll.filter(x => x.group === "style" && !ownNames.has(lower(x.name))) : [];
    const optGroups = new Map();
    for (const x of fromLib) {
      const parent = fromLib.find(y => y !== x && x.key.startsWith(y.key + "-"));
      if (parent) {
        if (!optGroups.has(parent)) optGroups.set(parent, []);
        optGroups.get(parent).push(x);
      }
    }
    const optional = new Set([...boons, ...[...optGroups.values()].flat()]);
    const feats = libAll && fromLib.length ? fromLib.filter(x => !optional.has(x)).map(x => ({ ...featureFromLib(x), category: "class", source: "class" })) : newFeatures(c, cls, plan.to);
    const choices = [
      boons.length ? { key: "boon", title: "Дар договора", list: boons, max: 1 } : null,
      styles.length ? { key: "style", title: "Боевой стиль", list: styles, max: 1 } : null,
      ...[...optGroups.entries()].map(([parent, list], i) => ({ key: "opt" + i, title: parent.name, list, max: /metamagic/i.test(parent.nameEn || "") ? 2 : 1 }))
    ].filter(Boolean);
    const die = maxDie(c.hitDie);
    const avg = Math.floor(die / 2) + 1;
    const con = S.d.mods.con;
    const maxLvl = learnLevel(c, cls, plan.to, slotTable, pactSlots);
    const st = { choice: {}, roll: null, hpMode: "avg", asi: "later", a1: "", a2: "", feat: "", feats: new Set(feats.map((_, i) => i)), pick: { spells: new Set(), cantrips: new Set(), arcanum: new Set(), invocations: new Set(), swapSpell: new Set(), swapInv: new Set() }, swapOut: "", invOut: "", q: {}, open: "" };
    let lib = null;
    let libError = false;
    const invs = invocationOptions(c, plan.to);
    const swappable = c.spells.filter(sp => Number(sp.level) > 0 && sp.cost === "slot");
    const ownInvs = c.features.filter(f => f.category === "invocation");
    const groups = {
      cantrips: { need: pk.cantrips, title: "Новый заговор", ic: "gi/lorc/magic-palm" },
      spells: { need: pk.spells, title: cls && cls.book ? "Заклинания в книгу" : "Новое заклинание", ic: "gi/delapouite/spell-book" },
      arcanum: { need: pk.arcanum ? 1 : 0, title: `Таинственный арканум (${pk.arcanum} круг)`, ic: "gi/delapouite/secret-book" },
      invocations: { need: pk.invocations, title: "Новое воззвание", ic: "gi/delapouite/warlock-eye" },
      swapSpell: { need: 1, title: "Новое вместо забытого", ic: "gi/delapouite/card-exchange" },
      swapInv: { need: 1, title: "Новое воззвание вместо старого", ic: "gi/lorc/trade" }
    };
    const options = g => {
      if (g === "invocations" || g === "swapInv") return invs.filter(x => !x.have).sort((a, b) => Number(b.ok) - Number(a.ok)).map(x => ({ key: x.key, name: x.name, sub: x.ok ? "" : x.why, desc: x.description, ok: x.ok, icon: "gi/delapouite/warlock-eye", color: "#c07cff" }));
      if (!lib) return [];
      const list = g === "cantrips" ? spellCandidates(lib, c, cls, 0, { cantrips: true }) : g === "arcanum" ? lib.filter(x => x.level === pk.arcanum && (x.classes || []).includes(cls.key)) : spellCandidates(lib, c, cls, maxLvl);
      return list.map(x => {
        const si = spellIcon(c, x);
        return { key: x.key, name: x.name, sub: `${x.level ? x.level + " круг" : "заговор"} · ${(SCHOOLS[x.school] || {}).name || ""}${x.expanded ? ` · ${sub ? sub.name.toLowerCase() : "доп. список"}` : ""}${x.concentration ? " · концентрация" : ""}`, desc: x.description, ok: true, icon: si.icon, color: si.color, en: x.nameEn, lib: x };
      });
    };
    const optRows = g => {
      const q = lower(st.q[g] || "");
      const all = options(g);
      const list = all.filter(o => !q || lower(o.name).includes(q) || lower(o.en).includes(q));
      const chosen = st.pick[g];
      if (!lib && g !== "invocations" && g !== "swapInv") return `<p class="hint">${libError ? "Не удалось загрузить библиотеку заклинаний. Выбери потом через «Библиотеку»." : "Загружаю список заклинаний…"}</p>`;
      if (!list.length) return `<p class="hint">Ничего не нашлось</p>`;
      return list.map(o => {
        const on = chosen.has(o.key);
        const off = !o.ok;
        const open = st.open === g + ":" + o.key;
        return `<div class="lu-opt ${on ? "on" : ""} ${o.ok ? "" : "locked"}">
          <button class="lu-pick" data-g="${g}" data-k="${esc(o.key)}" ${off ? "disabled" : ""} aria-pressed="${on ? "true" : "false"}"><span class="lu-ic" style="--c:${esc(o.color)}">${icon(o.icon)}</span><span class="lu-name"><b>${esc(o.name)}</b><small>${esc(o.sub)}</small></span><span class="lu-mark">${on ? icon("check") : ""}</span></button>
          <button class="icon-btn lu-info" data-info="${g}:${esc(o.key)}" title="Описание" aria-expanded="${open ? "true" : "false"}">${icon(open ? "down" : "info")}</button>
          ${open ? `<div class="lu-desc">${rich(o.desc || "")}</div>` : ""}
        </div>`;
      }).join("");
    };
    const pickerHtml = (g, extra = "") => {
      const n = groups[g].need;
      return `<div class="lu-picker" data-picker="${g}">
        <div class="lu-picker-h"><span>${esc(groups[g].title)}</span><b data-count="${g}" class="${st.pick[g].size >= n ? "done" : ""}">${st.pick[g].size} из ${n}</b></div>
        ${extra}
        <label class="search-box">${icon("search")}<input type="search" data-lu-q="${g}" placeholder="Поиск по названию" aria-label="Поиск"></label>
        <div class="lu-opts" data-opts="${g}">${optRows(g)}</div>
      </div>`;
    };
    const abOpts = sel => `<option value="">Выбери</option>${ABILITIES.map(a => `<option value="${a.key}" ${sel === a.key ? "selected" : ""}>${a.name} (${c.abilities[a.key]})</option>`).join("")}`;
    const preview = () => {
      const next = clone(c);
      next.info.level = plan.to;
      if (plan.asi && st.asi === "two" && st.a1 && st.a2 && st.a1 !== st.a2) {
        next.abilities[st.a1] = Math.min(20, next.abilities[st.a1] + 1);
        next.abilities[st.a2] = Math.min(20, next.abilities[st.a2] + 1);
      }
      if (plan.asi && st.asi === "one" && st.a1) next.abilities[st.a1] = Math.min(20, next.abilities[st.a1] + 2);
      const con1 = compute(normalize(next)).mods.con;
      const gain = st.hpMode === "roll" && st.roll != null ? st.roll : avg;
      const levelHp = Math.max(1, gain + con1);
      next.hp.rollAdj = (Number(next.hp.rollAdj) || 0) + levelHp - Math.max(1, avg + con1);
      if (next.hp.maxOverride != null && next.hp.maxOverride !== "") next.hp.maxOverride = Number(next.hp.maxOverride) + levelHp + (con1 - con) * from;
      return { next, d0: S.d, d1: compute(normalize(next)), gain };
    };
    const changesHtml = () => {
      const { d0, d1 } = preview();
      const rows = [
        ["Хиты (максимум)", d0.hpMax, d1.hpMax],
        ["Бонус мастерства", fmt(d0.pb), fmt(d1.pb)],
        ["Кости хитов", d0.hitDice.total, d1.hitDice.total],
        ["СЛ заклинаний", d0.spell.dc, d1.spell.dc],
        ["Атака заклинанием", fmt(d0.spell.atk), fmt(d1.spell.atk)],
        ["Ячейки", slotsText(d0), slotsText(d1)],
        ["КД", d0.ac, d1.ac]
      ].filter(([, a, b]) => String(a) !== String(b));
      return rows.length ? `<ul class="lu-list">${rows.map(([l, a, b]) => `<li><span>${esc(l)}</span><b>${esc(a)} → ${esc(b)}</b></li>`).join("")}</ul>` : `<p class="hint">Числа не меняются.</p>`;
    };
    const left = () => {
      const out = [];
      for (const g of ["cantrips", "spells", "arcanum", "invocations"]) {
        const n = groups[g].need - st.pick[g].size;
        if (n > 0) out.push(`${groups[g].title.toLowerCase()}: ${n}`);
      }
      choices.forEach(ch => (st.choice[ch.key] || new Set()).size < ch.max && out.push(ch.title.toLowerCase()));
      if (st.swapOut && !st.pick.swapSpell.size) out.push("замена заклинания");
      if (st.invOut && !st.pick.swapInv.size) out.push("замена воззвания");
      return out;
    };
    const featsHtml = feats.length ? `<section class="lu-sec"><h3>${icon("gi/lorc/book-aura")}Новые умения</h3><p class="hint">Добавятся во вкладку «Умения» сами.</p>${feats.map((f, i) => `<label class="lu-feat"><input type="checkbox" data-feat-i="${i}" checked><span><b>${esc(f.name)}</b>${f.uses ? `<small>${f.recharge === "short" ? "восстанавливается коротким отдыхом" : "раз за длинный отдых"}</small>` : ""}<span class="lu-feat-d">${rich(f.description)}</span></span></label>`).join("")}</section>` : "";
    const choiceHtml = choices.map(ch => `<section class="lu-sec"><h3>${icon("gi/delapouite/choice")}${esc(ch.title)}: ${ch.max > 1 ? `выбери ${ch.max}` : "выбери один"}</h3>${ch.list.map(x => `<label class="lu-feat"><input type="${ch.max > 1 ? "checkbox" : "radio"}" name="lu-ch-${ch.key}" value="${esc(x.key)}" data-choice="${ch.key}"><span><b>${esc(x.name)}</b><span class="lu-feat-d">${rich(x.description)}</span></span></label>`).join("")}</section>`).join("");
    const genericNotes = plan.notes.filter(n => !(feats.length && /Умение покровителя/.test(n)) && !(boons.length && /Дар договора/.test(n)));
    const asiHtml = plan.asi ? `<section class="lu-sec"><h3>${icon("gi/delapouite/upgrade")}Увеличение характеристик</h3>
      <label class="fld chk"><input type="radio" name="lu-asi" value="one"><span>+2 к одной</span></label>
      <div class="lu-row" data-show="one"><select data-a1-one>${abOpts("")}</select></div>
      <label class="fld chk"><input type="radio" name="lu-asi" value="two"><span>+1 к двум разным</span></label>
      <div class="lu-row" data-show="two"><select data-a1>${abOpts("")}</select><select data-a2>${abOpts("")}</select></div>
      <label class="fld chk"><input type="radio" name="lu-asi" value="feat"><span>Черта вместо увеличения</span></label>
      <div class="lu-row" data-show="feat"><input type="text" data-feat placeholder="Название черты, например: Подстрекатель" maxlength="80"></div>
      <label class="fld chk"><input type="radio" name="lu-asi" value="later" checked><span>Решу потом</span></label>
      <p class="hint">Характеристика не может стать больше 20.</p></section>` : "";
    const spellSec = [pk.cantrips ? pickerHtml("cantrips") : "", pk.spells ? pickerHtml("spells", `<p class="hint">Доступны заклинания до ${maxLvl} круга${sub && sub.spells ? `, включая расширенный список: ${esc(sub.name)}` : ""}.</p>`) : "", pk.arcanum ? pickerHtml("arcanum") : ""].join("");
    const swapSpellSec = pk.swapSpell && swappable.length ? `<details class="lu-sec lu-swap" data-swap="spell"><summary><h3>${icon("gi/delapouite/card-exchange")}Заменить известное заклинание</h3><span class="hint">необязательно</span></summary>
      <label class="fld"><span>Забыть</span><select data-swap-out><option value="">Ничего не менять</option>${swappable.map(sp => `<option value="${esc(sp.id)}">${esc(sp.name)} (${sp.level} круг)</option>`).join("")}</select></label>
      <div data-swap-pick hidden>${pickerHtml("swapSpell")}</div></details>` : "";
    const invSec = pk.invocations ? `<section class="lu-sec">${pickerHtml("invocations", `<p class="hint">Серые пока недоступны: рядом написано, чего не хватает.</p>`)}</section>` : "";
    const swapInvSec = pk.swapInvocation && ownInvs.length ? `<details class="lu-sec lu-swap" data-swap="inv"><summary><h3>${icon("gi/lorc/trade")}Заменить воззвание</h3><span class="hint">необязательно</span></summary>
      <label class="fld"><span>Убрать</span><select data-inv-out><option value="">Ничего не менять</option>${ownInvs.map(f => `<option value="${esc(f.id)}">${esc(f.name)}</option>`).join("")}</select></label>
      <div data-inv-pick hidden>${pickerHtml("swapInv")}</div></details>` : "";
    const notesHtml = genericNotes.length ? `<section class="lu-sec"><h3>${icon("gi/delapouite/checklist")}Ещё на этом уровне</h3><ul class="lu-todo">${genericNotes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>${cls ? "" : `<p class="hint">Класс не распознан, поэтому подсказки общие. Проверь умения класса в книге игрока.</p>`}</section>` : "";
    const m = openModal({
      title: `Повышение уровня: ${from} → ${plan.to}`,
      cls: "levelup",
      body: `<p class="lu-who">${esc(c.name)} · ${esc(cls ? cls.name : c.info.cls || "класс не указан")}${sub ? ` · ${esc(sub.name)}` : ""} · кость хитов ${esc(c.hitDie)}</p>
        <section class="lu-sec"><h3>${icon("gi/zeromancer/heart-plus")}Хиты за уровень</h3>
          <label class="fld chk"><input type="radio" name="lu-hp" value="avg" checked><span>Среднее: ${avg} ${fmt(con)} = <b>+${Math.max(1, avg + con)}</b></span></label>
          <label class="fld chk"><input type="radio" name="lu-hp" value="roll"><span>Бросить ${esc(c.hitDie)} ${fmt(con)} <b data-roll-res></b></span></label>
          <button class="btn sm" data-roll-hp>${icon("d20")}Бросить ${esc(c.hitDie)}</button>
        </section>
        ${featsHtml}
        ${choiceHtml}
        ${spellSec ? `<section class="lu-sec"><h3>${icon("gi/delapouite/spell-book")}Заклинания</h3>${spellSec}</section>` : ""}
        ${swapSpellSec}
        ${invSec}
        ${swapInvSec}
        ${asiHtml}
        <section class="lu-sec"><h3>${icon("gi/lorc/cycle")}Изменится само</h3><div data-changes>${changesHtml()}</div></section>
        ${notesHtml}
        <p class="lu-left hint" data-left></p>
        <div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn gold" data-go>${icon("star")}Повысить уровень</button></div>`
    });
    const body = m.body;
    const paintLeft = () => {
      const l = left();
      body.querySelector("[data-left]").textContent = l.length ? `Ещё не выбрано: ${l.join(", ")}. Можно выбрать и потом.` : "Всё выбрано.";
    };
    const paintGroup = g => {
      const box = body.querySelector(`[data-opts="${g}"]`);
      if (!box) return;
      const y = box.scrollTop;
      box.innerHTML = optRows(g);
      box.scrollTop = y;
      const cnt = body.querySelector(`[data-count="${g}"]`);
      cnt.textContent = `${st.pick[g].size} из ${groups[g].need}`;
      cnt.classList.toggle("done", st.pick[g].size >= groups[g].need);
      paintLeft();
    };
    const refresh = () => {
      body.querySelector("[data-changes]").innerHTML = changesHtml();
      body.querySelectorAll("[data-show]").forEach(el => (el.hidden = el.dataset.show !== st.asi));
      paintLeft();
    };
    refresh();
    if (pk.cantrips || pk.spells || pk.arcanum || (pk.swapSpell && swappable.length)) {
      loadSpells().then(list => {
        lib = list;
        ["cantrips", "spells", "arcanum", "swapSpell"].forEach(paintGroup);
      }).catch(() => {
        libError = true;
        ["cantrips", "spells", "arcanum", "swapSpell"].forEach(paintGroup);
      });
    }
    body.addEventListener("click", e => {
      const pick = e.target.closest("[data-g][data-k]");
      if (pick) {
        const g = pick.dataset.g;
        const set = st.pick[g];
        const k = pick.dataset.k;
        if (set.has(k)) set.delete(k);
        else {
          const need = groups[g].need;
          if (need === 1) set.clear();
          else if (set.size >= need) return toast(`Можно выбрать только ${need}`, { kind: "info", timeout: 1800 });
          set.add(k);
        }
        return paintGroup(g);
      }
      const info = e.target.closest("[data-info]");
      if (info) {
        st.open = st.open === info.dataset.info ? "" : info.dataset.info;
        return paintGroup(info.dataset.info.split(":")[0]);
      }
    });
    body.addEventListener("input", e => {
      if (e.target.matches("[data-feat]")) st.feat = e.target.value;
      if (e.target.matches("[data-lu-q]")) {
        st.q[e.target.dataset.luQ] = e.target.value;
        paintGroup(e.target.dataset.luQ);
      }
    });
    body.addEventListener("change", e => {
      const t = e.target;
      if (t.name === "lu-hp") st.hpMode = t.value;
      if (t.name === "lu-asi") st.asi = t.value;
      if (t.matches("[data-a1-one]")) st.a1 = t.value;
      if (t.matches("[data-a1]")) st.a1 = t.value;
      if (t.matches("[data-a2]")) st.a2 = t.value;
      if (t.matches("[data-choice]")) {
        const ch = choices.find(x => x.key === t.dataset.choice);
        const set = st.choice[ch.key] || (st.choice[ch.key] = new Set());
        if (ch.max === 1) set.clear();
        if (t.checked) {
          if (set.size >= ch.max) {
            t.checked = false;
            toast(`Можно выбрать только ${ch.max}`, { kind: "info", timeout: 1800 });
          } else set.add(t.value);
        } else set.delete(t.value);
      }
      if (t.matches("[data-feat-i]")) {
        const i = Number(t.dataset.featI);
        if (t.checked) st.feats.add(i);
        else st.feats.delete(i);
      }
      if (t.matches("[data-swap-out]")) {
        st.swapOut = t.value;
        body.querySelector("[data-swap-pick]").hidden = !t.value;
        if (!t.value) st.pick.swapSpell.clear();
        paintGroup("swapSpell");
      }
      if (t.matches("[data-inv-out]")) {
        st.invOut = t.value;
        body.querySelector("[data-inv-pick]").hidden = !t.value;
        if (!t.value) st.pick.swapInv.clear();
        paintGroup("swapInv");
      }
      if (t.name === "lu-asi") {
        st.a1 = "";
        st.a2 = "";
        body.querySelectorAll("[data-show] select").forEach(s => (s.value = ""));
      }
      refresh();
    });
    body.querySelector("[data-roll-hp]").onclick = () => {
      const r = rollDice(`1d${die}`);
      st.roll = r.total;
      st.hpMode = "roll";
      body.querySelector("input[name=lu-hp][value=roll]").checked = true;
      body.querySelector("[data-roll-res]").textContent = `= ${r.total} ${fmt(con)} = +${Math.max(1, r.total + con)}`;
      refresh();
    };
    body.querySelector("[data-go]").onclick = () => {
      if (st.hpMode === "roll" && st.roll == null) return toast("Сначала брось кость хитов или выбери среднее", { kind: "bad" });
      if (st.asi === "one" && !st.a1) return toast("Выбери характеристику для +2", { kind: "bad" });
      if (st.asi === "two" && (!st.a1 || !st.a2 || st.a1 === st.a2)) return toast("Выбери две разные характеристики", { kind: "bad" });
      if (st.asi === "feat" && !st.feat.trim()) return toast("Впиши название черты", { kind: "bad" });
      const { next, d0, d1 } = preview();
      const gained = Math.max(0, d1.hpMax - d0.hpMax);
      const byKey = new Map((lib || []).map(x => [x.key, x]));
      const invByKey = new Map(invs.map(x => [x.key, x]));
      const sourceFor = x => (x.classes || []).includes(cls && cls.key) ? cls.name : `${sub ? sub.name : "Подкласс"} (расширенный список)`;
      const newSpells = [];
      for (const g of ["cantrips", "spells", "swapSpell"]) for (const k of st.pick[g]) if (byKey.has(k)) newSpells.push({ ...toSpell(byKey.get(k)), source: sourceFor(byKey.get(k)) });
      for (const k of st.pick.arcanum) if (byKey.has(k)) newSpells.push({ ...toSpell(byKey.get(k)), cost: "uses", uses: "1", recharge: "long", source: "Таинственный арканум" });
      const newInvs = [...st.pick.invocations, ...st.pick.swapInv].map(k => invByKey.get(k)).filter(Boolean).map(invocationEntity);
      const newFeats = feats.filter((_, i) => st.feats.has(i)).map(f => (f.id ? { ...f, id: "ft-" + uid() } : featureEntity(f)));
      const chosen = choices.flatMap(ch => ch.list.filter(x => (st.choice[ch.key] || new Set()).has(x.key)));
      newFeats.push(...chosen.map(x => ({ ...featureFromLib(x), category: "class", source: "class" })));
      const boon = chosen.find(x => boons.includes(x));
      const dropSpell = st.swapOut && st.pick.swapSpell.size ? st.swapOut : "";
      const dropInv = st.invOut && st.pick.swapInv.size ? st.invOut : "";
      const remaining = left();
      m.close();
      X.withUndo("Повышение уровня", () => X.mutate(ch => {
        ch.info.level = next.info.level;
        ch.hp.rollAdj = next.hp.rollAdj;
        ch.hp.maxOverride = next.hp.maxOverride;
        ch.abilities = next.abilities;
        ch.hp.current = Math.min(d1.hpMax, (Number(ch.hp.current) || 0) + gained);
        if (st.asi === "feat") ch.features.push(featureEntity({ name: st.feat.trim().slice(0, 80), category: "feat", source: "" }));
        if (dropSpell) ch.spells = ch.spells.filter(sp => sp.id !== dropSpell);
        if (dropInv) ch.features = ch.features.filter(f => f.id !== dropInv);
        ch.spells.push(...newSpells);
        ch.features.push(...newFeats, ...newInvs);
        if (boon) ch.info.pactBoon = boon.name;
      }, { render: false }));
      X.renderAll(true);
      celebrate({ name: c.name, to: plan.to, d0, d1: S.d, before: c.abilities, after: S.c.abilities, feats: [...newFeats, ...newInvs], spells: newSpells, remaining });
    };
  }

  function celebrate({ name, to, d0, d1, before, after, feats, spells, remaining }) {
    const fx = fxSettings();
    const calm = !fx.anim || reducedMotion();
    if (fx.sound) playSound("levelup");
    X.track("levelUps");
    const rows = [];
    const row = (ic, label, from, now) => rows.push(`<div class="lu-row">${icon(ic)}<span>${esc(label)}</span><b>${from !== "" ? `<s>${esc(from)}</s> ` : ""}${esc(now)}</b></div>`);
    row("heart", "Максимум хитов", String(d0.hpMax), `${d1.hpMax} (+${Math.max(0, d1.hpMax - d0.hpMax)})`);
    if (d1.pb !== d0.pb) row("star", "Бонус мастерства", fmt(d0.pb), fmt(d1.pb));
    if (slotsText(d0) !== slotsText(d1)) row("sparkle", "Ячейки заклинаний", slotsText(d0), slotsText(d1));
    if (d1.tier !== d0.tier) row("force", "Заговоры", "", "бьют сильнее");
    for (const a of ABILITIES) if ((after[a.key] || 0) !== (before[a.key] || 0)) row("upgrade", a.name, String(before[a.key]), String(after[a.key]));
    const got = [...feats.map(f => `<li>${icon(featureIcon(f))}<span>${esc(f.name)}</span></li>`), ...spells.map(s => `<li style="--c:${spellIcon(S.c, s).color}">${icon(spellIcon(S.c, s).icon)}<span>${esc(s.name)}</span></li>`)];
    const lateLib = remaining.some(x => /заклин|заговор|арканум/.test(x));
    const m = openModal({
      cls: `small levelup-card ${calm ? "calm" : ""}`,
      body: `<div class="lu-burst" aria-hidden="true"><i></i><i></i><i></i>${icon("star")}</div>
        <div class="lu-big"><b>${esc(to)}</b><span>уровень</span></div>
        <p class="lu-who">${esc(name)} становится сильнее</p>
        <div class="lu-rows">${rows.join("")}</div>
        ${got.length ? `<h4 class="lu-h">Новое</h4><ul class="lu-got">${got.join("")}</ul>` : ""}
        ${remaining.length ? `<p class="lu-left">${icon("info")}Не забудь: ${esc(remaining.join(", "))}.</p>` : ""}
        <div class="form-actions">${lateLib ? `<button class="btn ghost" data-lu-lib-open>${icon("book")}Библиотека заклинаний</button>` : ""}<button class="btn gold" data-close>${icon("check")}Отлично</button></div>`
    });
    m.body.addEventListener("click", e => {
      if (!e.target.closest("[data-lu-lib-open]")) return;
      m.close();
      X.openLibrary(null);
    });
    return m;
  }

  Object.assign(X, { openLevelUp, celebrateLevel: celebrate });
}

