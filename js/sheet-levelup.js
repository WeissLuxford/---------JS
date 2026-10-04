import { ABILITIES, compute, fmt, maxDie, rollDice, uid, normalize } from "./rules.js";
import { icon } from "./icons.js";
import { esc, toast, openModal } from "./ui.js";
import { detectClass, levelUpPlan } from "./classes.js";
import { clone } from "./sheet-util.js";

export function installLevelUp(X) {
  const { S } = X;

  function slotsText(d) {
    if (d.pact) return `${d.pact.count} × ${d.pact.level} круг (договор)`;
    return d.slots.length ? d.slots.map((n, i) => `${i + 1}: ${n}`).join(", ") : "нет";
  }

  function openLevelUp() {
    const c = S.c;
    const from = S.d.level;
    if (from >= 20) return toast("Это уже 20 уровень, выше некуда", { kind: "info" });
    const cls = detectClass(c);
    const plan = levelUpPlan(c, cls, from);
    const die = maxDie(c.hitDie);
    const avg = Math.floor(die / 2) + 1;
    const con = S.d.mods.con;
    const st = { roll: null, hpMode: "avg", asi: "later", a1: "", a2: "", feat: "" };
    const abOpts = sel => `<option value="">Выбери</option>${ABILITIES.map(a => `<option value="${a.key}" ${sel === a.key ? "selected" : ""}>${a.name} (${c.abilities[a.key]})</option>`).join("")}`;
    const preview = () => {
      const next = clone(c);
      next.info.level = plan.to;
      const gain = (st.hpMode === "roll" && st.roll != null ? st.roll : avg);
      next.hp.rollAdj = (Number(next.hp.rollAdj) || 0) + (gain - avg);
      if (plan.asi && st.asi === "two" && st.a1 && st.a2 && st.a1 !== st.a2) {
        next.abilities[st.a1] = Math.min(20, next.abilities[st.a1] + 1);
        next.abilities[st.a2] = Math.min(20, next.abilities[st.a2] + 1);
      }
      if (plan.asi && st.asi === "one" && st.a1) next.abilities[st.a1] = Math.min(20, next.abilities[st.a1] + 2);
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
    const asiHtml = plan.asi ? `<section class="lu-sec"><h3>${icon("star")}Увеличение характеристик</h3>
      <label class="fld chk"><input type="radio" name="lu-asi" value="one"><span>+2 к одной</span></label>
      <div class="lu-row" data-show="one"><select data-a1-one>${abOpts("")}</select></div>
      <label class="fld chk"><input type="radio" name="lu-asi" value="two"><span>+1 к двум разным</span></label>
      <div class="lu-row" data-show="two"><select data-a1>${abOpts("")}</select><select data-a2>${abOpts("")}</select></div>
      <label class="fld chk"><input type="radio" name="lu-asi" value="feat"><span>Черта вместо увеличения</span></label>
      <div class="lu-row" data-show="feat"><input type="text" data-feat placeholder="Название черты, например: Подстрекатель" maxlength="80"></div>
      <label class="fld chk"><input type="radio" name="lu-asi" value="later" checked><span>Решу потом</span></label>
      <p class="hint">Характеристика не может стать больше 20.</p></section>` : "";
    const choose = plan.choose.length ? `<section class="lu-sec"><h3>${icon("book")}Не забудь выбрать</h3><ul class="lu-todo">${plan.choose.map(x => `<li>${esc(x.text)}</li>`).join("")}</ul>${plan.choose.some(x => x.kind === "spell" || x.kind === "cantrip") ? `<p class="hint">После повышения откроется кнопка «Библиотека заклинаний».</p>` : ""}${plan.choose.some(x => x.kind === "invocation") ? `<p class="hint">Воззвание добавь во вкладке «Умения» → «Таинственные воззвания».</p>` : ""}</section>` : "";
    const notes = plan.notes.length ? `<section class="lu-sec"><h3>${icon("sparkle")}Что ещё приходит на этом уровне</h3><ul class="lu-todo">${plan.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>${cls ? "" : `<p class="hint">Класс не распознан, поэтому подсказки общие. Проверь умения класса в книге игрока.</p>`}</section>` : "";
    const m = openModal({
      title: `Повышение уровня: ${from} → ${plan.to}`,
      cls: "levelup",
      body: `<p class="lu-who">${esc(c.name)} · ${esc(cls ? cls.name : c.info.cls || "класс не указан")} · кость хитов ${esc(c.hitDie)}</p>
        <section class="lu-sec"><h3>${icon("heart")}Хиты за уровень</h3>
          <label class="fld chk"><input type="radio" name="lu-hp" value="avg" checked><span>Среднее: ${avg} ${fmt(con)} = <b>+${Math.max(1, avg + con)}</b></span></label>
          <label class="fld chk"><input type="radio" name="lu-hp" value="roll"><span>Бросить ${esc(c.hitDie)} ${fmt(con)} <b data-roll-res></b></span></label>
          <button class="btn sm" data-roll-hp>${icon("d20")}Бросить ${esc(c.hitDie)}</button>
        </section>
        ${asiHtml}
        <section class="lu-sec"><h3>${icon("check")}Изменится само</h3><div data-changes>${changesHtml()}</div></section>
        ${choose}${notes}
        <div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn gold" data-go>${icon("star")}Повысить уровень</button></div>`
    });
    const body = m.body;
    const refresh = () => {
      body.querySelector("[data-changes]").innerHTML = changesHtml();
      body.querySelectorAll("[data-show]").forEach(el => (el.hidden = el.dataset.show !== st.asi));
    };
    refresh();
    body.addEventListener("change", e => {
      const t = e.target;
      if (t.name === "lu-hp") st.hpMode = t.value;
      if (t.name === "lu-asi") st.asi = t.value;
      if (t.matches("[data-a1-one]")) st.a1 = t.value;
      if (t.matches("[data-a1]")) st.a1 = t.value;
      if (t.matches("[data-a2]")) st.a2 = t.value;
      if (t.name === "lu-asi") {
        st.a1 = "";
        st.a2 = "";
        body.querySelectorAll("[data-show] select").forEach(s => (s.value = ""));
      }
      refresh();
    });
    body.addEventListener("input", e => {
      if (e.target.matches("[data-feat]")) st.feat = e.target.value;
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
      m.close();
      X.withUndo("Повышение уровня", () => X.mutate(ch => {
        ch.info.level = next.info.level;
        ch.hp.rollAdj = next.hp.rollAdj;
        ch.abilities = next.abilities;
        ch.hp.current = Math.min(d1.hpMax, (Number(ch.hp.current) || 0) + gained);
        if (st.asi === "feat") ch.features.push({ id: "ft-" + uid(), name: st.feat.trim().slice(0, 80), nameEn: "", category: "feat", source: "", action: "passive", recharge: "always", uses: "", used: 0, slot: "none", range: "", duration: "", save: "", damage: [], description: "", effect: "" });
      }, { render: false }));
      X.renderAll(true);
      const lib = plan.choose.some(x => x.kind === "spell" || x.kind === "cantrip");
      toast(`${icon("star")} <b>${esc(c.name)}: ${plan.to} уровень!</b> Хиты +${gained}.${plan.choose.length ? ` Не забудь: ${esc(plan.choose.filter(x => x.kind !== "swap").map(x => x.text.toLowerCase()).join(", "))}.` : ""}${lib ? ` <button class="btn sm" data-lu-lib>Библиотека заклинаний</button>` : ""}`, { kind: "good", timeout: 12000 });
    };
  }

  Object.assign(X, { openLevelUp });
}
