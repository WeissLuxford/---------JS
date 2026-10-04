import { normalize, newCharacter, uid, compute, importCharacter } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, timeAgo, toast, openForm, pickFile } from "./ui.js";
import { subscribeList, createChar, getMode, onStatus } from "./store.js";
import { subtitle } from "./tabs.js";
import { shortWho } from "./device.js";
import { onAccess } from "./access.js";
import { openDeviceManager, ownerSignIn, ownerSignOut } from "./admin.js";

export function mountHome(root, navigate) {
  document.title = "Листы персонажей";
  let list = null;
  let fromCache = false;
  let showArchived = false;
  let statusText = "";
  let disposed = false;
  let access = null;

  const offStatus = onStatus(st => {
    const next = st.mode === "local" ? st.error || "Только в этом браузере" : st.state === "error" || st.state === "offline" ? st.error : "";
    if (next !== statusText) {
      statusText = next;
      paint();
    }
  });

  const offAccess = onAccess(a => {
    access = a;
    paint();
  });

  const unsub = subscribeList((items, meta = {}) => {
    if (disposed) return;
    if (!items) {
      list = list || [];
      paint();
      return;
    }
    fromCache = !!meta.fromCache;
    list = items.map(x => ({ ...normalize(x), id: x.id, updatedAt: Number(x.updatedAt) || 0, updatedBy: x.updatedBy && typeof x.updatedBy === "object" ? x.updatedBy : null }));
    paint();
  });

  function charCard(c) {
    return `<a class="ch-card ${c.archived ? "arch" : ""}" href="#/c/${encodeURIComponent(c.id)}">
      <span class="ch-portrait">${c.portrait ? `<img src="${esc(c.portrait)}" alt="" loading="lazy">` : PORTRAIT_PLACEHOLDER}</span>
      <span class="ch-info">
        <span class="ch-name">${esc(c.name)}</span>
        <span class="ch-sub">${esc(subtitle(c))}</span>
        <span class="ch-sub dim">${esc([c.info.subclass, c.info.background].filter(Boolean).join(" · "))}</span>
        <span class="ch-time">${c.updatedAt ? "изменён " + timeAgo(c.updatedAt) + (shortWho(c.updatedBy) ? " · " + esc(shortWho(c.updatedBy)) : "") : ""}</span>
      </span>
    </a>`;
  }

  function paint() {
    if (disposed) return;
    if (!list || (fromCache && !list.length && navigator.onLine !== false)) {
      root.innerHTML = `<div class="loading">${icon("d20")}<span>Открываю архивы...</span></div>`;
      return;
    }
    const active = list.filter(c => !c.archived).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const archived = list.filter(c => c.archived);
    const offlineEmpty = fromCache && !list.length;
    root.innerHTML = `
      <div class="home">
        <header class="home-head">
          <div class="home-title">${icon("d20")}<div><h1>Листы персонажей</h1><p>D&amp;D 5e · все, у кого есть ссылка, могут смотреть и править</p></div></div>
          ${access && access.isOwner ? `<div class="owner-bar">${icon("shield")}<span>Ты владелец${access.locked ? " · редактирование закрыто" : ""}</span><span class="spacer"></span><button class="btn sm gold" data-devices>${icon("monitor")}Устройства</button><button class="btn sm ghost" data-owner-out>Выйти</button></div>` : ""}
          ${access && !access.canEdit ? `<div class="home-status">${icon("eye")}${access.reason === "banned" ? "Этому устройству запрещено вносить правки" : "Владелец закрыл редактирование: можно только смотреть"}</div>` : ""}
          ${statusText ? `<div class="home-status">${icon("cloudOff")}${esc(statusText)}</div>` : ""}
          ${offlineEmpty ? `<div class="home-status">${icon("cloudOff")}Нет связи с облаком: список появится, когда будет интернет</div>` : ""}
        </header>
        <div class="ch-grid">
          ${active.map(charCard).join("")}
          <button class="ch-card new" data-new>${icon("plus")}<span>Новый персонаж</span></button>
          <button class="ch-card new subtle" data-import>${icon("upload")}<span>Загрузить из файла</span></button>
        </div>
        ${archived.length ? `<div class="arch-toggle"><button class="btn ghost sm" data-arch>${icon("archive")}Архив (${archived.length})</button></div>${showArchived ? `<div class="ch-grid">${archived.map(charCard).join("")}</div>` : ""}` : ""}
        <footer class="home-foot"><a href="old/">Старый проект: Math Quiz</a><span>${getMode() === "cloud" ? "Синхронизация через облако" : "Локальный режим"}</span>${getMode() === "cloud" && access && !access.isOwner ? `<button class="link-btn" data-owner-in>${icon("shield")}Вход владельца</button>` : ""}</footer>
      </div>`;
  }

  const onClick = async e => {
    if (e.target.closest("[data-new]")) {
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
    if (e.target.closest("[data-devices]")) return openDeviceManager();
    if (e.target.closest("[data-owner-in]")) return ownerSignIn();
    if (e.target.closest("[data-owner-out]")) return ownerSignOut();
    if (e.target.closest("[data-arch]")) {
      showArchived = !showArchived;
      paint();
    }
    if (e.target.closest("[data-import]")) {
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
    unsub && unsub();
    offStatus();
    offAccess();
    root.removeEventListener("click", onClick);
  };
}
