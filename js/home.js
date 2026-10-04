import { normalize, newCharacter, uid } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, timeAgo, toast, openForm, pickFile } from "./ui.js";
import { subscribeList, createChar, getMode, onStatus } from "./store.js";
import { subtitle } from "./tabs.js";

export function mountHome(root, navigate) {
  document.title = "Листы персонажей";
  let list = null;
  let showArchived = false;
  let statusText = "";

  const offStatus = onStatus(st => {
    statusText = st.mode === "local" ? st.error || "Только в этом браузере" : st.state === "error" ? st.error : "";
    paint();
  });

  const unsub = subscribeList((items, err) => {
    if (err) {
      list = list || [];
      paint();
      return;
    }
    list = items.map(x => ({ ...normalize(x), id: x.id, updatedAt: x.updatedAt || 0 }));
    paint();
  });

  function charCard(c) {
    return `<a class="ch-card ${c.archived ? "arch" : ""}" href="#/c/${encodeURIComponent(c.id)}">
      <span class="ch-portrait">${c.portrait ? `<img src="${esc(c.portrait)}" alt="" loading="lazy">` : PORTRAIT_PLACEHOLDER}</span>
      <span class="ch-info">
        <span class="ch-name">${esc(c.name)}</span>
        <span class="ch-sub">${esc(subtitle(c))}</span>
        <span class="ch-sub dim">${esc([c.info.subclass, c.info.background].filter(Boolean).join(" · "))}</span>
        <span class="ch-time">${c.updatedAt ? "изменён " + timeAgo(c.updatedAt) : ""}</span>
      </span>
    </a>`;
  }

  function paint() {
    if (!list) {
      root.innerHTML = `<div class="loading">${icon("d20")}<span>Открываю архивы...</span></div>`;
      return;
    }
    const active = list.filter(c => !c.archived).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const archived = list.filter(c => c.archived);
    root.innerHTML = `
      <div class="home">
        <header class="home-head">
          <div class="home-title">${icon("d20")}<div><h1>Листы персонажей</h1><p>D&amp;D 5e · все, у кого есть ссылка, могут смотреть и править</p></div></div>
          ${statusText ? `<div class="home-status">${icon("cloudOff")}${esc(statusText)}</div>` : ""}
        </header>
        <div class="ch-grid">
          ${active.map(charCard).join("")}
          <button class="ch-card new" data-new>${icon("plus")}<span>Новый персонаж</span></button>
          <button class="ch-card new subtle" data-import>${icon("upload")}<span>Загрузить из файла</span></button>
        </div>
        ${archived.length ? `<div class="arch-toggle"><button class="btn ghost sm" data-arch>${icon("archive")}Архив (${archived.length})</button></div>${showArchived ? `<div class="ch-grid">${archived.map(charCard).join("")}</div>` : ""}` : ""}
        <footer class="home-foot"><a href="old/">Старый проект: Math Quiz</a><span>${getMode() === "cloud" ? "Синхронизация через облако" : "Локальный режим"}</span></footer>
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
          const id = uid();
          createChar(id, c).then(() => navigate(`#/c/${id}`)).catch(() => toast("Не удалось создать персонажа", { kind: "bad" }));
        }
      });
    }
    if (e.target.closest("[data-arch]")) {
      showArchived = !showArchived;
      paint();
    }
    if (e.target.closest("[data-import]")) {
      const f = await pickFile("application/json,.json");
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        const c = normalize(data.character || data);
        const id = uid();
        await createChar(id, { ...c, archived: false });
        navigate(`#/c/${id}`);
      } catch {
        toast("Файл не похож на лист персонажа", { kind: "bad" });
      }
    }
  };

  root.addEventListener("click", onClick);
  paint();

  return () => {
    unsub && unsub();
    offStatus();
    root.removeEventListener("click", onClick);
  };
}
