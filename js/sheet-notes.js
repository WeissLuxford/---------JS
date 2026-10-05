import { uid } from "./rules.js";
import { icon } from "./icons.js";
import { esc, toast, openModal, rich, attachLinkSuggest } from "./ui.js";
import { NOTE_SECTIONS, SECTION_NAME, currentSession, newSession, appendEntry, linkTargets, queryStems, markMatches, searchNotes } from "./notes.js";

const RECENT_KEY = "dnd.notes.recent.";

export function loadRecent(id) {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY + id) || "[]");
    return Array.isArray(v) ? v.filter(x => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function installNotes(X) {
  const { S, root, id } = X;
  const targets = () => linkTargets(S.c);

  function openNote(sec, nid) {
    const n = ((S.c && S.c.notes[sec]) || []).find(x => x.id === nid);
    if (!n) return toast("Заметка не найдена: возможно, её удалили", { kind: "bad" });
    Object.assign(S.ui, { notesSection: sec, notesQ: "", noteTag: "", peopleAtt: "all", clueState: "all", ordering: false });
    S.ui.noteOpen[nid] = true;
    if (S.tab !== "notes") {
      S.scroll[S.tab] = window.scrollY;
      S.tab = "notes";
      history.replaceState(history.state, "", X.here("notes"));
      X.renderAll(true);
    } else X.renderTab();
    requestAnimationFrame(() => {
      const el = root.querySelector(`article.note[data-rid="${CSS.escape(nid)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 1800);
    });
  }

  function journalAdd(text, { quiet = false } = {}) {
    const clean = String(text || "").trim();
    if (!clean) return false;
    const now = Date.now();
    let created = "";
    const ok = X.mutate(ch => {
      const list = ch.notes.sessions;
      let cur = currentSession(ch, now);
      if (!cur) {
        list.forEach(n => (n.collapsed = true));
        cur = newSession(ch, now, "nt-" + uid());
        list.unshift(cur);
        created = cur.title;
      }
      cur.text = appendEntry(cur.text, clean, now);
      cur.touched = now;
      cur.collapsed = false;
    });
    if (ok === false) return false;
    if (!quiet) toast(`${icon("quill")} ${created ? `Начата «${esc(created)}». ` : ""}Записано в журнал`, { kind: "good", timeout: 1800 });
    return true;
  }

  function startSession() {
    const now = Date.now();
    let title = "";
    X.mutate(ch => {
      ch.notes.sessions.forEach(n => (n.collapsed = true));
      const n = newSession(ch, now, "nt-" + uid());
      title = n.title;
      ch.notes.sessions.unshift(n);
    });
    S.ui.notesSection = "sessions";
    toast(`${icon("notebook")} Начата «${esc(title)}»`, { kind: "good", timeout: 1800 });
    focusJournal();
  }

  function focusJournal() {
    requestAnimationFrame(() => {
      const ta = root.querySelector("[data-journal]");
      if (ta) ta.focus();
    });
  }

  function togglePin(sec, nid) {
    let on = false;
    X.mutate(ch => {
      const n = (ch.notes[sec] || []).find(x => x.id === nid);
      if (!n) return;
      n.pinned = !n.pinned;
      on = n.pinned;
    });
    toast(on ? `${icon("star")} Закреплено в «Важном»: видно сверху заметок и во вкладке «Бой»` : "Откреплено", { timeout: 2200 });
  }

  function addNote(sec, title, text) {
    const n = { id: "nt-" + uid(), title: String(title || "").slice(0, 120), subtitle: "", text: String(text || ""), tags: "", created: Date.now(), collapsed: false, pinned: false };
    if (X.mutate(ch => { ch.notes[sec].unshift(n); }) === false) return null;
    return n;
  }

  function createFromLink(name) {
    if (X.readOnly()) return;
    const secs = NOTE_SECTIONS.filter(s => s.key !== "sessions");
    const m = openModal({
      title: `Создать «${name}»`,
      cls: "small",
      body: `<p class="hint">Куда положить новую заметку? Ссылки на «${esc(name)}» сразу станут рабочими.</p><div class="menu-list">${secs.map(s => `<button class="menu-item" data-sec="${s.key}">${icon(s.icon)}<span><b>${esc(s.name)}</b></span></button>`).join("")}</div>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-sec]");
      if (!b) return;
      m.close();
      X.editNote(b.dataset.sec, null, { title: name });
    });
  }

  function quickNote(preset = "sessions") {
    if (X.readOnly()) return toast("Лист открыт только для чтения", { kind: "bad" });
    const kinds = [["sessions", "В журнал", "notebook"], ["people", "Человек", "people"], ["places", "Место", "map"], ["quests", "Задание", "flag"], ["clues", "Улика", "monocle"], ["misc", "Прочее", "scroll"]];
    const st = { to: preset };
    const recent = () => {
      const cur = currentSession(S.c);
      const lines = cur ? String(cur.text || "").split("\n").filter(l => /^- \*\*\d\d:\d\d\*\*/.test(l)).slice(-3) : [];
      return lines.length ? `<div class="qn-recent"><span>${esc(cur.title)}: последние записи</span>${rich(lines.join("\n"))}</div>` : "";
    };
    const m = openModal({
      title: "Быстрая заметка",
      cls: "small quick-note",
      body: `<div class="qn-to" role="radiogroup" aria-label="Куда записать">${kinds.map(([k, l, ic]) => `<button type="button" class="chip toggle ${k === st.to ? "on" : ""}" data-to="${k}" role="radio" aria-checked="${k === st.to ? "true" : "false"}">${icon(ic)}${l}</button>`).join("")}</div>
        <label class="fld qn-title" ${st.to === "sessions" ? "hidden" : ""}><span>Название</span><input type="text" data-qn-title maxlength="120" placeholder="Можно пусто: возьмётся первая строка"></label>
        <textarea data-qn-text rows="4" placeholder="Что запомнить? [[ : ссылка на человека, место или задание"></textarea>
        <p class="hint">Ctrl+Enter: записать. Разложить по разделам можно потом.</p>
        <div data-qn-recent>${recent()}</div>
        <div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn" data-qn-more>Записать и ещё</button><button class="btn gold" data-qn-save>${icon("check")}Записать</button></div>`
    });
    const ta = m.body.querySelector("[data-qn-text]");
    const ti = m.body.querySelector("[data-qn-title]");
    attachLinkSuggest(ta, targets);
    setTimeout(() => ta.focus(), 60);
    const save = keep => {
      const text = ta.value.trim();
      if (!text && !ti.value.trim()) return toast("Пустую заметку не сохраняю", { kind: "info", timeout: 1600 });
      if (st.to === "sessions") {
        if (!journalAdd(text, { quiet: keep })) return;
      } else {
        const lines = text.split("\n");
        const title = ti.value.trim() || lines[0].replace(/^[-#>*\s]+/, "").slice(0, 80);
        const body = ti.value.trim() ? text : lines.slice(1).join("\n").trim();
        const n = addNote(st.to, title, body);
        if (!n) return;
        toast(`${icon("check")} Добавлено в «${esc(SECTION_NAME[st.to])}»: ${esc(title)}`, { kind: "good", timeout: 2200 });
      }
      if (!keep) return m.close();
      ta.value = "";
      ti.value = "";
      m.body.querySelector("[data-qn-recent]").innerHTML = recent();
      ta.focus();
    };
    m.body.addEventListener("click", e => {
      const to = e.target.closest("[data-to]");
      if (to) {
        st.to = to.dataset.to;
        m.body.querySelectorAll("[data-to]").forEach(b => {
          b.classList.toggle("on", b === to);
          b.setAttribute("aria-checked", String(b === to));
        });
        m.body.querySelector(".qn-title").hidden = st.to === "sessions";
        m.body.querySelector("[data-qn-recent]").hidden = st.to !== "sessions";
        return ta.focus();
      }
      if (e.target.closest("[data-qn-save]")) return save(false);
      if (e.target.closest("[data-qn-more]")) return save(true);
    });
    m.body.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        save(false);
      }
    });
  }

  function saveRecent(q) {
    const clean = String(q || "").trim();
    if (clean.length < 2 || !searchNotes(S.c, clean).length) return;
    const list = [clean, ...(S.ui.notesRecent || []).filter(x => x.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
    S.ui.notesRecent = list;
    try {
      localStorage.setItem(RECENT_KEY + id, JSON.stringify(list));
    } catch {}
  }

  function afterNotesRender() {
    const body = root.querySelector("[data-body]");
    if (!body || S.tab !== "notes") return;
    const ta = body.querySelector("[data-journal]");
    if (ta) attachLinkSuggest(ta, targets);
    const q = String(S.ui.notesQ || "").trim();
    if (q) body.querySelectorAll("[data-notes-list] .note-text").forEach(el => markMatches(el, queryStems(q)));
  }

  Object.assign(X, { openNote, journalAdd, startSession, focusJournal, togglePin, createFromLink, quickNote, saveRecent, afterNotesRender });
}
