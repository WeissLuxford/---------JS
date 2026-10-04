import { ABILITIES, SKILLS, compute, normalize, fmt, rollD20, rollDice, spellCast, usesInfo, maxDie, uid, newCharacter, addDice, swapType } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import {
  esc, $, $$, toast, openModal, confirmDialog, promptNumber, showD20, showDamage, rollLog, enableHoverCards, hideHoverCard,
  openForm, getPath, setPath, dateTime, timeAgo, resizeImage, download, pickFile
} from "./ui.js";
import { TABS, RENDER, subtitle } from "./tabs.js";
import { cardFor, findEntity, openEditor, noteFields, infoFields, armorFields, LIST_KEY, EDITORS } from "./entities.js";
import { subscribeChar, saveChar, addHistory, listHistory, onStatus, createChar, getMode } from "./store.js";

const SNAPSHOT_GAP = 10 * 60 * 1000;
const clone = v => JSON.parse(JSON.stringify(v));
const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || k;

export function mountSheet(root, id, initialTab, navigate) {
  const S = {
    c: null,
    d: null,
    tab: TABS.some(t => t.key === initialTab) ? initialTab : "char",
    ui: { invFilter: "all", notesSection: "patron" },
    dirty: false,
    saveTimer: null,
    lastSnapshot: 0,
    pendingRemote: null,
    rollMode: "normal",
    openRef: null,
    openModalApi: null
  };

  root.innerHTML = `<div class="loading">${icon("d20")}<span>Загружаю лист...</span></div>`;

  let lastStatus = null;
  const unStatus = onStatus(st => {
    lastStatus = st;
    paintSync();
  });

  function paintSync() {
    const el = $("[data-sync]", root);
    const st = lastStatus;
    if (!el || !st) return;
    el.className = "sync " + (st.mode === "local" ? "local" : st.state);
    el.title = st.error || (st.mode === "local" ? "Только в этом браузере" : st.state === "saving" ? "Сохраняю..." : "Сохранено в облаке");
    el.innerHTML = icon(st.mode === "local" || st.state === "error" ? "cloudOff" : "cloud");
  }

  const unsub = subscribeChar(id, (data, meta = {}) => {
    if (data === undefined) {
      if (!S.c) root.innerHTML = `<div class="loading err">${icon("cloudOff")}<span>Не удалось загрузить персонажа</span><a class="btn" href="#/">К списку</a></div>`;
      return;
    }
    if (data === null) {
      if (!S.c) root.innerHTML = `<div class="loading err">${icon("info")}<span>Персонаж не найден</span><a class="btn" href="#/">К списку</a></div>`;
      return;
    }
    if (meta.local) return;
    const incoming = normalize(data);
    incoming.id = id;
    if (!S.c) {
      S.c = incoming;
      S.d = compute(S.c);
      renderAll();
      return;
    }
    if (S.dirty || S.saveTimer) return;
    if (JSON.stringify(stripMeta(incoming)) === JSON.stringify(stripMeta(S.c))) return;
    const active = document.activeElement;
    if (active && root.contains(active) && active.matches("input, textarea, select")) {
      S.pendingRemote = incoming;
      return;
    }
    applyRemote(incoming);
  });

  function stripMeta(c) {
    const x = { ...c };
    delete x.updatedAt;
    delete x.createdAt;
    delete x.id;
    return x;
  }

  function applyRemote(incoming) {
    S.c = incoming;
    S.d = compute(S.c);
    S.pendingRemote = null;
    renderAll(true);
    toast(`${icon("cloud")} Лист обновлён: кто-то внёс изменения`, { kind: "info" });
  }

  function renderAll(keepScroll) {
    const y = window.scrollY;
    const c = S.c;
    document.title = `${c.name} · Лист персонажа`;
    root.innerHTML = `
      <div class="sheet">
        <header class="topbar">
          <a class="icon-btn" href="#/" title="Все персонажи">${icon("back")}</a>
          <button class="tb-portrait" data-act="portrait">${c.portrait ? `<img src="${esc(c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER}</button>
          <button class="tb-id" data-act="edit-info"><span class="tb-name" data-calc="name">${esc(c.name)}</span><span class="tb-sub" data-calc="sub">${esc(subtitle(c))}</span></button>
          <span class="spacer"></span>
          <button class="hp-mini" data-act="hp" title="Хиты"><span class="hp-mini-bar"><i data-hpbar></i></span><span><b data-calc="hp"></b>/<span data-calc="hpmax"></span></span></button>
          <button class="roll-mode" data-act="roll-mode" title="Режим следующего броска d20">${rollModeLabel()}</button>
          <span class="sync" data-sync></span>
          <button class="icon-btn" data-act="menu" title="Меню">${icon("dots")}</button>
        </header>
        <nav class="tabs" role="tablist">${TABS.map(t => `<button class="tab ${S.tab === t.key ? "on" : ""}" data-tab="${t.key}" role="tab">${icon(t.icon)}<span>${t.name}</span></button>`).join("")}</nav>
        ${c.archived ? `<div class="archived-bar">${icon("archive")} Персонаж в архиве <button class="btn sm" data-act="unarchive">Вернуть</button></div>` : ""}
        <main class="tab-body" data-body></main>
      </div>`;
    renderTab();
    paintSync();
    if (keepScroll) window.scrollTo(0, y);
  }

  function ctx() {
    return { c: S.c, d: S.d, ui: S.ui };
  }

  function renderTab() {
    const body = $("[data-body]", root);
    if (!body) return;
    body.innerHTML = RENDER[S.tab](ctx());
    body.dataset.tab = S.tab;
    $$(".tab", root).forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
    autogrowAll(body);
    updateCalcs();
  }

  function autogrowAll(scope) {
    $$("textarea.autogrow", scope).forEach(grow);
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
  }

  function snapshot(reason) {
    const now = Date.now();
    if (now - S.lastSnapshot < SNAPSHOT_GAP) return;
    S.lastSnapshot = now;
    addHistory(id, clone(S.c), reason);
  }

  function changed({ render = true } = {}) {
    S.d = compute(S.c);
    S.dirty = true;
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(flush, 650);
    if (render) renderTab();
    else updateCalcs();
    if (S.openRef && S.openModalApi) refreshEntityModal();
  }

  async function flush() {
    S.saveTimer = null;
    if (!S.dirty) return;
    S.dirty = false;
    try {
      await saveChar(S.c);
    } catch {
      S.dirty = true;
    }
  }

  function mutate(fn, opts) {
    snapshot("Перед правкой");
    fn(S.c);
    changed(opts);
  }

  const onInput = e => {
    const el = e.target.closest("[data-path]");
    if (!el || !root.contains(el)) return;
    if (el.tagName === "TEXTAREA" && el.classList.contains("autogrow")) grow(el);
    if (e.type === "input" && (el.tagName === "SELECT" || el.type === "checkbox")) return;
    snapshot("Перед правкой");
    let v = el.type === "checkbox" ? el.checked : el.value;
    if (el.hasAttribute("data-num")) v = v === "" ? 0 : Number(v);
    setPath(S.c, el.dataset.path, v);
    changed({ render: el.hasAttribute("data-rerender") });
  };

  const onFocusOut = () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (S.pendingRemote && !(a && root.contains(a) && a.matches("input, textarea, select")) && !S.dirty && !S.saveTimer) applyRemote(S.pendingRemote);
    }, 50);
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

  function d20(label, modifier) {
    const mode = takeMode();
    const r = rollD20(modifier, mode);
    showD20(label, modifier, r, mode);
    return r;
  }

  function doRoll(spec) {
    const { c, d } = S;
    const [k, a] = spec.split(":");
    if (k === "check") return d20(`Проверка: ${abName(a)}`, d.mods[a]);
    if (k === "save") return d20(`Спасбросок: ${abName(a)}`, d.saves[a]);
    if (k === "skill") {
      const s = SKILLS.find(x => x.key === a);
      return d20(s.name, d.skills[a]);
    }
    if (k === "init") return d20("Инициатива", d.init);
    if (k === "spellatk") return d20("Атака заклинанием", d.spell.atk);
    if (k === "attack") {
      const at = findEntity(c, "attack", a);
      const s = d.attacks[a];
      if (!at || !s) return;
      const r = d20(`${at.name}: атака`, s.hit);
      if (r.nat20) toast(`<b>Критическое попадание!</b> Кубы урона удваиваются. <button class="btn sm" data-crit="${a}">Бросить крит</button>`, { timeout: 7000 });
      return r;
    }
    if (k === "dmg" || k === "crit") {
      const at = findEntity(c, "attack", a);
      const s = d.attacks[a];
      if (!at || !s) return;
      const lines = Array.from({ length: s.beams }, () => ({ dice: s.dmg, type: s.type }));
      return showDamage(`${at.name}: урон${s.beams > 1 ? ` (${s.beams} луча)` : ""}`, lines, k === "crit");
    }
    if (k === "death") {
      const mode = takeMode();
      const r = rollD20(0, mode);
      showD20("Спасбросок от смерти", 0, r, mode);
      mutate(ch => {
        if (r.nat20) {
          ch.hp.current = 1;
          ch.hp.deathSuccess = 0;
          ch.hp.deathFail = 0;
        } else if (r.nat1) ch.hp.deathFail = Math.min(3, ch.hp.deathFail + 2);
        else if (r.total >= 10) ch.hp.deathSuccess = Math.min(3, ch.hp.deathSuccess + 1);
        else ch.hp.deathFail = Math.min(3, ch.hp.deathFail + 1);
      });
      if (S.c.hp.deathSuccess >= 3) toast("Три успеха: персонаж стабилизирован", { kind: "good" });
      if (S.c.hp.deathFail >= 3) toast("Три провала: персонаж погиб", { kind: "bad", timeout: 6000 });
      if (r.nat20) toast("Естественная 20: приходит в себя с 1 хитом!", { kind: "good" });
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
    if (!res || (!res.value && res.action !== "set")) return;
    const n = Math.abs(Math.floor(res.value));
    let concDc = 0;
    mutate(c => {
      const hp = c.hp;
      if (res.action === "dmg") {
        const fromTemp = Math.min(hp.temp || 0, n);
        hp.temp = (hp.temp || 0) - fromTemp;
        const rest = n - fromTemp;
        if (hp.current <= 0 && rest > 0) hp.deathFail = Math.min(3, hp.deathFail + 1);
        hp.current = Math.max(0, hp.current - rest);
        if (c.concentration && n > 0) concDc = Math.max(10, Math.floor(n / 2));
      } else if (res.action === "heal") {
        if (hp.current <= 0) {
          hp.deathSuccess = 0;
          hp.deathFail = 0;
        }
        hp.current = Math.min(S.d.hpMax, hp.current + n);
      } else if (res.action === "temp") {
        hp.temp = Math.max(hp.temp || 0, n);
      } else if (res.action === "set") {
        hp.current = Math.min(S.d.hpMax, n);
      }
    });
    if (concDc) {
      toast(`${icon("spiral")} Концентрация на «${esc(S.c.concentration)}»: спасбросок Телосложения, СЛ ${concDc}. <button class="btn sm" data-conc-roll>Бросить</button>`, { timeout: 9000 });
    }
  }

  function spendHitDie() {
    const { c, d } = S;
    if (d.hitDice.left <= 0) return toast("Кости хитов закончились");
    const r = rollDice(`1d${maxDie(c.hitDie)}`);
    const heal = Math.max(0, r.total + d.mods.con);
    mutate(ch => {
      ch.hp.hitDiceUsed = (Number(ch.hp.hitDiceUsed) || 0) + 1;
      ch.hp.current = Math.min(S.d.hpMax, ch.hp.current + heal);
    });
    toast(`${icon("heart")} Кость хитов: ${r.total} ${fmt(d.mods.con)} = <b>+${heal}</b> хитов`, { kind: "good" });
  }

  function resetUses(c, kinds) {
    for (const list of [c.features, c.items, c.spells]) {
      for (const e of list) if (kinds.includes(e.recharge)) e.used = 0;
    }
  }

  async function shortRest() {
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
    mutate(c => {
      const lvl = S.d.level;
      c.hp.current = S.d.hpMax;
      c.hp.temp = 0;
      c.hp.deathSuccess = 0;
      c.hp.deathFail = 0;
      c.hp.hitDiceUsed = Math.max(0, (Number(c.hp.hitDiceUsed) || 0) - Math.max(1, Math.floor(lvl / 2)));
      c.pactUsed = 0;
      c.slotsUsed = {};
      c.concentration = "";
      if (c.exhaustion > 0) c.exhaustion -= 1;
      resetUses(c, ["short", "long", "dawn"]);
    });
    toast(`${icon("moon")} Длинный отдых завершён`, { kind: "good" });
  }

  function spendSlot(level) {
    const { c, d } = S;
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

  async function castSpell(sp, chosenLevel) {
    const { d } = S;
    const lvl = Number(sp.level) || 0;
    let castLevel = null;
    if (lvl > 0 && sp.cost === "slot") {
      if (d.pact) {
        if ((Number(S.c.pactUsed) || 0) >= d.pact.count) return toast("Нет свободных ячеек договора. Нужен короткий отдых.", { kind: "bad" });
        castLevel = d.pact.level;
      } else {
        const avail = availableSlotLevels(lvl);
        if (!avail.length) return toast("Нет свободных ячеек подходящего круга", { kind: "bad" });
        castLevel = chosenLevel || avail[0];
      }
    }
    if (sp.cost === "uses") {
      const u = usesInfo(d, sp);
      if (u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    }
    let concNote = "";
    mutate(c => {
      const e = findEntity(c, "spell", sp.id);
      if (castLevel) spendSlot(castLevel);
      if (e.cost === "uses" && usesInfo(S.d, e)) e.used = (Number(e.used) || 0) + 1;
      if (e.concentration) {
        if (c.concentration && c.concentration !== e.name) concNote = ` Концентрация на «${c.concentration}» прервана.`;
        c.concentration = e.name;
      }
    });
    const cast = spellCast(S.c, S.d, sp, castLevel);
    toast(`${icon("sparkle")} <b>${esc(sp.name)}</b>${castLevel ? ` (${castLevel} круг)` : ""}.${esc(concNote)}`, { kind: "info" });
    return cast;
  }

  function useEntity(kind, e, delta = 1) {
    const u = usesInfo(S.d, e);
    if (!u && !(kind === "feature" && e.slot === "pact")) return;
    if (delta > 0 && u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    if (kind === "feature" && e.slot === "pact" && delta > 0 && S.d.pact && (Number(S.c.pactUsed) || 0) >= S.d.pact.count) return toast("Нет свободных ячеек договора", { kind: "bad" });
    mutate(c => {
      const x = findEntity(c, kind, e.id);
      if (u) x.used = Math.max(0, Math.min(u.max, (Number(x.used) || 0) + delta));
      if (kind === "feature" && x.slot === "pact" && delta > 0) spendSlot(S.d.pact ? S.d.pact.level : 1);
    });
  }

  function entityButtons(kind, e) {
    const { c, d } = S;
    const b = [];
    if (kind === "spell") {
      const lvl = Number(e.level) || 0;
      if (lvl > 0 || e.concentration) {
        if (!d.pact && lvl > 0 && e.cost === "slot") {
          const av = availableSlotLevels(lvl);
          av.forEach(l => b.push(`<button class="btn gold" data-x="cast" data-lvl="${l}">${icon("sparkle")}Сотворить (${l} круг)</button>`));
          if (!av.length) b.push(`<button class="btn" disabled>Нет ячеек</button>`);
        } else {
          b.push(`<button class="btn gold" data-x="cast">${icon("sparkle")}Сотворить</button>`);
        }
      }
      if (e.attack) b.push(`<button class="btn" data-x="spell-atk">${icon("d20")}Атака ${fmt(d.spell.atk)}</button>`);
      if ((e.damage || []).length) {
        b.push(`<button class="btn" data-x="spell-dmg">${icon("force")}Бросить кубы</button>`);
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
      b.push(`<span class="qty-ctl"><button class="icon-btn" data-x="qty-" title="Меньше">${icon("minus")}</button><b>${e.qty}</b><button class="icon-btn" data-x="qty+" title="Больше">${icon("plus")}</button></span>`);
    }
    if (kind === "attack") {
      const s = d.attacks[e.id];
      if (s.kind === "attack") b.push(`<button class="btn gold" data-x="atk">${icon("d20")}Атака ${fmt(s.hit)}</button>`);
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
    return `${cardFor(S.c, S.d, ref)}<div class="entity-actions">${entityButtons(kind, e)}</div>`;
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
    const m = openModal({ body: html, cls: "entity", onClose: () => { if (S.openModalApi === m) { S.openRef = null; S.openModalApi = null; } } });
    S.openRef = ref;
    S.openModalApi = m;
    m.body.addEventListener("click", async ev => {
      const btn = ev.target.closest("[data-x]");
      if (!btn) return;
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
        const cast = spellCast(S.c, S.d, e);
        const lines = [];
        for (let i = 0; i < cast.beams; i++) lines.push(...cast.lines);
        return showDamage(e.name, lines, x === "spell-crit");
      }
      if (x === "use") return useEntity(kind, e, 1);
      if (x === "restore") return useEntity(kind, e, -1);
      if (x === "feat-dmg" || x === "item-dmg") {
        const lines = (e.damage || []).map(l => ({ dice: l.addMod ? addDice(l.dice, S.d.spell.mod) : l.dice, type: swapType(S.c, l.type) }));
        return showDamage(e.name, lines);
      }
      if (x === "equip") return mutate(c => { const it = findEntity(c, "item", eid); it.equipped = !it.equipped; });
      if (x === "attune") {
        if (!e.attuned && S.d.attuned >= 3) return toast("Уже настроено 3 предмета: это максимум", { kind: "bad" });
        return mutate(c => { const it = findEntity(c, "item", eid); it.attuned = !it.attuned; });
      }
      if (x === "qty-" || x === "qty+") return mutate(c => { const it = findEntity(c, "item", eid); it.qty = Math.max(0, (Number(it.qty) || 0) + (x === "qty+" ? 1 : -1)); });
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
        mutate(c => {
          const list = c[key];
          const i = list.findIndex(x => x.id === val.id);
          if (i >= 0) list[i] = val;
          else list.push(val);
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
          c.info.level = Math.max(1, Math.min(20, Number(c.info.level) || 1));
          if (!String(c.name || "").trim()) c.name = "Без имени";
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
      onSave: val => mutate(c => { c.armor = { ...c.armor, ...val.armor }; })
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
    m.body.innerHTML = `<p class="hint">Версии сохраняются автоматически перед правками. Восстановление тоже можно откатить: текущее состояние сначала уйдёт в историю.</p><div class="hist">${list.map((h, i) => `
      <div class="hist-row"><div><b>${dateTime(h.at)}</b><small>${esc(h.data?.name || "")} · ${esc(subtitle(normalize(h.data || {})))} · ${timeAgo(h.at)}</small></div><button class="btn sm" data-i="${i}">${icon("history")}Восстановить</button></div>`).join("")}</div>`;
    m.body.addEventListener("click", async e => {
      const b = e.target.closest("[data-i]");
      if (!b) return;
      const h = list[Number(b.dataset.i)];
      if (!(await confirmDialog(`Вернуть лист к версии от ${dateTime(h.at)}?`, { ok: "Восстановить" }))) return;
      await addHistory(id, clone(S.c), "Перед восстановлением");
      S.lastSnapshot = Date.now();
      const restored = normalize(h.data);
      restored.id = id;
      S.c = restored;
      changed({ render: false });
      renderAll(true);
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
    let data;
    try {
      data = JSON.parse(await f.text());
    } catch {
      return toast("Файл не читается как JSON", { kind: "bad" });
    }
    const c = normalize(data.character || data);
    const m = openModal({
      title: "Импорт",
      cls: "small",
      body: `<p>Файл: <b>${esc(c.name)}</b>, ${esc(subtitle(c))}</p><div class="form-actions"><button class="btn" data-new>Как нового персонажа</button><button class="btn danger" data-replace>Заменить текущего</button></div>`
    });
    m.body.querySelector("[data-new]").onclick = async () => {
      const nid = uid();
      await createChar(nid, { ...c, archived: false });
      m.close();
      navigate(`#/c/${nid}`);
    };
    m.body.querySelector("[data-replace]").onclick = async () => {
      if (!(await confirmDialog("Заменить текущий лист данными из файла? Текущая версия сохранится в истории.", { ok: "Заменить", danger: true }))) return;
      await addHistory(id, clone(S.c), "Перед импортом");
      S.lastSnapshot = Date.now();
      S.c = { ...c, id };
      changed({ render: false });
      renderAll(true);
      m.close();
    };
  }

  function menu() {
    const items = [
      ["short-rest", "campfire", "Короткий отдых"],
      ["long-rest", "moon", "Длинный отдых"],
      ["roll-log", "d20", "Журнал бросков"],
      ["history", "history", "История изменений"],
      ["copy-link", "link", "Скопировать ссылку"],
      ["export", "download", "Скачать файл персонажа"],
      ["import", "upload", "Загрузить из файла"],
      ["duplicate", "copy", "Сделать копию"],
      S.c.archived ? ["unarchive", "archive", "Вернуть из архива"] : ["archive", "archive", "Убрать в архив"]
    ];
    const m = openModal({
      title: "Меню",
      cls: "small",
      body: `<div class="menu-list">${items.map(([a, ic, l]) => `<button class="menu-item" data-m="${a}">${icon(ic)}<span>${l}</span></button>`).join("")}</div><p class="hint">${getMode() === "cloud" ? "Данные в облаке: все, у кого есть ссылка, видят и правят этот лист." : "Облако недоступно: данные хранятся только в этом браузере."}</p>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      m.close();
      runAction(b.dataset.m);
    });
  }

  async function runAction(a, el) {
    const { c } = S;
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
        return download(`${name}.json`, JSON.stringify({ format: "dnd-sheet", version: 1, character: { ...clone(c), id: undefined } }, null, 2));
      }
      case "import": return importDialog();
      case "duplicate": {
        const nid = uid();
        await createChar(nid, { ...clone(c), name: c.name + " (копия)", archived: false });
        toast("Копия создана", { kind: "good" });
        return navigate(`#/c/${nid}`);
      }
      case "archive":
        if (!(await confirmDialog("Убрать персонажа в архив? Его можно будет вернуть со страницы списка.", { ok: "В архив" }))) return;
        mutate(ch => { ch.archived = true; }, { render: false });
        await flush();
        return navigate("#/");
      case "unarchive":
        mutate(ch => { ch.archived = false; }, { render: false });
        return renderAll(true);
      case "menu": return menu();
      case "roll-mode":
        S.rollMode = S.rollMode === "normal" ? "adv" : S.rollMode === "adv" ? "dis" : "normal";
        el.innerHTML = rollModeLabel();
        if (S.rollMode !== "normal") toast(`Следующий бросок d20: ${S.rollMode === "adv" ? "с преимуществом" : "с помехой"}`, { timeout: 1800 });
        return;
      case "hp": return hpDialog(el.dataset.mode);
      case "spend-hd": return spendHitDie();
      case "death": {
        const k = el.dataset.k;
        const i = Number(el.dataset.i);
        return mutate(ch => { ch.hp[k] = ch.hp[k] > i ? i : i + 1; });
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
      case "edit-note": return editNote(el.dataset.sec, c.notes[el.dataset.sec].find(n => n.id === el.dataset.id));
      case "notes-section": S.ui.notesSection = el.dataset.k; return renderTab();
      case "inv-filter": S.ui.invFilter = el.dataset.k; return renderTab();
      case "pact-pip": {
        const i = Number(el.dataset.i);
        const left = S.d.pact.count - (Number(c.pactUsed) || 0);
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
        const u = usesInfo(S.d, e);
        return useEntity(kind, e, Number(el.dataset.i) < u.left ? 1 : -1);
      }
      case "toggle-cond": return mutate(ch => { ch.conditions[el.dataset.k] = !ch.conditions[el.dataset.k]; });
      case "exhaustion": return mutate(ch => { ch.exhaustion = Number(el.dataset.i); });
      case "drop-conc": return mutate(ch => { ch.concentration = ""; });
    }
  }

  const onClick = e => {
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
    const crit = e.target.closest("[data-crit]");
    if (crit) doRoll("crit:" + crit.dataset.crit);
    if (e.target.closest("[data-conc-roll]")) doRoll("save:con");
  };

  const onKey = e => {
    if (e.key === "Enter" && e.target.matches("input[data-path]")) e.target.blur();
  };

  const onBeforeUnload = e => {
    if (S.dirty || S.saveTimer) {
      flush();
      e.preventDefault();
      e.returnValue = "";
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden" && (S.dirty || S.saveTimer)) {
      clearTimeout(S.saveTimer);
      flush();
    }
  };

  root.addEventListener("input", onInput);
  root.addEventListener("change", onInput);
  root.addEventListener("click", onClick);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("keydown", onKey);
  document.addEventListener("click", onToastClick);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibility);
  enableHoverCards(root, ref => (S.c ? cardFor(S.c, S.d, ref) : ""));

  return () => {
    if (S.dirty || S.saveTimer) {
      clearTimeout(S.saveTimer);
      flush();
    }
    unsub && unsub();
    unStatus();
    hideHoverCard();
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

export function blankCharacter() {
  return newCharacter();
}
