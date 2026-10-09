import { ACCENTS, normalize } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, toast, openModal, getPath, setPath, fieldHtml, readField, cropImage, pickFile, openBoard, compressImage, confirmDialog } from "./ui.js";
import { subtitle, classOf } from "./tabs.js";
import { infoFields } from "./entities.js";
import { subscribeList, getMode, getBoard, saveBoard, removeBoard, createChar, newCharId } from "./store.js";

const STORY = [
  ["appearance", "Внешность", "gi/lorc/mirror-mirror"],
  ["traits", "Черты характера", "gi/lorc/drama-masks"],
  ["ideals", "Идеалы", "gi/delapouite/polar-star"],
  ["bonds", "Привязанности", "gi/lorc/chained-heart"],
  ["flaws", "Слабости", "gi/delapouite/achilles-heel"],
  ["backstory", "Предыстория", "gi/lorc/quill-ink"],
  ["allies", "Союзники и организации", "gi/delapouite/shaking-hands"]
];

const PAGES = {
  who: { title: "Кто это", ic: "gi/lorc/hood", sub: "Раса, класс, уровень, предыстория" },
  story: { title: "Личность", ic: "gi/lorc/drama-masks", sub: "Внешность, характер, идеалы, история" },
  mech: { title: "Механика", ic: "gi/lorc/gears", sub: "Хиты, заклинатель, скорость, защита" },
  portrait: { title: "Портрет и доска", ic: "gi/delapouite/wood-frame", sub: "Картинка персонажа и большая доска" },
  accent: { title: "Цвет листа", ic: "gi/delapouite/palette", sub: "" }
};

const KEEP = ["info", "hp", "speed", "initBonus", "hitDie", "casterType", "spellAbility", "damageSwap", "defenses", "resistances", "accent"];

function pageFields(page) {
  const all = infoFields();
  const h2 = all.findIndex(f => f.key === "_h2");
  if (page === "who") return all.slice(1, h2);
  if (page === "mech") return all.slice(h2 + 1).filter(f => f.key !== "accent");
  if (page === "story") return STORY.map(([k, l]) => ({ key: "personality." + k, label: l, type: "textarea", rows: 3, span: 3, placeholder: l }));
  return [];
}

const avatar = src => (src ? `<img src="${esc(src)}" alt="">` : PORTRAIT_PLACEHOLDER);
const clsIcon = c => {
  const k = classOf(c);
  return k ? `<i class="pf-cls" title="${esc(k.name)}" style="--k:${k.color}">${icon(k.icon)}</i>` : "";
};
const avatarBox = (src, c) => `<span class="pf-avw"><span class="pf-av">${avatar(src)}</span>${clsIcon(c)}</span>`;

export function installProfile(X) {
  const { S, navigate } = X;
  let open = null;

  function profile(page = "") {
    if (open) return open.go(page);
    let cur = "";
    let dirty = false;
    let mine = [];
    let listOpen = false;
    const m = openModal({
      cls: "profile",
      body: `<div class="pf" data-pf></div>`,
      onClose: () => {
        off();
        open = null;
        if (dirty && !S.disposed) X.renderAll(true);
      }
    });
    const host = m.body.querySelector("[data-pf]");
    const off = subscribeList(items => {
      mine = (Array.isArray(items) ? items : []).filter(x => !x.archived);
      if (!cur && m.el.isConnected) paintList();
    }, "mine");

    function charRows() {
      const rows = [];
      const self = mine.find(x => x.id === X.id);
      const others = mine.filter(x => x.id !== X.id);
      rows.push(`<div class="pf-char on">${avatarBox(S.c.portrait || (self && self.portrait), S.c)}<span><b>${esc(S.c.name)}</b><small>${esc(subtitle(S.c))}</small></span>${icon("check")}</div>`);
      others.forEach(x => rows.push(`<button class="pf-char" data-go="${esc(x.id)}">${avatarBox(x.portrait, normalize(x))}<span><b>${esc(x.name || "Без имени")}</b><small>${esc(subtitle(normalize(x)))}</small></span></button>`));
      if (getMode() !== "cloud" || S.access.canCreate) rows.push(`<button class="pf-char pf-new" data-new><span class="pf-av">${icon("plus")}</span><span><b>Новый персонаж</b></span></button>`);
      rows.push(`<a class="pf-char pf-all" href="#/"><span class="pf-av">${icon("people")}</span><span><b>Все персонажи</b></span></a>`);
      return rows.join("");
    }

    function paintList() {
      const box = host.querySelector("[data-pf-list]");
      if (box) box.innerHTML = charRows();
    }

    function rootPage() {
      const sections = Object.entries(PAGES).map(([k, p]) => `<button class="menu-item" data-pf-go="${k}">${icon(p.ic)}<span>${esc(p.title)}${p.sub ? `<small>${esc(p.sub)}</small>` : ""}</span></button>`).join("");
      const files = X.fileItems().map(([act, ic, l]) => `<button class="menu-item" data-m="${act}">${icon(ic)}<span>${esc(l)}</span></button>`).join("");
      return `<header class="pf-head">
          <span class="pf-pw"${(k => (k ? ` style="--k:${k.color}"` : ""))(classOf(S.c))}><button class="pf-portrait" data-pf-go="portrait" aria-label="Портрет">${avatar(S.c.portrait)}</button>${clsIcon(S.c)}</span>
          <button class="pf-id" data-pf-go="who"><b>${esc(S.c.name)}</b><small>${esc(subtitle(S.c))}</small></button>
        </header>
        <button class="pf-switch ${listOpen ? "on" : ""}" data-pf-toggle aria-expanded="${listOpen}"><span>Мои персонажи</span>${icon("down")}</button>
        <div class="pf-list" data-pf-list ${listOpen ? "" : "hidden"}>${charRows()}</div>
        <div class="menu-group"><h4>Персонаж</h4><div class="menu-list">${sections}</div></div>
        <div class="menu-group"><h4>Лист и файлы</h4><div class="menu-list">${files}</div></div>`;
    }

    function formPage(page) {
      return `<div class="form-grid pf-form">${pageFields(page).map(f => fieldHtml(f, getPath(S.c, f.key))).join("")}</div>`;
    }

    function accentPage() {
      return `<div class="pf-accents">${Object.entries(ACCENTS).map(([k, a]) => `<button class="pf-accent ${S.c.accent === k ? "on" : ""}" data-accent="${k}" style="--a:${a.c[0]};--b:${a.c[1]};--d:${a.c[2]}"><i></i><span>${esc(a.name)}</span></button>`).join("")}</div>`;
    }

    function portraitPage() {
      const ro = X.readOnly();
      const hasBoard = !!(S.preview || S.c.boardAt);
      const boardBtns = hasBoard
        ? `<button class="btn gold" data-board-open>${icon("frame")}Открыть доску</button>${ro ? "" : `<span class="spacer"></span><button class="btn ghost" data-board-up>${icon("upload")}Заменить</button><button class="btn ghost" data-board-rm aria-label="Удалить доску">${icon("trash")}</button>`}`
        : ro ? `<p class="empty">Доски нет</p>` : `<button class="btn" data-board-up>${icon("upload")}Загрузить доску</button>`;
      return `<div class="portrait-big">${avatar(S.c.portrait)}</div>
        ${ro ? "" : `<div class="form-actions">${S.c.portrait ? `<button class="btn danger" data-rm>${icon("trash")}Убрать</button><span class="spacer"></span><button class="btn" data-crop>${icon("target")}Изменить кадр</button>` : `<span class="spacer"></span>`}<button class="btn gold" data-up>${icon("upload")}Загрузить картинку</button></div>
        <p class="hint">После выбора картинки можно подвинуть и приблизить нужную часть. Портрет сохранится вместе с персонажем.</p>`}
        <div class="pb-board"><h4>${icon("gi/delapouite/wood-frame")}Доска персонажа</h4>${ro ? "" : `<p class="hint">Большая картинка с артом и описанием, как у готовых персонажей. Видна всем, кто может открыть лист, и открывается с карточки на главной.</p>`}<div class="form-actions">${boardBtns}</div></div>`;
    }

    function go(page = "") {
      cur = PAGES[page] ? page : "";
      const p = PAGES[cur];
      const body = !cur ? rootPage() : cur === "accent" ? accentPage() : cur === "portrait" ? portraitPage() : formPage(cur);
      host.innerHTML = cur ? `<div class="pf-bar"><button class="icon-btn" data-pf-back aria-label="Назад">${icon("back")}</button><h3>${icon(p.ic)}${esc(p.title)}</h3></div><div class="pf-page" data-page="${cur}">${body}</div>` : body;
      if (X.readOnly()) host.querySelectorAll(".pf-page input, .pf-page select, .pf-page textarea, [data-accent]").forEach(el => (el.disabled = true));
      m.body.scrollTop = 0;
      m.el.querySelector(".modal").scrollTop = 0;
    }

    function redraw() {
      dirty = false;
      X.renderAll(true);
      go(cur);
    }

    function save(e) {
      const el = e.target.closest("[data-k]");
      if (!el || !cur || X.readOnly()) return;
      const f = pageFields(cur).find(x => x.key === el.dataset.k);
      if (!f) return;
      const text = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text");
      if (e.type === "input" && !text) return;
      const v = readField(host, f);
      const name = f.key === "name" && e.type === "change" && !String(v || "").trim();
      if (!name && JSON.stringify(v) === JSON.stringify(getPath(S.c, f.key))) return;
      const ok = X.mutate(c => {
        setPath(c, f.key, v);
        if (name) c.name = "Без имени";
        const n = normalize(c);
        for (const k of KEEP) c[k] = n[k];
        X.clampHp(c);
      }, { render: false });
      if (!ok) return;
      dirty = true;
      if (name) el.value = S.c.name;
      if (!text) {
        dirty = false;
        X.renderAll(true);
      }
    }

    host.addEventListener("input", save);
    host.addEventListener("change", save);
    host.addEventListener("click", async e => {
      const t = e.target;
      const g = t.closest("[data-pf-go]");
      if (g) return go(g.dataset.pfGo);
      if (t.closest("[data-pf-back]")) return go("");
      const tg = t.closest("[data-pf-toggle]");
      if (tg) {
        listOpen = !listOpen;
        tg.classList.toggle("on", listOpen);
        tg.setAttribute("aria-expanded", String(listOpen));
        host.querySelector("[data-pf-list]").hidden = !listOpen;
        return;
      }
      const ch = t.closest("[data-go]");
      if (ch) {
        m.close();
        return navigate(`#/c/${encodeURIComponent(ch.dataset.go)}`);
      }
      if (t.closest("[data-new]")) {
        m.close();
        return import("./creator.js").then(({ openCreator }) => openCreator({
          onCreate: c => {
            const nid = newCharId();
            createChar(nid, c).then(() => navigate(`#/c/${nid}`)).catch(() => toast("Не удалось создать персонажа", { kind: "bad" }));
          },
          onBlank: () => navigate("#/")
        }));
      }
      const mi = t.closest("[data-m]");
      if (mi) {
        m.close();
        return X.runAction(mi.dataset.m);
      }
      const ac = t.closest("[data-accent]");
      if (ac) {
        if (X.mutate(c => { c.accent = ac.dataset.accent; }, { render: false })) redraw();
        return;
      }
      if (t.closest("[data-board-open]")) return openBoard(S.preview ? `assets/templates/${S.preview}-board.webp` : S.c.boardAt ? getBoard(X.id).catch(() => "") : "", S.c.name);
      const bUp = t.closest("[data-board-up]");
      if (bUp) {
        const file = await pickFile("image/*");
        if (!file || S.disposed) return;
        bUp.disabled = true;
        try {
          const data = await compressImage(file);
          if (!data) throw new Error("Картинка слишком большая даже после сжатия");
          await saveBoard(X.id, data);
          if (X.mutate(c => { c.boardAt = Date.now(); }, { render: false })) redraw();
          toast(`${icon("frame")} Доска сохранена`, { kind: "good" });
        } catch (err) {
          bUp.disabled = false;
          toast(esc((err && err.message && !/permission/i.test(err.message) ? err.message : "") || "Не получилось сохранить доску"), { kind: "bad", timeout: 6000 });
        }
        return;
      }
      if (t.closest("[data-board-rm]")) {
        if (!(await confirmDialog("Удалить доску персонажа?", { ok: "Удалить", danger: true }))) return;
        try {
          await removeBoard(X.id);
          if (X.mutate(c => { c.boardAt = 0; }, { render: false })) redraw();
        } catch {
          toast("Не получилось удалить доску", { kind: "bad" });
        }
        return;
      }
      const setPortrait = data => {
        if (data && !S.disposed && X.mutate(c => { c.portrait = data; }, { render: false })) redraw();
      };
      if (t.closest("[data-up]")) {
        const file = await pickFile("image/*");
        if (!file) return;
        try {
          setPortrait(await cropImage(file));
        } catch {
          toast("Не получилось прочитать картинку", { kind: "bad" });
        }
        return;
      }
      if (t.closest("[data-crop]")) {
        try {
          setPortrait(await cropImage(S.c.portrait));
        } catch {
          toast("Не получилось открыть картинку", { kind: "bad" });
        }
        return;
      }
      if (t.closest("[data-rm]") && X.mutate(c => { c.portrait = ""; }, { render: false })) redraw();
    });

    const box = m.el.querySelector(".modal");
    let sx = 0;
    let sy = 0;
    box.addEventListener("touchstart", e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    box.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      if (sx - t.clientX > 70 && Math.abs(t.clientY - sy) < 50) m.close();
    }, { passive: true });

    open = { go };
    go(page);
  }

  let edge = null;
  const onStart = e => {
    const t = e.touches[0];
    edge = t.clientX < 28 && !open && !document.querySelector(".modal-back") && !S.disposed ? { x: t.clientX, y: t.clientY } : null;
  };
  const onMove = e => {
    if (!edge) return;
    const t = e.touches[0];
    if (Math.abs(t.clientY - edge.y) > 40) edge = null;
    else if (t.clientX - edge.x > 60) {
      edge = null;
      profile();
    }
  };
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: true });
  const offProfile = () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
  };

  Object.assign(X, { profile, offProfile });
}
