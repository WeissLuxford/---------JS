import { esc } from "./ui.js";

export const NOTE_SECTIONS = [
  { key: "sessions", name: "Журнал", icon: "notebook", add: "Сессия" },
  { key: "people", name: "Люди", icon: "people", add: "Человек" },
  { key: "places", name: "Места", icon: "map", add: "Место" },
  { key: "quests", name: "Задания", icon: "flag", add: "Задание" },
  { key: "clues", name: "Улики", icon: "monocle", add: "Улика" },
  { key: "patron", name: "Покровитель", icon: "pact", add: "Запись" },
  { key: "misc", name: "Прочее", icon: "scroll", add: "Заметка" }
];

export const SECTION_NAME = Object.fromEntries(NOTE_SECTIONS.map(s => [s.key, s.name]));

export const NOTE_STATUS = { active: ["Активно", "#e9c77a"], done: ["Выполнено", "#4fcf6a"], failed: ["Провалено", "#e5533d"] };
export const NOTE_ATTITUDE = { ally: ["Союзник", "#4fcf6a"], neutral: ["Нейтрально", "#c9b48a"], hostile: ["Враг", "#e5533d"] };
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
    for (const part of parts) {
      const clean = part.replace(/[^A-Za-zА-Яа-яЁё-]/g, "");
      const w = norm(clean);
      if (w.length < 4 || !/^[A-ZА-ЯЁ]/.test(clean) || TITLE_WORDS.has(w) || count.get(w) !== 1 || seen.has(w)) continue;
      seen.add(w);
      list.push({ name: clean, sec: x.sec, id: x.id, strict: true });
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

function namePattern(name, strict = false) {
  const parts = String(name).trim().split(/\s+/);
  const lastWord = parts.pop();
  const short = norm(lastWord).length === 3 && /[айяьоеу]$/.test(norm(lastWord));
  const st = short ? norm(lastWord).slice(0, 2) : stem(lastWord);
  const tail = short ? "[а-яё]{1,2}" : st.length < norm(lastWord).length ? "[а-яё]{0,3}" : /[а-яё]$/i.test(lastWord) ? "[а-яё]{0,2}" : "";
  const head = parts.map(p => ci(esc(p), false)).join("\\s+");
  const lastRe = ci(esc(lastWord).slice(0, st.length), (strict || short) && !head) + tail;
  return (head ? head + "\\s+" : "") + lastRe;
}

export function mentionMatcher(c) {
  const names = mentionNames(c);
  if (!names.length) return null;
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

export function pinnedNotes(c) {
  const out = [];
  for (const s of NOTE_SECTIONS) for (const n of (c.notes && c.notes[s.key]) || []) if (n.pinned) out.push({ sec: s.key, n });
  return out;
}
