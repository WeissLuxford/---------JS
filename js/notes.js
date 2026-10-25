import { esc } from "./ui.js";

export const NOTE_SECTIONS = [
  { key: "sessions", name: "Журнал", icon: "gi/delapouite/notebook", add: "Сессия" },
  { key: "people", name: "Люди", icon: "gi/lorc/rally-the-troops", add: "Человек" },
  { key: "places", name: "Места", icon: "gi/lorc/treasure-map", add: "Место" },
  { key: "quests", name: "Задания", icon: "gi/delapouite/flag-objective", add: "Задание" },
  { key: "clues", name: "Улики", icon: "gi/lorc/footprint", add: "Улика" },
  { key: "questions", name: "Вопросы", icon: "gi/lorc/wax-seal", add: "Вопрос" },
  { key: "patron", name: "Покровитель", icon: "gi/delapouite/warlock-hood", add: "Запись" },
  { key: "misc", name: "Прочее", icon: "gi/lorc/papers", add: "Заметка" }
];

export const SECTION_NAME = Object.fromEntries(NOTE_SECTIONS.map(s => [s.key, s.name]));

export const NOTE_STATUS = { active: ["Активно", "#e9c77a"], done: ["Выполнено", "#4fcf6a"], failed: ["Провалено", "#e5533d"] };
export const NOTE_ATTITUDE = { ally: ["Союзник", "#4fcf6a"], neutral: ["Нейтрально", "#c9b48a"], hostile: ["Враг", "#e5533d"] };
export const QUESTION_STATE = { open: ["Запечатано", "#d0573f"], answered: ["Вскрыто", "#4fcf6a"] };
export const CLUE_STATE = { lead: ["Зацепка", "#e9c77a"], confirmed: ["Подтверждено", "#4fcf6a"], false: ["Ложный след", "#8d8577"] };

const ENDINGS = ["иями", "ями", "ами", "ого", "его", "ому", "ему", "ыми", "ими", "ой", "ей", "ом", "ем", "ам", "ям", "ах", "ях", "ою", "ею", "ая", "яя", "ое", "ее", "ые", "ие", "ый", "ий", "ую", "юю", "ов", "ев", "ья", "ье", "ью", "а", "я", "у", "ю", "е", "ы", "и", "о", "ь", "й"];

export const norm = s => String(s ?? "").toLowerCase().replace(/ё/g, "е");

export function stem(word) {
  const w = norm(word);
  if (w.length <= 3 || !/[а-я]$/.test(w)) return w;
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
  return w;
}

const WORD_RE = /[a-zа-яё0-9]+/gi;

export const words = s => norm(s).match(WORD_RE) || [];

export function queryStems(q) {
  return [...new Set(words(q).map(stem))].filter(Boolean);
}

export const noteTagsOf = n => String(n.tags || "").split(",").map(t => t.trim()).filter(Boolean);

export const aliasesOf = n => String(n.aliases || "").split(",").map(t => t.trim()).filter(Boolean);

const FLEETING = /^(.+[^аеиоуыэюяё])[ео]([бвгджзклмнпрстфхцчшщ])$/;

function wordForms(text) {
  const out = [];
  for (const w of words(text)) {
    out.push(w);
    const m = w.match(FLEETING);
    if (m) out.push(m[1] + m[2]);
  }
  return out;
}

function fieldHits(text, stems) {
  const ws = wordForms(text);
  return stems.map(s => ws.some(w => w.startsWith(s)));
}

export function noteScore(n, stems) {
  if (!stems.length) return 0;
  const parts = [[n.title, 8], [aliasesOf(n).join(" "), 6], [n.tags, 4], [n.subtitle, 3], [n.text, 1]];
  let score = 0;
  const found = stems.map(() => false);
  for (const [text, weight] of parts) {
    const hits = fieldHits(text, stems);
    hits.forEach((h, i) => {
      if (h) {
        found[i] = true;
        score += weight;
      }
    });
  }
  if (!found.every(Boolean)) return 0;
  if (stems.length > 1 && norm(n.title).includes(stems.join(" "))) score += 5;
  return score + (n.pinned ? 1 : 0);
}

export function searchNotes(c, q) {
  const stems = queryStems(q);
  if (!stems.length) return [];
  const out = [];
  for (const s of NOTE_SECTIONS) {
    for (const n of (c.notes && c.notes[s.key]) || []) {
      const score = noteScore(n, stems);
      if (score) out.push({ sec: s.key, n, score });
    }
  }
  return out.sort((a, b) => b.score - a.score || String(a.n.title || "").localeCompare(String(b.n.title || ""), "ru"));
}

export function highlight(text, stems) {
  const s = String(text ?? "");
  if (!stems.length) return esc(s);
  let out = "";
  let last = 0;
  for (const m of s.matchAll(WORD_RE)) {
    const w = norm(m[0]);
    const st = stems.find(x => w.startsWith(x));
    if (!st) continue;
    out += esc(s.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`;
    last = m.index + m[0].length;
  }
  return out + esc(s.slice(last));
}

export function plainText(text) {
  return String(text ?? "").replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, a, b) => b || a).replace(/[#>*_~=`|]+/g, " ").replace(/^\s*-\s(\[( |x|х)\]\s)?/gim, "").replace(/\s+/g, " ").trim();
}

export function snippetHtml(text, stems, size = 140) {
  const plain = plainText(text);
  if (!plain) return "";
  let at = -1;
  for (const m of plain.matchAll(WORD_RE)) {
    if (stems.some(x => norm(m[0]).startsWith(x))) {
      at = m.index;
      break;
    }
  }
  if (at < 0) return esc(plain.length > size ? plain.slice(0, size - 1) + "…" : plain);
  const from = Math.max(0, at - 50);
  const to = Math.min(plain.length, from + size);
  return (from ? "…" : "") + highlight(plain.slice(from, to), stems) + (to < plain.length ? "…" : "");
}

export function linkIndex(c) {
  const map = new Map();
  for (const s of NOTE_SECTIONS) {
    for (const n of (c.notes && c.notes[s.key]) || []) {
      for (const name of [n.title, ...aliasesOf(n)]) {
        const k = norm(name).trim();
        if (k && !map.has(k)) map.set(k, { sec: s.key, id: n.id, title: n.title || "Без названия" });
      }
    }
  }
  return map;
}

export function linkTargets(c) {
  const out = [];
  for (const s of NOTE_SECTIONS) {
    for (const n of (c.notes && c.notes[s.key]) || []) {
      if (!String(n.title || "").trim()) continue;
      out.push({ title: n.title, sec: s.key, secName: s.name, aliases: aliasesOf(n) });
    }
  }
  return out;
}

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MENTION_SECTIONS = ["people", "places", "clues", "quests"];

const TITLE_WORDS = new Set(["отец", "мать", "брат", "сестра", "капитан", "лорд", "леди", "сэр", "мастер", "господин", "госпожа", "святой", "святая", "король", "королева", "принц", "принцесса", "барон", "баронесса", "граф", "графиня", "герцог", "герцогиня", "старый", "старая", "старик", "тетя", "дядя", "доктор", "профессор", "сержант", "лейтенант", "командир", "епископ", "жрец", "жрица", "магистр", "инспектор", "детектив", "мистер", "миссис", "мисс", "мадам", "бабушка", "дедушка", "город", "улица", "площадь", "порт", "храм", "собор", "таверна", "башня", "замок", "район", "квартал", "новый", "новая", "верхний", "нижний", "средний"]);

export function mentionNames(c) {
  const list = [];
  for (const sec of MENTION_SECTIONS) {
    for (const n of (c.notes && c.notes[sec]) || []) {
      for (const name of [n.title, ...aliasesOf(n)]) {
        const clean = String(name || "").trim();
        if (clean.length >= 3) list.push({ name: clean, sec, id: n.id, strict: false });
      }
    }
  }
  const count = new Map();
  const seen = new Set(list.map(x => norm(x.name)));
  for (const x of list) if (x.sec === "people" || x.sec === "places") for (const w of new Set(words(x.name))) count.set(w, (count.get(w) || 0) + 1);
  for (const x of list.slice()) {
    if (x.sec !== "people" && x.sec !== "places") continue;
    const parts = x.name.split(/\s+/);
    if (parts.length < 2) continue;
    const phrase = parts.some(p => /^[а-яёa-z]/.test(p) && !TITLE_WORDS.has(norm(p)) && !["де", "ла", "ле", "ван", "фон", "дер", "ди", "да", "дю", "аль", "эль", "бен", "ибн"].includes(norm(p)));
    for (const part of parts) {
      const clean = part.replace(/[^A-Za-zА-Яа-яЁё-]/g, "");
      const w = norm(clean);
      if (w.length < 4 || !/^[A-ZА-ЯЁ]/.test(clean) || TITLE_WORDS.has(w) || count.get(w) !== 1 || seen.has(w)) continue;
      seen.add(w);
      list.push({ name: clean, sec: x.sec, id: x.id, strict: phrase ? "cap" : true });
    }
  }
  return list.sort((a, b) => b.name.length - a.name.length);
}

const ci = (text, strictFirst) => {
  let out = "";
  let first = true;
  for (const ch of text) {
    const lo = ch.toLowerCase();
    const up = ch.toUpperCase();
    if (lo === up) out += reEsc(ch);
    else if (first && strictFirst) out += reEsc(up);
    else out += `[${lo}${up}]`;
    if (lo !== up) first = false;
  }
  return out;
};

export const COMMON_NAMES = new Set(["вера", "надежда", "любовь", "лев", "мила", "роза", "лилия", "ива", "лиса", "кот", "волк", "ворон", "сокол", "орел", "медведь", "змей", "клык", "коготь", "гром", "буря", "луна", "звезда", "заря", "слава", "мир", "свет", "ночь", "тень", "рок", "дар", "жук", "бык", "камень", "пепел", "руна", "май", "маг", "шут", "ада", "ад", "рай", "сила", "воля", "доля", "весна", "зима", "осень", "лето", "солнце", "небо", "море", "река", "лес", "гора", "поле", "вор", "лорд", "мастер", "король", "принц", "герой", "барон", "граф"]);

function wordPattern(word, capFirst) {
  const w = norm(word);
  const short = w.length === 3 && /[айяьоеу]$/.test(w);
  const st = short ? w.slice(0, 2) : stem(word);
  const tail = short ? "(?:[йяюеиаоуыь]|ем|ом|ой|ей)" : st.length < w.length ? "[а-яё]{0,3}" : /[а-яё]$/i.test(word) ? "[а-яё]{0,2}" : "";
  return ci(esc(word).slice(0, st.length), capFirst) + tail;
}

function namePattern(name, strict = false) {
  const parts = String(name).trim().split(/\s+/);
  const single = parts.length === 1;
  return parts.map((p, i) => wordPattern(p, i === 0 && (strict === "cap" || ((single || strict) && COMMON_NAMES.has(norm(p)))))).join("\\s+");
}

let matcherMemo = { key: null, value: null };

export function mentionMatcher(c) {
  const names = mentionNames(c);
  if (!names.length) return null;
  const key = names.map(x => `${x.name}|${x.sec}|${x.id}|${x.strict}`).join("\n");
  if (matcherMemo.key === key) return matcherMemo.value;
  const value = buildMatcher(names);
  matcherMemo = { key, value };
  return value;
}

function buildMatcher(names) {
  const byPattern = names.map(x => ({ ...x, re: new RegExp(`^${namePattern(x.name, x.strict)}$`, "u") }));
  const big = new RegExp(`(^|[^а-яёА-ЯЁa-zA-Z0-9])(${byPattern.map(x => namePattern(x.name, x.strict)).join("|")})(?![а-яёА-ЯЁa-zA-Z0-9])`, "gu");
  return {
    re: big,
    find: text => byPattern.find(x => x.re.test(text)) || null
  };
}

export function referencedIds(c, n, index = linkIndex(c), matcher = mentionMatcher(c)) {
  const ids = new Set();
  const text = String(n.text || "");
  for (const m of text.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g)) {
    const hit = index.get(norm(m[1]).trim());
    if (hit) ids.add(hit.id);
  }
  if (matcher) {
    const plain = esc(text.replace(/\[\[[^\]]*\]\]/g, " "));
    matcher.re.lastIndex = 0;
    for (const m of plain.matchAll(matcher.re)) {
      const hit = matcher.find(m[2]);
      if (hit) ids.add(hit.id);
    }
  }
  ids.delete(n.id);
  return ids;
}

export function backlinks(c) {
  const index = linkIndex(c);
  const matcher = mentionMatcher(c);
  const map = new Map();
  for (const s of NOTE_SECTIONS) {
    for (const n of (c.notes && c.notes[s.key]) || []) {
      for (const id of referencedIds(c, n, index, matcher)) {
        if (!map.has(id)) map.set(id, []);
        map.get(id).push({ sec: s.key, id: n.id, title: n.title || "Без названия" });
      }
    }
  }
  return map;
}

export function richLinks(c) {
  const index = linkIndex(c);
  const matcher = mentionMatcher(c);
  const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const link = (nameHtml, labelHtml) => {
    const name = unesc(nameHtml).trim();
    const hit = index.get(norm(name));
    const label = labelHtml || nameHtml;
    if (!hit) return `<button type="button" class="wl missing" data-act="note-create-link" data-name="${esc(name)}" title="Такой заметки ещё нет: нажми, чтобы создать">${label}</button>`;
    return `<button type="button" class="wl" data-act="open-note" data-sec="${hit.sec}" data-id="${esc(hit.id)}" title="${esc(SECTION_NAME[hit.sec] || "")}: ${esc(hit.title)}">${label}</button>`;
  };
  return selfId => ({
    link,
    mentions: matcher
      ? {
          re: matcher.re,
          render(textHtml) {
            const hit = matcher.find(textHtml);
            if (!hit || hit.id === selfId) return null;
            return `<button type="button" class="wl soft" data-act="open-note" data-sec="${hit.sec}" data-id="${esc(hit.id)}">${textHtml}</button>`;
          }
        }
      : null
  });
}

export function markMatches(root, stems) {
  if (!root || !stems.length) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const ranges = [];
    for (const m of text.matchAll(WORD_RE)) if (stems.some(x => norm(m[0]).startsWith(x))) ranges.push([m.index, m.index + m[0].length]);
    if (!ranges.length || (node.parentElement && node.parentElement.closest("mark"))) continue;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const [a, b] of ranges) {
      frag.append(document.createTextNode(text.slice(last, a)));
      const mk = document.createElement("mark");
      mk.className = "hit";
      mk.textContent = text.slice(a, b);
      frag.append(mk);
      last = b;
    }
    frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export const dateText = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function noteDay(n) {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(n.date || ""));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = Number(n.created) || 0;
  return t > 0 ? new Date(t) : null;
}

export function shortDate(d, now = new Date()) {
  if (!d) return "";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : " " + d.getFullYear()}`;
}

export function noteDates(n) {
  const made = noteDay(n);
  const t = Number(n.updated) || Number(n.touched) || 0;
  const edit = t > 0 ? new Date(t) : null;
  const sameDay = made && edit && made.toDateString() === edit.toDateString();
  return { made, edit: edit && !sameDay ? edit : null };
}

const pad = n => String(n).padStart(2, "0");

export const timeText = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const SESSION_GAP = 12 * 60 * 60 * 1000;

export function currentSession(c, now = Date.now()) {
  const list = ((c.notes && c.notes.sessions) || []).filter(n => Number(n.created) > 0);
  const last = list.sort((a, b) => Number(b.created) - Number(a.created))[0];
  if (!last) return null;
  const lastEntry = Math.max(Number(last.created) || 0, Number(last.touched) || 0);
  return now - lastEntry < SESSION_GAP ? last : null;
}

export function newSession(c, now = Date.now(), id = "nt-ses-" + now.toString(36)) {
  const d = new Date(now);
  const n = ((c.notes && c.notes.sessions) || []).length + 1;
  return { id, title: `Сессия ${n}`, subtitle: dateText(d), date: isoDate(d), created: now, touched: now, text: "", tags: "", collapsed: false, pinned: false };
}

export function appendEntry(text, entry, now = Date.now()) {
  const clean = String(entry || "").trim();
  if (!clean) return String(text || "");
  const lines = clean.split("\n");
  const first = `- **${timeText(new Date(now))}** ${lines[0]}`;
  const rest = lines.slice(1).map(l => (l.trim() ? `  ${l}` : "")).filter(Boolean);
  const body = [first, ...rest].join("\n");
  const base = String(text || "").replace(/\s+$/, "");
  return base ? `${base}\n${body}` : body;
}

const ENTRY = /^\s*- \*\*(\d\d:\d\d)\*\*\s?(.*)$/;

export function sessionEntries(text) {
  const parts = [];
  let free = [];
  let cur = null;
  const flushFree = () => {
    if (free.join("").trim()) parts.push({ free: free.join("\n") });
    free = [];
  };
  for (const l of String(text || "").replace(/\r/g, "").split("\n")) {
    const m = l.match(ENTRY);
    if (m) {
      flushFree();
      cur = { time: m[1], text: m[2] };
      parts.push(cur);
    } else if (cur && /^\s{2,}\S/.test(l)) cur.text += "\n" + l.trim();
    else {
      cur = null;
      free.push(l);
    }
  }
  flushFree();
  return parts;
}

export function journalMentions(c, id) {
  const index = linkIndex(c);
  const matcher = mentionMatcher(c);
  const out = [];
  for (const s of (c.notes && c.notes.sessions) || []) {
    for (const p of sessionEntries(s.text)) {
      const lines = p.time ? [p.text] : String(p.free || "").split("\n").map(l => l.trim()).filter(Boolean);
      for (const text of lines) if (referencedIds(c, { id: "", text }, index, matcher).has(id)) out.push({ sesId: s.id, title: s.title || "Сессия", day: noteDay(s), created: Number(s.created) || 0, time: p.time || "", text });
    }
  }
  return out.sort((a, b) => b.created - a.created || b.time.localeCompare(a.time));
}

export function journalLines(c, index = linkIndex(c), matcher = mentionMatcher(c)) {
  const out = [];
  const list = ((c.notes && c.notes.sessions) || []).slice().sort((a, b) => (Number(a.created) || 0) - (Number(b.created) || 0));
  for (const s of list) {
    for (const p of sessionEntries(s.text)) {
      const lines = p.time ? [p.text] : String(p.free || "").split("\n").map(l => l.trim()).filter(Boolean);
      for (const text of lines) {
        const ids = referencedIds(c, { id: "", text }, index, matcher);
        ids.delete(s.id);
        if (ids.size) out.push({ sesId: s.id, title: s.title || "Сессия", day: noteDay(s), time: p.time || "", text, ids });
      }
    }
  }
  return out;
}

export function noteDossier(c, id, lines = journalLines(c)) {
  const own = lines.filter(l => l.ids.has(id));
  if (!own.length) return null;
  const info = new Map();
  for (const s of NOTE_SECTIONS) if (s.key !== "sessions") for (const n of (c.notes && c.notes[s.key]) || []) info.set(n.id, { sec: s.key, id: n.id, title: n.title || "Без названия" });
  const placeIn = l => [...l.ids].map(x => info.get(x)).find(x => x && x.sec === "places" && x.id !== id) || null;
  const at = l => ({ sesId: l.sesId, title: l.title, day: l.day, time: l.time, text: l.text, place: placeIn(l) });
  const seen = own.slice().reverse().find(placeIn);
  const counts = new Map();
  for (const l of own) for (const x of l.ids) if (x !== id && info.has(x)) counts.set(x, (counts.get(x) || 0) + 1);
  const together = [...counts.entries()].sort((a, b) => b[1] - a[1] || info.get(a[0]).title.localeCompare(info.get(b[0]).title, "ru")).slice(0, 6).map(([x, n]) => ({ ...info.get(x), n }));
  return { count: own.length, first: at(own[0]), last: at(own[own.length - 1]), seen: seen ? at(seen) : null, together };
}

const ASK_WORDS = new Set(["кто", "что", "где", "когда", "почему", "зачем", "как", "какой", "какая", "какое", "какие", "чей", "чья", "чьи", "ли", "был", "была", "были", "было", "это", "этот", "эта", "тот", "там", "тут", "его", "её", "ее", "их", "нас", "нам", "они", "она", "он", "мы", "вообще", "такой", "такая", "сколько", "откуда", "куда", "чем", "кого", "кому", "чего", "есть", "будет", "может", "можно", "нужно", "надо", "если", "или", "который", "которая", "которые"]);

export function askStems(text) {
  return [...new Set(words(plainText(text)).filter(w => w.length >= 4 && !ASK_WORDS.has(w)).map(stem))];
}

export function questionClues(c, q, max = 20) {
  const index = linkIndex(c);
  const matcher = mentionMatcher(c);
  const qs = askStems(q.title + " " + (q.text || ""));
  const qids = referencedIds(c, { id: q.id, text: q.title + " " + (q.text || "") }, index, matcher);
  const qn = norm(q.title).replace(/[^a-zа-я0-9]+/g, " ").trim();
  const out = [];
  const list = ((c.notes && c.notes.sessions) || []).slice().sort((a, b) => (Number(a.created) || 0) - (Number(b.created) || 0));
  for (const s of list) {
    for (const p of sessionEntries(s.text)) {
      const lines = p.time ? [p.text] : String(p.free || "").split("\n").map(l => l.trim()).filter(Boolean);
      for (const text of lines) {
        if (norm(text).replace(/[^a-zа-я0-9]+/g, " ").trim() === qn) continue;
        const ws = new Set(askStems(text));
        const ids = referencedIds(c, { id: "", text }, index, matcher);
        const shared = qs.filter(x => ws.has(x)).length;
        const people = [...qids].filter(x => ids.has(x)).length;
        const score = shared + people * 2;
        if (shared >= 2 || (people >= 1 && shared >= 1) || people >= 2) out.push({ sesId: s.id, title: s.title || "Сессия", day: noteDay(s), time: p.time || "", text, score });
      }
    }
  }
  return out.slice(-max).reverse();
}

export function pinnedNotes(c) {
  const out = [];
  for (const s of NOTE_SECTIONS) for (const n of (c.notes && c.notes[s.key]) || []) if (n.pinned) out.push({ sec: s.key, n });
  return out;
}
