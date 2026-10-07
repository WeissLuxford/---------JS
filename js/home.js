import { normalize, newCharacter, compute, importCharacter } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, timeAgo, toast, openForm, openModal, pickFile, confirmDialog, openBoard } from "./ui.js";
import { installBanner, installApp } from "./pwa.js";
import { subscribeList, subscribeInvites, createChar, getMode, onStatus, getRecents, removeRecent, claimCharacter, deleteCharactersOf, listCharactersOf, newCharId, getCharOnce, getHiddenTemplates, setHiddenTemplates, getBoard } from "./store.js";
import { loadTemplates, templateCopy } from "./templates.js";
import { onAccess, signIn, signOut, IN_APP, getAccess, deleteAccountData } from "./access.js";
import { subtitle } from "./tabs.js";
import { shortWho } from "./device.js";
import { openShare, quickShare } from "./share.js";
import { openAccounts, backupAll } from "./admin.js";
import { CREDITS, LICENSES } from "./credits.js";

export function mountHome(root, navigate) {
  document.title = "Листы персонажей";
  let mine = null;
  let invites = [];
  let all = null;
  let fromCache = false;
  let showArchived = false;
  let statusText = "";
  let access = getAccess();
  let disposed = false;
  let offMine = () => {};
  let offInv = () => {};
  let offAll = () => {};
  let subKey = "";
  let graceOver = false;
  let graceTimer = null;
  let templates = [];
  let hiddenTpl = [];
  let showHiddenTpl = false;
  let accOpen = false;
  const PENDING = "dnd.takeAfterSignIn";

  const offStatus = onStatus(st => {
    const next = st.mode === "local" ? st.error || "Только в этом браузере" : st.state === "error" || st.state === "offline" ? st.error : "";
    if (next !== statusText) {
      statusText = next;
      paint();
    }
  });

  const toChar = x => ({ ...normalize(x), id: x.id, ownerUid: x.ownerUid || "", ownerName: x.ownerName || "", visibility: x.visibility === "private" ? "private" : "link", updatedAt: Number(x.updatedAt) || 0, updatedBy: x.updatedBy && typeof x.updatedBy === "object" ? x.updatedBy : null });

  function resubscribe() {
    const open = getMode() === "cloud" && !access.enforced;
    const key = `${getMode()}|${open}|${access.uid}|${access.email}|${access.isAdmin}`;
    if (key === subKey) return;
    subKey = key;
    offMine();
    offInv();
    offAll();
    mine = null;
    invites = [];
    all = null;
    if (getMode() === "cloud" && !open && !access.signedIn) {
      mine = [];
      return;
    }
    offMine = subscribeList((items, meta = {}) => {
      if (disposed) return;
      fromCache = !!meta.fromCache;
      mine = items ? items.map(toChar) : mine || [];
      paint();
    }, open ? "all" : "mine");
    if (open) return;
    offInv = subscribeInvites(access.email, items => {
      if (disposed) return;
      invites = items || [];
      paint();
      refreshInviteNames();
    });
    if (access.isAdmin) {
      offAll = subscribeList(items => {
        if (disposed) return;
        all = items ? items.map(toChar) : [];
        paint();
      }, "all");
    }
  }

  const liveNames = new Map();

  function refreshInviteNames() {
    for (const x of invites) {
      if (liveNames.has(x.id)) continue;
      liveNames.set(x.id, null);
      getCharOnce(x.id).then(c => {
        if (!c || disposed) return;
        liveNames.set(x.id, String(c.name || ""));
        paint();
      }).catch(() => {});
    }
  }

  const offAccess = onAccess(a => {
    access = a;
    if (!a.ready && getMode() === "cloud") return;
    resubscribe();
    paint();
    takePending();
  });

  function pendingKey() {
    try {
      return sessionStorage.getItem(PENDING) || "";
    } catch {
      return "";
    }
  }

  function setPending(key) {
    try {
      if (key) sessionStorage.setItem(PENDING, key);
      else sessionStorage.removeItem(PENDING);
    } catch {}
  }

  function canCreateNow() {
    const cloud = getMode() === "cloud";
    return !cloud || !access.enforced || (access.signedIn && !access.banned);
  }

  function takePending() {
    const key = pendingKey();
    if (!key || disposed || !templates.length || !access.signedIn || !canCreateNow()) return;
    setPending("");
    const tp = templates.find(x => x.key === key);
    if (tp) takeTemplate(tp);
  }

  async function takeTemplate(tp, btn) {
    if (btn) btn.disabled = true;
    try {
      const id = newCharId();
      await createChar(id, await templateCopy(tp));
      toast(`${icon("check")} ${esc(tp.c.name)} теперь твой`, { kind: "good" });
      navigate(`#/c/${id}`);
    } catch {
      if (btn) btn.disabled = false;
      toast("Не удалось забрать персонажа", { kind: "bad" });
    }
  }

  function ownCard(c) {
    const d = compute(c);
    const cur = Math.max(0, Number(c.hp.current) || 0);
    const pct = d.hpMax ? Math.max(0, Math.min(100, Math.round((cur / d.hpMax) * 100))) : 0;
    const i = c.info;
    const rows = [["sparkle", i.subclass], ["book", i.background]].filter(r => r[1]);
    const when = c.updatedAt ? "изменён " + timeAgo(c.updatedAt) + (shortWho(c.updatedBy) ? " · " + shortWho(c.updatedBy) : "") : "";
    const lock = c.visibility === "private" && getMode() === "cloud" && access.enforced;
    const href = `#/c/${encodeURIComponent(c.id)}`;
    return `<article class="tpl-hero own ${c.archived ? "arch" : ""} ${cur === 0 && d.hpMax ? "down" : ""}">
      <a class="tpl-art" href="${href}" aria-label="Открыть: ${esc(c.name)}">
        ${c.portrait ? `<img src="${esc(c.portrait)}" alt="" loading="lazy">` : `<span class="own-ph">${PORTRAIT_PLACEHOLDER}</span>`}
        <span class="tpl-name"><b>${esc(c.name)}</b><small>${esc(subtitle(c))}</small></span>
      </a>
      ${c.boardAt ? `<button class="own-board" data-own-board="${esc(c.id)}">${icon("frame")}Доска</button>` : ""}
      <button class="own-share" data-share="${esc(c.id)}" title="${lock ? "Доступ по ссылке выключен" : "Поделиться"}" aria-label="Поделиться: ${esc(c.name)}">${icon(lock ? "shield" : "link")}</button>
      <a class="tpl-body own-body" href="${href}" tabindex="-1">
        <span class="own-stats"><span class="own-hp ${pct <= 25 ? "low" : ""}"><span class="own-bar"><i style="width:${pct}%"></i></span><span><b>${cur}</b>/${d.hpMax} ХП</span></span><span class="own-ac">${icon("shield")}<b>${d.ac}</b> КД</span></span>
        ${rows.length ? `<ul class="tpl-rows">${rows.map(([ic, text]) => `<li>${icon(ic)}<span>${esc(text)}</span></li>`).join("")}</ul>` : ""}
        ${when ? `<small class="own-when">${esc(when)}</small>` : ""}
      </a>
    </article>`;
  }

  function accountButton() {
    if (getMode() !== "cloud" || !access.ready) return "";
    if (!access.signedIn) return `<button class="btn gold sm acc-in" data-signin>${icon("user")}Войти</button>`;
    return `<div class="acc-wrap"><button class="acc-btn" data-acc-menu aria-expanded="${accOpen}" aria-label="Аккаунт: ${esc(access.name)}">${access.photo ? `<img src="${esc(access.photo)}" alt="" referrerpolicy="no-referrer">` : icon("user")}</button>${accOpen ? accountMenu() : ""}</div>`;
  }

  function accountMenu() {
    return `<div class="st-pop acc-pop" role="dialog" aria-label="Аккаунт">
      <div class="acc-who"><b>${esc(access.name)}</b><small>${esc(access.email)}</small>${access.isAdmin ? `<span class="hist-tag gold">владелец сайта</span>` : ""}${access.banned ? `<span class="hist-tag bad">аккаунт запрещён</span>` : ""}</div>
      ${access.isAdmin ? `<button class="acc-item" data-accounts>${icon("people")}Аккаунты</button><button class="acc-item" data-backup>${icon("download")}Бэкап всех персонажей</button>` : ""}
      <button class="acc-item" data-myid>${icon("gear")}Аккаунт и удаление</button>
      <button class="acc-item" data-privacy>${icon("shield")}Что мы храним</button>
      <button class="acc-item" data-signout>${icon("back")}Выйти</button>
    </div>`;
  }

  function charCard(c, { owner = true, badge = "" } = {}) {
    return `<article class="ch-card ${c.archived ? "arch" : ""}">
      <a class="ch-link" href="#/c/${encodeURIComponent(c.id)}" aria-label="${esc(c.name)}"></a>
      <span class="ch-portrait">${c.portrait ? `<img src="${esc(c.portrait)}" alt="" loading="lazy">` : PORTRAIT_PLACEHOLDER}</span>
      <span class="ch-info">
        <span class="ch-name">${esc(c.name)}</span>
        <span class="ch-sub">${esc(subtitle(c))}</span>
        ${badge ? `<span class="ch-badge">${badge}</span>` : `<span class="ch-sub dim">${esc([c.info.subclass, c.info.background].filter(Boolean).join(" · "))}</span>`}
        <span class="ch-time">${c.updatedAt ? "изменён " + timeAgo(c.updatedAt) + (shortWho(c.updatedBy) ? " · " + esc(shortWho(c.updatedBy)) : "") : ""}</span>
      </span>
      ${owner ? `<button class="ch-share" data-share="${esc(c.id)}" title="Поделиться" aria-label="Поделиться: ${esc(c.name)}">${icon("link")}</button>` : ""}
      ${owner && c.visibility === "private" && getMode() === "cloud" && access.enforced ? `<span class="ch-lock" title="Доступ по ссылке выключен">${icon("shield")}</span>` : ""}
    </article>`;
  }

  function miniCard(x, kind) {
    return `<article class="ch-card mini">
      <a class="ch-link" href="#/c/${encodeURIComponent(x.id)}" aria-label="${esc(x.name)}"></a>
      <span class="ch-portrait small">${icon(kind === "invite" ? "edit" : "eye")}</span>
      <span class="ch-info">
        <span class="ch-name">${esc((kind === "invite" && liveNames.get(x.id)) || x.name || "Без имени")}</span>
        <span class="ch-sub">${kind === "invite" ? `${access.banned ? "Только просмотр (аккаунт запрещён)" : "Можно править"} · владелец ${esc(x.ownerName || "неизвестен")}` : "Открыт по ссылке"}</span>
        <span class="ch-time">${x.at ? (kind === "invite" ? "доступ дан " : "открыт ") + timeAgo(x.at) : ""}</span>
      </span>
      ${kind === "recent" ? `<button class="ch-x" data-forget="${esc(x.id)}" title="Убрать из списка">${icon("close")}</button>` : ""}
    </article>`;
  }

  function tplCard(t, { hidden = false, canCreate, canHide, needSignIn }) {
    const c = t.c;
    const look = `<a class="btn ghost sm" href="#/t/${esc(t.key)}">${icon("eye")}Посмотреть</a>`;
    const take = canCreate ? `<button class="btn gold sm" data-tpl-take="${esc(t.key)}">${icon("download")}Забрать себе</button>` : needSignIn ? `<button class="btn sm" data-tpl-signin="${esc(t.key)}">${icon("user")}Войти и забрать</button>` : "";
    const hide = canHide ? `<button class="btn ghost sm" data-tpl-hide="${esc(t.key)}" title="${hidden ? "Снова показывать всем" : "Убрать с главной для всех"}">${icon(hidden ? "eye" : "trash")}${hidden ? "Вернуть" : "Убрать"}</button>` : "";
    if (!t.art) return `<article class="ch-card tpl ${hidden ? "arch" : ""}">
      <span class="ch-portrait tpl-ic">${icon(t.icon)}</span>
      <span class="ch-info">
        <span class="ch-name">${esc(c.name)}</span>
        <span class="ch-sub">${esc(subtitle(c))}</span>
        <span class="ch-sub dim">${esc(t.blurb)}</span>
        <span class="tpl-acts">${look}${take}${hide}</span>
      </span>
    </article>`;
    const i = c.info;
    const rows = [["people", i.subrace], [t.icon, [i.cls, i.level ? `${i.level} уровня` : ""].filter(Boolean).join(" ")], ["sparkle", i.subclass], ["book", i.background], ["scales", i.alignment]].filter(r => r[1]);
    const lead = [i.race, i.age ? `${i.age} ${years(i.age)}` : ""].filter(Boolean).join(" · ");
    return `<article class="tpl-hero tpl-card ${hidden ? "arch" : ""}">
      <button class="tpl-art" ${t.board ? `data-tpl-board="${esc(t.key)}" aria-label="Доска персонажа: ${esc(c.name)}"` : "disabled"}>
        <img src="${esc(t.art)}" alt="" loading="lazy">
        <span class="tpl-name"><b>${esc(c.name)}</b><small>${esc(lead)}</small></span>
        ${t.board ? `<span class="tpl-zoom">${icon("frame")}Доска</span>` : ""}
      </button>
      <div class="tpl-body">
        <ul class="tpl-rows">${rows.map(([ic, text]) => `<li>${icon(ic)}<span>${esc(text)}</span></li>`).join("")}</ul>
        ${c.personality.ideals ? `<p class="tpl-quote">«${esc(c.personality.ideals)}»</p>` : ""}
        <p class="tpl-blurb">${esc(t.blurb)}</p>
        <div class="tpl-acts">${take}${look}${hide}</div>
      </div>
    </article>`;
  }

  function years(n) {
    const v = Math.abs(parseInt(n, 10)) % 100, d = v % 10;
    if (v > 10 && v < 20) return "лет";
    return d === 1 ? "год" : d > 1 && d < 5 ? "года" : "лет";
  }

  function tplSection(canCreate) {
    if (!templates.length) return "";
    const cloud = getMode() === "cloud";
    const canHide = cloud ? !!access.isAdmin : true;
    const needSignIn = cloud && access.enforced && !access.signedIn;
    const shown = templates.filter(t => !hiddenTpl.includes(t.key));
    const hidden = templates.filter(t => hiddenTpl.includes(t.key));
    if (!shown.length && !canHide) return "";
    const opts = { canCreate, canHide, needSignIn };
    return section("Готовые персонажи", "people", `<p class="hint tpl-hint">${needSignIn ? "Посмотреть можно и без входа. «Войти и забрать» войдёт через Google и сразу сделает твою копию." : "Готовые листы, чтобы попробовать сайт или сразу сесть играть. «Забрать себе» делает твою копию, её можно менять как угодно, образец остаётся для других."}</p>
      <div class="ch-grid tpl-grid">${shown.map(t => tplCard(t, opts)).join("")}</div>
      ${canHide && hidden.length ? `<div class="arch-toggle"><button class="btn ghost sm" data-tpl-hidden>${icon("archive")}Убранные (${hidden.length})</button></div>${showHiddenTpl ? `<div class="ch-grid tpl-grid">${hidden.map(t => tplCard(t, { ...opts, hidden: true })).join("")}</div>` : ""}` : ""}`);
  }

  function section(title, ic, body) {
    return `<section class="home-sec"><header class="home-sec-h">${icon(ic)}<h2>${esc(title)}</h2></header>${body}</section>`;
  }

  function paint() {
    if (disposed) return;
    const cloud = getMode() === "cloud";
    if ((cloud && !access.ready) || mine === null || (fromCache && !mine.length && navigator.onLine !== false && !graceOver)) {
      if (fromCache && !graceTimer) graceTimer = setTimeout(() => {
        graceOver = true;
        paint();
      }, 6000);
      root.innerHTML = `<div class="loading">${icon("d20")}<span>Открываю архивы...</span></div>`;
      return;
    }
    const open = cloud && !access.enforced;
    const canCreate = !cloud || open || (access.signedIn && !access.banned);
    const active = mine.filter(c => !c.archived).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const archived = mine.filter(c => c.archived);
    const mineIds = new Set(mine.map(c => c.id));
    const inv = invites.filter(x => !mineIds.has(x.id));
    const invIds = new Set(inv.map(x => x.id));
    const allIds = new Set((all || []).map(c => c.id));
    const recents = getRecents().filter(x => !mineIds.has(x.id) && !invIds.has(x.id) && !allIds.has(x.id));
    const others = all ? all.filter(c => !mineIds.has(c.id)) : [];
    const createCard = canCreate
      ? `<button class="tpl-hero new-hero" data-new><span class="new-ic">${icon("plus")}</span><span class="new-tx"><b>Новый персонаж</b><small>Мастер по шагам: раса, класс, характеристики, снаряжение</small></span></button>`
      : "";
    const more = [canCreate ? `<button class="link-btn" data-import>${icon("upload")}Загрузить из файла</button>` : "", archived.length ? `<button class="link-btn" data-arch>${icon("archive")}Архив (${archived.length})</button>` : ""].filter(Boolean).join("");
    const mySection = !cloud || open || access.signedIn
      ? section(cloud && !open ? "Мои персонажи" : "Персонажи", "user", `<div class="ch-grid tpl-grid own-grid">${active.map(c => ownCard(c)).join("")}${createCard}</div>
          ${more ? `<div class="home-more">${more}</div>` : ""}${showArchived && archived.length ? `<div class="ch-grid tpl-grid own-grid">${archived.map(c => ownCard(c)).join("")}</div>` : ""}`)
      : "";
    const firstTime = canCreate && !active.length;
    const adminSection = access.isAdmin && others.length
      ? section("Все остальные персонажи сайта", "shield", `<div class="ch-grid">${others.map(c => charCard(c, { owner: false, badge: c.ownerUid ? `владелец: ${esc(c.ownerName || c.ownerUid.slice(0, 8))}` : `<button class="btn sm gold ch-claim" data-claim="${esc(c.id)}">${icon("check")}Без владельца: забрать себе</button>` })).join("")}</div>`)
      : "";
    root.innerHTML = `
      <div class="home">
        <header class="home-head">
          <div class="home-top"><div class="home-title">${icon("d20")}<div><h1>Листы персонажей</h1><p>D&amp;D 5e: сам считает бонусы, бросает в одно касание, работает без интернета</p></div></div>${accountButton()}</div>
          ${statusText ? `<div class="home-status">${icon("cloudOff")}${esc(statusText)}</div>` : ""}
          ${fromCache && !mine.length ? `<div class="home-status">${icon("cloudOff")}Нет связи с облаком: список появится, когда будет интернет</div>` : ""}
          ${cloud && access.ready && !access.signedIn && IN_APP ? `<div class="home-status">${icon("eye")}Похоже, сайт открыт внутри приложения (Telegram, Instagram и т.п.). Google не пускает войти оттуда: открой ссылку в Chrome или Safari.</div>` : ""}
          ${cloud && access.ready && !access.signedIn && access.authError ? `<div class="home-status">${icon("cloudOff")}${esc(access.authError)}</div>` : ""}
          ${access.banned ? `<div class="home-status">${icon("eye")}Владелец сайта запретил твоему аккаунту вносить правки: можно только смотреть листы по ссылке</div>` : ""}
          ${installBanner()}
        </header>
        ${firstTime ? tplSection(canCreate) + mySection : mySection + tplSection(canCreate)}
        ${inv.length ? section("Со мной поделились", "edit", `<div class="ch-grid">${inv.map(x => miniCard(x, "invite")).join("")}</div>`) : ""}
        ${recents.length ? section("Недавно открытые", "eye", `<div class="ch-grid">${recents.map(x => miniCard(x, "recent")).join("")}</div>`) : ""}
        ${adminSection}
        <footer class="home-foot"><button class="link-btn" data-privacy>${icon("shield")}Что мы храним</button><button class="link-btn" data-thanks>${icon("heart")}Благодарности</button><span>${cloud ? "Синхронизация через облако" : "Локальный режим"}</span></footer>
      </div>`;
  }

  function createFlow() {
    import("./creator.js").then(({ openCreator }) => openCreator({
      onCreate: c => {
        const id = newCharId();
        createChar(id, c).then(() => navigate(`#/c/${id}`)).catch(() => toast("Не удалось создать персонажа", { kind: "bad" }));
      },
      onBlank: blankFlow
    })).catch(() => blankFlow());
  }

  function blankFlow() {
    openForm({
      title: "Новый персонаж",
      fields: [
        { key: "name", label: "Имя", span: 3, max: 120 },
        { key: "info.race", label: "Раса" },
        { key: "info.cls", label: "Класс" },
        { key: "info.level", label: "Уровень", type: "number" }
      ],
      value: { name: "", info: { race: "", cls: "", level: 1 } },
      saveLabel: "Создать",
      onSave: val => {
        const c = newCharacter(String(val.name || "").trim() || "Новый персонаж");
        c.info.race = val.info.race;
        c.info.cls = val.info.cls;
        c.info.level = Math.max(1, Math.min(20, Number(val.info.level) || 1));
        c.hp.current = compute(normalize(c)).hpMax;
        const id = newCharId();
        createChar(id, c).then(() => navigate(`#/c/${id}`)).catch(() => toast("Не удалось создать персонажа", { kind: "bad" }));
      }
    });
  }

  function showPrivacy() {
    openModal({
      title: "Что мы храним",
      cls: "small",
      body: `<div class="privacy">
        <p><b>Из Google-аккаунта:</b> имя, почта и фото. Почту видишь только ты и владелец сайта. Имя видно рядом с твоими персонажами и правками.</p>
        <p><b>Персонажи:</b> всё, что ты вписал в лист, включая портрет. Любой, у кого есть ссылка на лист, может его посмотреть, поэтому не храни там ничего личного.</p>
        <p><b>Редакторы:</b> почты приглашённых видит только владелец листа.</p>
        <p><b>История правок:</b> кто и когда менял лист, с какого устройства (телефон или компьютер, браузер). Видят только владелец листа, редакторы и владелец сайта.</p>
        <p><b>Чего нет:</b> рекламы, аналитики и слежки. Данные лежат в Google Firebase и никому не передаются.</p>
        <p><b>Удаление:</b> «Аккаунт», затем «Удалить аккаунт» стирает твой профиль и всех твоих персонажей вместе с историей.</p>
      </div>`
    });
  }

  function creditLine(it) {
    const link = (url, text) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text);
    return `<p><b>${link(it.url, it.title)}</b>, ${link(it.authorUrl, it.author)}. Лицензия ${link(LICENSES[it.license], it.license)}.${it.note ? ` ${esc(it.note)}` : ""}</p>`;
  }

  function showThanks() {
    openModal({
      title: "Благодарности",
      cls: "small",
      body: `<div class="privacy thanks">
        <p class="hint">Сайт собран на бесплатных материалах. Спасибо их авторам.</p>
        ${CREDITS.map(g => `<h4>${esc(g.group)}</h4>${g.items.map(creditLine).join("")}`).join("")}
      </div>`
    });
  }

  function showMyId() {
    const m = openModal({
      title: "Аккаунт",
      cls: "small",
      body: `<p class="hint">ID твоего аккаунта. Он нужен владельцу сайта, чтобы вписать себя в правила Firestore.</p><input class="copy-input" readonly value="${esc(access.uid)}"><div class="form-actions"><button class="btn gold" data-copyid>${icon("copy")}Скопировать ID</button></div>
        ${access.enforced ? `<hr class="sep"><p class="hint">Удаление стирает твой профиль и всех твоих персонажей вместе с историей правок. Вернуть их будет нельзя. Перед этим можно скачать нужных персонажей в файл (меню листа).</p><div class="form-actions"><button class="btn danger" data-delacc>${icon("trash")}Удалить аккаунт</button></div>` : ""}`
    });
    const del = m.body.querySelector("[data-delacc]");
    if (del) del.addEventListener("click", async () => {
      if (!getAccess().enforced) return toast("Удаление аккаунта доступно после обновления правил базы", { kind: "bad" });
      let count = 0;
      try {
        count = (await listCharactersOf(access.uid)).length;
      } catch {
        return toast("Нет связи с сервером, попробуй позже", { kind: "bad" });
      }
      if (!(await confirmDialog(`Удалить аккаунт и всех твоих персонажей (${count})? Это необратимо. Google попросит подтвердить вход.`, { ok: "Удалить всё", danger: true }))) return;
      try {
        await deleteAccountData(uid => deleteCharactersOf(uid));
        m.close();
        toast("Аккаунт и персонажи удалены", { kind: "good" });
      } catch (err) {
        toast(esc(err.message || "Не получилось удалить"), { kind: "bad", timeout: 7000 });
      }
    });
    m.body.querySelector("[data-copyid]").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(access.uid);
        toast("ID скопирован", { kind: "good" });
      } catch {
        toast("Выдели ID и скопируй вручную", { kind: "bad" });
      }
    });
  }

  const onClick = async e => {
    if (e.target.closest("[data-install]")) return installApp();
    const t = e.target;
    if (t.closest("[data-acc-menu]")) {
      accOpen = !accOpen;
      return paint();
    }
    if (accOpen) {
      accOpen = false;
      paint();
    }
    if (t.closest("[data-new]")) return createFlow();
    const tSign = t.closest("[data-tpl-signin]");
    if (tSign) {
      setPending(tSign.dataset.tplSignin);
      try {
        await signIn();
      } catch (err) {
        setPending("");
        toast(esc(err.message), { kind: "bad", timeout: 7000 });
      }
      return;
    }
    if (t.closest("[data-signin]")) {
      try {
        await signIn();
      } catch (err) {
        toast(esc(err.message), { kind: "bad", timeout: 7000 });
      }
      return;
    }
    if (t.closest("[data-signout]")) {
      if (await confirmDialog("Выйти из аккаунта на этом устройстве?", { ok: "Выйти" })) await signOut();
      return;
    }
    if (t.closest("[data-myid]")) return showMyId();
    if (t.closest("[data-privacy]")) return showPrivacy();
    if (t.closest("[data-thanks]")) return showThanks();
    if (t.closest("[data-accounts]")) return openAccounts();
    if (t.closest("[data-backup]")) return backupAll();
    const share = t.closest("[data-share]");
    if (share) {
      const c = [...(mine || []), ...(all || [])].find(x => x.id === share.dataset.share);
      return c && quickShare(c);
    }
    const claim = t.closest("[data-claim]");
    if (claim) {
      if (!(await confirmDialog("Сделать себя владельцем этого персонажа? Он появится в «Мои персонажи».", { ok: "Забрать" }))) return;
      try {
        await claimCharacter(claim.dataset.claim);
        toast("Готово: персонаж теперь твой", { kind: "good" });
      } catch {
        toast("Не получилось: проверь правила Firestore", { kind: "bad" });
      }
      return;
    }
    const ob = t.closest("[data-own-board]");
    if (ob) {
      const c = (mine || []).find(x => x.id === ob.dataset.ownBoard);
      return openBoard(getBoard(ob.dataset.ownBoard).catch(() => ""), c ? c.name : "");
    }
    const board = t.closest("[data-tpl-board]");
    if (board) {
      const tp = templates.find(x => x.key === board.dataset.tplBoard);
      return tp && openBoard(tp.board, tp.c.name);
    }
    const take = t.closest("[data-tpl-take]");
    if (take) {
      const tp = templates.find(x => x.key === take.dataset.tplTake);
      return tp && takeTemplate(tp, take);
    }
    const tHide = t.closest("[data-tpl-hide]");
    if (tHide) {
      const key = tHide.dataset.tplHide;
      const on = !hiddenTpl.includes(key);
      if (on && !(await confirmDialog("Убрать этого готового персонажа с главной для всех? Вернуть можно в «Убранные».", { ok: "Убрать" }))) return;
      try {
        hiddenTpl = await setHiddenTemplates(on ? [...hiddenTpl, key] : hiddenTpl.filter(x => x !== key));
        toast(on ? "Убран с главной" : "Снова показывается всем", { timeout: 1800 });
      } catch {
        toast("Не получилось: менять список может только владелец сайта", { kind: "bad" });
      }
      return paint();
    }
    if (t.closest("[data-tpl-hidden]")) {
      showHiddenTpl = !showHiddenTpl;
      return paint();
    }
    const forget = t.closest("[data-forget]");
    if (forget) {
      removeRecent(forget.dataset.forget);
      return paint();
    }
    if (t.closest("[data-arch]")) {
      showArchived = !showArchived;
      return paint();
    }
    if (t.closest("[data-import]")) {
      const f = await pickFile("application/json,.json");
      if (!f) return;
      let c = null;
      try {
        c = importCharacter(JSON.parse(await f.text()));
      } catch {}
      if (!c) return toast("Файл не похож на лист персонажа", { kind: "bad" });
      try {
        const id = newCharId();
        await createChar(id, c);
        navigate(`#/c/${id}`);
      } catch {
        toast("Не удалось создать персонажа", { kind: "bad" });
      }
    }
  };

  root.addEventListener("click", onClick);
  paint();
  Promise.all([loadTemplates(), getHiddenTemplates()]).then(([list, hidden]) => {
    if (disposed) return;
    templates = list;
    hiddenTpl = hidden;
    paint();
    takePending();
  }).catch(() => {});

  return () => {
    disposed = true;
    clearTimeout(graceTimer);
    offMine();
    offInv();
    offAll();
    offStatus();
    offAccess();
    root.removeEventListener("click", onClick);
  };
}
