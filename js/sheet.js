import { compute, normalize, fmt, usesInfo, addDice, swapType, NOTE_KEYS, reorderSubset, presetEffect, xpInfo } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, $, $$, toast, openModal, confirmDialog, promptNumber, enableHoverCards, hideHoverCard, enableLongPress, enableReorder, openDiceRoller, fxSettings, setFx, playSound, getPath, setPath, download } from "./ui.js";
import { TABS, RENDER, subtitle, hpState, notesList, noteTags, combatSources } from "./tabs.js";
import { cardFor, findEntity } from "./entities.js";
import { subscribeChar, saveChanges, addHistory, onStatus, createChar, getMode, watchInvite, addRecent, deleteCharacter, pendingWrites, newCharId, humanError } from "./store.js";
import { diffPaths, applyPaths } from "./sync.js";
import { onAccess, getAccess, myEmail, signIn, IN_APP } from "./access.js";
import { openAccounts } from "./admin.js";
import { openShare } from "./share.js";
import { setAmbient } from "./ambient.js";
import { saveBackup, listBackups, fileDue, markFile, backupFile, backupName, BACKUP_GAP } from "./backup.js";
import { SNAPSHOT_GAP, lastSnapshot, clone, sameContent, loadUiPrefs, accentStyle, applyAccent, loadJson, loadTurn, saveUiPrefs } from "./sheet-util.js";
import { installRolls } from "./sheet-rolls.js";
import { installUndo } from "./sheet-undo.js";
import { installMagic } from "./sheet-magic.js";
import { installTurn } from "./sheet-turn.js";
import { installCards } from "./sheet-cards.js";
import { installDialogs } from "./sheet-dialogs.js";
import { installLevelUp } from "./sheet-levelup.js";
import { installNotes, loadRecent } from "./sheet-notes.js";

export function mountSheet(root, id, initialTab, navigate) {
  const S = {
    c: null,
    d: null,
    base: null,
    tab: TABS.some(t => t.key === initialTab) ? initialTab : "char",
    ui: { ...loadUiPrefs(), turn: loadTurn(id), ammoSpent: loadJson("dnd.ammo." + id), invFilter: "all", notesSection: "sessions", clueState: "all", notesRecent: loadRecent(id), spellFilter: "all", spellQ: "", noteOpen: {}, notesQ: "", noteTag: "", peopleAtt: "all" },
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
  const X = { S, root, id, navigate, status: () => lastStatus };
  Object.assign(X, { backupTick, downloadBackup, paintSync, loaderMessage, rights, checkEditor, readOnly, roText, roBar, inputFocused, rerenderKeepingModal, renderAll, renderTab, grow, calcValue, updateCalcs, snapshot, changed, flush, hasUnsaved, mutate, curHp, clampHp, setHp, filterSpells, rollModeLabel, takeMode, runAction, runActionInner });
  installRolls(X);
  installUndo(X);
  installMagic(X);
  installTurn(X);
  installCards(X);
  installDialogs(X);
  installLevelUp(X);
  installNotes(X);
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
    if (S.openRef && S.openModalApi) X.refreshEntityModal();
  }

  function renderAll(keepScroll) {
    if (S.disposed) return;
    lastRole = rights().role;
    const y = window.scrollY;
    const c = S.c;
    document.title = `${c.name} · Лист персонажа`;
    applyAccent(c.accent);
    setAmbient(c.scene);
    root.innerHTML = `
      <div class="sheet ${readOnly() ? "viewer" : ""}" style="${accentStyle(c.accent)}">
        <button class="fab-quick" data-act="quick-note" title="Быстрая заметка" aria-label="Быстрая заметка">${icon("quill")}</button>
        <header class="topbar">
          <a class="icon-btn" href="#/" title="Все персонажи">${icon("back")}</a>
          <button class="tb-portrait" data-act="portrait" title="Портрет">${c.portrait ? `<img src="${esc(c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER}</button>
          <button class="tb-id" data-act="edit-info"><span class="tb-name" data-calc="name">${esc(c.name)}</span><span class="tb-sub" data-calc="sub">${esc(subtitle(c))}</span></button>
          <button class="hp-mini" data-act="hp" title="Хиты"><span class="hp-mini-bar"><i data-hpbar></i></span><span><b data-calc="hp"></b>/<span data-calc="hpmax"></span></span></button>
          <button class="roll-mode" data-act="roll-mode" title="Режим следующего броска d20: обычный, с преимуществом, с помехой">${rollModeLabel()}</button>
          <span class="sync" data-sync></span>
          <button class="icon-btn tb-quick" data-act="quick-note" title="Быстрая заметка" aria-label="Быстрая заметка">${icon("quill")}</button>
          <button class="icon-btn tb-search" data-act="search-all" title="Поиск по листу" aria-label="Поиск по листу">${icon("search")}</button>
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
    setAmbient(S.c && S.c.scene);
    const body = $("[data-body]", root);
    if (!body) return;
    body.innerHTML = (S.ui.ordering ? `<div class="order-bar">${icon("menu")}<span>Перетаскивай карточки за значок ⠿ (на компьютере ещё Alt + стрелки). Порядок сохранится для всех устройств.</span><button class="btn gold sm" data-act="toggle-order">${icon("check")}Готово</button></div>` : "") + RENDER[S.tab]({ c: S.c, d: S.d, ui: S.ui });
    body.dataset.tab = S.tab;
    body.classList.toggle("ordering", !!S.ui.ordering);
    if (S.ui.ordering) $$("[data-reorder] > [data-rid]", body).forEach(el => el.insertAdjacentHTML("afterbegin", `<span class="drag-h" aria-hidden="true">⠿</span>`));
    $$(".tab", root).forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
    $$("textarea.autogrow", body).forEach(grow);
    if (S.tab === "notes") X.afterNotesRender();
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

  function backupTick(edited = false) {
    if (!S.c || S.disposed || readOnly()) return;
    if (edited) S.editedThisSession = true;
    if (S.backupAt == null) S.backupAt = (listBackups(id)[0] || {}).at || 0;
    if (Date.now() - S.backupAt >= BACKUP_GAP) {
      saveBackup(id, S.c);
      S.backupAt = Date.now();
    }
    if (S.editedThisSession && !S.fileAsked && fileDue(id)) {
      S.fileAsked = true;
      toast(`${icon("download")} Давно не было копии листа файлом. <button class="btn sm" data-backup-file>Скачать копию</button>`, { timeout: 12000 });
    }
  }

  function downloadBackup() {
    download(backupName(S.c), backupFile(S.c));
    markFile(id);
  }

  function changed({ render = true } = {}) {
    if (S.disposed) return;
    backupTick(true);
    S.d = compute(S.c);
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(flush, 650);
    if (render) renderTab();
    else updateCalcs();
    if (S.openRef && S.openModalApi) X.refreshEntityModal();
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
      if (e.type === "change") {
        X.saveRecent(nq.value);
        return true;
      }
      if (list) list.innerHTML = notesList({ c: S.c, d: S.d, ui: S.ui });
      const on = !!nq.value.trim();
      $$(".note-filters, .notes-head, .journal-slot", body).forEach(el => (el.hidden = on));
      X.afterNotesRender();
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

  const MUTATING = new Set(["short-rest", "long-rest", "hp", "hp-quick", "inspiration", "spend-hd", "death", "toggle-save", "cycle-skill", "edit-info", "edit-armor", "portrait", "add-attack", "add-spell", "spell-library", "toggle-order", "add-effect", "level-up", "dedupe-attacks", "cover", "collect-ammo", "scene", "pin-use", "coin-pay", "coin-get", "add-xp", "gear-table", "edit-effect", "remove-effect", "next-round", "end-combat", "add-feature", "add-item", "add-note", "edit-note", "pact-pip", "slot-pip", "use-pip", "toggle-cond", "exhaustion", "drop-conc", "import", "archive", "unarchive", "delete", "pin-note", "journal-add", "session-new", "note-create-link", "feature-library", "box-stored"]);

  const UNDO = {
    "hp-quick": el => (Number(el.dataset.n) < 0 ? `Урон ${-Number(el.dataset.n)}` : `Лечение ${el.dataset.n}`),
    hp: () => "Изменение хитов",
    "pact-pip": () => "Ячейка договора",
    "slot-pip": () => "Ячейка заклинаний",
    "use-pip": () => "Использование",
    "pin-use": () => "Использование",
    "toggle-cond": () => "Состояние",
    exhaustion: () => "Истощение",
    inspiration: () => "Вдохновение",
    "remove-effect": () => "Эффект снят",
    "next-round": () => "Следующий раунд",
    "end-combat": () => "Бой окончен",
    "spend-hd": () => "Кость хитов",
    death: () => "Спасбросок от смерти",
    "drop-conc": () => "Концентрация снята",
    cover: () => "Укрытие",
    "coin-pay": () => "Оплата",
    "coin-get": () => "Получение денег",
    "add-xp": () => "Опыт",
    "toggle-save": () => "Владение спасброском",
    "cycle-skill": () => "Владение навыком",
    "collect-ammo": () => "Сбор боеприпасов"
  };

  function runAction(a, el) {
    if (UNDO[a] && S.c && !readOnly() && !(MUTATING.has(a) && readOnly())) return X.withUndo(UNDO[a](el), () => runActionInner(a, el));
    return runActionInner(a, el);
  }

  async function runActionInner(a, el) {
    const { c } = S;
    if (!c || S.disposed) return;
    if (MUTATING.has(a) && readOnly()) {
      toast(`${icon("eye")} ${esc(roText())}`, { kind: "bad" });
      return;
    }
    switch (a) {
      case "short-rest": return X.shortRest();
      case "long-rest": return X.longRest();
      case "roll-log": return X.rollLogDialog();
      case "dice": return openDiceRoller();
      case "level-up": return X.openLevelUp();
      case "install": {
        const { installApp } = await import("./pwa.js");
        return installApp();
      }
      case "rules-ref": {
        const { openReference } = await import("./ref.js");
        return openReference();
      }
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
      case "history": return X.historyDialog();
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
      case "export": return downloadBackup();
      case "backups": return X.backupDialog();
      case "import": return X.importDialog();
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
      case "menu": return X.menu();
      case "roll-mode":
        S.rollMode = S.rollMode === "normal" ? "adv" : S.rollMode === "adv" ? "dis" : "normal";
        if (el) el.innerHTML = rollModeLabel();
        toast(S.rollMode === "normal" ? "Следующий бросок d20: обычный" : `Следующий бросок d20: ${S.rollMode === "adv" ? "с преимуществом" : "с помехой"}`, { timeout: 1800 });
        return;
      case "hp": return X.hpDialog(el.dataset.mode);
      case "hp-quick": {
        const n = Number(el.dataset.n) || 0;
        return X.applyHp(n < 0 ? "dmg" : "heal", Math.abs(n));
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
      case "gear-table": return X.gearTable();
      case "dedupe-attacks": {
        const ids = combatSources(c, S.d).dupes.map(x => x.id);
        if (!ids.length) return;
        if (!(await confirmDialog(`Удалить ${ids.length} ${ids.length === 1 ? "запись" : ids.length < 5 ? "записи" : "записей"} атак, которые повторяют заклинания или оружие? Старая версия останется в истории.`, { ok: "Удалить" }))) return;
        return mutate(ch => { ch.attacks = ch.attacks.filter(x => !ids.includes(x.id)); });
      }
      case "search-all": return X.searchAll();
      case "switch-char": return X.switchChar();
      case "cover": {
        const key = el.dataset.k;
        const has = (c.effects || []).some(x => x.preset === key);
        return mutate(ch => {
          ch.effects = (ch.effects || []).filter(x => x.preset !== "cover2" && x.preset !== "cover5");
          if (!has) ch.effects.push(presetEffect(key, {}, S.d.level));
        });
      }
      case "collect-ammo": {
        const spent = S.ui.ammoSpent;
        const back = Object.entries(spent).map(([aid, n]) => [aid, Math.floor(n / 2)]).filter(([, n]) => n > 0);
        S.ui.ammoSpent = {};
        X.saveAmmo();
        if (back.length) mutate(ch => back.forEach(([aid, n]) => {
          const it = findEntity(ch, "item", aid);
          if (it) it.qty = (Number(it.qty) || 0) + n;
        }));
        else renderTab();
        return toast(`${icon("arrow")} Собрано: ${back.reduce((a, [, n]) => a + n, 0)}`, { kind: "good", timeout: 2200 });
      }
      case "pin-use": {
        const [kind, eid] = el.dataset.ref.split(":");
        const e = findEntity(c, kind, eid);
        return e && X.useEntity(kind, e, 1);
      }
      case "pin-dmg": {
        const [kind, eid] = el.dataset.ref.split(":");
        const e = findEntity(c, kind, eid);
        if (!e) return;
        return X.rollDamage(e.name, (e.damage || []).map(l => ({ dice: l.addMod ? addDice(l.dice, S.d.spell.mod) : l.dice, type: swapType(c, l.type) })));
      }
      case "coin-pay":
      case "coin-get": return X.coinDialog(a === "coin-pay");
      case "add-xp": {
        const res = await promptNumber("Опыт", { label: `Сейчас ${xpInfo(c).xp}. Сколько добавить?`, value: "", buttons: [{ label: "Добавить", value: "add" }] });
        if (!res || !res.value || S.disposed) return;
        const n = Math.round(res.value);
        const was = xpInfo(S.c);
        mutate(ch => { ch.info.xp = Math.max(0, (Number(ch.info.xp) || 0) + n); }, { render: false });
        renderAll(true);
        const now = xpInfo(S.c);
        return toast(now.canLevel && !was.canLevel ? `${icon("star")} <b>Опыта хватает на ${now.levelByXp} уровень!</b> Повысь уровень в «Основном».` : `${icon("star")} Опыт: ${now.xp}`, { kind: "good", timeout: now.canLevel ? 7000 : 2500 });
      }
      case "turn-open": return el.dataset.k === "move" ? X.movementMenu() : X.actionMenu(el.dataset.k);
      case "turn-toggle":
        S.ui.turn[el.dataset.k] = !S.ui.turn[el.dataset.k];
        return X.saveTurn();
      case "new-turn": {
        S.ui.turn = { action: false, bonus: false, reaction: false };
        X.saveTurn();
        const tips = X.turnReminders();
        const timed = (c.effects || []).some(x => x.rounds != null);
        if (timed && !readOnly()) {
          const ended = [];
          X.withUndo("Следующий раунд", () => mutate(ch => {
            ch.effects = ch.effects.map(x => (x.rounds == null ? x : { ...x, rounds: x.rounds - 1 })).filter(x => {
              if (x.rounds != null && x.rounds <= 0) {
                ended.push(x.name);
                return false;
              }
              return true;
            });
          }));
          if (ended.length) tips.unshift({ text: `Закончилось: ${ended.join(", ")}` });
        }
        return X.showReminders(tips);
      }
      case "tips-toggle": {
        const on = !X.tipsOn();
        try {
          localStorage.setItem("dnd.tips", on ? "1" : "0");
        } catch {}
        return toast(on ? "Подсказки в бою включены" : "Подсказки в бою выключены", { timeout: 1800 });
      }
      case "add-effect": return X.effectPicker();
      case "edit-effect": {
        const ef = (c.effects || []).find(x => x.id === el.dataset.id);
        return ef && X.editEffect(ef);
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
      case "spend-hd": return X.spendHitDie();
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
      case "edit-info": return X.editInfo();
      case "scene": return X.sceneDialog();
      case "edit-armor": return X.editArmor();
      case "portrait": return X.portraitDialog();
      case "add-attack": return X.editEntity("attack", null);
      case "add-spell": return X.editEntity("spell", null);
      case "spell-library": return X.openLibrary(null, "spells");
      case "feature-library": return X.openLibrary(null, "features");
      case "add-feature": return X.editEntity("feature", null, el.dataset.cat);
      case "add-item": return X.editEntity("item", null, S.ui.invFilter && !["all", "equipped", "other"].includes(S.ui.invFilter) ? S.ui.invFilter : "gear");
      case "add-note":
        if (el.dataset.sec === "sessions") return X.startSession();
        return X.editNote(el.dataset.sec, null);
      case "open-note": return X.openNote(el.dataset.sec, el.dataset.id);
      case "pin-note": return X.togglePin(el.dataset.sec, el.dataset.id);
      case "note-create-link": return X.createFromLink(el.dataset.name || "");
      case "quick-note": return X.quickNote();
      case "session-new": return X.startSession();
      case "journal-add": {
        const ta = $("[data-journal]", root);
        if (ta && X.journalAdd(ta.value)) X.focusJournal();
        return;
      }
      case "clue-state": S.ui.clueState = el.dataset.k; return renderTab();
      case "box-stored": return mutate(ch => { const b = ch.items.find(x => x.id === el.dataset.id); if (b) b.stored = !b.stored; });
      case "edit-note": {
        const n = (c.notes[el.dataset.sec] || []).find(x => x.id === el.dataset.id);
        return n && X.editNote(el.dataset.sec, n);
      }
      case "notes-section":
        S.ui.notesSection = el.dataset.k;
        S.ui.noteTag = "";
        S.ui.peopleAtt = "all";
        S.ui.clueState = "all";
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
        const left = X.pactLeft();
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
        return X.useEntity(kind, e, Number(el.dataset.i) < u.left ? 1 : -1);
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
    if (roll && root.contains(roll)) return X.doRoll(roll.dataset.roll);
    const open = e.target.closest("[data-open]");
    if (open && root.contains(open)) {
      hideHoverCard();
      return X.openEntity(open.dataset.open);
    }
  };

  const onToastClick = e => {
    if (S.disposed) return;
    if (e.target.closest("#undo-bar [data-undo]")) return X.doUndo();
    if (e.target.closest("#toasts [data-rem-death]")) X.doRoll("death");
    if (e.target.closest("#toasts [data-lu-lib]")) X.openLibrary(null);
    if (e.target.closest("#toasts [data-backup-file]")) downloadBackup();
    const hs = e.target.closest("#toasts [data-heal-self]");
    if (hs) X.applyHp("heal", Number(hs.dataset.healSelf) || 0);
    const tf = e.target.closest("#toasts [data-temp-force]");
    if (tf) X.giveTemp(Number(tf.dataset.tempForce) || 0, true);
    const ae = e.target.closest("#toasts [data-add-effect]");
    if (ae) X.addEffect(presetEffect(ae.dataset.addEffect, { mine: ae.dataset.mine === "1", concName: ae.dataset.mine === "1" ? ae.dataset.conc : "" }, S.d.level));
    const hit = e.target.closest("#toasts [data-hit-dmg]");
    if (hit) X.hitDamage(hit.dataset.kind || "attack", hit.dataset.hitDmg, Number(hit.dataset.n) || 1, Number(hit.dataset.c) || 0);
    const crit = e.target.closest("#toasts [data-crit]");
    if (crit) X.doRoll("crit:" + crit.dataset.crit);
    if (e.target.closest("#toasts [data-conc-roll]")) X.doRoll("save:con");
  };

  const onKey = e => {
    if (e.key === "Enter" && e.target.matches("input[data-path]")) e.target.blur();
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.target.matches("[data-journal]")) {
      e.preventDefault();
      if (X.journalAdd(e.target.value)) X.focusJournal();
    }
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

  const backupTimer = setInterval(() => backupTick(false), 10 * 60 * 1000);
  const backupFirst = setTimeout(() => backupTick(false), 8000);
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
    if (el.closest("[data-open]")) return X.openEntity(el.closest("[data-open]").dataset.open);
    const html = cardFor(S.c, S.d, ref);
    if (html) openModal({ body: html, cls: "entity info-card" });
  });

  return () => {
    if (hasUnsaved()) flush();
    clearInterval(backupTimer);
    clearTimeout(backupFirst);
    backupTick(false);
    S.disposed = true;
    applyAccent("");
    setAmbient(null);
    if (S.openModalApi) S.openModalApi.close();
    unsub && unsub();
    unStatus();
    offAccess();
    offInvite();
    offHover();
    offLong();
    offOrder();
    X.hideUndo();
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
