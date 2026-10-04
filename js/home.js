import { normalize, newCharacter, uid, compute, importCharacter } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, timeAgo, toast, openForm, openModal, pickFile, confirmDialog } from "./ui.js";
import { subscribeList, subscribeInvites, createChar, getMode, onStatus, getRecents, removeRecent, claimCharacter } from "./store.js";
import { onAccess, signIn, signOut, IN_APP, getAccess } from "./access.js";
import { subtitle } from "./tabs.js";
import { shortWho } from "./device.js";
import { openShare } from "./share.js";
import { openAccounts } from "./admin.js";

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

  const offStatus = onStatus(st => {
    const next = st.mode === "local" ? st.error || "Только в этом браузере" : st.state === "error" || st.state === "offline" ? st.error : "";
    if (next !== statusText) {
      statusText = next;
      paint();
    }
  });

  const toChar = x => ({ ...normalize(x), id: x.id, ownerUid: x.ownerUid || "", ownerName: x.ownerName || "", updatedAt: Number(x.updatedAt) || 0, updatedBy: x.updatedBy && typeof x.updatedBy === "object" ? x.updatedBy : null });

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
    });
    if (access.isAdmin) {
      offAll = subscribeList(items => {
        if (disposed) return;
        all = items ? items.map(toChar) : [];
        paint();
      }, "all");
    }
  }

  const offAccess = onAccess(a => {
    access = a;
    if (!a.ready && getMode() === "cloud") return;
    resubscribe();
    paint();
  });

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
      ${owner ? `<button class="ch-share" data-share="${esc(c.id)}" title="Поделиться">${icon("link")}<span>Поделиться</span></button>` : ""}
    </article>`;
  }

  function miniCard(x, kind) {
    return `<article class="ch-card mini">
      <a class="ch-link" href="#/c/${encodeURIComponent(x.id)}" aria-label="${esc(x.name)}"></a>
      <span class="ch-portrait small">${icon(kind === "invite" ? "edit" : "eye")}</span>
      <span class="ch-info">
        <span class="ch-name">${esc(x.name || "Без имени")}</span>
        <span class="ch-sub">${kind === "invite" ? `Можно править · владелец ${esc(x.ownerName || "неизвестен")}` : "Только просмотр"}</span>
        <span class="ch-time">${x.at ? (kind === "invite" ? "доступ дан " : "открыт ") + timeAgo(x.at) : ""}</span>
      </span>
      ${kind === "recent" ? `<button class="ch-x" data-forget="${esc(x.id)}" title="Убрать из списка">${icon("close")}</button>` : ""}
    </article>`;
  }

  function accountBar() {
    if (getMode() !== "cloud" || !access.ready) return "";
    if (!access.signedIn) {
      return `<section class="signin">
        <div class="signin-text">${icon("user")}<div><b>Войди через Google</b><small>Чтобы создавать своих персонажей и править те, к которым тебе дали доступ. Смотреть листы по ссылке можно и без входа.</small>${IN_APP ? `<small class="warn">Похоже, сайт открыт внутри приложения (Telegram, Instagram и т.п.). Google не пускает войти оттуда: открой ссылку в Chrome или Safari.</small>` : ""}${access.authError ? `<small class="warn">${esc(access.authError)}</small>` : ""}</div></div>
        <button class="btn gold" data-signin>${icon("user")}Войти через Google</button>
      </section>`;
    }
    return `<section class="account">
      <span class="acc-ava">${access.photo ? `<img src="${esc(access.photo)}" alt="" referrerpolicy="no-referrer">` : icon("user")}</span>
      <div class="acc-main"><b>${esc(access.name)}</b>${access.isAdmin ? `<span class="hist-tag gold">владелец сайта</span>` : ""}${access.banned ? `<span class="hist-tag bad">аккаунт запрещён</span>` : ""}<small>${esc(access.email)}</small></div>
      <div class="acc-actions">${access.isAdmin ? `<button class="btn sm gold" data-accounts>${icon("people")}Аккаунты</button>` : ""}<button class="btn sm ghost" data-myid>${icon("info")}Мой ID</button><button class="btn sm ghost" data-signout>Выйти</button></div>
    </section>`;
  }

  function section(title, ic, body) {
    return `<section class="home-sec"><header class="home-sec-h">${icon(ic)}<h2>${esc(title)}</h2></header>${body}</section>`;
  }

  function paint() {
    if (disposed) return;
    const cloud = getMode() === "cloud";
    if ((cloud && !access.ready) || mine === null || (fromCache && !mine.length && navigator.onLine !== false && access.signedIn)) {
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
    const recents = getRecents().filter(x => !mineIds.has(x.id) && !invIds.has(x.id));
    const others = all ? all.filter(c => !mineIds.has(c.id)) : [];
    const createCards = canCreate
      ? `<button class="ch-card new" data-new>${icon("plus")}<span>Новый персонаж</span></button><button class="ch-card new subtle" data-import>${icon("upload")}<span>Загрузить из файла</span></button>`
      : "";
    const mySection = !cloud || open || access.signedIn
      ? section(cloud && !open ? "Мои персонажи" : "Персонажи", "user", `<div class="ch-grid">${active.map(c => charCard(c)).join("")}${createCards}</div>
          ${archived.length ? `<div class="arch-toggle"><button class="btn ghost sm" data-arch>${icon("archive")}Архив (${archived.length})</button></div>${showArchived ? `<div class="ch-grid">${archived.map(c => charCard(c)).join("")}</div>` : ""}` : ""}`)
      : "";
    const adminSection = access.isAdmin && others.length
      ? section("Все остальные персонажи сайта", "shield", `<div class="ch-grid">${others.map(c => charCard(c, { owner: false, badge: c.ownerUid ? `владелец: ${esc(c.ownerName || c.ownerUid.slice(0, 8))}` : `<button class="btn sm gold ch-claim" data-claim="${esc(c.id)}">${icon("check")}Без владельца: забрать себе</button>` })).join("")}</div>`)
      : "";
    root.innerHTML = `
      <div class="home">
        <header class="home-head">
          <div class="home-title">${icon("d20")}<div><h1>Листы персонажей</h1><p>D&amp;D 5e в стиле Baldur's Gate 3</p></div></div>
          ${statusText ? `<div class="home-status">${icon("cloudOff")}${esc(statusText)}</div>` : ""}
          ${accountBar()}
        </header>
        ${mySection}
        ${inv.length ? section("Со мной поделились", "edit", `<div class="ch-grid">${inv.map(x => miniCard(x, "invite")).join("")}</div>`) : ""}
        ${recents.length ? section("Недавно открытые", "eye", `<div class="ch-grid">${recents.map(x => miniCard(x, "recent")).join("")}</div>`) : ""}
        ${adminSection}
        <footer class="home-foot"><a href="old/">Старый проект: Math Quiz</a><span>${cloud ? "Синхронизация через облако" : "Локальный режим"}</span></footer>
      </div>`;
  }

  function createFlow() {
    openForm({
      title: "Новый персонаж",
      fields: [
        { key: "name", label: "Имя", span: 3 },
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
        const id = uid();
        createChar(id, c).then(() => navigate(`#/c/${id}`)).catch(() => toast("Не удалось создать персонажа", { kind: "bad" }));
      }
    });
  }

  function showMyId() {
    const m = openModal({
      title: "Мой ID",
      cls: "small",
      body: `<p class="hint">Это ID твоего аккаунта. Владельцу сайта он нужен, чтобы вписать себя в правила Firestore.</p><input class="copy-input" readonly value="${esc(access.uid)}"><div class="form-actions"><button class="btn gold" data-copyid>${icon("copy")}Скопировать</button></div>`
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
    const t = e.target;
    if (t.closest("[data-new]")) return createFlow();
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
    if (t.closest("[data-accounts]")) return openAccounts();
    const share = t.closest("[data-share]");
    if (share) {
      const c = [...(mine || []), ...(all || [])].find(x => x.id === share.dataset.share);
      return c && openShare(c);
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
        const id = uid();
        await createChar(id, c);
        navigate(`#/c/${id}`);
      } catch {
        toast("Не удалось создать персонажа", { kind: "bad" });
      }
    }
  };

  root.addEventListener("click", onClick);
  paint();

  return () => {
    disposed = true;
    offMine();
    offInv();
    offAll();
    offStatus();
    offAccess();
    root.removeEventListener("click", onClick);
  };
}
