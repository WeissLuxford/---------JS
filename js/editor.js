import { esc, rich, openModal } from "./ui.js";
import { icon } from "./icons.js";

const k = t => `<kbd>${esc(t)}</kbd>`;
const btn = t => `<span class="hw-btn">${t}</span>`;
const demo = (md, links) => `<div class="hw-demo note-text">${rich(md, links ? { link: (a, b) => `<span class="wl">${esc(b || a)}</span>` } : undefined)}</div>`;
const row = (how, md, links) => `<div class="hw-row"><div class="hw-how">${how}</div>${demo(md, links)}</div>`;

const helpSections = () => [
  ["start", "С чего начать", `
    <p>Просто пиши, как в обычном блокноте. Оформление не обязательно: его можно добавить потом или не добавлять вовсе.</p>
    <ol class="hw-steps"><li>Выдели слово или строку пальцем или мышкой.</li><li>Нажми кнопку на панели над текстом: ${btn("<b>Ж</b>")}, ${btn("Маркер")}, ${btn("Заголовок")} и другие.</li><li>Нажми ту же кнопку ещё раз, чтобы убрать оформление.</li></ol>
    <p class="hw-tip">Кнопка на панели подсвечивается, когда курсор стоит в оформленном месте: так видно, что уже включено.</p>`],
  ["text", "Выделить слова", [
    row(`${btn("<b>Ж</b>")} или ${k("Ctrl")}+${k("B")}<small>Главное: имена, суммы, сроки</small>`, "Барон должен нам **300 золотых**."),
    row(`${btn("<i>К</i>")} или ${k("Ctrl")}+${k("I")}<small>Мысли, слухи, чужие слова</small>`, "Трактирщик шепнул: *в подвале кто-то есть*."),
    row(`${btn("<u>Ч</u>")} или ${k("Ctrl")}+${k("U")}<small>Важно не забыть</small>`, "Встреча __на рассвете__ у мельницы."),
    row(`${btn("<s>З</s>")}<small>Неправда или уже не актуально</small>`, "Убийца: ~~конюх~~ дворецкий."),
    row(`${btn("<mark>Маркер</mark>")}<small>Самое важное на странице</small>`, "Пароль от ворот: ==Серебряная луна==.")
  ].join("")],
  ["blocks", "Заголовки, списки, цитаты", [
    row(`${btn("Заголовок")} или ${k("#")} ${k("пробел")} в начале строки<small>Делит длинную запись на части</small>`, "## Что известно\nКупец пропал три дня назад."),
    row(`${btn("Список")} или ${k("-")} ${k("пробел")}<small>Перечислить что угодно</small>`, "- Кинжал с гербом\n- Письмо без подписи\n- Следы сажи"),
    row(`${btn("Номера")} или ${k("1.")} ${k("пробел")}<small>Когда важен порядок</small>`, "1. Найти купца\n2. Отдать письмо\n3. Получить награду"),
    row(`${btn("Дела")} или ${k("[]")} ${k("пробел")}<small>Цели задания: нажми на квадратик, чтобы отметить. В «Заданиях» появится счётчик «1 из 3»</small>`, "- [x] Поговорить со стражей\n- [ ] Осмотреть склад\n- [ ] Доложить барону"),
    row(`${btn("Цитата")} или ${k(">")} ${k("пробел")}<small>Точные слова персонажа</small>`, "> Кто держит строй, тот держит мир."),
    row(`${btn("Линия")}<small>Отделить одно от другого</small>`, "До битвы\n\n---\n\nПосле битвы")
  ].join("")],
  ["links", "Ссылки на людей и места", `
    <p>Набери ${k("[[")} и начни имя: появится подсказка, выбери нужного человека, место или задание. Получится плашка-ссылка. Или выдели имя и нажми ${btn("[[ Ссылка")}.</p>
    ${row(`${k("[[")} ${k("Рэй")}`, "Встретили [[Рэй]] в порту.", true)}
    <ul class="hw-list"><li>При чтении ссылка нажимается и открывает запись.</li><li>На «Доске связей» между ними появится нить.</li><li>Внизу записи о человеке будет видно, где он «Упоминается».</li><li>Если такой записи ещё нет, ссылка станет красноватой: нажми на неё, чтобы создать.</li></ul>
    <p class="hw-tip">Имена людей и мест, которые уже есть в заметках, подсвечиваются пунктиром сами, даже без ${k("[[")}.</p>`],
  ["journal", "Журнал сессии", `
    <ul class="hw-list"><li>Пиши в поле наверху журнала, что сейчас произошло, и нажми ${k("Enter")}: запись встанет в ленту со временем.</li><li>${k("Shift")}+${k("Enter")} переносит строку, не записывая.</li><li>Через 12 часов без записей начнётся новая сессия сама. Или нажми ${btn("Новая сессия")}.</li><li>Записать из любой вкладки: кнопка с пером внизу экрана.</li></ul>
    <div class="hw-demo note-text"><ol class="tl"><li class="tl-e"><time>21:40</time><div class="tl-t"><p>Пришли в порт, говорили с <span class="wl">Рэй</span></p></div></li><li class="tl-e"><time>21:55</time><div class="tl-t"><p>Нашли письмо с печатью змеи</p></div></li></ol></div>`],
  ["where", "Куда что записывать", `
    <dl class="hw-dl">
      <dt>Журнал</dt><dd>Что происходило на игре, по порядку.</dd>
      <dt>Люди</dt><dd>Все, кого встретили. Отметь, союзник это или враг: люди сами разложатся по группам.</dd>
      <dt>Места</dt><dd>Города, таверны, подземелья, тайные ходы.</dd>
      <dt>Задания</dt><dd>Что поручили и за что заплатят. Цели пиши делами с галочками, статус ставь «Выполнено» или «Провалено».</dd>
      <dt>Улики</dt><dd>Находки для расследования: подтверждено, зацепка или ложный след.</dd>
      <dt>Покровитель</dt><dd>Договор, условия, что он просил.</dd>
      <dt>Прочее</dt><dd>Законы мира, слухи, правила Мастера, всё остальное.</dd>
    </dl>
    <p class="hw-tip">${icon("star")} Звёздочка на записи кладёт её в «Важное»: оно видно сверху заметок и во вкладке «Бой». Метки через запятую помогают искать: #долг, #порт.</p>`],
  ["example", "Пример целой записи", demo("## Пропавший купец\nГильдия платит **200 золотых**, срок ==до полнолуния==.\n- [x] Расспросить жену купца\n- [ ] Найти [[Порт Сильверхолл|склад в порту]]\n- [ ] Вернуть печать гильдии\n> Он ушёл ночью и взял с собой только печать.\n---\n*Похоже, жена что-то скрывает.*", true)]
];

export function openWritingHelp(start = "") {
  const HELP = helpSections();
  const m = openModal({
    title: "Как записывать",
    wide: true,
    cls: "writing-help",
    body: `<nav class="hw-nav">${HELP.map(([key, t]) => `<button type="button" class="chip" data-hw="${key}">${esc(t)}</button>`).join("")}</nav>
      ${HELP.map(([key, t, body]) => `<section class="hw-sec" id="hw-${key}"><h3>${esc(t)}</h3>${body}</section>`).join("")}`
  });
  m.body.addEventListener("click", e => {
    const b = e.target.closest("[data-hw]");
    if (b) m.body.querySelector(`#hw-${b.dataset.hw}`).scrollIntoView({ behavior: "smooth", block: "start" });
  });
  if (start) requestAnimationFrame(() => {
    const el = m.body.querySelector(`#hw-${start}`);
    if (el) el.scrollIntoView({ block: "start" });
  });
  return m;
}

const TOOLS = [
  ["h", `<span class="rt-l">Заголовок</span>`, "Заголовок"],
  ["bold", "<b>Ж</b>", "Жирный"],
  ["italic", "<i>К</i>", "Курсив"],
  ["under", "<u>Ч</u>", "Подчёркнутый"],
  ["strike", "<s>З</s>", "Зачёркнутый"],
  ["mark", `<mark>Маркер</mark>`, "Выделить маркером"],
  ["list", `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="5" r="1.6"/><circle cx="4" cy="10" r="1.6"/><circle cx="4" cy="15" r="1.6"/><path d="M8 5h9M8 10h9M8 15h9"/></svg><span class="rt-l">Список</span>`, "Список"],
  ["num", `<svg viewBox="0 0 20 20" aria-hidden="true"><text x="1" y="7.5">1</text><text x="1" y="17">2</text><path d="M8 5h9M8 14h9"/></svg><span class="rt-l">Номера</span>`, "Нумерованный список"],
  ["todo", `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3" width="6" height="6" rx="1.2"/><path d="M3.5 6l1.2 1.3L7 4.6"/><rect x="2" y="11" width="6" height="6" rx="1.2"/><path d="M11 6h7M11 14h7"/></svg><span class="rt-l">Дела</span>`, "Список дел с галочками"],
  ["quote", `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4v12M7 6h10M7 10h10M7 14h7"/></svg><span class="rt-l">Цитата</span>`, "Цитата"],
  ["hr", `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10h16"/><path d="M8 10l2-2 2 2-2 2z"/></svg><span class="rt-l">Линия</span>`, "Линия-разделитель"],
  ["link", `<span class="rt-l">[[ Ссылка</span>`, "Ссылка на человека, место или задание"]
];

const chip = (t, l) => `<span class="wl-chip" contenteditable="false" data-t="${esc(t)}"${l && l !== t ? ` data-l="${esc(l)}"` : ""}>${esc(l || t)}</span>`;
const box = () => `<span class="rt-todo" contenteditable="false" role="checkbox" aria-checked="false"></span>`;

const unesc = s => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (_, k) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" }[k]));

export function mdToEditHtml(md) {
  const html = rich(md, { link: (a, b) => chip(unesc(a).trim(), b && unesc(b).trim()) });
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll(".rt-todo").forEach(s => {
    s.setAttribute("contenteditable", "false");
    s.setAttribute("role", "checkbox");
    s.setAttribute("aria-checked", s.classList.contains("done") ? "true" : "false");
    const ul = s.closest("ul");
    if (ul) ul.classList.add("todo");
  });
  tmp.querySelectorAll(".rt-h").forEach(h => h.classList.remove("rt-h"));
  return tmp.innerHTML || "<p><br></p>";
}

const WRAP = { B: "**", STRONG: "**", I: "*", EM: "*", U: "__", S: "~~", STRIKE: "~~", DEL: "~~", MARK: "==" };

function inlineMd(node) {
  let out = "";
  for (const n of node.childNodes) {
    if (n.nodeType === 3) {
      out += n.nodeValue.replace(/ /g, " ").replace(/​/g, "");
      continue;
    }
    if (n.nodeType !== 1) continue;
    if (n.tagName === "BR") {
      out += "\n";
      continue;
    }
    if (n.classList.contains("rt-todo")) continue;
    if (n.classList.contains("wl-chip")) {
      const t = n.dataset.t || n.textContent.trim();
      const l = n.dataset.l;
      out += l && l !== t ? `[[${t}|${l}]]` : `[[${t}]]`;
      continue;
    }
    const inner = inlineMd(n);
    const st = n.style || {};
    let w = WRAP[n.tagName] || "";
    if (!w && n.tagName === "SPAN") {
      if (/bold|[6-9]00/.test(st.fontWeight || "")) w = "**";
      else if (st.fontStyle === "italic") w = "*";
      else if (/line-through/.test(st.textDecoration || st.textDecorationLine || "")) w = "~~";
      else if (/underline/.test(st.textDecoration || st.textDecorationLine || "")) w = "__";
    }
    if (!w || !inner.trim()) {
      out += inner;
      continue;
    }
    const lead = inner.match(/^\s*/)[0];
    const tail = inner.match(/\s*$/)[0];
    out += lead + w + inner.trim() + w + tail;
  }
  return out;
}

const BLOCK = /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|HR|PRE)$/;

function blocksMd(root) {
  const out = [];
  let loose = [];
  const flushLoose = () => {
    const t = inlineMd({ childNodes: loose });
    if (t.trim()) out.push({ kind: "p", text: t });
    loose = [];
  };
  for (const n of root.childNodes) {
    if (n.nodeType === 1 && BLOCK.test(n.tagName)) {
      flushLoose();
      const tag = n.tagName;
      if (/^H[1-6]$/.test(tag)) {
        const lvl = Math.max(1, Math.min(3, Number(tag[1]) - 3));
        const t = inlineMd(n).replace(/\n+/g, " ").trim();
        if (t) out.push({ kind: "h", text: "#".repeat(lvl) + " " + t });
      } else if (tag === "HR") out.push({ kind: "hr", text: "---" });
      else if (tag === "UL" || tag === "OL") {
        const todo = n.classList.contains("todo");
        let i = 0;
        const lines = [];
        for (const li of n.children) {
          if (li.tagName !== "LI") continue;
          const nested = [...li.querySelectorAll(":scope > ul, :scope > ol")];
          nested.forEach(x => x.remove());
          const cb = li.querySelector(".rt-todo");
          const t = inlineMd(li).replace(/\n+/g, " ").trim();
          i += 1;
          const pre = cb || todo ? `- [${cb && cb.classList.contains("done") ? "x" : " "}] ` : tag === "OL" ? `${i}. ` : "- ";
          if (t || cb) lines.push(pre + t);
          for (const x of nested) lines.push(...blocksMd({ childNodes: [x] }).map(b => b.text));
        }
        if (lines.length) out.push({ kind: "list", text: lines.join("\n") });
      } else if (tag === "BLOCKQUOTE") {
        const inner = blocksMd(n).map(b => b.text).join("\n");
        const t = (inner || inlineMd(n)).split("\n").filter(l => l.trim()).map(l => "> " + l).join("\n");
        if (t) out.push({ kind: "q", text: t });
      } else if (tag === "LI") {
        const t = inlineMd(n).trim();
        if (t) out.push({ kind: "list", text: "- " + t });
      } else {
        const hasBlocks = [...n.children].some(c => BLOCK.test(c.tagName));
        if (hasBlocks) out.push(...blocksMd(n));
        else {
          const t = inlineMd(n).replace(/\n+$/, "");
          if (t.trim()) out.push({ kind: "p", text: t });
        }
      }
    } else loose.push(n);
  }
  flushLoose();
  return out;
}

export function editHtmlToMd(root) {
  const blocks = blocksMd(root);
  let md = "";
  blocks.forEach((b, i) => {
    if (i) md += blocks[i - 1].kind === "p" && b.kind === "p" ? "\n\n" : "\n";
    md += b.text;
  });
  return md.replace(/[ \t]+$/gm, "").trim();
}

const lnorm = s => String(s ?? "").toLowerCase().replace(/ё/g, "е");

export function mountEditor(ta, { links, placeholder = "" } = {}) {
  if (!ta || ta.dataset.wysiwyg) return null;
  ta.dataset.wysiwyg = "1";
  const field = ta.closest(".rt-field");
  const ed = document.createElement("div");
  ed.className = "rt-edit note-text";
  ed.contentEditable = "true";
  ed.setAttribute("role", "textbox");
  ed.setAttribute("aria-multiline", "true");
  ed.setAttribute("aria-label", (field && field.querySelector("label") ? field.querySelector("label").textContent : "Текст"));
  ed.dataset.placeholder = placeholder || ta.placeholder || "Пиши здесь";
  ed.innerHTML = mdToEditHtml(ta.value);
  ta.hidden = true;
  ta.after(ed);
  const bar = field && field.querySelector(".rt-bar");
  if (bar) bar.innerHTML = TOOLS.map(([k, html, t]) => `<button type="button" class="rt-btn" data-ed="${k}" title="${esc(t)}" aria-label="${esc(t)}" aria-pressed="false">${html}</button>`).join("") + `<button type="button" class="rt-btn rt-help" data-ed-help title="Как оформлять записи, с примерами"><span class="rt-l">? Как писать</span></button>`;
  const sync = () => {
    ta.value = editHtmlToMd(ed);
    ed.classList.toggle("empty", !ed.textContent.trim() && !ed.querySelector(".wl-chip, hr, .rt-todo"));
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  };
  ed.classList.toggle("empty", !ta.value.trim());
  const exec = (cmd, val = null) => {
    try {
      document.execCommand("styleWithCSS", false, false);
    } catch {}
    document.execCommand(cmd, false, val);
  };
  const blockOf = node => {
    let n = node && node.nodeType === 3 ? node.parentNode : node;
    while (n && n !== ed && !BLOCK.test(n.tagName)) n = n.parentNode;
    return n && n !== ed ? n : null;
  };
  const inside = sel => {
    const s = window.getSelection();
    if (!s.rangeCount || !ed.contains(s.anchorNode)) return null;
    let n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentNode : s.anchorNode;
    while (n && n !== ed) {
      if (n.matches && n.matches(sel)) return n;
      n = n.parentNode;
    }
    return null;
  };
  const toggleMark = () => {
    const s = window.getSelection();
    const cur = inside("mark");
    if (cur) {
      cur.replaceWith(...cur.childNodes);
      return;
    }
    if (!s.rangeCount || s.isCollapsed) return;
    const r = s.getRangeAt(0);
    const m = document.createElement("mark");
    try {
      r.surroundContents(m);
    } catch {
      m.appendChild(r.extractContents());
      r.insertNode(m);
    }
    s.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(m);
    s.addRange(nr);
  };
  const ensureTodo = ul => {
    ul.classList.add("todo");
    for (const li of ul.children) if (li.tagName === "LI" && !li.querySelector(":scope > .rt-todo")) li.insertAdjacentHTML("afterbegin", box());
  };
  const normalize = () => {
    let run = [];
    const wrap = () => {
      if (run.some(n => n.nodeType === 1 || n.nodeValue.trim())) {
        const p = document.createElement("p");
        run[0].before(p);
        p.append(...run);
      } else run.forEach(n => n.remove());
      run = [];
    };
    for (const n of [...ed.childNodes]) {
      if (n.nodeType === 1 && BLOCK.test(n.tagName)) wrap();
      else run.push(n);
    }
    wrap();
    ed.querySelectorAll("p > :is(ul, ol, blockquote, h4, h5, h6, hr, p), div > :is(ul, ol, blockquote, h4, h5, h6, hr)").forEach(b => {
      const host = b.parentNode;
      if (host === ed || !host.parentNode) return;
      const tail = document.createElement(host.tagName === "DIV" ? "p" : host.tagName.toLowerCase());
      while (b.nextSibling) tail.append(b.nextSibling);
      host.after(b);
      if (tail.childNodes.length) b.after(tail);
      if (!host.textContent.trim() && !host.querySelector(".wl-chip, img")) host.remove();
    });
    ed.querySelectorAll(":scope > div").forEach(d => {
      const p = document.createElement("p");
      p.append(...d.childNodes);
      d.replaceWith(p);
    });
    ed.querySelectorAll("ul.todo").forEach(ensureTodo);
    if (!ed.firstChild) ed.innerHTML = "<p><br></p>";
  };
  const top = node => {
    let n = node && node.nodeType === 3 ? node.parentNode : node;
    if (!n || n === ed) return null;
    while (n.parentNode && n.parentNode !== ed) n = n.parentNode;
    return n.parentNode === ed ? n : null;
  };
  const withCaret = fn => {
    const s = window.getSelection();
    let mark = null;
    if (s.rangeCount && ed.contains(s.anchorNode)) {
      const r = s.getRangeAt(0).cloneRange();
      r.collapse(false);
      mark = document.createElement("span");
      mark.dataset.caret = "1";
      r.insertNode(mark);
    }
    normalize();
    fn(mark);
    const m = ed.querySelector("[data-caret]");
    if (m) {
      const blk = m.parentNode;
      const r = document.createRange();
      r.setStartBefore(m);
      r.collapse(true);
      m.remove();
      if (blk && !blk.textContent && !blk.querySelector("br, .wl-chip, .rt-todo")) blk.appendChild(document.createElement("br"));
      else if (blk && blk.tagName === "LI" && !blk.textContent.trim() && !blk.querySelector("br")) blk.appendChild(document.createElement("br"));
      s.removeAllRanges();
      s.addRange(r);
    }
  };
  const selectedBlocks = mark => {
    const s = window.getSelection();
    const a = top(s.rangeCount ? s.getRangeAt(0).startContainer : null) || top(mark);
    const b = top(s.rangeCount ? s.getRangeAt(0).endContainer : null) || a;
    if (!a) return [];
    const out = [];
    let n = a;
    while (n) {
      out.push(n);
      if (n === b) break;
      n = n.nextElementSibling;
    }
    return out;
  };
  const toItems = blk => {
    if (blk.tagName === "UL" || blk.tagName === "OL") return [...blk.children].filter(x => x.tagName === "LI");
    if (blk.tagName === "BLOCKQUOTE") {
      const kids = [...blk.children].filter(x => BLOCK.test(x.tagName));
      if (kids.length) return kids.flatMap(toItems);
    }
    if (blk.tagName === "HR") return [];
    const li = document.createElement("li");
    li.append(...blk.childNodes);
    return [li];
  };
  const setList = kind => withCaret(mark => {
    const blocks = selectedBlocks(mark);
    if (!blocks.length) return;
    const is = b => (kind === "num" ? b.tagName === "OL" : b.tagName === "UL" && b.classList.contains("todo") === (kind === "todo"));
    if (blocks.every(is)) {
      for (const b of blocks) {
        const ps = toItems(b).map(li => {
          li.querySelectorAll(":scope > .rt-todo").forEach(x => x.remove());
          const p = document.createElement("p");
          p.append(...li.childNodes);
          return p;
        });
        b.replaceWith(...ps);
      }
      return;
    }
    const list = document.createElement(kind === "num" ? "ol" : "ul");
    for (const b of blocks) {
      toItems(b).forEach(li => {
        if (kind !== "todo") li.querySelectorAll(":scope > .rt-todo").forEach(x => x.remove());
        list.appendChild(li);
      });
    }
    blocks[0].before(list);
    blocks.forEach(b => b.remove());
    if (kind === "todo") ensureTodo(list);
  });
  const setBlock = tag => withCaret(mark => {
    const blocks = selectedBlocks(mark);
    if (!blocks.length) return;
    if (tag === "blockquote") {
      const q = blocks.find(b => b.tagName === "BLOCKQUOTE");
      if (q && blocks.length === 1) {
        const kids = [...q.childNodes];
        if (kids.some(k => k.nodeType === 1 && BLOCK.test(k.tagName))) q.replaceWith(...kids);
        else {
          const p = document.createElement("p");
          p.append(...kids);
          q.replaceWith(p);
        }
        return;
      }
      const bq = document.createElement("blockquote");
      blocks[0].before(bq);
      for (const b of blocks) {
        if (b.tagName === "BLOCKQUOTE") bq.append(...b.childNodes);
        else if (b.tagName === "UL" || b.tagName === "OL") toItems(b).forEach(li => { li.querySelectorAll(".rt-todo").forEach(x => x.remove()); const p = document.createElement("p"); p.append(...li.childNodes); bq.appendChild(p); });
        else if (b.tagName === "HR") continue;
        else {
          const p = document.createElement("p");
          p.append(...b.childNodes);
          bq.appendChild(p);
        }
        b.remove();
      }
      return;
    }
    const allH = blocks.every(b => /^H[4-6]$/.test(b.tagName));
    for (const b of blocks) {
      const items = b.tagName === "UL" || b.tagName === "OL" || b.tagName === "BLOCKQUOTE" ? toItems(b) : [b];
      const made = items.map(x => {
        x.querySelectorAll && x.querySelectorAll(":scope > .rt-todo").forEach(y => y.remove());
        const el = document.createElement(allH ? "p" : "h5");
        el.append(...x.childNodes);
        return el;
      });
      b.replaceWith(...made);
    }
  });
  const insertChip = (range, title) => {
    range.deleteContents();
    const tmp = document.createElement("span");
    tmp.innerHTML = chip(title);
    const el = tmp.firstChild;
    const sp = document.createTextNode(" ");
    range.insertNode(sp);
    range.insertNode(el);
    const s = window.getSelection();
    const r = document.createRange();
    r.setStartAfter(sp);
    r.collapse(true);
    s.removeAllRanges();
    s.addRange(r);
  };
  const run = k => {
    if (document.activeElement !== ed) ed.focus();
    if (k === "bold") exec("bold");
    else if (k === "italic") exec("italic");
    else if (k === "under") exec("underline");
    else if (k === "strike") exec("strikeThrough");
    else if (k === "mark") toggleMark();
    else if (k === "h") setBlock("h5");
    else if (k === "list" || k === "num" || k === "todo") setList(k);
    else if (k === "quote") setBlock("blockquote");
    else if (k === "hr") {
      withCaret(mark => {
        const b = selectedBlocks(mark).pop();
        if (!b) return;
        const hr = document.createElement("hr");
        const p = document.createElement("p");
        if (mark) p.appendChild(mark);
        b.after(hr, p);
      });
    } else if (k === "link") {
      const s = window.getSelection();
      const text = s.rangeCount && !s.isCollapsed ? s.toString().trim() : "";
      if (text) insertChip(s.getRangeAt(0), text);
      else exec("insertText", "[[");
    }
    sync();
    state();
  };
  const state = () => {
    if (!bar) return;
    const q = c => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    const on = { bold: q("bold"), italic: q("italic"), under: q("underline"), strike: q("strikeThrough"), mark: !!inside("mark"), h: !!inside("h4,h5,h6"), quote: !!inside("blockquote"), todo: !!inside("ul.todo"), list: !!inside("ul:not(.todo)"), num: !!inside("ol") };
    bar.querySelectorAll("[data-ed]").forEach(b => {
      const v = !!on[b.dataset.ed];
      b.classList.toggle("on", v);
      b.setAttribute("aria-pressed", String(v));
    });
  };
  if (bar) {
    bar.addEventListener("pointerdown", e => {
      if (e.target.closest("[data-ed]")) e.preventDefault();
    });
    bar.addEventListener("click", e => {
      if (e.target.closest("[data-ed-help]")) return openWritingHelp();
      const b = e.target.closest("[data-ed]");
      if (b) run(b.dataset.ed);
    });
  }
  ed.addEventListener("click", e => {
    const cb = e.target.closest(".rt-todo");
    if (cb) {
      cb.classList.toggle("done");
      cb.setAttribute("aria-checked", String(cb.classList.contains("done")));
      sync();
    }
  });
  const AUTO = [[/^[-*•]$/, "list"], [/^1[.)]$/, "num"], [/^#{1,3}$/, "h"], [/^>$/, "quote"], [/^\[ ?\]$/, "todo"]];
  ed.addEventListener("keydown", e => {
    if (sg.open && ["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) return sg.key(e);
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = { b: "bold", i: "italic", u: "under" }[e.key.toLowerCase()];
      if (k) {
        e.preventDefault();
        return run(k);
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      const li = inside("ul.todo > li");
      const s = window.getSelection();
      if (li && s.rangeCount) {
        e.preventDefault();
        const ul = li.parentNode;
        const caretTo = (node, at = 0) => {
          const r = document.createRange();
          r.setStart(node, at);
          r.collapse(true);
          s.removeAllRanges();
          s.addRange(r);
        };
        if (!li.textContent.trim() && !li.querySelector(".wl-chip")) {
          const p = document.createElement("p");
          p.appendChild(document.createElement("br"));
          const rest = document.createElement("ul");
          rest.className = "todo";
          while (li.nextSibling) rest.appendChild(li.nextSibling);
          li.remove();
          ul.after(p);
          if (rest.children.length) p.after(rest);
          if (!ul.children.length) ul.remove();
          caretTo(p);
        } else {
          const r = s.getRangeAt(0);
          r.deleteContents();
          const tail = document.createRange();
          tail.setStart(r.startContainer, r.startOffset);
          tail.setEnd(li, li.childNodes.length);
          const frag = tail.extractContents();
          const next = document.createElement("li");
          next.insertAdjacentHTML("afterbegin", box());
          next.appendChild(frag);
          next.querySelectorAll(".rt-todo").forEach((x, i) => i && x.remove());
          if (!next.textContent.trim() && !next.querySelector(".wl-chip")) next.appendChild(document.createElement("br"));
          if (!li.textContent.trim() && !li.querySelector("br")) li.appendChild(document.createElement("br"));
          li.after(next);
          caretTo(next, 1);
        }
        sync();
        return;
      }
    }
    if (e.key === " ") {
      const s = window.getSelection();
      if (!s.rangeCount || !s.isCollapsed) return;
      const blk = blockOf(s.anchorNode);
      if (blk && !/^(P|DIV|LI)$/.test(blk.tagName)) return;
      const text = (blk || ed).textContent;
      const node = s.anchorNode;
      if (node.nodeType !== 3 || s.anchorOffset !== node.nodeValue.length || text.trim() !== node.nodeValue.trim()) return;
      const hit = AUTO.find(([re]) => re.test(node.nodeValue.trim()));
      if (!hit || (blk && blk.tagName === "LI" && hit[1] !== "todo")) return;
      e.preventDefault();
      node.nodeValue = "";
      if (blk && !blk.querySelector("br")) blk.appendChild(document.createElement("br"));
      const r = document.createRange();
      r.setStart(blk || ed, 0);
      r.collapse(true);
      s.removeAllRanges();
      s.addRange(r);
      run(hit[1]);
    }
  });
  ed.addEventListener("paste", e => {
    const t = e.clipboardData && e.clipboardData.getData("text/plain");
    if (t == null) return;
    e.preventDefault();
    exec("insertText", t);
  });
  ed.addEventListener("drop", e => e.preventDefault());
  const sg = linkSuggest(ed, links, () => sync(), insertChip);
  ed.addEventListener("input", () => {
    if ([...ed.childNodes].some(n => n.nodeType === 3 || (n.nodeType === 1 && !BLOCK.test(n.tagName))) || ed.querySelector("p > :is(ul, ol, blockquote, h4, h5, h6), :scope > div")) withCaret(() => {});
    else ed.querySelectorAll("ul.todo").forEach(ensureTodo);
    sync();
    sg.update();
  });
  document.addEventListener("selectionchange", state);
  try {
    document.execCommand("defaultParagraphSeparator", false, "p");
  } catch {}
  return { el: ed, destroy: () => document.removeEventListener("selectionchange", state) };
}

function linkSuggest(ed, getTargets, onPick, insertChip) {
  const box = document.createElement("div");
  box.className = "rt-suggest";
  box.hidden = true;
  box.setAttribute("role", "listbox");
  ed.after(box);
  let items = [];
  let active = 0;
  let hitRange = null;
  const api = { open: false };
  const hide = () => {
    box.hidden = true;
    api.open = false;
    items = [];
  };
  const draw = () => {
    box.innerHTML = items.map((it, i) => `<button type="button" class="rt-sg ${i === active ? "on" : ""}" data-sg="${i}" role="option" aria-selected="${i === active ? "true" : "false"}"><b>${esc(it.title)}</b><small>${esc(it.sub || "")}</small></button>`).join("");
  };
  const pick = i => {
    const it = items[i];
    if (!it || !hitRange) return hide();
    const range = hitRange;
    hide();
    insertChip(range, it.title);
    onPick();
  };
  api.update = () => {
    if (!getTargets) return hide();
    const s = window.getSelection();
    if (!s.rangeCount || !s.isCollapsed) return hide();
    const node = s.anchorNode;
    if (!node || node.nodeType !== 3 || !ed.contains(node)) return hide();
    const before = node.nodeValue.slice(0, s.anchorOffset);
    const m = before.match(/\[\[([^\]\n|]{0,40})$/);
    if (!m) return hide();
    hitRange = document.createRange();
    hitRange.setStart(node, s.anchorOffset - m[0].length);
    const after = node.nodeValue.slice(s.anchorOffset, s.anchorOffset + 2) === "]]" ? 2 : 0;
    hitRange.setEnd(node, s.anchorOffset + after);
    const q = lnorm(m[1]).trim();
    const all = (getTargets() || []).map(t => ({ title: t.title, sub: t.secName + (t.aliases && t.aliases.length ? ` · ${t.aliases.join(", ")}` : ""), keys: [t.title, ...(t.aliases || [])].map(lnorm) }));
    const starts = all.filter(t => !q || t.keys.some(k => k.startsWith(q)));
    const inner = q ? all.filter(t => !starts.includes(t) && t.keys.some(k => k.includes(q))) : [];
    items = [...starts, ...inner].slice(0, 8);
    if (q && !all.some(t => t.keys.includes(q))) items.push({ title: m[1].trim(), sub: "новая ссылка: заметку можно создать потом" });
    if (!items.length) return hide();
    active = Math.min(active, items.length - 1);
    draw();
    box.hidden = false;
    api.open = true;
    const host = ed.parentNode;
    const rr = s.getRangeAt(0).getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    if (rr.bottom || rr.top) {
      box.style.top = Math.round(rr.bottom - hr.top + 6) + "px";
      box.style.left = Math.round(Math.max(0, Math.min(rr.left - hr.left, hr.width - Math.min(320, hr.width)))) + "px";
    }
  };
  api.key = e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
      return draw();
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      return pick(active);
    }
    e.preventDefault();
    e.stopPropagation();
    hide();
  };
  box.addEventListener("pointerdown", e => e.preventDefault());
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-sg]");
    if (b) pick(Number(b.dataset.sg));
  });
  ed.addEventListener("blur", () => setTimeout(hide, 150));
  return api;
}
