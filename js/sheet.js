import { ABILITIES, SKILLS, DAMAGE, DAMAGE_TYPES, DEFENSE_KINDS, compute, normalize, fmt, rollD20, rollDice, spellCast, usesInfo, maxDie, uid, addDice, swapType, importCharacter, NOTE_KEYS, itemCharges, reorderSubset, rollContext, resolveMode, rollReasons, applyDefenses, effectDamage, presetEffect, cleanEffect, EFFECT_PRESETS, weaponStats, STANDARD_ACTIONS, movementInfo, ACTIONS } from "./rules.js";
import { icon, actionMark, PORTRAIT_PLACEHOLDER } from "./icons.js";
import {
  esc, $, $$, toast, openModal, confirmDialog, promptNumber, showD20, showBeams, showDamage, rollLog, enableHoverCards, hideHoverCard,
  enableLongPress, enableReorder, openDiceRoller, fxSettings, setFx, playSound, openForm, getPath, setPath, dateTime, timeAgo, cropImage, download, pickFile
} from "./ui.js";
import { TABS, RENDER, subtitle, hpState, notesList, noteTags, combatSources, turnBar } from "./tabs.js";
import { cardFor, findEntity, itemIcon, spellIcon, featureIcon, attackIcon, effectFields, openEditor, noteFields, infoFields, armorFields, LIST_KEY, EDITORS, itemSpellInfo, spellAtk, chargeWord } from "./entities.js";
import { subscribeChar, saveChanges, addHistory, listHistory, onStatus, createChar, getMode, watchInvite, addRecent, deleteCharacter, pendingWrites, newCharId, humanError } from "./store.js";
import { diffPaths, applyPaths } from "./sync.js";
import { describeChanges } from "./changes.js";
import { describeWho, isMe, KIND_ICONS } from "./device.js";
import { onAccess, getAccess, currentUid, myEmail, signIn, IN_APP } from "./access.js";
import { banAccount, openAccounts } from "./admin.js";
import { openShare } from "./share.js";

const SNAPSHOT_GAP = 10 * 60 * 1000;
const lastSnapshot = new Map();
const clone = v => JSON.parse(JSON.stringify(v));
const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || k;
const META = ["updatedAt", "createdAt", "updatedBy", "id"];

function sameContent(a, b) {
  const strip = x => {
    const y = { ...x };
    META.forEach(k => delete y[k]);
    return JSON.stringify(y);
  };
  return strip(a) === strip(b);
}

const UI_PREFS = "dnd.ui";

function loadUiPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(UI_PREFS) || "{}");
    return { invSort: typeof p.invSort === "string" ? p.invSort : "added", invEqFirst: p.invEqFirst !== false };
  } catch {
    return { invSort: "added", invEqFirst: true };
  }
}

function loadTurn(id) {
  try {
    const t = JSON.parse(localStorage.getItem("dnd.turn." + id) || "{}");
    return { action: !!t.action, bonus: !!t.bonus, reaction: !!t.reaction };
  } catch {
    return { action: false, bonus: false, reaction: false };
  }
}

function saveUiPrefs(ui) {
  try {
    localStorage.setItem(UI_PREFS, JSON.stringify({ invSort: ui.invSort, invEqFirst: ui.invEqFirst }));
  } catch {}
}

export function mountSheet(root, id, initialTab, navigate) {
  const S = {
    c: null,
    d: null,
    base: null,
    tab: TABS.some(t => t.key === initialTab) ? initialTab : "char",
    ui: { ...loadUiPrefs(), turn: loadTurn(id), invFilter: "all", notesSection: "patron", spellFilter: "all", spellQ: "", noteOpen: {}, notesQ: "", noteTag: "", peopleAtt: "all" },
    scroll: {},
    saveTimer: null,
    retry: 0,
    pendingRender: false,
    rollMode: "normal",
    openRef: null,
    openModalApi: null,
    lastCast: {},
    lastExtra: {},
    disposed: false,
    access: getAccess(),
    isEditor: false,
    aclFor: ""
  };

  root.innerHTML = `<div class="loading">${icon("d20")}<span>Загружаю лист...</span></div>`;
  let lastRole = "";

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
      if (meta.denied) {
        if (!S.c) {
          const guest = getMode() === "cloud" && !S.access.signedIn;
          root.innerHTML = `<div class="loading err">${icon("eye")}<span>Владелец закрыл доступ к этому листу</span><small>${guest ? "Если тебе дали право править, войди через Google." : "Попроси владельца снова поделиться ссылкой или пригласить тебя редактором."}</small>${guest ? `<button class="btn gold" data-act="signin">${icon("user")}Войти через Google</button>` : ""}<a class="btn" href="#/">К списку</a></div>`;
        } else {
          S.closed = true;
          renderAll(true);
          toast(`${icon("eye")} Владелец закрыл доступ к листу`, { kind: "bad", timeout: 6000 });
        }
        return;
      }
      if (!S.c) {
        if (meta.offline) loaderMessage("cloudOff", "Нет связи с облаком", "Этот лист ещё не открывался на этом устройстве. Он загрузится, как только появится интернет.");
        else loaderMessage("cloudOff", "Не удалось загрузить персонажа", (lastStatus && lastStatus.error) || "");
      }
      return;
    }
    if (data === null) {
      if (!S.c) loaderMessage("info", "Персонаж не найден");
      else if (!S.deleted) {
        S.deleted = true;
        clearTimeout(S.saveTimer);
        S.saveTimer = null;
        S.base = clone(S.c);
        renderAll(true);
        toast(`${icon("trash")} Этот лист удалён владельцем. Можно скачать файл или сделать копию себе.`, { kind: "bad", timeout: 8000 });
      }
      return;
    }
    const incoming = normalize(data);
    incoming.id = id;
    if (!S.c) {
      S.base = clone(incoming);
      S.c = incoming;
      S.d = compute(S.c);
      renderAll();
      checkEditor();
      if (rights().role !== "owner") addRecent({ id, name: S.c.name, sub: subtitle(S.c) });
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
    if (!meta.pendingWrites && !meta.self) toast(`${icon("cloud")} Лист обновлён: кто-то внёс изменения`, { kind: "info" });
  });

  function rights() {
    const a = S.access;
    if (S.deleted) return { canEdit: false, role: "deleted" };
    if (S.closed) return { canEdit: false, role: "closed" };
    if (getMode() !== "cloud" || !a.enforced) return { canEdit: true, role: "open" };
    if (!a.signedIn) return { canEdit: false, role: "guest" };
    if (a.banned) return { canEdit: false, role: "banned" };
    const own = !!(S.c && S.c.ownerUid && S.c.ownerUid === a.uid);
    if (own) return { canEdit: true, role: "owner" };
    if (a.isAdmin) return { canEdit: true, role: "admin" };
    if (S.isEditor) return { canEdit: true, role: "editor" };
    return { canEdit: false, role: S.c && !S.c.ownerUid ? "orphan" : "viewer" };
  }

  let offInvite = () => {};

  function checkEditor() {
    const a = S.access;
    const key = `${a.uid}|${a.enforced}|${myEmail()}`;
    if (S.aclFor === key || !S.c || S.disposed) return;
    S.aclFor = key;
    offInvite();
    offInvite = () => {};
    S.isEditor = false;
    if (getMode() !== "cloud" || !a.enforced || !a.signedIn) return;
    offInvite = watchInvite(id, myEmail(), has => {
      if (S.disposed) return;
      S.isEditor = has;
      if (S.c && rights().role !== lastRole) renderAll(true);
    });
  }

  const offAccess = onAccess(a => {
    S.access = a;
    if (!S.c || S.disposed) return;
    checkEditor();
    if (rights().role !== lastRole) renderAll(true);
  });

  function readOnly() {
    return !rights().canEdit;
  }

  function roText() {
    const r = rights().role;
    if (r === "banned") return "Владелец сайта запретил твоему аккаунту вносить правки. Смотреть лист можно.";
    if (r === "guest") return "Только просмотр. Если владелец дал тебе право править, войди через Google.";
    if (r === "orphan") return "Только просмотр: у персонажа пока нет владельца.";
    if (r === "closed") return "Владелец закрыл доступ к листу. Показана последняя загруженная версия.";
    if (r === "deleted") return "Лист удалён владельцем. Можно скачать файл или сделать копию себе (Меню).";
    return "Только просмотр: это чужой персонаж. Можно сделать копию себе (Меню).";
  }

  function roBar() {
    if (!readOnly()) return "";
    const r = rights().role;
    const btn = r === "guest"
      ? `<button class="btn sm gold" data-act="signin">${icon("user")}Войти через Google</button>`
      : r === "viewer" || r === "orphan" || r === "deleted" ? `<button class="btn sm" data-act="duplicate">${icon("copy")}Копия себе</button>` : "";
    const warn = r === "guest" && IN_APP ? `<small>Открыто внутри приложения: для входа открой ссылку в Chrome или Safari.</small>` : "";
    return `<div class="ro-bar">${icon("eye")}<span>${esc(roText())}${warn}</span>${btn}</div>`;
  }

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
    lastRole = rights().role;
    const y = window.scrollY;
    const c = S.c;
    document.title = `${c.name} · Лист персонажа`;
    root.innerHTML = `
      <div class="sheet ${readOnly() ? "viewer" : ""}">
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
        ${roBar()}
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
    body.innerHTML = (S.ui.ordering ? `<div class="order-bar">${icon("menu")}<span>Перетаскивай карточки за значок ⠿ (на компьютере ещё Alt + стрелки). Порядок сохранится для всех устройств.</span><button class="btn gold sm" data-act="toggle-order">${icon("check")}Готово</button></div>` : "") + RENDER[S.tab]({ c: S.c, d: S.d, ui: S.ui });
    body.dataset.tab = S.tab;
    body.classList.toggle("ordering", !!S.ui.ordering);
    if (S.ui.ordering) $$("[data-reorder] > [data-rid]", body).forEach(el => el.insertAdjacentHTML("afterbegin", `<span class="drag-h" aria-hidden="true">⠿</span>`));
    $$(".tab", root).forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
    $$("textarea.autogrow", body).forEach(grow);
    if (readOnly()) $$("input:not([data-ui]), textarea, select:not([data-ui])", body).forEach(el => (el.disabled = true));
    if (S.tab === "spells" && S.ui.spellQ) filterSpells(S.ui.spellQ);
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
      case "speed": return S.d.speed + " фт";
      case "pp": return String(d.passive.perception);
      case "pi": return String(d.passive.insight);
      case "pinv": return String(d.passive.investigation);
      case "hp": return String(curHp());
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
    const pct = Math.max(0, Math.min(100, (curHp() / Math.max(1, S.d.hpMax)) * 100));
    const state = hpState(curHp(), S.d.hpMax);
    $$("[data-hpbar]", root).forEach(el => {
      el.style.width = pct + "%";
      el.parentElement.classList.toggle("low", pct <= 25);
    });
    $$(".hp-mini, [data-hpstate]", root).forEach(el => (el.dataset.hpstate = state));
    $$(".medal.slow, [data-calc=speed]", root).forEach(el => {
      const m = el.closest(".medal");
      if (m) m.classList.toggle("slow", S.d.speed < S.d.baseSpeed);
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
    addHistory(id, clone(S.c), reason, { prune: ["owner", "admin"].includes(rights().role) });
  }

  function changed({ render = true } = {}) {
    if (S.disposed) return;
    S.d = compute(S.c);
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
      S.saveFailed = false;
    } catch (err) {
      if (String(err && err.code).includes("permission-denied")) {
        S.base = prevBase;
        S.c = normalize(clone(prevBase));
        S.c.id = id;
        S.d = compute(S.c);
        S.aclFor = "";
        S.isEditor = false;
        S.saveFailed = false;
        renderAll(true);
        checkEditor();
        toast(`${icon("eye")} ${esc(humanError(err, "write"))}: права на правку отозваны, показана версия с сервера`, { kind: "bad", timeout: 7000 });
        return;
      }
      S.saveFailed = true;
      S.base = applyPaths(clone(S.base), diffPaths(sent, prevBase));
      S.retry = Math.min((S.retry || 1000) * 2, 30000);
      if (!S.disposed || getMode() === "local") S.saveTimer = setTimeout(flush, S.retry);
    }
  }

  function hasUnsaved() {
    return !!(S.c && S.base && (S.saveTimer || diffPaths(S.base, S.c).length));
  }

  function mutate(fn, opts) {
    if (S.disposed || !S.c) return false;
    if (readOnly()) {
      toast(`${icon("eye")} ${esc(roText())}`, { kind: "bad" });
      return false;
    }
    snapshot("Перед правкой");
    const prevConc = S.c.concentration;
    fn(S.c);
    if (prevConc && S.c.concentration !== prevConc && Array.isArray(S.c.effects)) {
      const gone = S.c.effects.filter(e => e.mine && e.concName === prevConc);
      if (gone.length) {
        S.c.effects = S.c.effects.filter(e => !gone.includes(e));
        toast(`${icon("spiral")} Концентрация прервана, снято: ${esc(gone.map(e => e.name).join(", "))}`, { kind: "info" });
      }
    }
    changed(opts);
    return true;
  }

  function curHp(c = S.c) {
    return Math.max(0, Math.min(S.d.hpMax, Number(c.hp.current) || 0));
  }

  function clampHp(c = S.c) {
    const d = compute(c);
    if ((Number(c.hp.current) || 0) > d.hpMax) c.hp.current = d.hpMax;
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

  function filterSpells(q) {
    const body = $("[data-body]", root);
    if (!body) return;
    const needle = q.trim().toLowerCase();
    let shown = 0;
    $$(".spell-lists .panel", body).forEach(p => {
      let any = 0;
      $$(".tile[data-search]", p).forEach(t => {
        const ok = !needle || t.dataset.search.includes(needle);
        t.hidden = !ok;
        if (ok) any++;
      });
      p.hidden = !any;
      shown += any;
    });
    const empty = $("[data-search-empty]", body);
    if (empty) empty.hidden = !(needle && !shown);
  }

  const onUiInput = e => {
    const so = e.target.closest("[data-ui=inv-sort]");
    if (so && root.contains(so)) {
      if (e.type === "change") {
        S.ui.invSort = so.value;
        saveUiPrefs(S.ui);
        renderTab();
      }
      return true;
    }
    const nq = e.target.closest("[data-ui=notes-q]");
    if (nq && root.contains(nq)) {
      S.ui.notesQ = nq.value;
      const body = $("[data-body]", root);
      const list = body && $("[data-notes-list]", body);
      if (list) list.innerHTML = notesList({ c: S.c, d: S.d, ui: S.ui });
      const on = !!nq.value.trim();
      $$(".note-filters, .notes-head", body).forEach(el => (el.hidden = on));
      $$(".subtab", body).forEach(el => el.classList.toggle("on", !on && el.dataset.k === S.ui.notesSection));
      return true;
    }
    const q = e.target.closest("[data-ui=spell-q]");
    if (!q || !root.contains(q)) return false;
    S.ui.spellQ = q.value;
    filterSpells(q.value);
    return true;
  };

  const onToggle = e => {
    const d = e.target;
    if (!d || !d.matches || !d.matches("details[data-ui-open]") || !root.contains(d)) return;
    S.ui[d.dataset.uiOpen] = d.open;
  };

  const onInput = e => {
    if (onUiInput(e)) return;
    const el = e.target.closest("[data-path]");
    if (!el || !root.contains(el) || !S.c || readOnly()) return;
    if (el.tagName === "TEXTAREA" && el.classList.contains("autogrow")) grow(el);
    if (e.type === "input" && (el.tagName === "SELECT" || el.type === "checkbox")) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    const path = el.dataset.path;
    if (el.hasAttribute("data-num")) v = v === "" ? 0 : Number(v);
    if (path.startsWith("coins.")) v = Math.max(0, Math.floor(Number(v) || 0));
    const affectsHp = path.startsWith("abilities.") || path === "info.level";
    if (getPath(S.c, path) === v) {
      if (e.type === "change" && affectsHp && (Number(S.c.hp.current) || 0) > S.d.hpMax) {
        clampHp();
        changed({ render: false });
      }
      return;
    }
    snapshot("Перед правкой");
    setPath(S.c, path, v);
    if (path.startsWith("abilities.")) S.c.abilities = normalize(S.c).abilities;
    if (e.type === "change" && affectsHp) clampHp();
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

  function rollSetup(kind, ability, manual) {
    const ctx = rollContext(S.c, kind, ability);
    return { mode: resolveMode(manual, ctx), why: rollReasons(manual, ctx), fail: ctx.autoFail, bonus: ctx.bonus };
  }

  function addBonus(r, st) {
    const parts = st.bonus.map(b => {
      const x = rollDice(b.expr);
      return { ...b, value: x ? x.total : 0 };
    });
    r.total += parts.reduce((sum, p) => sum + p.value, 0);
    return parts;
  }

  function bonusLines(list) {
    const by = new Map();
    for (const p of list) {
      const cur = by.get(p.name) || { expr: p.expr, values: [] };
      cur.values.push(p.value);
      by.set(p.name, cur);
    }
    return [...by].map(([name, v]) => `${name}: ${v.values.map(x => (x < 0 ? "−" : "+") + Math.abs(x)).join(", ")} (${v.expr.replace(/^-/, "−")})`);
  }

  function consumeOnce(st) {
    const ids = st.bonus.filter(b => b.once).map(b => b.id);
    if (!ids.length || readOnly()) return;
    const names = st.bonus.filter(b => b.once).map(b => b.name);
    mutate(c => { c.effects = c.effects.filter(e => !ids.includes(e.id)); });
    toast(`${icon("sparkle")} Потрачено: ${esc([...new Set(names)].join(", "))}`, { timeout: 2200 });
  }

  function d20(label, modifier, kind, ability, extra) {
    const st = rollSetup(kind, ability, takeMode());
    const r = rollD20(modifier, st.mode);
    const parts = addBonus(r, st);
    showD20(label, modifier, r, st.mode, { why: [...bonusLines(parts), ...st.why], fail: st.fail, extra: typeof extra === "function" ? extra(r) : extra || "" });
    consumeOnce(st);
    return r;
  }

  function saveTurn() {
    try {
      localStorage.setItem("dnd.turn." + id, JSON.stringify(S.ui.turn));
    } catch {}
    const bar = $("[data-turn]", root);
    if (bar) bar.outerHTML = turnBar({ ui: S.ui });
  }

  function markAction(kind) {
    if (!["action", "bonus", "reaction"].includes(kind) || S.ui.turn[kind]) return;
    S.ui.turn[kind] = true;
    saveTurn();
  }

  function spellReady(sp) {
    const lvl = Number(sp.level) || 0;
    if (sp.cost === "item") {
      const info = itemSpellInfo(S.c, S.d, sp);
      return info && info.uses ? (info.left >= info.min ? `${info.left} ${chargeWord(info.left)}` : false) : false;
    }
    if (sp.cost === "uses") {
      const u = usesInfo(S.d, sp);
      return u ? (u.left > 0 ? `${u.left}/${u.max}` : false) : "";
    }
    if (lvl === 0 || sp.cost === "free") return "";
    if (S.d.pact) return lvl <= S.d.pact.level && pactLeft() > 0 ? `ячейка ${S.d.pact.level} круга` : false;
    return availableSlotLevels(lvl).length ? "" : false;
  }

  function actionMenu(kind) {
    const { c, d } = S;
    const a = ACTIONS[kind];
    const used = !!S.ui.turn[kind];
    const rows = [];
    const row = (ref, ic, color, name, sub, off = false) => rows.push({ html: `<button class="am-row ${off ? "off" : ""}" data-am-open="${esc(ref)}" style="--c:${color}">${icon(ic)}<span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>` });
    const groups = [];
    const flush = title => {
      if (rows.length) groups.push(`<div class="am-group">${esc(title)}</div>${rows.splice(0).map(r => r.html).join("")}`);
    };
    if (kind === "action") {
      const src = combatSources(c, d);
      src.weapons.filter(it => (it.action || "action") === kind).forEach(it => row("item:" + it.id, itemIcon(it), "#cbbfa8", it.name, `атака ${fmt(d.weapons[it.id].hit)} · ${d.weapons[it.id].dmg}`));
      src.own.filter(at => (at.action || "action") === kind).forEach(at => {
        const st = d.attacks[at.id];
        row("attack:" + at.id, at.icon || attackIcon(at.name) || "swords", (DAMAGE[st.type] || {}).color || "#cbbfa8", at.name, st.kind === "save" ? `СЛ ${st.dc}` : `атака ${fmt(st.hit)} · ${st.dmg}`);
      });
      flush("Атаки");
    }
    c.spells.filter(sp => (sp.action || "action") === kind).forEach(sp => {
      const ready = spellReady(sp);
      const ic = spellIcon(c, sp);
      row("spell:" + sp.id, ic.icon, ic.color, sp.name, [Number(sp.level) ? `${sp.level} круг` : "заговор", ready === false ? "нечем заплатить" : ready].filter(Boolean).join(" · "), ready === false);
    });
    flush("Заклинания");
    c.features.filter(f => f.action === kind).forEach(f => {
      const u = usesInfo(d, f);
      row("feature:" + f.id, featureIcon(f), "#c9a0ff", f.name, u ? `${u.left}/${u.max}` : f.effect || "", !!u && u.left <= 0);
    });
    c.items.filter(it => it.action === kind && !(kind === "action" && d.weapons[it.id])).forEach(it => {
      const u = usesInfo(d, it);
      row("item:" + it.id, itemIcon(it), "#4fcf6a", it.name, u ? `${u.left}/${u.max}` : "", !!u && u.left <= 0);
    });
    flush(kind === "action" ? "Умения и предметы" : "Твоё");
    const mine = groups.length;
    const std = (STANDARD_ACTIONS[kind] || []).map(x => `<button class="am-row std" data-am-std="${x.key}" style="--c:${a.color}">${icon(x.icon)}<span><b>${esc(x.name)}${x.roll ? ` <i class="am-roll">${icon("d20")}</i>` : ""}</b><small>${esc(x.desc)}</small></span></button>`).join("");
    const empty = kind === "bonus" && !mine ? `<p class="am-empty">${icon("info")}Своих бонусных действий сейчас нет. Их дают только заклинания, умения или класс.</p>` : "";
    const hint = kind === "bonus" ? `<p class="hint am-hint">В BG3 прыжок и толчок бонусные действия. По настольным правилам прыжок входит в движение, а толчок заменяет атаку.</p>` : "";
    const m = openModal({
      title: a.name,
      cls: "action-menu",
      body: `<div class="am-head" style="--c:${a.color}"><span class="am-state ${used ? "used" : ""}">${actionMark(a.shape, a.color)}${used ? "Уже потрачено в этом ходу" : "Доступно в этом ходу"}</span><button class="btn sm ${used ? "gold" : "ghost"}" data-am-toggle>${used ? "Вернуть" : "Отметить потраченным"}</button></div>${empty}${groups.join("")}${std ? `<div class="am-group">Общие действия</div>${std}` : ""}${hint}`
    });
    m.body.addEventListener("click", e => {
      if (e.target.closest("[data-am-toggle]")) {
        S.ui.turn[kind] = !S.ui.turn[kind];
        saveTurn();
        return m.close();
      }
      const op = e.target.closest("[data-am-open]");
      if (op) {
        m.close();
        return openEntity(op.dataset.amOpen);
      }
      const st = e.target.closest("[data-am-std]");
      if (!st) return;
      const x = (STANDARD_ACTIONS[kind] || []).find(y => y.key === st.dataset.amStd);
      m.close();
      if (!x) return;
      markAction(kind);
      if (x.roll) return doRoll(x.roll);
      if (x.effect && !readOnly()) return addEffect(presetEffect(x.effect));
      if (x.key === "dash") return toast(`${icon("boot")} Рывок: ещё ${d.speed} фт перемещения в этом ходу`, { kind: "good" });
      toast(`${icon("check")} ${esc(x.name)}`, { timeout: 2000 });
    });
  }

  function movementMenu() {
    const info = movementInfo(S.c, S.d);
    openModal({
      title: `Движение · ${S.d.speed} фт`,
      cls: "action-menu",
      body: `${info.map(x => `<div class="am-row static" style="--c:#c9b48a">${icon(x.name.startsWith("Прыжок") ? "wings" : x.name === "Рывок" ? "bolt" : "boot")}<span><b>${esc(x.name)}: ${esc(x.value)}</b><small>${esc(x.desc)}</small></span></div>`).join("")}<p class="hint am-hint">Перемещение можно делить: пройти часть, ударить, пройти остаток. Трудная местность стоит вдвое.</p>`
    });
  }

  function attackProfile(kind, id) {
    const { c, d } = S;
    if (kind === "attack") {
      const at = findEntity(c, "attack", id);
      const s = d.attacks[id];
      return at && s ? { name: at.name, hit: s.hit, beams: s.beams, lines: [{ dice: s.dmg, type: s.type }], attack: s.kind === "attack", action: at.action || "action" } : null;
    }
    if (kind === "item") {
      const it = findEntity(c, "item", id);
      const w = it && it.atkAbility ? d.weapons[id] || weaponStats(c, d, it) : null;
      return w ? { name: it.name, hit: w.hit, beams: 1, lines: w.lines, attack: true, action: it.action || "action" } : null;
    }
    if (kind === "spell") {
      const sp = findEntity(c, "spell", id);
      if (!sp) return null;
      const cast = spellCast(c, d, sp, S.lastCast[id] || null, sp.cost === "item" ? S.lastExtra[id] || 0 : 0);
      return { name: sp.name, hit: spellAtk(d, sp), beams: cast.beams, lines: cast.lines.map(l => ({ dice: l.dice, type: l.type })), attack: !!sp.attack, action: sp.action || "action" };
    }
    return null;
  }

  function dmgButtons(kind, aid, beams, crits, missAll) {
    if (missAll) return "";
    const b = [];
    const attr = `data-hit-dmg="${esc(aid)}" data-kind="${kind}"`;
    if (beams > 1) {
      b.push(`<span class="r-btns-l">Урон по попавшим:</span>`);
      for (let h = Math.max(1, crits); h <= beams; h++) b.push(`<button class="btn sm ${h === beams ? "gold" : ""}" ${attr} data-n="${h}" data-c="${crits}">${h}</button>`);
    } else if (crits) b.push(`<button class="btn sm gold" ${attr} data-n="1" data-c="1">Урон (крит)</button>`);
    else b.push(`<button class="btn sm" ${attr} data-n="1" data-c="0">Урон</button>`);
    return b.join("");
  }

  function hitDamage(kind, aid, n, crits) {
    const p = attackProfile(kind, aid);
    if (!p) return;
    const extra = p.attack ? effectDamage(S.c) : [];
    const lines = [];
    for (let i = 0; i < n; i++) {
      const crit = i < crits;
      const tag = n > 1 ? `Луч ${i + 1}${crit ? " · крит" : ""}` : "";
      p.lines.forEach(l => lines.push({ dice: l.dice, type: l.type, crit, tag }));
      extra.forEach(x => lines.push({ dice: x.dice, type: x.type || (p.lines[0] || {}).type || "bludgeoning", crit, tag: (tag ? tag + " · " : "") + x.name }));
    }
    showDamage(`${p.name}: урон${n > 1 ? ` (${n} ${n < 5 ? "луча" : "лучей"})` : ""}`, lines, false);
  }

  function doRoll(spec) {
    const { c, d } = S;
    if (!c) return;
    const [k, a] = spec.split(":");
    if (k === "check") return d20(`Проверка: ${abName(a)}`, d.mods[a], "check", a);
    if (k === "save") return d20(`Спасбросок: ${abName(a)}`, d.saves[a], "save", a);
    if (k === "skill") {
      const s = SKILLS.find(x => x.key === a);
      return s && d20(s.name, d.skills[a], "check", s.ab);
    }
    if (k === "init") return d20("Инициатива", d.init, "check", "dex");
    if (k === "spellatk") return d20("Атака заклинанием", d.spell.atk, "attack");
    const AK = { attack: "attack", iattack: "item", sattack: "spell" };
    const DK = { dmg: "attack", idmg: "item", sdmg: "spell", crit: "attack" };
    if (AK[k]) {
      const p = attackProfile(AK[k], a);
      if (!p) return;
      const kind = AK[k];
      markAction(p.action);
      if (p.beams > 1) {
        const st = rollSetup("attack", "", takeMode());
        const rs = Array.from({ length: p.beams }, () => rollD20(p.hit, st.mode));
        const parts = rs.flatMap(r => addBonus(r, st));
        const crits = rs.filter(r => r.nat20).length;
        showBeams(`${p.name}: ${p.beams} ${p.beams < 5 ? "луча" : "лучей"}`, p.hit, rs, st.mode, { why: [...bonusLines(parts), ...st.why], extra: dmgButtons(kind, a, p.beams, crits, rs.every(r => r.nat1)) });
        consumeOnce(st);
        return;
      }
      return d20(`${p.name}: атака`, p.hit, "attack", "", r => dmgButtons(kind, a, 1, r.nat20 ? 1 : 0, r.nat1));
    }
    if (DK[k]) {
      const p = attackProfile(DK[k], a);
      if (!p) return;
      const n = k === "crit" ? 1 : p.beams;
      const lines = [];
      for (let i = 0; i < n; i++) p.lines.forEach(l => lines.push({ dice: l.dice, type: l.type, tag: n > 1 ? `Луч ${i + 1}` : "" }));
      return showDamage(`${p.name}: урон${n > 1 ? ` (${n} ${n < 5 ? "луча" : "лучей"})` : ""}`, lines, k === "crit");
    }
    if (k === "death") {
      if (c.hp.deathFail >= 3) return toast("Персонаж погиб: спасброски больше не нужны", { kind: "bad" });
      if (c.hp.stable || c.hp.deathSuccess >= 3) return toast("Персонаж стабилизирован", { kind: "good" });
      const st = rollSetup("death", "", takeMode());
      const r = rollD20(0, st.mode);
      const parts = addBonus(r, st);
      showD20("Спасбросок от смерти", 0, r, st.mode, { why: [...bonusLines(parts), ...st.why] });
      consumeOnce(st);
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

  function typeOptions() {
    const def = S.d.defenses;
    const mark = t => (def.immune.includes(t) ? " (иммунитет)" : def.resist.includes(t) && def.vuln.includes(t) ? " (сопр. и уязв.)" : def.resist.includes(t) ? " (сопротивление)" : def.vuln.includes(t) ? " (уязвимость)" : "");
    return [["", "Без типа"], ...DAMAGE_TYPES.map(t => [t, DAMAGE[t].name + mark(t)])];
  }

  function applyHp(action, value, type = "") {
    const raw = Math.abs(Math.floor(Number(value) || 0));
    if (!raw && action !== "set") return;
    let n = raw;
    let note = "";
    if (action === "dmg" && type) {
      const r = applyDefenses(raw, type, S.d.defenses);
      n = r.amount;
      const tn = (DAMAGE[type] || {}).name || type;
      if (r.kind === "immune") note = `${tn}: иммунитет, урон не получен`;
      else if (r.kind === "resist") note = `${tn}: сопротивление, ${raw} → ${n}`;
      else if (r.kind === "vuln") note = `${tn}: уязвимость, ${raw} → ${n}`;
      else if (r.kind === "both") note = `${tn}: сопротивление и уязвимость, ${raw} → ${n}`;
    }
    let concDc = 0;
    let concLost = "";
    const ok = mutate(c => {
      const hp = c.hp;
      hp.current = curHp(c);
      if (action === "dmg") {
        const fromTemp = Math.min(hp.temp || 0, n);
        hp.temp = (hp.temp || 0) - fromTemp;
        const rest = n - fromTemp;
        if (hp.current <= 0 && rest > 0) {
          if (hp.stable) hp.deathSuccess = 0;
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
      } else if (action === "heal") {
        setHp(c, hp.current + n);
      } else if (action === "temp") {
        hp.temp = Math.max(hp.temp || 0, n);
      } else if (action === "set") {
        setHp(c, n);
      }
    });
    if (ok === false) return;
    if (note) toast(`${icon("shield")} ${esc(note)}`, { kind: "info" });
    if (concLost) toast(`${icon("spiral")} Концентрация на «${esc(concLost)}» прервана: персонаж без сознания`, { kind: "bad" });
    if (concDc) toast(`${icon("spiral")} Концентрация на «${esc(S.c.concentration)}»: спасбросок Телосложения, СЛ ${concDc}. <button class="btn sm" data-conc-roll>Бросить</button>`, { timeout: 9000 });
  }

  async function hpDialog(mode) {
    const titles = { dmg: "Урон", heal: "Лечение", temp: "Временные хиты" };
    const withType = !mode || mode === "dmg";
    const res = await promptNumber(mode ? titles[mode] : "Хиты", {
      label: `Сейчас: ${curHp()} / ${S.d.hpMax}${S.c.hp.temp ? ` (+${S.c.hp.temp} врем.)` : ""}`,
      value: "",
      select: withType ? { label: "Тип урона", options: typeOptions(), value: S.ui.lastDmgType || "", hint: "Сопротивления и уязвимости учтутся сами" } : null,
      buttons: mode
        ? [{ label: titles[mode], value: mode, cls: mode === "dmg" ? "danger" : mode === "heal" ? "heal" : "gold" }]
        : [{ label: "Урон", value: "dmg", cls: "danger" }, { label: "Лечение", value: "heal", cls: "heal" }, { label: "Врем.", value: "temp", cls: "ghost" }, { label: "Задать", value: "set", cls: "ghost" }]
    });
    if (!res || S.disposed) return;
    if (withType) S.ui.lastDmgType = res.type;
    applyHp(res.action, res.value, res.action === "dmg" ? res.type : "");
  }

  function spendHitDie() {
    const { c, d } = S;
    if (readOnly()) return;
    if (d.hitDice.left <= 0) return toast("Кости хитов закончились");
    if (curHp() <= 0) return toast("Без сознания нельзя тратить кости хитов", { kind: "bad" });
    const r = rollDice(`1d${maxDie(c.hitDie)}`);
    const heal = Math.max(0, r.total + d.mods.con);
    mutate(ch => {
      ch.hp.hitDiceUsed = (Number(ch.hp.hitDiceUsed) || 0) + 1;
      setHp(ch, curHp(ch) + heal);
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
        c.effects = (c.effects || []).filter(e => e.rounds == null && e.until !== "short");
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
      c.effects = [];
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

  function castFromItem(sp, chosen) {
    markAction(sp.action || "action");
    const info = itemSpellInfo(S.c, S.d, sp);
    if (!info) return toast("Выбери в заклинании предмет с зарядами (кнопка «Изменить»)", { kind: "bad" });
    if (!info.uses) return toast(`У предмета «${esc(info.item.name)}» не указаны заряды`, { kind: "bad" });
    const n = Math.max(info.min, Math.min(info.max, chosen || info.min));
    if (info.left < n) return toast(`Не хватает зарядов: нужно ${n}, осталось ${info.left}`, { kind: "bad" });
    S.lastExtra[sp.id] = n - info.min;
    let concNote = "";
    let emptied = false;
    mutate(c => {
      const it = findEntity(c, "item", info.item.id);
      const e = findEntity(c, "spell", sp.id);
      if (!it || !e) return;
      it.used = Math.min(info.uses.max, (Number(it.used) || 0) + n);
      emptied = it.used >= info.uses.max;
      if (e.concentration) {
        if (c.concentration && c.concentration !== e.name) concNote = ` Концентрация на «${c.concentration}» прервана.`;
        c.concentration = e.name;
      }
    });
    offerEffect(sp);
    toast(`${icon("wand")} <b>${esc(sp.name)}</b>: ${n} ${chargeWord(n)} из «${esc(info.item.name)}», осталось ${Math.max(0, info.left - n)}.${esc(concNote)}`, { kind: "info" });
    const brk = Number(info.item.breakOn);
    if (emptied && brk) {
      const r = rollDice("1d20");
      const broke = r.total === brk;
      toast(`${icon("d20")} Последний заряд, d20: <b>${r.total}</b>. ${broke ? `«${esc(info.item.name)}» разрушается!` : "Предмет уцелел."}`, { kind: broke ? "bad" : "good", timeout: 9000 });
    }
  }

  function castSpell(sp, chosenLevel) {
    const { d } = S;
    if (readOnly()) return;
    if (sp.cost === "item") return castFromItem(sp, chosenLevel);
    markAction(sp.action || "action");
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
    offerEffect(sp);
  }

  function useEntity(kind, e, delta = 1) {
    if (!e || readOnly()) return;
    const u = usesInfo(S.d, e);
    const pactCost = kind === "feature" && e.slot === "pact";
    if (!u && !pactCost) return;
    if (delta > 0 && u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    if (pactCost && delta > 0 && S.d.pact && !pactLeft()) return toast("Нет свободных ячеек договора", { kind: "bad" });
    if (delta > 0) markAction(e.action);
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
    if (readOnly()) {
      if (kind === "spell") {
        if (e.attack) b.push(`<button class="btn" data-x="spell-atk">${icon("d20")}Атака ${fmt(d.spell.atk)}</button>`);
        if ((e.damage || []).length) b.push(`<button class="btn" data-x="spell-dmg">${icon("force")}Бросить кубы</button>`);
      }
      if ((kind === "feature" || kind === "item") && (e.damage || []).length) b.push(`<button class="btn" data-x="${kind === "item" ? "item-dmg" : "feat-dmg"}">${icon("d20")}Бросить кубы</button>`);
      if (kind === "attack") {
        const s = d.attacks[e.id];
        if (s.kind === "attack") b.push(`<button class="btn gold" data-x="atk">${icon("d20")}Атака ${fmt(s.hit)}${s.beams > 1 ? ` ×${s.beams}` : ""}</button>`);
        b.push(`<button class="btn" data-x="dmg">${icon("swords")}Урон</button>`);
        b.push(`<button class="btn ghost" data-x="crit">Крит</button>`);
      }
      return b.join("");
    }
    if (kind === "spell" && e.cost === "item") {
      const info = itemSpellInfo(S.c, d, e);
      if (!info || !info.uses) b.push(`<button class="btn" disabled>Не выбран предмет с зарядами</button>`);
      else if (info.left < info.min) b.push(`<button class="btn" disabled>Не хватает зарядов (${info.left})</button>`);
      else for (let n = info.min; n <= Math.min(info.max, info.left); n++) b.push(`<button class="btn gold" data-x="cast" data-lvl="${n}">${icon("wand")}${n} ${chargeWord(n)}</button>`);
    }
    if (kind === "spell" && e.cost !== "item") {
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
      if (e.cost === "uses" && usesInfo(d, e)) b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть использование</button>`);
    }
    if (kind === "spell") {
      if (e.attack) b.push(`<button class="btn" data-x="spell-atk">${icon("d20")}Атака ${fmt(spellAtk(d, e))}</button>`);
      if (e.cost === "item") b.push(`<button class="btn ghost" data-x="to-own">${icon("book")}В мои заклинания</button>`);
      else if (S.c.items.some(it => usesInfo(d, it))) b.push(`<button class="btn ghost" data-x="to-item">${icon("wand")}В предмет</button>`);
      if ((e.damage || []).length) {
        const lv = S.lastCast[e.id];
        const ex = e.cost === "item" ? S.lastExtra[e.id] || 0 : 0;
        b.push(`<button class="btn" data-x="spell-dmg">${icon("force")}Бросить кубы${ex ? ` (+${ex} ${chargeWord(ex)})` : lv && lv !== Number(e.level) && e.cost !== "item" ? ` (${lv} круг)` : ""}</button>`);
        if (e.attack) b.push(`<button class="btn ghost" data-x="spell-crit">Крит</button>`);
      }
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
      const w = e.atkAbility ? weaponStats(S.c, d, e) : null;
      if (w) {
        b.push(`<button class="btn gold" data-x="w-atk">${icon("d20")}Атака ${fmt(w.hit)}</button>`);
        b.push(`<button class="btn" data-x="w-dmg">${icon("swords")}Урон</button>`);
        b.push(`<button class="btn ghost" data-x="w-crit">Крит</button>`);
      } else if ((e.damage || []).length) b.push(`<button class="btn" data-x="item-dmg">${icon("d20")}Бросить кубы</button>`);
      S.c.spells.filter(sp => sp.cost === "item" && sp.itemId === e.id).forEach(sp => b.push(`<button class="btn" data-x="open-spell" data-sid="${esc(sp.id)}">${icon("sparkle")}${esc(sp.name)}</button>`));
      if (u) b.push(`<button class="btn ghost" data-x="item-add-spell">${icon("plus")}Добавить заклинание</button>`);
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
    return `${cardFor(S.c, S.d, ref, { slotLevel: kind === "spell" ? S.lastCast[eid] : null, extra: kind === "spell" ? S.lastExtra[eid] || 0 : 0 })}<div class="entity-actions">${entityButtons(kind, e)}</div>`;
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
      if (x === "spell-atk") return d20(`${e.name}: атака`, spellAtk(S.d, e), "attack");
      if (x === "to-item") {
        m.close();
        return moveSpellToItem(e);
      }
      if (x === "to-own") return mutate(c => {
        const sp = findEntity(c, "spell", eid);
        if (sp) Object.assign(sp, { cost: Number(sp.level) > 0 ? "slot" : "free", itemId: "" });
      });
      if (x === "item-add-spell") {
        m.close();
        return openLibrary(e);
      }
      if (x === "open-spell") {
        m.close();
        return openEntity("spell:" + btn.dataset.sid);
      }
      if (x === "spell-dmg" || x === "spell-crit") {
        const cast = spellCast(S.c, S.d, e, S.lastCast[e.id] || null, e.cost === "item" ? S.lastExtra[e.id] || 0 : 0);
        const lines = [];
        const extra = e.attack ? effectDamage(S.c) : [];
        for (let i = 0; i < cast.beams; i++) {
          lines.push(...cast.lines);
          extra.forEach(x => lines.push({ dice: x.dice, type: x.type || (cast.lines[0] || {}).type || "force", tag: x.name }));
        }
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
      if (x === "w-atk") return doRoll("iattack:" + eid);
      if (x === "w-dmg") return doRoll("idmg:" + eid);
      if (x === "w-crit") {
        const p = attackProfile("item", eid);
        return p && showDamage(`${p.name}: урон`, p.lines, true);
      }
      if (x === "atk") return doRoll("attack:" + eid);
      if (x === "dmg") return doRoll("dmg:" + eid);
      if (x === "crit") return doRoll("crit:" + eid);
    });
  }

  function moveSpellToItem(sp) {
    const wandish = it => (it.type === "wand" || /палочк|жезл|посох/i.test(it.name || "") ? 0 : 1);
    const items = S.c.items.filter(it => usesInfo(S.d, it)).sort((a, b) => wandish(a) - wandish(b));
    const m = openModal({
      title: `«${sp.name}» в предмет`,
      cls: "small",
      body: `<p class="hint">Заклинание будет тратить заряды выбранного предмета. Числа можно поменять потом кнопкой «Изменить».</p><div class="menu-list">${items.map(it => `<button class="menu-item" data-it="${esc(it.id)}">${icon(itemIcon(it))}<span>${esc(it.name || "Без названия")} · ${usesInfo(S.d, it).left}/${usesInfo(S.d, it).max}</span></button>`).join("")}</div>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-it]");
      if (!b) return;
      const it = items.find(x => x.id === b.dataset.it);
      m.close();
      if (!it) return;
      mutate(c => {
        const x = findEntity(c, "spell", sp.id);
        if (x) Object.assign(x, { cost: "item", itemId: it.id, scaling: "none", ...itemCharges(x) });
        c.spells = normalize(c).spells;
      });
      toast(`${icon("wand")} «${esc(sp.name)}» теперь тратит заряды «${esc(it.name)}»`, { kind: "good" });
    });
  }

  async function gearTable() {
    const { GEAR, gearToItem } = await import("./gear.js");
    const prof = String(S.c.proficiencies.weapons || "").toLowerCase();
    const m = openModal({
      title: "Оружие и доспехи",
      wide: true,
      cls: "library",
      body: `<div class="lib-tools"><label class="search-box">${icon("search")}<input type="search" data-q placeholder="Кинжал, рапира, кольчуга..." aria-label="Поиск"></label></div><div class="lib-list" data-list></div><p class="hint small lib-src">Базовое оружие и доспехи из SRD 5.1 (CC-BY-4.0). После добавления предмет можно изменить: сделать магическим, переименовать, добавить свойства.</p>`
    });
    const listEl = m.body.querySelector("[data-list]");
    const draw = q => {
      const n = q.trim().toLowerCase().replace(/ё/g, "е");
      let group = "";
      listEl.innerHTML = GEAR.map((g, i) => ({ g, i })).filter(({ g }) => !n || g.name.toLowerCase().replace(/ё/g, "е").includes(n) || g.nameEn.toLowerCase().includes(n)).map(({ g, i }) => {
        const head = g.group !== group ? `<div class="atk-group">${esc((group = g.group))}</div>` : "";
        const stat = g.kind === "weapon" ? `${g.dice} ${(DAMAGE[g.type] || {}).name.toLowerCase()}` : g.kind === "armor" ? `КД ${g.base}${g.dex === "0" ? "" : g.dex === "2" ? " + Лов (макс. 2)" : " + Лов"}` : "+2 КД";
        return `${head}<button class="lib-head gear-row" data-g="${i}"><span class="lib-names"><b>${esc(g.name)}</b><small>${esc(g.nameEn)} · ${esc(stat)}${g.props ? " · " + esc(g.props) : ""} · ${esc(g.value)}</small></span><span class="btn ghost sm">${icon("plus")}</span></button>`;
      }).join("") || `<p class="empty">Ничего не нашлось</p>`;
    };
    draw("");
    m.body.querySelector("[data-q]").addEventListener("input", e => draw(e.target.value));
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-g]");
      if (!b) return;
      const g = GEAR[Number(b.dataset.g)];
      const it = gearToItem(g, uid);
      if (g.kind === "weapon") it.atkProf = g.group.startsWith("Простое") ? /прост/.test(prof) : /воинск/.test(prof) || prof.includes(g.name.toLowerCase());
      const ok = mutate(c => {
        c.items.push(it);
        c.items = normalize(c).items;
      });
      if (ok !== false) toast(`${icon("check")} «${esc(g.name)}» в снаряжении. Надень, чтобы он считался в бою и в КД.`, { kind: "good", timeout: 3200 });
    });
  }

  function addEffect(ef) {
    if (!ef) return;
    mutate(c => {
      c.effects = [...(c.effects || []).filter(x => !(ef.preset && x.preset === ef.preset)), ef];
    });
    toast(`${icon("sparkle")} Эффект «${esc(ef.name)}» добавлен`, { kind: "good", timeout: 2400 });
  }

  function effectPicker() {
    const m = openModal({
      title: "Добавить эффект",
      cls: "small",
      body: `<div class="menu-list">${Object.entries(EFFECT_PRESETS).map(([k, p]) => `<button class="menu-item eff-pick" data-pre="${k}">${icon("sparkle")}<span><b>${esc(p.name)}</b><small>${esc(p.note || "")}</small></span></button>`).join("")}<button class="menu-item eff-pick" data-pre="">${icon("edit")}<span><b>Свой эффект</b><small>Любые бонусы, помехи и длительность</small></span></button></div>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-pre]");
      if (!b) return;
      m.close();
      if (!b.dataset.pre) return editEffect(null);
      addEffect(presetEffect(b.dataset.pre));
    });
  }

  function editEffect(ef) {
    const value = ef ? clone(ef) : cleanEffect({ id: "ef-" + uid(), name: "", rounds: 10 });
    openForm({
      title: ef ? "Изменить эффект" : "Свой эффект",
      fields: effectFields(),
      value,
      onSave: val => {
        if (!String(val.name || "").trim()) {
          toast("Нужно название", { kind: "bad" });
          return false;
        }
        const clean = cleanEffect({ ...val, id: value.id, concName: val.mine ? value.concName || S.c.concentration : "" });
        mutate(c => {
          const list = c.effects || [];
          const i = list.findIndex(x => x.id === clean.id);
          if (i >= 0) list[i] = clean;
          else list.push(clean);
          c.effects = list;
        });
      },
      onDelete: ef ? () => mutate(c => { c.effects = c.effects.filter(x => x.id !== ef.id); }) : null
    });
  }

  function offerEffect(sp) {
    const key = Object.keys(EFFECT_PRESETS).find(k => EFFECT_PRESETS[k].name.toLowerCase() === String(sp.name || "").trim().toLowerCase());
    if (!key) return;
    const mine = !!sp.concentration;
    if (["hex", "huntersMark", "shield"].includes(key)) return addEffect(presetEffect(key, { mine, concName: mine ? sp.name : "" }));
    toast(`${icon("sparkle")} «${esc(sp.name)}» на тебе? <button class="btn sm" data-add-effect="${key}" data-mine="${mine ? 1 : 0}" data-conc="${esc(sp.name)}">Добавить эффект себе</button>`, { timeout: 8000 });
  }

  async function openLibrary(item) {
    if (readOnly()) return toast(`${icon("eye")} ${esc(roText())}`, { kind: "bad" });
    const { openSpellLibrary } = await import("./library.js");
    return openSpellLibrary({
      item,
      get: () => ({ c: S.c, d: S.d }),
      onAdd: sp => mutate(ch => {
        ch.spells.push(sp);
        ch.spells = normalize(ch).spells;
      })
    });
  }

  function changedKeys(before, after) {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    return [...keys].filter(k => JSON.stringify(before ? before[k] : undefined) !== JSON.stringify(after ? after[k] : undefined));
  }

  function editEntity(kind, e, makeArg) {
    const key = LIST_KEY[kind];
    const initial = e ? clone(e) : null;
    openEditor(kind, e, {
      makeArg,
      items: S.c.items,
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
          if (i >= 0 && initial) {
            const next = { ...list[i] };
            for (const k of changedKeys(initial, val)) next[k] = clone(val[k] === undefined ? null : val[k]);
            list[i] = next;
          } else if (i >= 0) list[i] = val;
          else list.push(val);
          const n = normalize(c);
          c[key] = n[key];
        });
      },
      onDelete: () => mutate(c => { c[key] = c[key].filter(x => x.id !== e.id); })
    });
  }

  function editNote(section, n) {
    const value = n || { ...EDITORS.note.make(), tags: S.ui.noteTag || "" };
    const initial = clone(value);
    openForm({
      title: n ? "Изменить запись" : "Новая запись",
      fields: noteFields(section),
      value,
      onSave: val => mutate(c => {
        const list = c.notes[section];
        const i = list.findIndex(x => x.id === val.id);
        if (i >= 0) {
          const next = { ...list[i] };
          for (const k of changedKeys(initial, val)) next[k] = val[k];
          list[i] = next;
        } else list.unshift(val);
      }),
      onDelete: n ? () => mutate(c => { c.notes[section] = c.notes[section].filter(x => x.id !== n.id); }) : null
    });
  }

  function editInfo() {
    const fields = infoFields().filter(f => f.type !== "heading");
    const initial = clone(S.c);
    openForm({
      title: "Основное",
      fields: infoFields(),
      value: S.c,
      onSave: val => {
        mutate(c => {
          for (const f of fields) {
            const v = getPath(val, f.key);
            if (JSON.stringify(v) !== JSON.stringify(getPath(initial, f.key))) setPath(c, f.key, v);
          }
          if (!String(c.name || "").trim()) c.name = "Без имени";
          const n = normalize(c);
          for (const k of ["info", "hp", "speed", "initBonus", "hitDie", "casterType", "spellAbility", "damageSwap", "defenses", "resistances"]) c[k] = n[k];
          clampHp(c);
        }, { render: false });
        renderAll(true);
      }
    });
  }

  function editArmor() {
    const initial = clone(S.c.armor);
    openForm({
      title: "Класс доспеха",
      fields: armorFields(),
      value: S.c,
      onSave: val => mutate(c => {
        for (const k of changedKeys(initial, val.armor)) c.armor[k] = val.armor[k];
        c.armor = normalize(c).armor;
      })
    });
  }

  function portraitDialog() {
    const m = openModal({
      title: "Портрет",
      cls: "small",
      body: `<div class="portrait-big">${S.c.portrait ? `<img src="${esc(S.c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER}</div>
        <div class="form-actions">${S.c.portrait ? `<button class="btn danger" data-rm>${icon("trash")}Убрать</button><span class="spacer"></span><button class="btn" data-crop>${icon("target")}Изменить кадр</button>` : `<span class="spacer"></span>`}<button class="btn gold" data-up>${icon("upload")}Загрузить картинку</button></div>
        <p class="hint">После выбора картинки можно подвинуть и приблизить нужную часть. Портрет сохранится вместе с персонажем.</p>`
    });
    const apply = data => {
      if (!data || S.disposed) return;
      mutate(c => { c.portrait = data; }, { render: false });
      m.close();
      renderAll(true);
    };
    m.body.querySelector("[data-up]").onclick = async () => {
      const f = await pickFile("image/*");
      if (!f) return;
      try {
        apply(await cropImage(f));
      } catch {
        toast("Не получилось прочитать картинку", { kind: "bad" });
      }
    };
    const crop = m.body.querySelector("[data-crop]");
    if (crop) crop.onclick = async () => {
      try {
        apply(await cropImage(S.c.portrait));
      } catch {
        toast("Не получилось открыть картинку", { kind: "bad" });
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
    if (readOnly()) return;
    data = { ...data, ownerUid: S.c.ownerUid, ownerName: S.c.ownerName };
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
    const REASONS = { "Перед восстановлением": "Восстановление версии", "Перед импортом": "Загрузка из файла" };
    const rows = list.map((h, i) => {
      const before = normalize(h.data || {});
      const after = i === 0 ? S.c : normalize(list[i - 1].data || {});
      const changes = describeChanges(before, after);
      const shown = changes.slice(0, 8);
      const more = changes.length - shown.length;
      const by = h.by;
      const reason = REASONS[h.reason] || "";
      return `<article class="hist-item">
        <header class="hist-head">
          <span class="hist-dev">${icon(KIND_ICONS[by && by.kind] || "info")}</span>
          <div class="hist-who"><b>${esc(describeWho(by))}</b>${isMe(by) ? `<span class="hist-tag me">это устройство</span>` : ""}${reason ? `<span class="hist-tag">${esc(reason)}</span>` : ""}<small>${dateTime(h.at, true)} · ${timeAgo(h.at)}${i === 0 ? " · последние правки" : ""}</small></div>
        </header>
        ${changes.length ? `<ul class="hist-changes">${shown.map(t => `<li>${esc(t)}</li>`).join("")}${more > 0 ? `<li class="dim">и ещё ${more}</li>` : ""}</ul>` : `<p class="hist-none">Видимых изменений нет</p>`}
        <div class="hist-actions">${S.access.isAdmin && by && by.uid && by.uid !== currentUid() ? `<button class="btn sm danger" data-ban-i="${i}">${icon("close")}Запретить аккаунт</button>` : ""}<button class="btn sm ghost" data-i="${i}">${icon("history")}Вернуть как было до этих правок</button></div>
      </article>`;
    }).join("");
    m.body.innerHTML = `<p class="hint">Каждая запись: кто правил, с какого устройства и что поменял. Кнопка возвращает лист к состоянию до этих правок, и это тоже можно откатить. Портрет не меняется.</p><div class="hist-list">${rows}</div>`;
    m.body.addEventListener("click", async e => {
      const ban = e.target.closest("[data-ban-i]");
      if (ban) return banAccount(list[Number(ban.dataset.banI)].by);
      const b = e.target.closest("[data-i]");
      if (!b || b.disabled) return;
      const h = list[Number(b.dataset.i)];
      if (!(await confirmDialog(`Вернуть лист к состоянию на ${dateTime(h.at, true)}, до этих правок?`, { ok: "Вернуть" }))) return;
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
      const nid = newCharId();
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
    const r = rights();
    const a = S.access;
    const cloud = getMode() === "cloud";
    const manage = r.role === "owner" || r.role === "admin" || r.role === "open";
    const items = [
      ["short-rest", "campfire", "Короткий отдых"],
      ["long-rest", "moon", "Длинный отдых"],
      ["roll-mode", "d20", "Режим броска: " + (S.rollMode === "adv" ? "преимущество" : S.rollMode === "dis" ? "помеха" : "обычный")],
      ["dice", "d20", "Бросить кубы"],
      ["roll-log", "scroll", "Журнал бросков"],
      ["fx-sound", "bell", "Звуки бросков: " + (fxSettings().sound ? "включены" : "выключены")],
      ["fx-anim", "d20", "Анимация кубов: " + (fxSettings().anim ? "включена" : "выключена")],
      ...(r.canEdit ? [["history", "history", "История изменений"]] : []),
      ["share", "link", manage && cloud && a.enforced ? "Поделиться и доступ" : "Поделиться"],
      ["print", "scroll", "Печать и PDF"],
      ["export", "download", "Скачать файл персонажа"],
      ...(r.canEdit ? [["import", "upload", "Заменить из файла"]] : []),
      ...(!cloud || a.canCreate ? [["duplicate", "copy", r.canEdit ? "Сделать копию" : "Копия себе"]] : []),
      ...(manage ? [S.c.archived ? ["unarchive", "archive", "Вернуть из архива"] : ["archive", "archive", "Убрать в архив"]] : []),
      ...(cloud && a.enforced && manage ? [["delete", "trash", "Удалить навсегда"]] : []),
      ...(a.isAdmin ? [["accounts", "people", "Аккаунты и запреты"]] : []),
      ...(cloud && a.enforced && !a.signedIn ? [["signin", "user", "Войти через Google"]] : [])
    ];
    const roles = { owner: "Ты владелец этого листа.", admin: "Ты владелец сайта и можешь править любой лист.", editor: "Тебя пригласили редактором этого листа.", viewer: "Ты смотришь чужой лист.", guest: "Ты не вошёл: лист только для просмотра.", banned: "Твой аккаунт запрещён.", orphan: "У листа нет владельца.", open: cloud ? "Пока правила базы не обновлены, править может любой, у кого есть ссылка." : "Облако недоступно: данные хранятся только в этом браузере." };
    const st = lastStatus || {};
    const m = openModal({
      title: "Меню",
      cls: "small",
      body: `<div class="menu-list">${items.map(([a, ic, l]) => `<button class="menu-item" data-m="${a}">${icon(ic)}<span>${l}</span></button>`).join("")}</div><p class="hint">${esc(roles[r.role] || "")}${st.error ? `<br>${esc(st.error)}` : ""}</p>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      m.close();
      runAction(b.dataset.m, $("[data-act=roll-mode]", root));
    });
  }

  const MUTATING = new Set(["short-rest", "long-rest", "hp", "hp-quick", "inspiration", "spend-hd", "death", "toggle-save", "cycle-skill", "edit-info", "edit-armor", "portrait", "add-attack", "add-spell", "spell-library", "toggle-order", "add-effect", "dedupe-attacks", "gear-table", "edit-effect", "remove-effect", "next-round", "end-combat", "add-feature", "add-item", "add-note", "edit-note", "pact-pip", "slot-pip", "use-pip", "toggle-cond", "exhaustion", "drop-conc", "import", "archive", "unarchive", "delete"]);

  async function runAction(a, el) {
    const { c } = S;
    if (!c || S.disposed) return;
    if (MUTATING.has(a) && readOnly()) {
      toast(`${icon("eye")} ${esc(roText())}`, { kind: "bad" });
      return;
    }
    switch (a) {
      case "short-rest": return shortRest();
      case "long-rest": return longRest();
      case "roll-log": return rollLogDialog();
      case "dice": return openDiceRoller();
      case "print": {
        const { openPrint } = await import("./print.js");
        return openPrint(c, S.d);
      }
      case "fx-sound": {
        const v = setFx("sound", !fxSettings().sound);
        if (v.sound) playSound("crit");
        return toast(v.sound ? "Звуки бросков включены" : "Звуки бросков выключены", { timeout: 1800 });
      }
      case "fx-anim": {
        const v = setFx("anim", !fxSettings().anim);
        return toast(v.anim ? "Анимация кубов включена" : "Анимация кубов выключена", { timeout: 1800 });
      }
      case "history": return historyDialog();
      case "accounts": return openAccounts();
      case "share": return openShare({ ...c, id });
      case "signin":
        try {
          await signIn();
        } catch (err) {
          toast(esc(err.message), { kind: "bad", timeout: 7000 });
        }
        return;
      case "delete": {
        if (!(await confirmDialog(`Удалить «${c.name}» навсегда вместе с историей? Вернуть будет нельзя. Если сомневаешься, лучше убери в архив или скачай файл.`, { ok: "Удалить навсегда", danger: true }))) return;
        try {
          clearTimeout(S.saveTimer);
          S.saveTimer = null;
          S.base = clone(S.c);
          await deleteCharacter(id);
          toast("Персонаж удалён", { kind: "good" });
          return navigate("#/");
        } catch {
          return toast("Не получилось удалить: проверь права", { kind: "bad" });
        }
      }
      case "export": {
        const name = (c.name || "character").replace(/[^\p{L}\p{N}]+/gu, "_");
        const data = clone(c);
        delete data.id;
        return download(`${name}.json`, JSON.stringify({ format: "dnd-sheet", version: 1, character: data }, null, 2));
      }
      case "import": return importDialog();
      case "duplicate": {
        if (getMode() === "cloud" && !S.access.canCreate) return toast(S.access.signedIn ? "Твоему аккаунту нельзя создавать персонажей" : "Чтобы сделать копию себе, войди через Google", { kind: "bad" });
        const nid = newCharId();
        const copy = clone(c);
        delete copy.id;
        delete copy.ownerUid;
        delete copy.ownerName;
        try {
          await createChar(nid, { ...copy, name: c.name.slice(0, 110) + " (копия)", archived: false });
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
      case "hp-quick": {
        const n = Number(el.dataset.n) || 0;
        return applyHp(n < 0 ? "dmg" : "heal", Math.abs(n));
      }
      case "inspiration": {
        if (c.inspiration) {
          mutate(ch => { ch.inspiration = false; });
          S.rollMode = "adv";
          const b = $("[data-act=roll-mode]", root);
          if (b) b.innerHTML = rollModeLabel();
          return toast(`${icon("sun")} Вдохновение потрачено: следующий бросок d20 с преимуществом`, { kind: "good" });
        }
        mutate(ch => { ch.inspiration = true; });
        return toast(`${icon("sun")} Вдохновение получено`, { kind: "good", timeout: 2000 });
      }
      case "toggle-note": {
        const sec = el.dataset.sec;
        const n = (c.notes[sec] || []).find(x => x.id === el.dataset.id);
        if (!n) return;
        const local = S.ui.noteOpen;
        const shut = n.id in local ? !local[n.id] : !!n.collapsed;
        if (readOnly()) {
          local[n.id] = shut;
          return renderTab();
        }
        delete local[n.id];
        return mutate(ch => {
          const x = (ch.notes[sec] || []).find(y => y.id === n.id);
          if (x) x.collapsed = !shut;
        });
      }
      case "fold-notes": {
        const sec = el.dataset.sec;
        const v = el.dataset.v === "1";
        const list = c.notes[sec] || [];
        if (readOnly() || list.every(x => !!x.collapsed === v)) {
          list.forEach(x => (S.ui.noteOpen[x.id] = !v));
          return renderTab();
        }
        list.forEach(x => delete S.ui.noteOpen[x.id]);
        return mutate(ch => (ch.notes[sec] || []).forEach(x => { x.collapsed = v; }));
      }
      case "spell-filter": S.ui.spellFilter = el.dataset.k; return renderTab();
      case "gear-table": return gearTable();
      case "dedupe-attacks": {
        const ids = combatSources(c, S.d).dupes.map(x => x.id);
        if (!ids.length) return;
        if (!(await confirmDialog(`Удалить ${ids.length} ${ids.length === 1 ? "запись" : ids.length < 5 ? "записи" : "записей"} атак, которые повторяют заклинания или оружие? Старая версия останется в истории.`, { ok: "Удалить" }))) return;
        return mutate(ch => { ch.attacks = ch.attacks.filter(x => !ids.includes(x.id)); });
      }
      case "turn-open": return el.dataset.k === "move" ? movementMenu() : actionMenu(el.dataset.k);
      case "turn-toggle":
        S.ui.turn[el.dataset.k] = !S.ui.turn[el.dataset.k];
        return saveTurn();
      case "new-turn": {
        S.ui.turn = { action: false, bonus: false, reaction: false };
        saveTurn();
        const timed = (c.effects || []).some(x => x.rounds != null);
        if (timed && !readOnly()) return runAction("next-round", el);
        return toast(`${icon("history")} Новый ход`, { timeout: 1500 });
      }
      case "add-effect": return effectPicker();
      case "edit-effect": {
        const ef = (c.effects || []).find(x => x.id === el.dataset.id);
        return ef && editEffect(ef);
      }
      case "remove-effect": return mutate(ch => { ch.effects = ch.effects.filter(x => x.id !== el.dataset.id); });
      case "next-round": {
        const ended = [];
        mutate(ch => {
          ch.effects = ch.effects.map(x => (x.rounds == null ? x : { ...x, rounds: x.rounds - 1 })).filter(x => {
            if (x.rounds != null && x.rounds <= 0) {
              ended.push(x.name);
              return false;
            }
            return true;
          });
        });
        return toast(`${icon("hourglass")} Следующий раунд${ended.length ? `. Закончилось: ${esc(ended.join(", "))}` : ""}`, { timeout: 2400 });
      }
      case "end-combat": return mutate(ch => { ch.effects = ch.effects.filter(x => x.rounds == null || x.rounds > 10); });
      case "toggle-order":
        S.ui.ordering = !S.ui.ordering;
        if (S.ui.ordering) {
          S.ui.notesQ = "";
          S.ui.spellQ = "";
          S.ui.spellFilter = "all";
          S.ui.noteTag = "";
          S.ui.peopleAtt = "all";
          S.ui.invFilter = "all";
        }
        return renderTab();
      case "spend-hd": return spendHitDie();
      case "death": {
        const k = el.dataset.k;
        const i = Number(el.dataset.i);
        let stabilized = false;
        mutate(ch => {
          ch.hp[k] = ch.hp[k] > i ? i : i + 1;
          if (ch.hp.deathSuccess >= 3) {
            ch.hp.stable = true;
            ch.hp.deathSuccess = 0;
            ch.hp.deathFail = 0;
            stabilized = true;
          } else if (k === "deathSuccess") ch.hp.stable = false;
        });
        if (stabilized) toast("Три успеха: персонаж стабилизирован", { kind: "good" });
        return;
      }
      case "toggle-save": return mutate(ch => { ch.saves[el.dataset.k] = !ch.saves[el.dataset.k]; });
      case "cycle-skill": return mutate(ch => { ch.skills[el.dataset.k] = ((Number(ch.skills[el.dataset.k]) || 0) + 1) % 3; });
      case "edit-info": return editInfo();
      case "edit-armor": return editArmor();
      case "portrait": return portraitDialog();
      case "add-attack": return editEntity("attack", null);
      case "add-spell": return editEntity("spell", null);
      case "spell-library": return openLibrary(null);
      case "add-feature": return editEntity("feature", null, el.dataset.cat);
      case "add-item": return editEntity("item", null, S.ui.invFilter && !["all", "equipped", "other"].includes(S.ui.invFilter) ? S.ui.invFilter : "gear");
      case "add-note": return editNote(el.dataset.sec, null);
      case "edit-note": {
        const n = (c.notes[el.dataset.sec] || []).find(x => x.id === el.dataset.id);
        return n && editNote(el.dataset.sec, n);
      }
      case "notes-section":
        S.ui.notesSection = el.dataset.k;
        S.ui.noteTag = "";
        S.ui.notesQ = "";
        return renderTab();
      case "note-tag":
        S.ui.noteTag = S.ui.noteTag === el.dataset.k ? "" : el.dataset.k;
        if (S.ui.notesQ) {
          const sec = NOTE_KEYS.find(k => (c.notes[k] || []).some(n => noteTags(n).includes(el.dataset.k)));
          if (sec) S.ui.notesSection = sec;
          S.ui.notesQ = "";
        }
        return renderTab();
      case "people-att": S.ui.peopleAtt = el.dataset.k; return renderTab();
      case "inv-filter": S.ui.invFilter = el.dataset.k; return renderTab();
      case "inv-eq-first":
        S.ui.invEqFirst = S.ui.invEqFirst === false;
        saveUiPrefs(S.ui);
        return renderTab();
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
      case "exhaustion": return mutate(ch => {
        ch.exhaustion = Number(el.dataset.i);
        clampHp(ch);
      });
      case "drop-conc": return mutate(ch => { ch.concentration = ""; });
    }
  }

  const onClick = e => {
    const si = e.target.closest("[data-act=signin]");
    if (si && root.contains(si) && !S.c) {
      e.preventDefault();
      signIn().catch(err => toast(esc(err.message), { kind: "bad", timeout: 7000 }));
      return;
    }
    if (!S.c) return;
    const tab = e.target.closest("[data-tab]");
    if (tab && root.contains(tab) && tab.classList.contains("tab")) {
      if (tab.dataset.tab === S.tab) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      S.scroll[S.tab] = window.scrollY;
      S.tab = tab.dataset.tab;
      S.ui.ordering = false;
      hideHoverCard();
      history.replaceState(history.state, "", `#/c/${id}/${S.tab}`);
      renderTab();
      window.scrollTo({ top: S.scroll[S.tab] || 0 });
      return;
    }
    if (S.ui.ordering && e.target.closest("[data-reorder]") && !e.target.closest("[data-act=toggle-order]")) {
      e.preventDefault();
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
    const ae = e.target.closest("#toasts [data-add-effect]");
    if (ae) addEffect(presetEffect(ae.dataset.addEffect, { mine: ae.dataset.mine === "1", concName: ae.dataset.mine === "1" ? ae.dataset.conc : "" }));
    const hit = e.target.closest("#toasts [data-hit-dmg]");
    if (hit) hitDamage(hit.dataset.kind || "attack", hit.dataset.hitDmg, Number(hit.dataset.n) || 1, Number(hit.dataset.c) || 0);
    const crit = e.target.closest("#toasts [data-crit]");
    if (crit) doRoll("crit:" + crit.dataset.crit);
    if (e.target.closest("#toasts [data-conc-roll]")) doRoll("save:con");
  };

  const onKey = e => {
    if (e.key === "Enter" && e.target.matches("input[data-path]")) e.target.blur();
  };

  const onBeforeUnload = e => {
    const unsaved = hasUnsaved();
    if (unsaved) flush();
    const risky = getMode() === "cloud" ? unsaved || pendingWrites() > 0 : S.saveFailed || hasUnsaved();
    if (risky) {
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
  root.addEventListener("toggle", onToggle, true);
  document.addEventListener("click", onToastClick);
  window.addEventListener("beforeunload", onBeforeUnload);
  document.addEventListener("visibilitychange", onVisibility);
  const offHover = enableHoverCards(root, ref => (S.c && !S.disposed ? cardFor(S.c, S.d, ref) : ""));
  const offOrder = enableReorder(root, (key, ids) => {
    if (!S.c || S.disposed) return;
    const ok = mutate(c => {
      const list = getPath(c, key);
      if (Array.isArray(list)) setPath(c, key, reorderSubset(list, ids));
    }, { render: false });
    if (ok === false) renderTab();
  });
  const offLong = enableLongPress(root, (ref, el) => {
    if (!S.c || S.disposed || S.ui.ordering) return;
    hideHoverCard();
    if (el.closest("[data-open]")) return openEntity(el.closest("[data-open]").dataset.open);
    const html = cardFor(S.c, S.d, ref);
    if (html) openModal({ body: html, cls: "entity info-card" });
  });

  return () => {
    if (hasUnsaved()) flush();
    S.disposed = true;
    if (S.openModalApi) S.openModalApi.close();
    unsub && unsub();
    unStatus();
    offAccess();
    offInvite();
    offHover();
    offLong();
    offOrder();
    root.removeEventListener("toggle", onToggle, true);
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
