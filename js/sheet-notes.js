import { uid, payCoins, coinsText, COINS, xpInfo } from "./rules.js";
import { icon } from "./icons.js";
import { esc, toast, openModal, openForm, rich, attachLinkSuggest } from "./ui.js";
import { noteReadHtml } from "./tabs.js";
import { sealFx, inkLast, flip } from "./paper-fx.js";
import { NOTE_SECTIONS, SECTION_NAME, currentSession, newSession, appendEntry, linkTargets, queryStems, markMatches, searchNotes, questionClues } from "./notes.js";
import { entryHints, mergeHints, liveHints, itemFromHint } from "./note-hints.js";

const RECENT_KEY = "dnd.notes.recent.";
const IGNORE_KEY = "dnd.notes.ignore.";
const HINTS_KEY = "dnd.notes.hints.";
const DONE_KEY = "dnd.notes.done.";
const SKIPS_KEY = "dnd.notes.skips.";
const MERGE_KEY = "dnd.notes.merge-skip.";

function loadJson(key, fallback, ok) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return ok(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

const isList = v => Array.isArray(v);

const loadIgnore = id => loadJson(IGNORE_KEY + id, [], isList).filter(x => typeof x === "string").slice(-300);

const LOWER = { pp: ["gp", 10], gp: ["sp", 10], ep: ["sp", 5], sp: ["cp", 10] };

function wholeCoins(amount, unit) {
  let a = amount;
  let u = unit;
  while (!Number.isInteger(Math.round(a * 1000) / 1000) && LOWER[u]) {
    a *= LOWER[u][1];
    u = LOWER[u][0];
  }
  return [Math.round(a), u];
}

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
  if (!S.ui.jHints) S.ui.jHints = loadJson(HINTS_KEY + id, [], isList).filter(h => h && typeof h.key === "string" && ["name", "coins", "dead", "alias", "att", "quest", "qdone", "item", "xp", "level", "ask", "answer"].includes(h.kind));

  const ignoreKeys = () => [...new Set([...((S.c && S.c.hintIgnore) || []).map(x => x.k), ...loadIgnore(id), ...loadJson(MERGE_KEY + id, [], isList).filter(x => typeof x === "string")])];
  const syncSkip = () => {
    S.ui.mergeSkip = ignoreKeys().filter(k => k.startsWith("merge:"));
  };
  syncSkip();

  function addIgnore(k, t) {
    if (X.readOnly()) {
      saveJson(IGNORE_KEY + id, [...loadIgnore(id).filter(x => x !== k), k].slice(-300));
    } else {
      X.mutate(ch => {
        ch.hintIgnore = [...(ch.hintIgnore || []).filter(x => x.k !== k), { k, t: String(t || "").slice(0, 120) }].slice(-500);
      });
    }
    syncSkip();
  }

  function hiddenHints() {
    const kindOf = k => (k.startsWith("merge:") ? "это разные" : k.startsWith("alias:") ? "не то же имя" : "не имя");
    const draw = () => {
      const list = ((S.c && S.c.hintIgnore) || []).slice().reverse();
      return list.length
        ? `<p class="hint">Скрипт больше не предлагает эти подсказки. «Вернуть», и он снова будет их замечать.</p><div class="menu-list">${list.map(x => `<div class="menu-item hh-row"><span><b>${esc(x.t || x.k)}</b><small>${kindOf(x.k)}</small></span><button class="btn ghost sm" data-hh="${esc(x.k)}">Вернуть</button></div>`).join("")}</div>`
        : `<p class="hint">Скрытых подсказок нет.</p>`;
    };
    const m = openModal({ title: "Скрытые подсказки", cls: "small", body: draw() });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-hh]");
      if (!b) return;
      const k = b.dataset.hh;
      X.mutate(ch => {
        ch.hintIgnore = (ch.hintIgnore || []).filter(x => x.k !== k);
      });
      saveJson(IGNORE_KEY + id, loadIgnore(id).filter(x => x !== k));
      saveJson(MERGE_KEY + id, loadJson(MERGE_KEY + id, [], isList).filter(x => x !== k));
      const skips = loadJson(SKIPS_KEY + id, {}, v => v && typeof v === "object" && !Array.isArray(v));
      delete skips[k];
      saveJson(SKIPS_KEY + id, skips);
      syncSkip();
      m.body.innerHTML = draw();
      X.renderTab();
    });
  }

  function offerHints(text) {
    const clean = String(text || "").trim();
    if (!clean || X.readOnly()) return [];
    let fresh = [];
    try {
      const done = new Set(loadJson(DONE_KEY + id, [], isList));
      fresh = entryHints(S.c, clean, { ignore: ignoreKeys() }).filter(h => !done.has(h.key)).map(h => ({ ...h, src: clean.slice(0, 220) }));
    } catch (e) {
      console.warn("hints", e);
    }
    return fresh;
  }

  function openLetter(qid, answer = "") {
    const q = (S.c.notes.questions || []).find(x => x.id === qid);
    if (!q) return;
    const clue = answer || (questionClues(S.c, q, 1)[0] || {}).text || "";
    openForm({
      title: "Вскрыть письмо",
      fields: [{ key: "answer", label: `Ответ на «${q.title}»`, type: "textarea", rows: 4, span: 3, placeholder: "Что выяснили и откуда" }],
      value: { answer: q.answer || clue },
      saveLabel: "Вскрыть",
      onSave: val => {
        const text = String(val.answer || "").trim();
        undoable(`Вскрыто: ${q.title}`, S.ui.jHints || [], () => X.mutate(ch => {
          const n = (ch.notes.questions || []).find(x => x.id === qid);
          if (!n) return;
          n.status = "answered";
          n.answer = text;
          n.updated = Date.now();
        }), () => `${icon("gi/lorc/envelope")} Письмо вскрыто: «${esc(q.title)}». Оно во «Вскрытых»`);
        sealFx("crack");
        return true;
      }
    });
  }

  function resealLetter(qid) {
    const q = (S.c.notes.questions || []).find(x => x.id === qid);
    if (!q) return;
    undoable(`Запечатано снова: ${q.title}`, S.ui.jHints || [], () => X.mutate(ch => {
      const n = (ch.notes.questions || []).find(x => x.id === qid);
      if (n) n.status = "open";
    }), () => `${icon("gi/lorc/wax-seal")} «${esc(q.title)}» снова запечатано`);
    sealFx("stamp");
  }

  function hintsFromEdit(before, after) {
    const old = new Set(String(before || "").split("\n").map(l => l.trim()).filter(Boolean));
    const added = String(after || "").split("\n").map(l => l.trim()).filter(l => l && !old.has(l)).map(l => l.replace(/^-\s*(\*\*\d\d:\d\d\*\*)?\s*/, "")).join("\n");
    const fresh = offerHints(added);
    if (!fresh.length) return;
    setHints(mergeHints(S.ui.jHints, fresh));
    X.renderTab();
    toast(`${icon("quill")} Скрипт заметил в правке: ${fresh.length}. Подсказки под полем журнала`, { timeout: 2600 });
  }

  function setHints(list) {
    S.ui.jHints = S.c ? liveHints(S.c, list) : list;
    if (!S.ui.jHints.length) S.ui.jHintsAll = false;
    saveJson(HINTS_KEY + id, S.ui.jHints);
  }

  function readNote(sec, nid) {
    const find = (s, i) => ((S.c && S.c.notes[s]) || []).find(x => x.id === i);
    if (!find(sec, nid)) return toast("Заметка не найдена: возможно, её удалили", { kind: "bad" });
    const cur = { sec, id: nid };
    const m = openModal({ cls: "note-read" });
    let shown = false;
    const show = () => {
      const n = find(cur.sec, cur.id);
      if (!n) return m.close();
      m.body.innerHTML = noteReadHtml(S.c, cur.sec, n, { readOnly: X.readOnly() });
      m.body.scrollTop = 0;
      if (shown) flip(m.body.querySelector(".nr"));
      shown = true;
    };
    show();
    m.body.addEventListener("click", e => {
      const a = e.target.closest("[data-act]");
      if (!a) return;
      const act = a.dataset.act;
      if (act === "open-note") {
        if (a.dataset.sec === "sessions") {
          m.close();
          return openNote(a.dataset.sec, a.dataset.id);
        }
        if (!find(a.dataset.sec, a.dataset.id)) return toast("Заметка не найдена: возможно, её удалили", { kind: "bad" });
        Object.assign(cur, { sec: a.dataset.sec, id: a.dataset.id });
        return show();
      }
      if (act === "pin-note") {
        togglePin(cur.sec, cur.id);
        return show();
      }
      m.close();
      if (act === "note-create-link") return createFromLink(a.dataset.name || "");
      if (act === "edit-note") return X.editNote(cur.sec, find(cur.sec, cur.id));
      if (act === "q-open") return openLetter(a.dataset.id);
      if (act === "q-reseal") return resealLetter(a.dataset.id);
      if (act === "note-tag") {
        Object.assign(S.ui, { notesSection: cur.sec, notesQ: "", noteTag: a.dataset.k });
        return X.renderTab();
      }
    });
  }

  function openNote(sec, nid) {
    const n = ((S.c && S.c.notes[sec]) || []).find(x => x.id === nid);
    if (!n) return toast("Заметка не найдена: возможно, её удалили", { kind: "bad" });
    if (sec !== "sessions") return readNote(sec, nid);
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
    const before = S.ui.jHints;
    const fresh = offerHints(clean);
    S.ui.jHints = mergeHints(before, fresh);
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
    if (ok === false) {
      S.ui.jHints = before;
      return false;
    }
    setHints(S.ui.jHints);
    setTimeout(() => inkLast(root), 120);
    if (fresh.length && (S.tab !== "notes" || (S.ui.notesSection || "sessions") !== "sessions" || String(S.ui.notesQ || "").trim())) toast(`${icon("quill")} Скрипт заметил: ${fresh.length}. Подсказки ждут под полем журнала`, { timeout: 2600 });
    else if (!quiet && created) toast(`${icon("quill")} Начата «${esc(created)}»`, { kind: "good", timeout: 1800 });
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
        if (!keep && S.tab !== "notes") toast(`${icon("quill")} Записано в журнал`, { kind: "good", timeout: 1800 });
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

  function hintAct(act, el) {
    const list = S.ui.jHints || [];
    const h = list.find(x => x.key === el.dataset.k);
    const drop = () => setHints((S.ui.jHints || []).filter(x => x !== h));
    const done = () => saveJson(DONE_KEY + id, [...loadJson(DONE_KEY + id, [], isList), h.key].slice(-300));
    if (act === "jh-clear") {
      setHints([]);
      return X.renderTab();
    }
    if (!h) return X.renderTab();
    if (act === "jh-skip") {
      if (h.kind === "name") {
        const skips = loadJson(SKIPS_KEY + id, {}, v => v && typeof v === "object" && !Array.isArray(v));
        skips[h.key] = (Number(skips[h.key]) || 0) + 1;
        saveJson(SKIPS_KEY + id, skips);
        if (skips[h.key] >= 2) {
          addIgnore(h.key, h.name);
          toast(`«${esc(h.name)}» больше не предлагаю как имя. Вернуть: меню, «Скрытые подсказки заметок»`, { timeout: 3200 });
        }
      }
      drop();
      return X.renderTab();
    }
    if (act === "jh-make") return X.editNote(el.dataset.sec || h.guess, null, { title: h.name });
    if (act === "jh-alias") {
      return undoable(`Другое имя: ${h.name}`, list, () => {
        drop();
        X.mutate(ch => {
          const n = (ch.notes[h.sec] || []).find(x => x.id === h.id);
          if (n) n.aliases = [...String(n.aliases || "").split(",").map(x => x.trim()).filter(Boolean), h.name].join(", ");
        });
      }, () => `${icon("gi/lorc/two-shadows")} «${esc(h.name)}» теперь тоже ${esc(h.title)}`);
    }
    if (act === "jh-alias-no") {
      addIgnore(h.key, `${h.name}: не ${h.title}`);
      const name ={ kind: "name", name: h.name, key: h.key.replace(/^alias:/, ""), guess: h.guess || h.sec || "people" };
      setHints((S.ui.jHints || []).map(x => (x === h ? name : x)));
      return X.renderTab();
    }
    if (act === "jh-att") {
      return undoable(`${h.att === "hostile" ? "Враг" : "Союзник"}: ${h.title}`, list, () => {
        drop();
        X.mutate(ch => {
          const n = (ch.notes.people || []).find(x => x.id === h.id);
          if (n) n.attitude = h.att;
        });
      }, () => `${icon(h.att === "hostile" ? "gi/lorc/crossed-swords" : "gi/delapouite/shaking-hands")} ${esc(h.title)}: ${h.att === "hostile" ? "теперь враг" : "теперь союзник"}`);
    }
    if (act === "jh-item") {
      const mode = el.dataset.mode || "add";
      const short = u => (COINS.find(k => k.key === u) || {}).short || "ЗМ";
      const pay = mode === "addpay" && h.price;
      const gain = mode === "removegain" && h.price;
      const broke = pay && !payCoins(S.c.coins, h.price.amount, h.price.unit);
      const qty = Math.max(1, Number(h.qty) || 1);
      const label = mode === "use" ? `Потрачено: ${h.name}` : mode.startsWith("add") ? `В инвентарь: ${h.name}` : `Убрано: ${h.name}`;
      return undoable(label, list, () => {
        drop();
        done();
        X.mutate(ch => {
          if (mode.startsWith("add")) {
            const have = h.id && ch.items.find(it => it.id === h.id);
            if (have) have.qty = (Number(have.qty) || 1) + qty;
            else ch.items.push(itemFromHint(h, uid));
            if (pay && !broke) Object.assign(ch.coins, payCoins(ch.coins, h.price.amount, h.price.unit));
          } else {
            const it = ch.items.find(x => x.id === h.id);
            if (it) {
              const left = (Number(it.qty) || 1) - qty;
              if (left > 0) it.qty = left;
              else ch.items = ch.items.filter(x => x.id !== it.id);
            }
            if (gain) {
              const [whole, unit] = wholeCoins(h.price.amount, h.price.unit);
              ch.coins[unit] = (Number(ch.coins[unit]) || 0) + whole;
            }
          }
        });
      }, () => `${icon("gi/delapouite/backpack")} ${esc(label)}${qty > 1 ? ` ×${qty}` : ""}${pay ? (broke ? `. Денег не хватило, ${h.price.amount} ${short(h.price.unit)} не списано` : `, −${h.price.amount} ${short(h.price.unit)}`) : gain ? `, +${h.price.amount} ${short(h.price.unit)}` : ""}`, h.key);
    }
    if (act === "jh-ask") {
      return undoable(`Письмо: ${h.title}`, list, () => {
        drop();
        X.mutate(ch => {
          ch.notes.questions.unshift({ id: "nt-" + uid(), title: h.title, subtitle: "", text: "", tags: "", status: "open", answer: "", created: Date.now(), collapsed: false, pinned: false });
        });
      }, () => `${icon("gi/lorc/wax-seal")} Запечатано в письмо. Зацепки соберутся сами, смотри «Вопросы»`);
    }
    if (act === "jh-answer") return openLetter(h.id, h.answer);
    if (act === "jh-xp") {
      const was = xpInfo(S.c);
      return undoable(`Опыт +${h.amount}`, list, () => {
        drop();
        done();
        X.mutate(ch => { ch.info.xp = Math.max(0, (Number(ch.info.xp) || 0) + h.amount); });
      }, () => {
        const now = xpInfo(S.c);
        return now.canLevel && !was.canLevel ? `${icon("star")} Опыт: ${now.xp}. <b>Хватает на ${now.levelByXp} уровень!</b>` : `${icon("star")} Опыт: ${now.xp}`;
      }, h.key);
    }
    if (act === "jh-level") {
      drop();
      X.renderTab();
      return X.openLevelUp();
    }
    if (act === "jh-quest") return X.editNote("quests", null, { title: h.title, status: "active" });
    if (act === "jh-qdone") {
      return undoable(`${h.status === "failed" ? "Провалено" : "Выполнено"}: ${h.title}`, list, () => {
        drop();
        X.mutate(ch => {
          const q = (ch.notes.quests || []).find(x => x.id === h.id);
          if (q) q.status = h.status;
        });
      }, () => `${icon(h.status === "failed" ? "gi/sbed/cancel" : "gi/delapouite/check-mark")} «${esc(h.title)}»: ${h.status === "failed" ? "провалено" : "выполнено"}`);
    }
    if (act === "jh-coins") {
      const mode = el.dataset.sign;
      const short = u => (COINS.find(k => k.key === u) || {}).short || "ЗМ";
      if (mode === "-1" && !payCoins(S.c.coins, h.amount, h.unit)) return toast(`Не хватает денег: в кошельке ${esc(coinsText(S.c.coins))}`, { kind: "bad" });
      const [whole, unit] = wholeCoins(h.amount, h.unit);
      const what = mode === "set" ? `${short(unit)}: теперь ${whole}` : `${mode === "-1" ? "−" : "+"}${h.amount} ${short(h.unit)}`;
      return undoable(`Кошелёк ${what}`, list, () => {
        drop();
        done();
        X.mutate(ch => {
          if (mode === "set") ch.coins[unit] = whole;
          else if (mode === "-1") Object.assign(ch.coins, payCoins(ch.coins, h.amount, h.unit));
          else ch.coins[unit] = (Number(ch.coins[unit]) || 0) + whole;
        });
      }, () => `${icon("gi/delapouite/two-coins")} ${what}. В кошельке: ${esc(coinsText(S.c.coins))}`, h.key);
    }
    if (act === "jh-dead") {
      return undoable(`Нет в живых: ${h.title}`, list, () => {
        drop();
        X.mutate(ch => {
          const n = (ch.notes.people || []).find(x => x.id === h.id);
          if (n) n.dead = true;
        });
      }, () => `${icon("gi/lorc/tombstone")} ${esc(h.title)}: нет в живых, карточка внизу «Людей»`);
    }
  }

  function mergeAct(act, el) {
    if (act === "merge-skip") {
      addIgnore(el.dataset.k, el.dataset.label || "");
      return X.renderTab();
    }
    const sec = el.dataset.sec;
    const list = (S.c.notes[sec] || []);
    const keep = list.find(x => x.id === el.dataset.keep);
    const gone = list.find(x => x.id === el.dataset.drop);
    if (!keep || !gone) return X.renderTab();
    const keepTitle = keep.title;
    const goneTitle = gone.title;
    return undoable(`Объединено: ${goneTitle} → ${keepTitle}`, S.ui.jHints || [], () => X.mutate(ch => {
      const a = (ch.notes[sec] || []).find(x => x.id === keep.id);
      const b = (ch.notes[sec] || []).find(x => x.id === gone.id);
      if (!a || !b) return;
      const split = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
      const names = [...new Set([...split(a.aliases), b.title, ...split(b.aliases)].filter(x => x && x !== a.title))];
      a.aliases = names.join(", ");
      a.text = [a.text, b.text].map(x => String(x || "").trim()).filter(Boolean).join("\n\n");
      a.subtitle = a.subtitle || b.subtitle || "";
      a.tags = [...new Set([...split(a.tags), ...split(b.tags)])].join(", ");
      if (!a.attitude && b.attitude) a.attitude = b.attitude;
      if (b.dead) a.dead = true;
      if (b.pinned) a.pinned = true;
      if (Number(b.created) && (!Number(a.created) || Number(b.created) < Number(a.created))) a.created = b.created;
      ch.notes[sec] = ch.notes[sec].filter(x => x.id !== b.id);
    }), () => `${icon("gi/lorc/linked-rings")} «${esc(goneTitle)}» теперь часть «${esc(keepTitle)}»`);
  }

  function undoable(label, prevHints, fn, html, doneKey = "") {
    X.withUndo(label, fn);
    const mark = S.undo;
    const close = toast(`<span>${html()}</span><button type="button" class="toast-undo">Отменить</button>`, { kind: "good", timeout: 6000 });
    const b = close.el && close.el.querySelector(".toast-undo");
    if (!b) return;
    b.addEventListener("click", e => {
      e.stopPropagation();
      close();
      if (!mark || S.undo !== mark) return toast("Уже не отменить: после этого лист менялся", { kind: "bad", timeout: 2400 });
      X.doUndo();
      if (doneKey) saveJson(DONE_KEY + id, loadJson(DONE_KEY + id, [], isList).filter(k => k !== doneKey));
      setHints(prevHints);
      X.renderTab();
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

  Object.assign(X, { hintAct, mergeAct, hiddenHints, hintsFromEdit, openLetter, resealLetter, openNote, readNote, journalAdd, startSession, focusJournal, togglePin, createFromLink, quickNote, saveRecent, afterNotesRender });
}
