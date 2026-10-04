import { canInstall } from "./pwa.js";
import { SKILLS, compute, normalize, fmt, importCharacter, NOTE_KEYS, payCoins, COIN_NAMES, CONDITIONS, FEATURE_CATS } from "./rules.js";
import { icon } from "./icons.js";
import { esc, $, toast, openModal, confirmDialog, promptNumber, rollLog, fxSettings, dateTime, timeAgo, download, pickFile } from "./ui.js";
import { subtitle } from "./tabs.js";
import { cardFor, itemIcon, spellIcon, featureIcon, attackIcon } from "./entities.js";
import { listHistory, createChar, getMode, subscribeList, getRecents, newCharId } from "./store.js";
import { describeChanges } from "./changes.js";
import { describeWho, isMe, KIND_ICONS } from "./device.js";
import { currentUid } from "./access.js";
import { banAccount } from "./admin.js";
import { clone } from "./sheet-util.js";
export function installDialogs(X) {
  const { S, root, id, navigate } = X;

  async function coinDialog(pay) {
    const res = await promptNumber(pay ? "Заплатить" : "Получить", {
      label: `В кошельке: ${Object.entries(COIN_NAMES).filter(([k]) => Number(S.c.coins[k])).map(([k, n]) => `${S.c.coins[k]} ${n}`).join(", ") || "пусто"}`,
      value: "",
      select: { label: "Монеты", options: [["gp", "Золотые (ЗМ)"], ["sp", "Серебряные (СМ)"], ["cp", "Медные (ММ)"], ["pp", "Платиновые (ПМ)"], ["ep", "Электрум (ЭМ)"]], value: S.ui.lastCoin || "gp" },
      buttons: [{ label: pay ? "Заплатить" : "Получить", value: pay ? "pay" : "get", cls: pay ? "danger" : "heal" }]
    });
    if (!res || !res.value || S.disposed) return;
    const unit = res.type || "gp";
    S.ui.lastCoin = unit;
    const n = Math.abs(res.value);
    if (pay) {
      const next = payCoins(S.c.coins, n, unit);
      if (!next) return toast(`Не хватает денег: нужно ${n} ${COIN_NAMES[unit]}`, { kind: "bad" });
      X.mutate(c => { c.coins = next; });
    } else {
      if (!Number.isInteger(n)) return toast("Получить можно только целое число монет", { kind: "bad" });
      X.mutate(c => { c.coins[unit] = (Number(c.coins[unit]) || 0) + n; });
    }
    toast(`${icon("coin")} ${pay ? "Заплачено" : "Получено"} ${n} ${COIN_NAMES[unit]}. В кошельке: ${Object.entries(COIN_NAMES).filter(([k]) => Number(S.c.coins[k])).map(([k, nm]) => `${S.c.coins[k]} ${nm}`).join(", ") || "пусто"}`, { kind: "good", timeout: 4000 });
  }

  function searchAll() {
    const m = openModal({ title: "Поиск по листу", cls: "library", body: `<label class="search-box">${icon("search")}<input type="search" data-q placeholder="Заклинание, предмет, умение, заметка..." aria-label="Поиск по листу"></label><div class="lib-list search-res" data-list></div>` });
    const input = m.body.querySelector("[data-q]");
    const listEl = m.body.querySelector("[data-list]");
    setTimeout(() => input.focus(), 60);
    const norm = v => String(v || "").toLowerCase().replace(/ё/g, "е");
    const draw = () => {
      const q = norm(input.value.trim());
      if (!q) {
        listEl.innerHTML = `<p class="hint">Ищет по названиям и текстам: заклинания, умения, предметы, атаки, заметки, навыки, состояния.</p>`;
        return;
      }
      const hit = (...v) => v.some(x => norm(x).includes(q));
      const res = [];
      const add = (group, ref, name, sub, ic) => res.push({ group, ref, name, sub, ic });
      S.c.spells.forEach(x => hit(x.name, x.nameEn, x.description) && add("Заклинания", "spell:" + x.id, x.name, Number(x.level) ? `${x.level} круг` : "заговор", spellIcon(S.c, x).icon));
      S.c.features.forEach(x => hit(x.name, x.nameEn, x.description, x.effect) && add("Умения", "feature:" + x.id, x.name, (FEATURE_CATS[x.category] || {}).name || "", featureIcon(x)));
      S.c.items.forEach(x => hit(x.name, x.description, x.effect) && add("Снаряжение", "item:" + x.id, x.name, x.equipped ? "надето" : "", itemIcon(x)));
      S.c.attacks.forEach(x => hit(x.name, x.notes) && add("Атаки", "attack:" + x.id, x.name, x.range || "", x.icon || attackIcon(x.name) || "swords"));
      NOTE_KEYS.forEach(k => S.c.notes[k].forEach(n => hit(n.title, n.subtitle, n.text, n.tags) && add("Заметки", `note:${k}:${n.id}`, n.title || "Без названия", n.subtitle || "", "scroll")));
      SKILLS.forEach(x => hit(x.name) && add("Навыки", "skill:" + x.key, x.name, fmt(S.d.skills[x.key]), "d20"));
      CONDITIONS.forEach(x => hit(x.name) && add("Состояния", "condition:" + x.key, x.name, "", "skull"));
      let group = "";
      listEl.innerHTML = res.slice(0, 80).map(r => `${r.group !== group ? `<div class="atk-group">${esc((group = r.group))}</div>` : ""}<button class="am-row" data-ref="${esc(r.ref)}" style="--c:var(--gold-2)">${icon(r.ic)}<span><b>${esc(r.name)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</span></button>`).join("") || `<p class="empty">Ничего не нашлось</p>`;
    };
    draw();
    input.addEventListener("input", draw);
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-ref]");
      if (!b) return;
      const ref = b.dataset.ref;
      const q = input.value.trim();
      m.close();
      if (ref.startsWith("note:")) {
        const [, sec, nid] = ref.split(":");
        S.ui.notesSection = sec;
        S.ui.notesQ = q;
        S.ui.noteOpen[nid] = true;
        S.tab = "notes";
        history.replaceState(history.state, "", `#/c/${id}/notes`);
        X.renderAll();
        return;
      }
      if (ref.startsWith("skill:") || ref.startsWith("condition:")) {
        const html = cardFor(S.c, S.d, ref);
        return html && openModal({ body: html, cls: "entity info-card" });
      }
      X.openEntity(ref);
    });
  }

  function switchChar() {
    const m = openModal({ title: "Другой персонаж", cls: "small", body: `<div class="loading small">${icon("hourglass")} Загружаю...</div>` });
    let mine = [];
    const draw = () => {
      const seen = new Set([id]);
      const rows = [];
      mine.filter(x => !x.archived).forEach(x => {
        if (seen.has(x.id)) return;
        seen.add(x.id);
        rows.push(`<button class="menu-item" data-go="${esc(x.id)}">${icon("user")}<span><b>${esc(x.name || "Без имени")}</b><small>${esc(subtitle(normalize(x)))}</small></span></button>`);
      });
      const rec = getRecents().filter(x => !seen.has(x.id));
      if (rec.length) rows.push(`<div class="atk-group">Недавно открытые</div>`, ...rec.map(x => `<button class="menu-item" data-go="${esc(x.id)}">${icon("eye")}<span><b>${esc(x.name || "Без имени")}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</span></button>`));
      m.body.innerHTML = `<div class="menu-list switch-list">${rows.join("") || `<p class="empty">Других персонажей нет</p>`}</div><div class="form-actions"><a class="btn ghost" href="#/">${icon("menu")}Все персонажи</a></div>`;
    };
    const off = subscribeList(items => {
      mine = Array.isArray(items) ? items : [];
      if (m.el.isConnected) draw();
    }, "mine");
    const stop = new MutationObserver(() => {
      if (!m.el.isConnected) {
        off();
        stop.disconnect();
      }
    });
    stop.observe(document.body, { childList: true });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-go]");
      if (!b) return;
      m.close();
      navigate(`#/c/${b.dataset.go}`);
    });
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
      X.spendHitDie();
      m.body.querySelector("[data-hdleft]").textContent = `${S.d.hitDice.left}/${S.d.hitDice.total}`;
    };
    m.body.querySelector("[data-ok]").onclick = () => {
      const before = clone(S.c);
      X.mutate(c => {
        c.pactUsed = 0;
        X.resetUses(c, ["short"]);
        c.effects = (c.effects || []).filter(e => e.until !== "short" && (e.rounds == null || e.rounds > 600)).map(e => (e.rounds == null ? e : { ...e, rounds: e.rounds - 600 }));
      });
      m.close();
      restSummary("Короткий отдых", "campfire", before);
    };
  }

  async function longRest() {
    if (S.c.hp.deathFail >= 3) return toast("Погибший персонаж не может отдохнуть", { kind: "bad" });
    if (X.curHp() <= 0) return toast("Длинный отдых не даёт пользы, если в его начале у персонажа 0 хитов. Сначала стабилизируйся и получи хотя бы 1 хит (лечение или 1d4 часа после стабилизации).", { kind: "bad", timeout: 8000 });
    if (!(await confirmDialog("Длинный отдых: полные хиты, все ячейки и умения восстановлены, вернётся половина костей хитов. Продолжить?", { ok: "Отдохнуть" }))) return;
    const before = clone(S.c);
    X.mutate(c => {
      const lvl = S.d.level;
      if (c.exhaustion > 0) c.exhaustion -= 1;
      c.effects = [];
      c.hp.current = compute(c).hpMax;
      c.hp.deathSuccess = 0;
      c.hp.deathFail = 0;
      c.hp.stable = false;
      c.hp.temp = 0;
      c.hp.hitDiceUsed = Math.max(0, (Number(c.hp.hitDiceUsed) || 0) - Math.max(1, Math.floor(lvl / 2)));
      c.pactUsed = 0;
      c.slotsUsed = {};
      c.concentration = "";
      X.resetUses(c, ["short", "long", "dawn"]);
    });
    restSummary("Длинный отдых", "moon", before);
  }

  function restSummary(title, ic, before) {
    const after = S.c;
    const db = compute(before);
    const lines = [];
    const hp0 = Math.min(db.hpMax, Number(before.hp.current) || 0);
    const hp1 = X.curHp();
    if (hp1 > hp0) lines.push(`Хиты: ${hp0} → ${hp1}`);
    const hd = (Number(before.hp.hitDiceUsed) || 0) - (Number(after.hp.hitDiceUsed) || 0);
    if (hd > 0) lines.push(`Кости хитов: +${hd}`);
    if ((Number(before.pactUsed) || 0) > (Number(after.pactUsed) || 0)) lines.push(`Ячейки договора: +${(Number(before.pactUsed) || 0) - (Number(after.pactUsed) || 0)}`);
    const slots = Object.values(before.slotsUsed || {}).reduce((a, b) => a + (Number(b) || 0), 0) - Object.values(after.slotsUsed || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    if (slots > 0) lines.push(`Ячейки заклинаний: +${slots}`);
    const names = [];
    for (const key of ["features", "items", "spells"]) {
      for (const e of after[key]) {
        const was = (before[key].find(x => x.id === e.id) || {}).used;
        if ((Number(was) || 0) > (Number(e.used) || 0)) names.push(e.name);
      }
    }
    if (names.length) lines.push(`Восстановлено: ${names.join(", ")}`);
    if (before.exhaustion > after.exhaustion) lines.push(`Истощение: ${before.exhaustion} → ${after.exhaustion}`);
    const gone = (before.effects || []).filter(e => !(after.effects || []).some(x => x.id === e.id)).map(e => e.name);
    if (gone.length) lines.push(`Закончилось: ${gone.join(", ")}`);
    if (before.concentration && !after.concentration) lines.push(`Концентрация на «${before.concentration}» снята`);
    toast(`${icon(ic)} <b>${esc(title)} завершён</b>${lines.length ? `<ul class="rest-sum">${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : "<br>Восстанавливать было нечего"}`, { kind: "good", timeout: 9000 });
    X.showUndo(title, before);
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
      X.replaceWith(h.data || {}, "Перед восстановлением");
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
      X.replaceWith(c, "Перед импортом");
      m.close();
    };
  }

  function menu() {
    const r = X.rights();
    const a = S.access;
    const cloud = getMode() === "cloud";
    const manage = r.role === "owner" || r.role === "admin" || r.role === "open";
    const items = [
      ["short-rest", "campfire", "Короткий отдых"],
      ["long-rest", "moon", "Длинный отдых"],
      ["roll-mode", "d20", "Режим броска: " + (S.rollMode === "adv" ? "преимущество" : S.rollMode === "dis" ? "помеха" : "обычный")],
      ["dice", "d20", "Бросить кубы"],
      ...(S.d.level < 20 && r.canEdit ? [["level-up", "star", "Повысить уровень"]] : []),
      ["switch-char", "people", "Другой персонаж"],
      ["rules-ref", "book", "Шпаргалка правил"],
      ...(canInstall() ? [["install", "phone", "Установить как приложение"]] : []),
      ["search-all", "search", "Поиск по листу"],
      ["roll-log", "scroll", "Журнал бросков"],
      ["fx-sound", "bell", "Звуки бросков: " + (fxSettings().sound ? "включены" : "выключены")],
      ["tips-toggle", "info", "Подсказки в бою: " + (X.tipsOn() ? "включены" : "выключены")],
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
    const st = X.status() || {};
    const m = openModal({
      title: "Меню",
      cls: "small",
      body: `<div class="menu-list">${items.map(([a, ic, l]) => `<button class="menu-item" data-m="${a}">${icon(ic)}<span>${l}</span></button>`).join("")}</div><p class="hint">${esc(roles[r.role] || "")}${st.error ? `<br>${esc(st.error)}` : ""}</p>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      m.close();
      X.runAction(b.dataset.m, $("[data-act=roll-mode]", root));
    });
  }

  Object.assign(X, { coinDialog, searchAll, switchChar, shortRest, longRest, restSummary, historyDialog, rollLogDialog, importDialog, menu });
}
