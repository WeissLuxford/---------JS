import { ABILITIES, SKILLS, compute, normalize, fmt, rollD20, rollDice, spellCast, usesInfo, maxDie, uid, addDice, swapType, importCharacter } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import {
  esc, $, $$, toast, openModal, confirmDialog, promptNumber, showD20, showDamage, rollLog, enableHoverCards, hideHoverCard,
  openForm, getPath, setPath, dateTime, timeAgo, resizeImage, download, pickFile
} from "./ui.js";
import { TABS, RENDER, subtitle } from "./tabs.js";
import { cardFor, findEntity, openEditor, noteFields, infoFields, armorFields, LIST_KEY, EDITORS } from "./entities.js";
import { subscribeChar, saveChanges, addHistory, listHistory, onStatus, createChar, getMode } from "./store.js";
import { diffPaths, applyPaths } from "./sync.js";

const SNAPSHOT_GAP = 10 * 60 * 1000;
const lastSnapshot = new Map();
const clone = v => JSON.parse(JSON.stringify(v));
const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || k;
const META = ["updatedAt", "createdAt", "id"];

function sameContent(a, b) {
  const strip = x => {
    const y = { ...x };
    META.forEach(k => delete y[k]);
    return JSON.stringify(y);
  };
  return strip(a) === strip(b);
}

export function mountSheet(root, id, initialTab, navigate) {
  const S = {
    c: null,
    d: null,
    base: null,
    tab: TABS.some(t => t.key === initialTab) ? initialTab : "char",
    ui: { invFilter: "all", notesSection: "patron" },
    saveTimer: null,
    retry: 0,
    pendingRender: false,
    rollMode: "normal",
    openRef: null,
    openModalApi: null,
    lastCast: {},
    disposed: false
  };

  root.innerHTML = `<div class="loading">${icon("d20")}<span>Загружаю лист...</span></div>`;

  let lastStatus = null;
  let lastError = "";
  const unStatus = onStatus(st => {
    lastStatus = st;
    paintSync();
    if (st.state === "error" && st.error && st.error !== lastError && S.c) toast(`${icon("cloudOff")} ${esc(st.error)}`, { kind: "bad", timeout: 6000 });
    lastError = st.state === "error" ? st.error : "";
  });

  function paintSync() {
    const el = $("[data-sync]", root);
    const st = lastStatus;
    if (!el || !st) return;
    const state = st.state === "error" ? "error" : st.mode === "local" ? "local" : st.state;
    el.className = "sync " + state;
    el.title = st.error || (st.mode === "local" ? "Только в этом браузере" : st.state === "saving" ? "Сохраняю..." : "Сохранено в облаке");
    el.innerHTML = icon(state === "local" || state === "error" || state === "offline" ? "cloudOff" : "cloud");
  }

  function loaderMessage(ic, text, sub = "") {
    root.innerHTML = `<div class="loading err">${icon(ic)}<span>${esc(text)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}<a class="btn" href="#/">К списку</a></div>`;
  }

  const unsub = subscribeChar(id, (data, meta = {}) => {
    if (S.disposed) return;
    if (data === undefined) {
      if (!S.c) {
        if (meta.offline) loaderMessage("cloudOff", "Нет связи с облаком", "Этот лист ещё не открывался на этом устройстве. Он загрузится, как только появится интернет.");
        else loaderMessage("cloudOff", "Не удалось загрузить персонажа", (lastStatus && lastStatus.error) || "");
      }
      return;
    }
    if (data === null) {
      if (!S.c) loaderMessage("info", "Персонаж не найден");
      return;
    }
    const incoming = normalize(data);
    incoming.id = id;
    if (!S.c) {
      S.base = clone(incoming);
      S.c = incoming;
      S.d = compute(S.c);
      renderAll();
      return;
    }
    const local = diffPaths(S.base, S.c);
    S.base = clone(incoming);
    const merged = normalize(applyPaths(clone(incoming), local));
    merged.id = id;
    if (sameContent(merged, S.c)) return;
    S.c = merged;
    S.d = compute(S.c);
    if (inputFocused()) S.pendingRender = true;
    else rerenderKeepingModal();
    if (!meta.pendingWrites) toast(`${icon("cloud")} Лист обновлён: кто-то внёс изменения`, { kind: "info" });
  });

  function inputFocused() {
    const a = document.activeElement;
    return !!(a && root.contains(a) && a.matches("input, textarea, select"));
  }

  function rerenderKeepingModal() {
    S.pendingRender = false;
    renderAll(true);
    if (S.openRef && S.openModalApi) refreshEntityModal();
  }

  function renderAll(keepScroll) {
    if (S.disposed) return;
    const y = window.scrollY;
    const c = S.c;
    document.title = `${c.name} · Лист персонажа`;
    root.innerHTML = `
      <div class="sheet">
        <header class="topbar">
          <a class="icon-btn" href="#/" title="Все персонажи">${icon("back")}</a>
          <button class="tb-portrait" data-act="portrait" title="Портрет">${c.portrait ? `<img src="${esc(c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER}</button>
          <button class="tb-id" data-act="edit-info"><span class="tb-name" data-calc="name">${esc(c.name)}</span><span class="tb-sub" data-calc="sub">${esc(subtitle(c))}</span></button>
          <button class="hp-mini" data-act="hp" title="Хиты"><span class="hp-mini-bar"><i data-hpbar></i></span><span><b data-calc="hp"></b>/<span data-calc="hpmax"></span></span></button>
          <button class="roll-mode" data-act="roll-mode" title="Режим следующего броска d20: обычный, с преимуществом, с помехой">${rollModeLabel()}</button>
          <span class="sync" data-sync></span>
          <button class="icon-btn" data-act="menu" title="Меню">${icon("dots")}</button>
        </header>
        <nav class="tabs" role="tablist">${TABS.map(t => `<button class="tab ${S.tab === t.key ? "on" : ""}" data-tab="${t.key}" role="tab">${icon(t.icon)}<span class="tab-l">${t.name}</span><span class="tab-s">${t.short || t.name}</span></button>`).join("")}</nav>
        ${c.archived ? `<div class="archived-bar">${icon("archive")} Персонаж в архиве <button class="btn sm" data-act="unarchive">Вернуть</button></div>` : ""}
        <main class="tab-body" data-body></main>
      </div>`;
    renderTab();
    paintSync();
    if (keepScroll) window.scrollTo(0, y);
  }

  function renderTab() {
    const body = $("[data-body]", root);
    if (!body) return;
    body.innerHTML = RENDER[S.tab]({ c: S.c, d: S.d, ui: S.ui });
    body.dataset.tab = S.tab;
    $$(".tab", root).forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
    $$("textarea.autogrow", body).forEach(grow);
    updateCalcs();
  }

  function grow(t) {
    t.style.height = "auto";
    t.style.height = t.scrollHeight + 2 + "px";
  }

  function calcValue(key) {
    const { c, d } = S;
    const [k, a] = key.split(".");
    switch (k) {
      case "mod": return fmt(d.mods[a]);
      case "save": return fmt(d.saves[a]);
      case "skill": return fmt(d.skills[a]);
      case "pb": return fmt(d.pb);
      case "init": return fmt(d.init);
      case "ac": return String(d.ac);
      case "speed": return c.speed + " фт";
      case "pp": return String(d.passive.perception);
      case "pi": return String(d.passive.insight);
      case "pinv": return String(d.passive.investigation);
      case "hp": return String(Math.max(0, Number(c.hp.current) || 0));
      case "hpmax": return String(d.hpMax);
      case "dc": return String(d.spell.dc);
      case "satk": return fmt(d.spell.atk);
      case "weight": return String(Math.round(d.weight * 10) / 10).replace(".", ",");
      case "carry": return String(d.carry);
      case "attuned": return String(d.attuned);
      case "name": return c.name;
      case "sub": return subtitle(c);
      case "hd": return `${d.hitDice.left}/${d.hitDice.total}`;
      case "level": return String(d.level);
      default: return "";
    }
  }

  function updateCalcs() {
    $$("[data-calc]", root).forEach(el => {
      const v = calcValue(el.dataset.calc);
      if (el.textContent !== v) {
        el.textContent = v;
        el.classList.remove("flash");
        void el.offsetWidth;
        el.classList.add("flash");
      }
    });
    const pct = Math.max(0, Math.min(100, ((Number(S.c.hp.current) || 0) / Math.max(1, S.d.hpMax)) * 100));
    $$("[data-hpbar]", root).forEach(el => {
      el.style.width = pct + "%";
      el.parentElement.classList.toggle("low", pct <= 25);
    });
    $$("[data-wbar]", root).forEach(el => {
      el.classList.toggle("over", S.d.weight > S.d.carry);
      el.firstElementChild.style.width = Math.min(100, (S.d.weight / Math.max(1, S.d.carry)) * 100) + "%";
    });
  }

  function snapshot(reason) {
    const now = Date.now();
    if (now - (lastSnapshot.get(id) || 0) < SNAPSHOT_GAP) return;
    lastSnapshot.set(id, now);
    addHistory(id, clone(S.c), reason);
  }

  function changed({ render = true } = {}) {
    if (S.disposed) return;
    S.d = compute(S.c);
    if ((Number(S.c.hp.current) || 0) > S.d.hpMax) S.c.hp.current = S.d.hpMax;
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(flush, 650);
    if (render) renderTab();
    else updateCalcs();
    if (S.openRef && S.openModalApi) refreshEntityModal();
  }

  async function flush() {
    clearTimeout(S.saveTimer);
    S.saveTimer = null;
    if (!S.c || !S.base) return;
    const changes = diffPaths(S.base, S.c);
    if (!changes.length) return;
    const prevBase = S.base;
    const sent = clone(S.c);
    S.base = clone(S.c);
    try {
      await saveChanges(id, changes, sent);
      S.retry = 0;
    } catch {
      S.base = applyPaths(clone(S.base), diffPaths(sent, prevBase));
      S.retry = Math.min((S.retry || 1000) * 2, 30000);
      if (!S.disposed || getMode() === "local") S.saveTimer = setTimeout(flush, S.retry);
    }
  }

  function hasUnsaved() {
    return !!(S.c && S.base && (S.saveTimer || diffPaths(S.base, S.c).length));
  }

  function mutate(fn, opts) {
    if (S.disposed || !S.c) return;
    snapshot("Перед правкой");
    fn(S.c);
    changed(opts);
  }

  function setHp(c, value) {
    const was = Number(c.hp.current) || 0;
    const v = Math.max(0, Math.min(S.d.hpMax, Math.round(value)));
    c.hp.current = v;
    if ((was <= 0) !== (v <= 0) || v > 0) {
      c.hp.deathSuccess = 0;
      c.hp.deathFail = 0;
      c.hp.stable = false;
    }
  }

  const onInput = e => {
    const el = e.target.closest("[data-path]");
    if (!el || !root.contains(el) || !S.c) return;
    if (el.tagName === "TEXTAREA" && el.classList.contains("autogrow")) grow(el);
    if (e.type === "input" && (el.tagName === "SELECT" || el.type === "checkbox")) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.hasAttribute("data-num")) v = v === "" ? 0 : Number(v);
    if (getPath(S.c, el.dataset.path) === v) return;
    snapshot("Перед правкой");
    setPath(S.c, el.dataset.path, v);
    if (el.dataset.path.startsWith("abilities.")) S.c.abilities = normalize(S.c).abilities;
    changed({ render: el.hasAttribute("data-rerender") });
  };

  const onFocusOut = () => {
    setTimeout(() => {
      if (S.pendingRender && !inputFocused()) rerenderKeepingModal();
    }, 60);
  };

  function rollModeLabel() {
    return S.rollMode === "adv" ? `<span class="rm adv">ПРЕ</span>` : S.rollMode === "dis" ? `<span class="rm dis">ПОМ</span>` : icon("d20");
  }

  function takeMode() {
    const m = S.rollMode;
    if (m !== "normal") {
      S.rollMode = "normal";
      const b = $("[data-act=roll-mode]", root);
      if (b) b.innerHTML = rollModeLabel();
    }
    return m;
  }

  function d20(label, modifier, mode = takeMode()) {
    const r = rollD20(modifier, mode);
    showD20(label, modifier, r, mode);
    return r;
  }

  function doRoll(spec) {
    const { c, d } = S;
    if (!c) return;
    const [k, a] = spec.split(":");
    if (k === "check") return d20(`Проверка: ${abName(a)}`, d.mods[a]);
    if (k === "save") return d20(`Спасбросок: ${abName(a)}`, d.saves[a]);
    if (k === "skill") {
      const s = SKILLS.find(x => x.key === a);
      return s && d20(s.name, d.skills[a]);
    }
    if (k === "init") return d20("Инициатива", d.init);
    if (k === "spellatk") return d20("Атака заклинанием", d.spell.atk);
    if (k === "attack") {
      const at = findEntity(c, "attack", a);
      const s = d.attacks[a];
      if (!at || !s) return;
      const mode = takeMode();
      let crit = false;
      for (let i = 0; i < s.beams; i++) {
        const r = d20(`${at.name}: атака${s.beams > 1 ? ` (${i + 1} из ${s.beams})` : ""}`, s.hit, mode);
        if (r.nat20) crit = true;
      }
      if (crit) toast(`<b>Критическое попадание!</b> Кубы урона удваиваются. <button class="btn sm" data-crit="${esc(a)}">Бросить крит</button>`, { timeout: 7000 });
      return;
    }
    if (k === "dmg" || k === "crit") {
      const at = findEntity(c, "attack", a);
      const s = d.attacks[a];
      if (!at || !s) return;
      const lines = Array.from({ length: k === "crit" ? 1 : s.beams }, () => ({ dice: s.dmg, type: s.type }));
      return showDamage(`${at.name}: урон${s.beams > 1 && k !== "crit" ? ` (${s.beams} луча)` : ""}`, lines, k === "crit");
    }
    if (k === "death") {
      if (c.hp.deathFail >= 3) return toast("Персонаж погиб: спасброски больше не нужны", { kind: "bad" });
      if (c.hp.stable || c.hp.deathSuccess >= 3) return toast("Персонаж стабилизирован", { kind: "good" });
      const mode = takeMode();
      const r = rollD20(0, mode);
      showD20("Спасбросок от смерти", 0, r, mode);
      let outcome = "";
      mutate(ch => {
        const hp = ch.hp;
        if (r.nat20) {
          setHp(ch, 1);
          outcome = "up";
        } else if (r.nat1) hp.deathFail = Math.min(3, hp.deathFail + 2);
        else if (r.total >= 10) hp.deathSuccess = Math.min(3, hp.deathSuccess + 1);
        else hp.deathFail = Math.min(3, hp.deathFail + 1);
        if (!outcome && hp.deathFail >= 3) outcome = "dead";
        else if (!outcome && hp.deathSuccess >= 3) {
          hp.stable = true;
          hp.deathSuccess = 0;
          hp.deathFail = 0;
          outcome = "stable";
        }
      });
      if (outcome === "stable") toast("Три успеха: персонаж стабилизирован", { kind: "good" });
      if (outcome === "dead") toast("Три провала: персонаж погиб", { kind: "bad", timeout: 6000 });
      if (outcome === "up") toast("Естественная 20: приходит в себя с 1 хитом!", { kind: "good" });
    }
  }

  async function hpDialog(mode) {
    const titles = { dmg: "Урон", heal: "Лечение", temp: "Временные хиты" };
    const res = await promptNumber(mode ? titles[mode] : "Хиты", {
      label: `Сейчас: ${S.c.hp.current} / ${S.d.hpMax}${S.c.hp.temp ? ` (+${S.c.hp.temp} врем.)` : ""}`,
      value: "",
      buttons: mode
        ? [{ label: titles[mode], value: mode, cls: mode === "dmg" ? "danger" : mode === "heal" ? "heal" : "gold" }]
        : [{ label: "Урон", value: "dmg", cls: "danger" }, { label: "Лечение", value: "heal", cls: "heal" }, { label: "Врем.", value: "temp", cls: "ghost" }, { label: "Задать", value: "set", cls: "ghost" }]
    });
    if (!res || S.disposed || (!res.value && res.action !== "set")) return;
    const n = Math.abs(Math.floor(res.value));
    let concDc = 0;
    let concLost = "";
    mutate(c => {
      const hp = c.hp;
      if (res.action === "dmg") {
        const fromTemp = Math.min(hp.temp || 0, n);
        hp.temp = (hp.temp || 0) - fromTemp;
        const rest = n - fromTemp;
        if (hp.current <= 0 && rest > 0) {
          hp.stable = false;
          hp.deathFail = Math.min(3, hp.deathFail + 1);
        } else {
          setHp(c, hp.current - rest);
        }
        if (c.concentration && n > 0) {
          if (hp.current <= 0) {
            concLost = c.concentration;
            c.concentration = "";
          } else concDc = Math.max(10, Math.floor(n / 2));
        }
      } else if (res.action === "heal") {
        setHp(c, hp.current + n);
      } else if (res.action === "temp") {
        hp.temp = Math.max(hp.temp || 0, n);
      } else if (res.action === "set") {
        setHp(c, n);
      }
    });
    if (concLost) toast(`${icon("spiral")} Концентрация на «${esc(concLost)}» прервана: персонаж без сознания`, { kind: "bad" });
    if (concDc) toast(`${icon("spiral")} Концентрация на «${esc(S.c.concentration)}»: спасбросок Телосложения, СЛ ${concDc}. <button class="btn sm" data-conc-roll>Бросить</button>`, { timeout: 9000 });
  }

  function spendHitDie() {
    const { c, d } = S;
    if (d.hitDice.left <= 0) return toast("Кости хитов закончились");
    if ((Number(c.hp.current) || 0) <= 0) return toast("Без сознания нельзя тратить кости хитов", { kind: "bad" });
    const r = rollDice(`1d${maxDie(c.hitDie)}`);
    const heal = Math.max(0, r.total + d.mods.con);
    mutate(ch => {
      ch.hp.hitDiceUsed = (Number(ch.hp.hitDiceUsed) || 0) + 1;
      setHp(ch, ch.hp.current + heal);
    });
    toast(`${icon("heart")} Кость хитов: ${r.total} ${fmt(d.mods.con)} = <b>+${heal}</b> хитов`, { kind: "good" });
  }

  function resetUses(c, kinds) {
    for (const list of [c.features, c.items, c.spells]) {
      for (const e of list) if (kinds.includes(e.recharge)) e.used = 0;
    }
  }

  function shortRest() {
    const m = openModal({
      title: "Короткий отдых",
      cls: "small",
      body: `<p>Не меньше часа отдыха. Восстановятся ячейки договора и умения «короткий отдых». Можно потратить кости хитов на лечение.</p>
        <div class="rest-hd"><span>Кости хитов: <b data-hdleft>${S.d.hitDice.left}/${S.d.hitDice.total}</b> ${esc(S.c.hitDie)}</span><button class="btn sm" data-hd>${icon("d20")}Бросить кость</button></div>
        <div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn gold" data-ok>${icon("campfire")}Отдохнуть</button></div>`
    });
    m.body.querySelector("[data-hd]").onclick = () => {
      spendHitDie();
      m.body.querySelector("[data-hdleft]").textContent = `${S.d.hitDice.left}/${S.d.hitDice.total}`;
    };
    m.body.querySelector("[data-ok]").onclick = () => {
      mutate(c => {
        c.pactUsed = 0;
        resetUses(c, ["short"]);
      });
      m.close();
      toast(`${icon("campfire")} Короткий отдых завершён`, { kind: "good" });
    };
  }

  async function longRest() {
    if (!(await confirmDialog("Длинный отдых: полные хиты, все ячейки и умения восстановлены, вернётся половина костей хитов. Продолжить?", { ok: "Отдохнуть" }))) return;
    if (S.c.hp.deathFail >= 3) return toast("Погибший персонаж не может отдохнуть", { kind: "bad" });
    mutate(c => {
      const lvl = S.d.level;
      setHp(c, S.d.hpMax);
      c.hp.temp = 0;
      c.hp.hitDiceUsed = Math.max(0, (Number(c.hp.hitDiceUsed) || 0) - Math.max(1, Math.floor(lvl / 2)));
      c.pactUsed = 0;
      c.slotsUsed = {};
      c.concentration = "";
      if (c.exhaustion > 0) c.exhaustion -= 1;
      resetUses(c, ["short", "long", "dawn"]);
    });
    toast(`${icon("moon")} Длинный отдых завершён`, { kind: "good" });
  }

  function spendSlot(c, level) {
    const d = S.d;
    if (d.pact) {
      if ((Number(c.pactUsed) || 0) >= d.pact.count) return false;
      c.pactUsed = (Number(c.pactUsed) || 0) + 1;
      return true;
    }
    const total = d.slots[level - 1] || 0;
    const used = Number(c.slotsUsed[level]) || 0;
    if (used >= total) return false;
    c.slotsUsed[level] = used + 1;
    return true;
  }

  function availableSlotLevels(min) {
    const { c, d } = S;
    const out = [];
    d.slots.forEach((n, i) => {
      const lvl = i + 1;
      if (lvl >= min && n - (Number(c.slotsUsed[lvl]) || 0) > 0) out.push(lvl);
    });
    return out;
  }

  function pactLeft() {
    return S.d.pact ? Math.max(0, S.d.pact.count - (Number(S.c.pactUsed) || 0)) : 0;
  }

  function castSpell(sp, chosenLevel) {
    const { d } = S;
    const lvl = Number(sp.level) || 0;
    let castLevel = null;
    if (lvl > 0 && sp.cost === "slot") {
      if (d.pact) {
        if (lvl > d.pact.level) return toast(`Нужна ячейка ${lvl} круга, а ячейки договора ${d.pact.level} круга`, { kind: "bad" });
        if (!pactLeft()) return toast("Нет свободных ячеек договора. Нужен короткий отдых.", { kind: "bad" });
        castLevel = d.pact.level;
      } else {
        const avail = availableSlotLevels(lvl);
        if (!avail.length) return toast("Нет свободных ячеек подходящего круга", { kind: "bad" });
        castLevel = chosenLevel && avail.includes(chosenLevel) ? chosenLevel : avail[0];
      }
    }
    if (sp.cost === "uses") {
      const u = usesInfo(d, sp);
      if (u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    }
    let concNote = "";
    S.lastCast[sp.id] = castLevel || (sp.castAt ? Number(sp.castAt) : null);
    mutate(c => {
      const e = findEntity(c, "spell", sp.id);
      if (!e) return;
      if (castLevel) spendSlot(c, castLevel);
      if (e.cost === "uses" && usesInfo(S.d, e)) e.used = (Number(e.used) || 0) + 1;
      if (e.concentration) {
        if (c.concentration && c.concentration !== e.name) concNote = ` Концентрация на «${c.concentration}» прервана.`;
        c.concentration = e.name;
      }
    });
    toast(`${icon("sparkle")} <b>${esc(sp.name)}</b>${castLevel ? ` (${castLevel} круг)` : ""}.${esc(concNote)}`, { kind: "info" });
  }

  function useEntity(kind, e, delta = 1) {
    if (!e) return;
    const u = usesInfo(S.d, e);
    const pactCost = kind === "feature" && e.slot === "pact";
    if (!u && !pactCost) return;
    if (delta > 0 && u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    if (pactCost && delta > 0 && S.d.pact && !pactLeft()) return toast("Нет свободных ячеек договора", { kind: "bad" });
    mutate(c => {
      const x = findEntity(c, kind, e.id);
      if (!x) return;
      if (u) x.used = Math.max(0, Math.min(u.max, (Number(x.used) || 0) + delta));
      if (pactCost && delta > 0) spendSlot(c, S.d.pact ? S.d.pact.level : 1);
    });
  }

  function entityButtons(kind, e) {
    const { d } = S;
    const b = [];
    if (kind === "spell") {
      const lvl = Number(e.level) || 0;
      if (lvl > 0 || e.concentration) {
        if (lvl > 0 && e.cost === "slot" && d.pact) {
          if (lvl > d.pact.level) b.push(`<button class="btn" disabled>Нужна ячейка ${lvl} круга</button>`);
          else if (!pactLeft()) b.push(`<button class="btn" disabled>Нет ячеек договора</button>`);
          else b.push(`<button class="btn gold" data-x="cast">${icon("sparkle")}Сотворить</button>`);
        } else if (lvl > 0 && e.cost === "slot") {
          const av = availableSlotLevels(lvl);
          av.forEach(l => b.push(`<button class="btn gold" data-x="cast" data-lvl="${l}">${icon("sparkle")}Сотворить (${l} круг)</button>`));
          if (!av.length) b.push(`<button class="btn" disabled>Нет ячеек</button>`);
        } else if (e.cost === "uses" && usesInfo(d, e) && usesInfo(d, e).left <= 0) {
          b.push(`<button class="btn" disabled>Использования закончились</button>`);
        } else {
          b.push(`<button class="btn gold" data-x="cast">${icon("sparkle")}Сотворить</button>`);
        }
      }
      if (e.attack) b.push(`<button class="btn" data-x="spell-atk">${icon("d20")}Атака ${fmt(d.spell.atk)}</button>`);
      if ((e.damage || []).length) {
        const lv = S.lastCast[e.id];
        b.push(`<button class="btn" data-x="spell-dmg">${icon("force")}Бросить кубы${lv && lv !== Number(e.level) ? ` (${lv} круг)` : ""}</button>`);
        if (e.attack) b.push(`<button class="btn ghost" data-x="spell-crit">Крит</button>`);
      }
      if (e.cost === "uses" && usesInfo(d, e)) b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть использование</button>`);
    }
    if (kind === "feature") {
      const u = usesInfo(d, e);
      if (u || e.slot === "pact") b.push(`<button class="btn gold" data-x="use">${icon("check")}Использовать</button>`);
      if (u) b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть</button>`);
      if ((e.damage || []).length) b.push(`<button class="btn" data-x="feat-dmg">${icon("d20")}Бросить кубы</button>`);
    }
    if (kind === "item") {
      const u = usesInfo(d, e);
      if (u) {
        b.push(`<button class="btn gold" data-x="use">${icon("check")}Использовать</button>`);
        b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть</button>`);
      }
      if ((e.damage || []).length) b.push(`<button class="btn" data-x="item-dmg">${icon("d20")}Бросить кубы</button>`);
      b.push(`<button class="btn" data-x="equip">${e.equipped ? "Снять" : "Экипировать"}</button>`);
      if (e.requiresAttunement) b.push(`<button class="btn" data-x="attune">${e.attuned ? "Снять настройку" : "Настроиться"}</button>`);
      b.push(`<span class="qty-ctl"><button class="icon-btn" data-x="qty-" title="Меньше">${icon("minus")}</button><b>${esc(e.qty)}</b><button class="icon-btn" data-x="qty+" title="Больше">${icon("plus")}</button></span>`);
    }
    if (kind === "attack") {
      const s = d.attacks[e.id];
      if (s.kind === "attack") b.push(`<button class="btn gold" data-x="atk">${icon("d20")}Атака ${fmt(s.hit)}${s.beams > 1 ? ` ×${s.beams}` : ""}</button>`);
      b.push(`<button class="btn" data-x="dmg">${icon("swords")}Урон</button>`);
      b.push(`<button class="btn ghost" data-x="crit">Крит</button>`);
    }
    b.push(`<span class="spacer"></span><button class="btn ghost" data-x="edit">${icon("edit")}Изменить</button>`);
    return b.join("");
  }

  function entityBody(ref) {
    const [kind, eid] = ref.split(":");
    const e = findEntity(S.c, kind, eid);
    if (!e) return null;
    return `${cardFor(S.c, S.d, ref, { slotLevel: kind === "spell" ? S.lastCast[eid] : null })}<div class="entity-actions">${entityButtons(kind, e)}</div>`;
  }

  function refreshEntityModal() {
    const html = entityBody(S.openRef);
    if (!html) {
      S.openModalApi.close();
      return;
    }
    S.openModalApi.body.innerHTML = html;
  }

  function openEntity(ref) {
    const html = entityBody(ref);
    if (!html) return;
    const [kind, eid] = ref.split(":");
    const m = openModal({
      body: html,
      cls: "entity",
      onClose: () => {
        if (S.openModalApi === m) {
          S.openRef = null;
          S.openModalApi = null;
        }
      }
    });
    S.openRef = ref;
    S.openModalApi = m;
    m.body.addEventListener("click", ev => {
      const btn = ev.target.closest("[data-x]");
      if (!btn || S.disposed) return;
      const e = findEntity(S.c, kind, eid);
      if (!e) return;
      const x = btn.dataset.x;
      if (x === "edit") {
        m.close();
        return editEntity(kind, e);
      }
      if (x === "cast") return castSpell(e, Number(btn.dataset.lvl) || null);
      if (x === "spell-atk") return d20(`${e.name}: атака`, S.d.spell.atk);
      if (x === "spell-dmg" || x === "spell-crit") {
        const cast = spellCast(S.c, S.d, e, S.lastCast[e.id] || null);
        const lines = [];
        for (let i = 0; i < cast.beams; i++) lines.push(...cast.lines);
        return showDamage(`${e.name}${cast.level && cast.level !== Number(e.level) ? ` (${cast.level} круг)` : ""}`, lines, x === "spell-crit");
      }
      if (x === "use") return useEntity(kind, e, 1);
      if (x === "restore") return useEntity(kind, e, -1);
      if (x === "feat-dmg" || x === "item-dmg") {
        const lines = (e.damage || []).map(l => ({ dice: l.addMod ? addDice(l.dice, S.d.spell.mod) : l.dice, type: swapType(S.c, l.type) }));
        return showDamage(e.name, lines);
      }
      if (x === "equip") return mutate(c => { const it = findEntity(c, "item", eid); if (it) it.equipped = !it.equipped; });
      if (x === "attune") {
        if (!e.attuned && S.d.attuned >= 3) return toast("Уже настроено 3 предмета: это максимум", { kind: "bad" });
        return mutate(c => { const it = findEntity(c, "item", eid); if (it) it.attuned = !it.attuned; });
      }
      if (x === "qty-" || x === "qty+") return mutate(c => { const it = findEntity(c, "item", eid); if (it) it.qty = Math.max(0, (Number(it.qty) || 0) + (x === "qty+" ? 1 : -1)); });
      if (x === "atk") return doRoll("attack:" + eid);
      if (x === "dmg") return doRoll("dmg:" + eid);
      if (x === "crit") return doRoll("crit:" + eid);
    });
  }

  function editEntity(kind, e, makeArg) {
    const key = LIST_KEY[kind];
    openEditor(kind, e, {
      makeArg,
      onSave: val => {
        if (!String(val.name || "").trim()) {
          toast("Нужно название", { kind: "bad" });
          return false;
        }
        if (kind === "item") {
          if (!val.requiresAttunement) val.attuned = false;
          if (val.attuned && !(e && e.attuned) && S.d.attuned >= 3) {
            toast("Уже настроено 3 предмета: это максимум", { kind: "bad" });
            return false;
          }
        }
        mutate(c => {
          const list = c[key];
          const i = list.findIndex(x => x.id === val.id);
          if (i >= 0) list[i] = val;
          else list.push(val);
          const n = normalize(c);
          c[key] = n[key];
        });
      },
      onDelete: () => mutate(c => { c[key] = c[key].filter(x => x.id !== e.id); })
    });
  }

  function editNote(section, n) {
    const value = n || EDITORS.note.make();
    openForm({
      title: n ? "Изменить запись" : "Новая запись",
      fields: noteFields(section),
      value,
      onSave: val => mutate(c => {
        const list = c.notes[section];
        const i = list.findIndex(x => x.id === val.id);
        if (i >= 0) list[i] = val;
        else list.unshift(val);
      }),
      onDelete: n ? () => mutate(c => { c.notes[section] = c.notes[section].filter(x => x.id !== n.id); }) : null
    });
  }

  function editInfo() {
    openForm({
      title: "Основное",
      fields: infoFields(),
      value: S.c,
      onSave: val => {
        mutate(c => {
          for (const f of infoFields()) {
            if (f.type === "heading") continue;
            setPath(c, f.key, getPath(val, f.key));
          }
          if (!String(c.name || "").trim()) c.name = "Без имени";
          const n = normalize(c);
          for (const k of ["info", "hp", "speed", "initBonus", "hitDie", "casterType", "spellAbility", "damageSwap"]) c[k] = n[k];
        }, { render: false });
        renderAll(true);
      }
    });
  }

  function editArmor() {
    openForm({
      title: "Класс доспеха",
      fields: armorFields(),
      value: S.c,
      onSave: val => mutate(c => {
        c.armor = { ...c.armor, ...val.armor };
        c.armor = normalize(c).armor;
      })
    });
  }

  function portraitDialog() {
    const m = openModal({
      title: "Портрет",
      cls: "small",
      body: `<div class="portrait-big">${S.c.portrait ? `<img src="${esc(S.c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER}</div>
        <div class="form-actions">${S.c.portrait ? `<button class="btn danger" data-rm>${icon("trash")}Убрать</button>` : ""}<span class="spacer"></span><button class="btn gold" data-up>${icon("upload")}Загрузить картинку</button></div>
        <p class="hint">Картинка ужмётся до 640 пикселей и сохранится вместе с персонажем.</p>`
    });
    m.body.querySelector("[data-up]").onclick = async () => {
      const f = await pickFile("image/*");
      if (!f) return;
      try {
        const data = await resizeImage(f);
        mutate(c => { c.portrait = data; }, { render: false });
        m.close();
        renderAll(true);
      } catch {
        toast("Не получилось прочитать картинку", { kind: "bad" });
      }
    };
    const rm = m.body.querySelector("[data-rm]");
    if (rm) rm.onclick = () => {
      mutate(c => { c.portrait = ""; }, { render: false });
      m.close();
      renderAll(true);
    };
  }

  function replaceWith(data, reason) {
    addHistory(id, clone(S.c), reason);
    lastSnapshot.set(id, Date.now());
    const portrait = S.c.portrait;
    const next = normalize(data);
    if (!next.portrait && portrait && !("portrait" in data)) next.portrait = portrait;
    next.id = id;
    S.c = next;
    changed({ render: false });
    renderAll(true);
  }

  async function historyDialog() {
    const m = openModal({ title: "История изменений", body: `<div class="loading small">${icon("hourglass")} Загружаю...</div>` });
    let list = [];
    try {
      list = await listHistory(id);
    } catch {
      m.body.innerHTML = `<p class="empty">Не удалось загрузить историю</p>`;
      return;
    }
    if (!list.length) {
      m.body.innerHTML = `<p class="empty">Сохранённых версий пока нет. Версия сохраняется автоматически перед правками (не чаще раза в 10 минут).</p>`;
      return;
    }
    m.body.innerHTML = `<p class="hint">Здесь лист, каким он был в указанный момент. Восстановление тоже можно откатить: текущее состояние сначала уйдёт в историю. Портрет не меняется.</p><div class="hist">${list.map((h, i) => {
      const hc = normalize(h.data || {});
      const hd = compute(hc);
      return `<div class="hist-row"><div><b>${dateTime(h.at, true)}</b>${h.reason ? ` <span class="hist-tag">${esc(h.reason)}</span>` : ""}<small>${esc(hc.name)} · ${esc(subtitle(hc))} · хиты ${esc(hc.hp.current)}/${hd.hpMax} · ${timeAgo(h.at)}</small></div><button class="btn sm" data-i="${i}">${icon("history")}Восстановить</button></div>`;
    }).join("")}</div>`;
    m.body.addEventListener("click", async e => {
      const b = e.target.closest("[data-i]");
      if (!b || b.disabled) return;
      const h = list[Number(b.dataset.i)];
      if (!(await confirmDialog(`Вернуть лист к версии от ${dateTime(h.at, true)}?`, { ok: "Восстановить" }))) return;
      if (S.disposed) return;
      b.disabled = true;
      replaceWith(h.data || {}, "Перед восстановлением");
      m.close();
      toast("Версия восстановлена", { kind: "good" });
    });
  }

  function rollLogDialog() {
    openModal({
      title: "Журнал бросков",
      cls: "small",
      body: rollLog.length ? `<div class="hist">${rollLog.map(r => `<div class="hist-row"><div><b>${esc(r.label)}</b><small>${timeAgo(r.at)}</small></div><span class="log-v">${esc(r.text)}</span></div>`).join("")}</div>` : `<p class="empty">Бросков пока не было</p>`
    });
  }

  async function importDialog() {
    const f = await pickFile("application/json,.json");
    if (!f) return;
    let c = null;
    try {
      c = importCharacter(JSON.parse(await f.text()));
    } catch {}
    if (!c) return toast("Файл не похож на лист персонажа", { kind: "bad" });
    const m = openModal({
      title: "Импорт",
      cls: "small",
      body: `<p>Файл: <b>${esc(c.name)}</b>, ${esc(subtitle(c))}</p><div class="form-actions"><button class="btn" data-new>Как нового персонажа</button><button class="btn danger" data-replace>Заменить текущего</button></div>`
    });
    m.body.querySelector("[data-new]").onclick = async () => {
      const nid = uid();
      m.close();
      try {
        await createChar(nid, c);
        navigate(`#/c/${nid}`);
      } catch {
        toast("Не удалось создать персонажа", { kind: "bad" });
      }
    };
    m.body.querySelector("[data-replace]").onclick = async () => {
      if (!(await confirmDialog("Заменить текущий лист данными из файла? Текущая версия сохранится в истории.", { ok: "Заменить", danger: true }))) return;
      if (S.disposed) return;
      replaceWith(c, "Перед импортом");
      m.close();
    };
  }

  function menu() {
    const items = [
      ["short-rest", "campfire", "Короткий отдых"],
      ["long-rest", "moon", "Длинный отдых"],
      ["roll-mode", "d20", "Режим броска: " + (S.rollMode === "adv" ? "преимущество" : S.rollMode === "dis" ? "помеха" : "обычный")],
      ["roll-log", "scroll", "Журнал бросков"],
      ["history", "history", "История изменений"],
      ["copy-link", "link", "Скопировать ссылку"],
      ["export", "download", "Скачать файл персонажа"],
      ["import", "upload", "Загрузить из файла"],
      ["duplicate", "copy", "Сделать копию"],
      S.c.archived ? ["unarchive", "archive", "Вернуть из архива"] : ["archive", "archive", "Убрать в архив"]
    ];
    const st = lastStatus || {};
    const m = openModal({
      title: "Меню",
      cls: "small",
      body: `<div class="menu-list">${items.map(([a, ic, l]) => `<button class="menu-item" data-m="${a}">${icon(ic)}<span>${l}</span></button>`).join("")}</div><p class="hint">${getMode() === "cloud" ? "Данные в облаке: все, у кого есть ссылка, видят и правят этот лист." : "Облако недоступно: данные хранятся только в этом браузере."}${st.error ? `<br>${esc(st.error)}` : ""}</p>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      m.close();
      runAction(b.dataset.m, $("[data-act=roll-mode]", root));
    });
  }

  async function runAction(a, el) {
    const { c } = S;
    if (!c || S.disposed) return;
    switch (a) {
      case "short-rest": return shortRest();
      case "long-rest": return longRest();
      case "roll-log": return rollLogDialog();
      case "history": return historyDialog();
      case "copy-link": {
        const url = location.href.split("#")[0] + `#/c/${id}`;
        try {
          await navigator.clipboard.writeText(url);
          toast(`${icon("link")} Ссылка скопирована`, { kind: "good" });
        } catch {
          openModal({ title: "Ссылка", cls: "small", body: `<input class="copy-input" readonly value="${esc(url)}">` });
        }
        return;
      }
      case "export": {
        const name = (c.name || "character").replace(/[^\p{L}\p{N}]+/gu, "_");
        const data = clone(c);
        delete data.id;
        return download(`${name}.json`, JSON.stringify({ format: "dnd-sheet", version: 1, character: data }, null, 2));
      }
      case "import": return importDialog();
      case "duplicate": {
        const nid = uid();
        const copy = clone(c);
        delete copy.id;
        try {
          await createChar(nid, { ...copy, name: c.name + " (копия)", archived: false });
          toast("Копия создана", { kind: "good" });
          return navigate(`#/c/${nid}`);
        } catch {
          return toast("Не удалось создать копию", { kind: "bad" });
        }
      }
      case "archive":
        if (!(await confirmDialog("Убрать персонажа в архив? Его можно будет вернуть со страницы списка.", { ok: "В архив" }))) return;
        mutate(ch => { ch.archived = true; }, { render: false });
        flush();
        return navigate("#/");
      case "unarchive":
        mutate(ch => { ch.archived = false; }, { render: false });
        return renderAll(true);
      case "menu": return menu();
      case "roll-mode":
        S.rollMode = S.rollMode === "normal" ? "adv" : S.rollMode === "adv" ? "dis" : "normal";
        if (el) el.innerHTML = rollModeLabel();
        toast(S.rollMode === "normal" ? "Следующий бросок d20: обычный" : `Следующий бросок d20: ${S.rollMode === "adv" ? "с преимуществом" : "с помехой"}`, { timeout: 1800 });
        return;
      case "hp": return hpDialog(el.dataset.mode);
      case "spend-hd": return spendHitDie();
      case "death": {
        const k = el.dataset.k;
        const i = Number(el.dataset.i);
        return mutate(ch => {
          ch.hp[k] = ch.hp[k] > i ? i : i + 1;
          if (ch.hp.deathSuccess < 3) ch.hp.stable = false;
        });
      }
      case "toggle-save": return mutate(ch => { ch.saves[el.dataset.k] = !ch.saves[el.dataset.k]; });
      case "cycle-skill": return mutate(ch => { ch.skills[el.dataset.k] = ((Number(ch.skills[el.dataset.k]) || 0) + 1) % 3; });
      case "edit-info": return editInfo();
      case "edit-armor": return editArmor();
      case "portrait": return portraitDialog();
      case "add-attack": return editEntity("attack", null);
      case "add-spell": return editEntity("spell", null);
      case "add-feature": return editEntity("feature", null, el.dataset.cat);
      case "add-item": return editEntity("item", null, S.ui.invFilter && !["all", "equipped", "other"].includes(S.ui.invFilter) ? S.ui.invFilter : "gear");
      case "add-note": return editNote(el.dataset.sec, null);
      case "edit-note": {
        const n = (c.notes[el.dataset.sec] || []).find(x => x.id === el.dataset.id);
        return n && editNote(el.dataset.sec, n);
      }
      case "notes-section": S.ui.notesSection = el.dataset.k; return renderTab();
      case "inv-filter": S.ui.invFilter = el.dataset.k; return renderTab();
      case "pact-pip": {
        const i = Number(el.dataset.i);
        const left = pactLeft();
        return mutate(ch => { ch.pactUsed = i < left ? (Number(ch.pactUsed) || 0) + 1 : Math.max(0, (Number(ch.pactUsed) || 0) - 1); });
      }
      case "slot-pip": {
        const lvl = el.dataset.lvl;
        const i = Number(el.dataset.i);
        const total = S.d.slots[lvl - 1];
        const used = Number(c.slotsUsed[lvl]) || 0;
        return mutate(ch => { ch.slotsUsed[lvl] = i < total - used ? used + 1 : Math.max(0, used - 1); });
      }
      case "use-pip": {
        const [kind, eid] = el.dataset.ref.split(":");
        const e = findEntity(c, kind, eid);
        const u = e && usesInfo(S.d, e);
        if (!u) return;
        return useEntity(kind, e, Number(el.dataset.i) < u.left ? 1 : -1);
      }
      case "toggle-cond": return mutate(ch => { ch.conditions[el.dataset.k] = !ch.conditions[el.dataset.k]; });
      case "exhaustion": return mutate(ch => { ch.exhaustion = Number(el.dataset.i); });
      case "drop-conc": return mutate(ch => { ch.concentration = ""; });
    }
  }

  const onClick = e => {
    if (!S.c) return;
    const tab = e.target.closest("[data-tab]");
    if (tab && root.contains(tab) && tab.classList.contains("tab")) {
      S.tab = tab.dataset.tab;
      hideHoverCard();
      history.replaceState(null, "", `#/c/${id}/${S.tab}`);
      renderTab();
      window.scrollTo({ top: 0 });
      return;
    }
    const act = e.target.closest("[data-act]");
    if (act && root.contains(act)) {
      e.preventDefault();
      return runAction(act.dataset.act, act);
    }
    const roll = e.target.closest("[data-roll]");
    if (roll && root.contains(roll)) return doRoll(roll.dataset.roll);
    const open = e.target.closest("[data-open]");
    if (open && root.contains(open)) {
      hideHoverCard();
      return openEntity(open.dataset.open);
    }
  };

  const onToastClick = e => {
    if (S.disposed) return;
    const crit = e.target.closest("#toasts [data-crit]");
    if (crit) doRoll("crit:" + crit.dataset.crit);
    if (e.target.closest("#toasts [data-conc-roll]")) doRoll("save:con");
  };

  const onKey = e => {
    if (e.key === "Enter" && e.target.matches("input[data-path]")) e.target.blur();
  };

  const onBeforeUnload = e => {
    if (!hasUnsaved() && !(lastStatus && getMode() === "cloud" && ["saving", "offline"].includes(lastStatus.state))) return;
    flush();
    if (getMode() === "cloud" || hasUnsaved()) {
      e.preventDefault();
      e.returnValue = "";
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden" && hasUnsaved()) flush();
  };

  root.addEventListener("input", onInput);
  root.addEventListener("change", onInput);
  root.addEventListener("click", onClick);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("keydown", onKey);
  document.addEventListener("click", onToastClick);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibility);
  const offHover = enableHoverCards(root, ref => (S.c && !S.disposed ? cardFor(S.c, S.d, ref) : ""));

  return () => {
    if (hasUnsaved()) flush();
    S.disposed = true;
    if (S.openModalApi) S.openModalApi.close();
    unsub && unsub();
    unStatus();
    offHover();
    root.removeEventListener("input", onInput);
    root.removeEventListener("change", onInput);
    root.removeEventListener("click", onClick);
    root.removeEventListener("focusout", onFocusOut);
    root.removeEventListener("keydown", onKey);
    document.removeEventListener("click", onToastClick);
    window.removeEventListener("beforeunload", onBeforeUnload);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
