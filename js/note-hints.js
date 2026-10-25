import { norm, stem, words, mentionMatcher, linkIndex, aliasesOf, askStems, referencedIds } from "./notes.js";
import { GEAR, POTIONS, gearToItem, potionToItem } from "./gear.js";
import { PACKS } from "./packs.js";
import { esc } from "./ui.js";

const STOP = new Set(["в", "во", "на", "из", "к", "ко", "у", "с", "со", "о", "об", "от", "до", "по", "за", "под", "над", "при", "про", "без", "для", "я", "мы", "он", "она", "они", "оно", "вы", "ты", "бог", "боги", "богиня", "ад", "ада", "аду", "аде", "рай", "небеса", "сила", "ловкость", "телосложение", "интеллект", "мудрость", "харизма", "кд", "хп", "зм", "см", "мм", "эм", "пм", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье", "январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь", "сессия", "глава", "итог", "итоги", "план", "вопрос", "важно", "потом", "завтра", "сегодня", "вчера", "утром", "вечером", "ночью", "днём", "днем", "кстати", "надо", "нужно", "может", "похоже", "кажется", "наверное", "итак", "дальше", "затем", "после", "перед", "когда", "если", "но", "и", "а", "да", "нет", "ну", "так", "там", "тут", "здесь", "все", "всё", "это", "этот", "эта", "тот", "та", "кто", "что", "где", "куда", "зачем", "почему", "как", "мой", "моя", "наш", "наша", "их", "его", "ее", "её", "лол", "ура", "блин", "rip", "нас", "нам", "вас", "вам", "им", "ему", "ей", "них", "него", "неё", "нее", "меня", "мне", "тебя", "тебе", "себя", "свой", "своя", "наши", "ваш", "ваша", "весь", "вся", "каждый", "никто", "партия", "группа", "отряд", "команда", "все", "мастер", "гм", "дм", "игрок", "игроки", "персонаж", "отдых", "бой", "раунд", "ход", "инициатива"]);

const TITLES = new Map(Object.entries({
  лорд: "people", леди: "people", сэр: "people", дама: "people", капитан: "people", мастер: "people", инквизитор: "people", святой: "people", святая: "people", дракон: "people", король: "people", королева: "people", принц: "people", принцесса: "people", герцог: "people", герцогиня: "people", барон: "people", баронесса: "people", граф: "people", графиня: "people", жрец: "people", жрица: "people", бармен: "people", стражник: "people", командир: "people", генерал: "people", архимаг: "people", маг: "people", отец: "people", мать: "people", брат: "people", сестра: "people", дядя: "people", тетя: "people", бабушка: "people", дедушка: "people", госпожа: "people", господин: "people", мистер: "people", миссис: "people", мисс: "people", мадам: "people", торговец: "people", кузнец: "people", трактирщик: "people", сержант: "people", лейтенант: "people", шериф: "people", епископ: "people", паладин: "people", демон: "people", дьявол: "people", бес: "people",
  таверна: "places", трактир: "places", корчма: "places", корабль: "places"
}).map(([k, v]) => [stem(k), v]));

const CREATURES = new Set(["стражник", "стража", "бармен", "гоблин", "хобгоблин", "орк", "культист", "бандит", "разбойник", "пират", "зомби", "скелет", "нежить", "демон", "дьявол", "бес", "тролль", "огр", "кракен", "гигант", "великан", "волк", "паук", "крыса", "наемник", "солдат", "рыцарь", "дракон", "виверна", "призрак", "вампир", "оборотень", "кобольд", "гнолл", "эльф", "дварф", "гном", "халфлинг", "человек", "люди", "монстр", "чудовище", "жрец", "маг", "стражи", "охранник", "торговец", "кузнец", "трактирщик", "нищий", "крестьянин", "ребенок", "старик", "старуха"].map(stem));

const ITEMS = new Set(["зелье", "кольцо", "плащ", "свиток", "меч", "щит", "посох", "жезл", "палочка", "амулет", "сумка", "книга", "доспех", "латы", "перчатки", "сапоги", "шлем", "карта", "кинжал", "лук", "топор", "ключ", "шкатулка", "сундук", "алебарда", "глефа", "копье", "арбалет", "броня", "мантия", "венец", "корона", "медальон", "печатка", "кубок", "камень", "кристалл", "огненный", "ледяной", "магический", "волшебный"].map(stem));

const JOIN = new Set(["де", "ван", "фон", "дер", "ла", "ле", "ди", "да", "аль", "эль", "бен", "ибн", "дю", "ду", "фан", "тер"]);

const PLACE_PREP = new Set(["в", "во", "из", "до", "через", "возле", "около", "над"]);

const PLACE_STEMS = new Set(["город", "врата", "таверна", "трактир", "корчма", "крепость", "замок", "замк", "храм", "собор", "церковь", "церкв", "лес", "гора", "порт", "башня", "район", "квартал", "улица", "площадь", "деревня", "село", "остров", "пещера", "подземелье", "руины", "мост", "река", "озеро", "болото", "пустыня", "долина", "перевал", "земли", "королевство", "империя", "вилла", "особняк", "поместье", "гильдия", "академия", "библиотека", "рынок", "рынк", "кладбище", "склеп", "гробница", "монастырь", "форт", "застава", "тракт", "дорога", "лагерь", "корабль", "трюм", "бухта", "залив", "шахта", "рудник", "дворец", "тюрьма", "казарма", "лавка", "магазин", "кузница", "баня", "лесу", "холм", "скала", "ущелье", "пустошь", "топь", "чаща", "роща"].map(stem));

const isPlaceWord = w => PLACE_STEMS.has(stem(w));

const VERBISH = /(ли|ла|ло|ть|ться|тся|сь|ся|ешь|ете|ем|ют|ят|ует|ает|яет|ил|ал|ел|ял|ул|ыл|нул)$/;

const VERB_NEXT = /(ли|ла|ло|ся|сь|ет|ит|ат|ят|ют|ут|ил|ал|ел|ял|ул|ыл|нул|ёт|ег|ёг)$/;

const ADJ = /(ым|ой|ый|ий|ая|яя|ое|ее|ые|ие|ых|их|ими|ыми|ого|его|ому|ему|ую|юю)$/;

const QUOTED = /[«"„“]([A-ZА-ЯЁ][^«»"„“”]{1,60})[»"”“]/g;

const WORD = /[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё'’-]*/g;

const OBLIQUE = /(у|ю|е|ом|ем|ой|ей|ах|ях|ам|ям|ами|ями|ых|их|ов|ев|ии|ою|ею)$/;

const DAT_PREP = new Set(["к", "ко", "по", "благодаря", "навстречу"]);

const GEN_PREP = new Set(["у", "от", "до", "из", "для", "без", "около", "возле", "против", "после", "кроме", "среди", "вокруг", "мимо", "ради", "вместо", "напротив", "со", "с", "про", "через"]);

const DAT_VERB = /^(дал|дала|дали|отдал|продал|передал|сказал|помог|написал|вернул|заплатил|обещал|рассказал|показал|должен|должна|должны|молил|верил|доверил|служ|подарил|ответил|предложил|отправил|послал|приказал|поклял|поклонил|сдал|завидовал|грозил|пригрозил|звонил)/;

const ACC_VERB = /(ли|ил|ал|ел|ял|ул|ыл|нул|ит|ат|ят|ют|ем|им)$/;

const isCap = w => /^[A-ZА-ЯЁ]/.test(w) && !/^[A-ZА-ЯЁ]{2,}$/.test(w);

function entityStems(c) {
  const out = new Set();
  for (const list of [c.spells, c.features, c.items, c.attacks, c.effects]) {
    for (const e of list || []) {
      const first = String(e.name || "").split(/\s+/)[0];
      if (first) out.add(stem(first));
    }
  }
  for (const part of String(c.name || "").split(/\s+/)) if (part) out.add(stem(part));
  return out;
}

function sentences(text) {
  const out = [];
  const src = String(text || "").replace(/\[\[[^\]]*\]\]/g, " , ").replace(/(^|\s)\d{1,2}[.)]\s+(?=[A-Za-zА-Яа-яЁё])/g, "\n• ");
  for (const line of src.split(/\n+/)) {
    const m = line.match(/^\s*[-•*–]\s*(.*)$/);
    const body = m ? m[1] : line;
    body.split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(Boolean).forEach((s, i) => out.push({ s, list: !!m && i === 0 }));
  }
  return out;
}

export function nameKey(name) {
  return String(name || "").split(/\s+/).filter(Boolean).map(stem).join(" ");
}

function capForms(text) {
  const map = new Map();
  for (const m of String(text || "").matchAll(WORD)) {
    if (!isCap(m[0]) || m[0].length < 3) continue;
    const k = stem(m[0]);
    if (!map.has(k)) map.set(k, new Set());
    map.get(k).add(m[0]);
  }
  return map;
}

function baseWord(w, { prev = "", prev2 = "", next = "", guess = "people", forms }) {
  const lo = norm(w);
  if (lo.length < 4 || JOIN.has(lo) || /[ьи]е$/.test(lo)) return w;
  const cand = [...((forms && forms.get(stem(w))) || [])].filter(f => f !== w && !OBLIQUE.test(norm(f)) && norm(f).length >= stem(w).length);
  if (cand.length) return [w, ...cand].filter(f => !OBLIQUE.test(norm(f))).sort((a, b) => a.length - b.length)[0];
  const cut = (n, add = "") => w.slice(0, w.length - n) + add;
  if (/ии$/.test(lo)) return cut(1, "я");
  if (/(ом|ем)$/.test(lo) && lo.length >= 6) return cut(2);
  if (/ой$/.test(lo)) return cut(2, "а");
  if (/ей$/.test(lo) && lo.length >= 5) return cut(2, "я");
  if (/ах$/.test(lo)) return cut(2, "а");
  if (/ях$/.test(lo)) return cut(2, "я");
  if (/[уюе]$/.test(lo)) {
    if (guess === "places") return /е$/.test(lo) && !["в", "во", "на", "о", "об", "при"].includes(prev) ? w : cut(1);
    if (DAT_PREP.has(prev) || DAT_VERB.test(prev) || DAT_VERB.test(next) || DAT_VERB.test(prev2)) return /е$/.test(lo) ? cut(1, "а") : /[еа]ю$/.test(lo) ? cut(1, "й") : /ю$/.test(lo) ? w : cut(1);
    if (/у$/.test(lo)) return cut(1, "а");
    if (/ю$/.test(lo)) return /ию$/.test(lo) ? cut(1, "я") : w;
    return cut(1, "а");
  }
  if (/[ая]$/.test(lo) && (GEN_PREP.has(prev) || (ACC_VERB.test(prev) && prev.length > 3))) return /я$/.test(lo) ? cut(1, guess === "places" ? "ь" : "й") : cut(1);
  if (/[ыи]$/.test(lo) && GEN_PREP.has(prev)) return cut(1, /ы$/.test(lo) ? "а" : "я");
  return w;
}

function baseName(parts, ctx) {
  const words = parts.filter(w => !JOIN.has(norm(w)));
  if (words.length >= 2 && /(ых|их)$/.test(norm(words[0]))) {
    return parts.map((w, i) => {
      const lo = norm(w);
      if (i === 0) return w.slice(0, -2) + (lo.endsWith("их") ? "ие" : "ые");
      if (/(ов|ев)$/.test(lo)) return w.slice(0, -2) + (/[гкхжшчщ]$/.test(lo.slice(0, -2)) ? "и" : "ы");
      return w;
    }).join(" ");
  }
  if (ctx.quoted || (words.length >= 2 && ADJ.test(norm(words[0])))) return parts.join(" ");
  if (ctx.guess === "places" && words.length >= 2) return [baseWord(parts[0], ctx), ...parts.slice(1)].join(" ");
  return parts.map(w => baseWord(w, ctx)).join(" ");
}

function knownStemsOf(c) {
  const out = new Set();
  for (const sec of ["people", "places"]) {
    for (const n of (c.notes && c.notes[sec]) || []) {
      for (const name of [n.title, ...aliasesOf(n)]) for (const w of norm(name).split(/\s+/)) if (w.length >= 3) out.add(stem(w));
    }
  }
  return out;
}

const squash = s => norm(s).replace(/э/g, "е").replace(/й/g, "и").replace(/[^a-zа-я ]/g, "").replace(/(.)\1+/g, "$1").trim();

export function editDistance(a, b, cap = 3) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      low = Math.min(low, cur[j]);
    }
    if (low > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

const near = (a, b) => {
  const len = Math.min(a.length, b.length);
  if (len < 4) return false;
  return editDistance(a, b, 2) <= (len >= 9 ? 2 : 1);
};

function cardsOf(c) {
  const out = [];
  for (const sec of ["people", "places"]) {
    for (const n of (c.notes && c.notes[sec]) || []) {
      const names = [n.title, ...aliasesOf(n)].filter(Boolean);
      out.push({ id: n.id, sec, title: n.title || "Без названия", names: names.map(squash), words: names.flatMap(x => squash(x).split(" ")).filter(w => w.length >= 5) });
    }
  }
  return out;
}

function twinCard(cards, name) {
  const full = squash(name);
  const words = full.split(" ").filter(Boolean);
  for (const card of cards) {
    if (card.names.some(x => x === full || near(x, full))) return card;
    if (words.length === 1 && words[0].length >= 5 && card.words.some(w => w === words[0] || near(w, words[0]))) return card;
  }
  return null;
}

export function findDoubles(c, sec, skip = []) {
  const list = ((c.notes && c.notes[sec]) || []).filter(n => String(n.title || "").trim());
  const out = [];
  const no = new Set(skip);
  const wordsOf = n => squash(n.title).split(" ").filter(w => w.length >= 3 && !TITLES.has(stem(w)));
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const [a, b] = [list[i], list[j]];
      const key = "merge:" + [a.id, b.id].sort().join("|");
      if (no.has(key)) continue;
      const wa = wordsOf(a).map(stem);
      const wb = wordsOf(b).map(stem);
      if (!wa.length || !wb.length) continue;
      const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
      const inside = small.every(w => big.includes(w)) && small.some(w => w.length >= 4);
      const typo = wa.length === wb.length && near(squash(a.title), squash(b.title));
      if (!inside && !typo) continue;
      const [keep, drop] = String(a.title).length >= String(b.title).length ? [a, b] : [b, a];
      out.push({ kind: "merge", key, sec, keep: keep.id, drop: drop.id, keepTitle: keep.title, dropTitle: drop.title });
    }
  }
  return out;
}

export function findNames(c, text, { ignore = [], known } = {}) {
  const matcher = known === undefined ? mentionMatcher(c) : known;
  const index = linkIndex(c);
  const skip = new Set(ignore);
  const ents = entityStems(c);
  const knownStems = knownStemsOf(c);
  const cards = cardsOf(c);
  const journal =((c.notes && c.notes.sessions) || []).map(s => s.text || "").join("\n");
  const forms = capForms(String(text || "") + "\n" + journal);
  const capsElsewhere = new Set();
  for (const { s } of sentences(String(text || "") + "\n" + journal)) [...s.matchAll(WORD)].slice(1).forEach(m => isCap(m[0]) && capsElsewhere.add(stem(m[0])));
  const out = [];
  const seen = new Set();
  const push = (parts, ctx) => {
    const words = parts.filter(w => !JOIN.has(norm(w)));
    if (!words.length) return;
    const name = baseName(parts, { ...ctx, forms });
    const key = nameKey(name);
    if (seen.has(key) || skip.has(key) || skip.has(nameKey(parts.join(" "))) || index.has(norm(name)) || index.has(norm(parts.join(" ")))) return;
    if (words.every(w => knownStems.has(stem(w)))) return;
    if (matcher && (matcher.find(esc(parts.join(" "))) || words.some(w => matcher.find(esc(w))))) return;
    seen.add(key);
    const twin = twinCard(cards, name);
    if (twin && !skip.has("alias:" + key)) out.push({ kind: "alias", name, key: "alias:" + key, id: twin.id, sec: twin.sec, title: twin.title, guess: ctx.guess });
    else out.push({ kind: "name", name, key, guess: ctx.guess, as: parts.join(" ") });
  };
  for (const { s: raw, list } of sentences(text)) {
    let s = raw;
    for (const m of raw.matchAll(QUOTED)) {
      const words = m[1].trim().match(WORD) || [];
      s = s.replace(m[0], " , ");
      if (!words.length || ITEMS.has(stem(words[0])) || CREATURES.has(stem(words[0]))) continue;
      const before = raw.slice(0, m.index).match(/([A-Za-zА-Яа-яЁё]+)\s*$/);
      const prev = before ? norm(before[1]) : "";
      push(words, { prev, quoted: true, guess: (prev && (isPlaceWord(prev) || PLACE_PREP.has(prev) || TITLES.get(stem(prev)) === "places")) || words.some(isPlaceWord) ? "places" : "misc" });
    }
    const ws = [...s.matchAll(WORD)];
    const gapOk = k => /^\s+$/.test(s.slice(ws[k - 1].index + ws[k - 1][0].length, ws[k].index));
    for (let i = 0; i < ws.length; i++) {
      if (!isCap(ws[i][0])) continue;
      const run = [i];
      let j = i + 1;
      while (j < ws.length && gapOk(j)) {
        if (isCap(ws[j][0])) {
          run.push(j++);
          continue;
        }
        let k = j;
        while (k < ws.length && JOIN.has(norm(ws[k][0])) && gapOk(k)) k++;
        if (k > j && k < ws.length && isCap(ws[k][0]) && gapOk(k)) {
          for (let x = j; x <= k; x++) run.push(x);
          j = k + 1;
          continue;
        }
        break;
      }
      i = j - 1;
      let first = run[0] === 0;
      let titled = "";
      const before = run[0] > 0 ? norm(ws[run[0] - 1][0]) : "";
      if (TITLES.has(stem(before))) titled = TITLES.get(stem(before));
      while (run.length) {
        const w = norm(ws[run[0]][0]);
        if (TITLES.has(stem(w)) && run.length > 1) {
          titled = TITLES.get(stem(w));
          run.shift();
          first = false;
          continue;
        }
        if (STOP.has(w) || w.length < 2 || (first && run.length > 1 && VERBISH.test(w) && !capsElsewhere.has(stem(w)))) {
          run.shift();
          first = false;
          continue;
        }
        break;
      }
      if (!run.length) continue;
      const parts = run.map(k => ws[k][0]);
      const words = parts.filter(w => !JOIN.has(norm(w)));
      if (!words.length) continue;
      const lead = stem(words[0]);
      if (ITEMS.has(lead) || (CREATURES.has(lead) && words.length === 1) || (TITLES.has(lead) && words.length === 1)) continue;
      const nextIdx = run[run.length - 1] + 1;
      const next = ws[nextIdx] && gapOk(nextIdx) ? ws[nextIdx][0] : "";
      const near = run[0] > 0 ? norm(ws[run[0] - 1][0]) : "";
      const prevWord = TITLES.has(stem(near)) && !TITLES.has(near) ? (/[ая]$/.test(near) ? "у" : /[ую]$/.test(near) ? "к" : near) : near;
      if (words.length === 1 && next && !isCap(next) && isPlaceWord(next) && ADJ.test(norm(words[0]))) {
        push([words[0], next], { prev: prevWord, guess: "places" });
        continue;
      }
      if (first && !titled && words.length < 2 && !list && !(ws.length === 1 && raw.length < 40 && list)) {
        const lone = ws.length === 1;
        if (!capsElsewhere.has(stem(words[0])) && (lone || VERBISH.test(norm(words[0])) || ADJ.test(norm(words[0])) || !VERB_NEXT.test(norm(next)))) continue;
      }
      if (words.every(w => STOP.has(norm(w)) || norm(w).length < 3)) continue;
      if (words.length === 1 && ents.has(stem(words[0]))) continue;
      if (words.length === 1 && ADJ.test(norm(words[0])) && next && !isCap(next)) continue;
      const org = words.length >= 2 && ADJ.test(norm(words[0])) && !words.some(isPlaceWord);
      const guess = titled || (PLACE_PREP.has(prevWord) || words.some(isPlaceWord) ? "places" : org ? "misc" : "people");
      push(parts, { prev: prevWord, prev2: run[0] > 1 ? norm(ws[run[0] - 2][0]) : "", next: norm(next), guess });
    }
  }
  return out;
}

const UNITS = [["pp", /^(пм|pp|плат)/], ["gp", /^(зм|gp|зол)/], ["ep", /^(эм|ep|элек)/], ["sp", /^(см|сп|sp|сер)/], ["cp", /^(мм|cp|мед)/]];

const COIN_RE = /(^|[^\dA-Za-zА-Яа-яЁё.,])([+\-−]\s*)?(\d{1,3}(?:[ .]\d{3})+|\d+(?:[.,]\d{1,2})?)\s*(к|k|тыс\.?)?\s*(пм|зм|эм|см|сп|мм|pp|gp|ep|sp|cp|плат[а-яё]*|золот[а-яё]*|зол\.?|электр[а-яё]*|серебр[а-яё]*|медн[а-яё]*|медяк[а-яё]*)(?![a-zа-яё])/gi;

const CUES = [
  [1, /(получ|нашл|нашёл|нашел|найден|заработ|продал|продали|продаж|выигр|награди|наградил|подарил[аи]? нам|подарок|добыч|трофе|забрал|сняли с|снял с|обыскал|отсыпал|заплатил[аи]? нам|заплатил[аи]? мне|нам дал|мне дал|дал[аи]? нам|дал[аи]? мне|вернул[аи]? нам|вернул[аи]? мне|нам вернул|мне вернул|прибыль|доход|выручк|разжил|вытряс|ограбил|в сундуке|внутри|взял[аи]?(?:\s+\S+){0,3}\s+в долг|занял[аи]?|одолжил[аи]? нам|одолжил[аи]? мне)/gi],
  [-1, /(потрат|заплатил|заплатили|заплатить|отдал|отдали|отдать|отдам|купил|купили|покупк|проиграл|проиграли|пожертв|подкуп|взятк|задолж|должен|должна|должны|долг|аренд|оплатил|оплатили|за ночлег|за комнат|в долг|штраф|налог|пошлин|чаевые|спустил|обокр|украл|укради|потерял|потеряли|ушло|ушли|отняли|отобрали|скинул|вложил|вложили|одолжил|одолжили|вернул|вернули|дали|дал|дала)/gi],
  [0, /(в кошельк|в кошеле|осталось|осталась|итого|всего|у нас|у меня|казн|награда за|наградой|цена|ценой|стоит|стоят|стоимост|обещал|обещали|предлож|просит|требует|хочет|хотят|лежат|лежит)/gi]
];

const BALANCE = /(в кошельк|в кошеле|осталось|осталась|итого|у нас|у меня|казн)/i;

const hash = s => {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
};

function parseAmount(num, mult) {
  let n;
  if (/^\d{1,3}(?:[ .]\d{3})+$/.test(num)) n = Number(num.replace(/[ .]/g, ""));
  else n = Number(num.replace(",", "."));
  if (mult) n *= 1000;
  return Math.round(n * 100) / 100;
}

function cueSign(s, at, end) {
  const found = [];
  for (const [sign, re] of CUES) {
    re.lastIndex = 0;
    for (const m of s.matchAll(re)) found.push({ sign, at: m.index, end: m.index + m[0].length, word: norm(m[0]) });
  }
  const back = found.filter(f => f.end <= at).sort((a, b) => b.end - a.end);
  const fwd = found.filter(f => f.at >= end && f.at - end < 30).sort((a, b) => a.at - b.at);
  const near = back[0] || fwd[0];
  const pick = near && found.filter(f => f.at < near.end && near.at < f.end).sort((a, b) => b.end - b.at - (a.end - a.at))[0];
  if (!pick) return 0;
  if (/^(дал|дала|дали|вернул|вернули)$/.test(pick.word)) {
    const pre = s.slice(Math.max(0, pick.at - 30), pick.at).match(/([A-Za-zА-Яа-яЁё]+)\s*$/);
    if (pre && isCap(pre[1]) && !STOP.has(norm(pre[1]))) return 1;
  }
  return pick.sign;
}

export function findCoins(text) {
  const out = [];
  for (const { s } of sentences(text)) {
    const each = /(кажд[а-яё]* по|по\s+\d[\d.,]*\s*\S+\s+(?:на\s+)?кажд|на брата|на каждого|на нос)/i.test(s);
    let n = 0;
    const per = each && s.match(/(?:^|\s)по\s+(\d+(?:[.,]\d{1,2})?)(?![\d.,]|\s*(?:пм|зм|эм|см|сп|мм|pp|gp|ep|sp|cp|плат|золот|зол|электр|серебр|медн|медяк))/i);
    if (per) {
      const any = [...s.matchAll(COIN_RE)][0];
      const unit = any ? (UNITS.find(([, re]) => re.test(norm(any[5]))) || ["gp"])[0] : "gp";
      out.push({ kind: "coins", amount: parseAmount(per[1]), unit, sign: cueSign(s, per.index, per.index + per[0].length) || 1, balance: false, key: `coins:${hash(norm(s))}:0` });
      continue;
    }
    for (const m of s.matchAll(COIN_RE)) {
      const pre = s.slice(Math.max(0, m.index - 4), m.index + m[1].length);
      if (each && !/по\s*$/i.test(pre)) continue;
      const amount = parseAmount(m[3], m[4]);
      if (!amount) continue;
      const unit = (UNITS.find(([, re]) => re.test(norm(m[5]))) || ["gp"])[0];
      const at = m.index + m[1].length;
      const end = m.index + m[0].length;
      const sign = m[2] ? (/[-−]/.test(m[2]) ? -1 : 1) : cueSign(s, at, end);
      const balance = !m[2] && BALANCE.test(s.slice(0, end)) && sign === 0;
      out.push({ kind: "coins", amount, unit, sign, balance, key: `coins:${hash(norm(s))}:${n++}` });
    }
  }
  return out;
}

const DIES = /(погиб(ла|ли)?|умер(ла|ли)?|помер(ла|ли)?|скончал(ся|ась|ись)|сдох(ла|ли)?|не выжил[аи]?|пал[аи]? в бою|утонул[аи]?|разбил(ся|ась)|м[её]ртв(а|ы)?(?![а-яё])|убит(а|ы)?(?![а-яё])|казн[её]н(а|ы)?(?![а-яё])|больше нет|rip|☠|†)/i;

const KILL_SG = /(?<![а-яё])(убил|убила|зарубил|зарубила|прикончил|прикончила|застрелил|застрелила|задушил|задушила|сжёг|сжег|сожгла|добил|добила|обезглавил|обезглавила|сожрал|сожрала|растерзал|растерзала|повесил|повесила|казнил|казнила|заколол|заколола|отравил|отравила)(?![а-яё])/i;

const KILL_PL = /(?<![а-яё])(убили|зарубили|прикончили|застрелили|задушили|сожгли|добили|обезглавили|сожрали|растерзали|повесили|казнили|закололи|отравили)(?![а-яё])/i;

const FOUND_DEAD = /(нашли|найден[аоы]?|обнаружил[аи]?|лежал[аи]?|лежит)\s.*м[её]ртв/i;

const NOT_DEAD = /(чуть не|едва не|не убил|не убили|не умер|не погиб|не м[её]ртв|почти|хотел[аи]? убить|хочет убить|хотят убить|пытал[аи]?с[ья] убить|угрожал|воскрес|оживил|оживили|ожил[аи]?|(?<!не\s)выжил[аи]?(?![а-яё])|жив(а|ы)?(?![а-яё])|мертвецки|убил[аи]? время|убить время|чуть|возможно|кажется|если)/i;

const PREP_AFTER = /^\s*(?:(?:на|в|во|у|за|под|над|при|об|о|с|со|из|к|по|возле|около|рядом|прямо|вчера|сегодня|ночью|утром|наконец|сразу|тут|там)(?![а-яё])|[^а-яёa-z]*$)/i;

export function findDeaths(c, text, known) {
  const matcher = known === undefined ? mentionMatcher(c) : known;
  if (!matcher) return [];
  const people = (c.notes && c.notes.people) || [];
  const out = [];
  const seen = new Set();
  const clauses = String(text || "").replace(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g, "$1").split(/[.!?…;\n]+|,|\s(?:а|но|однако|зато)\s/i);
  for (const clause of clauses) {
    if (NOT_DEAD.test(clause)) continue;
    const dies = DIES.test(clause) || FOUND_DEAD.test(clause);
    const sg = clause.match(KILL_SG);
    const pl = clause.match(KILL_PL);
    if (!dies && !sg && !pl) continue;
    const plain = esc(clause);
    matcher.re.lastIndex = 0;
    const hits = [];
    for (const m of plain.matchAll(matcher.re)) {
      const hit = matcher.find(m[2]);
      if (!hit || hit.sec !== "people") continue;
      const at = m.index + m[1].length;
      const before = plain.slice(Math.max(0, at - 3), at);
      if (/(^|\s)у\s$/i.test(before)) continue;
      hits.push({ hit, at, word: m[2] });
    }
    let victims = hits;
    const kill = sg || pl;
    if (kill && !dies) {
      const vAt = esc(clause.slice(0, kill.index)).length;
      const vEnd = vAt + esc(kill[0]).length;
      const after = hits.filter(h => h.at >= vEnd);
      const beforeV = hits.filter(h => h.at < vAt);
      const rest = plain.slice(vEnd);
      if (after.length) victims = after;
      else if (pl) victims = PREP_AFTER.test(rest) ? beforeV : [];
      else {
        const fem = /а$/.test(norm(kill[0]));
        victims = beforeV.filter(h => {
          const w = norm(h.word);
          return /[ауяю]$/.test(w) && !(fem && /[ая]$/.test(w));
        });
      }
    }
    for (const { hit } of victims) {
      if (seen.has(hit.id)) continue;
      const n = people.find(x => x.id === hit.id);
      if (!n || n.dead) continue;
      seen.add(hit.id);
      out.push({ kind: "dead", id: hit.id, title: n.title || hit.name, key: "dead:" + hit.id });
    }
  }
  return out;
}

const HOSTILE = /(?<![а-яё])(напал[аи]?|напад[а-яё]*|атаковал[аи]?|предал[аи]?|обманул[аи]?|кинул[аи]?|ограбил[аи]?|обокрал[аи]?|угрожал[аи]?|подставил[аи]?|сдал[аи]? нас|устроил[аи]? засаду|пытал(?:ся|ась|ись) убить|хочет убить|хотят убить|враг|врагом|враги|ненавидит|шпионит|шпион|шпионка|предатель|предательница)(?![а-яё])/i;

const FRIEND = /(?<![а-яё])(помог(?:ла|ли)?|спас(?:ла|ли)?|вылечил[аи]?|исцелил[аи]?|защитил[аи]?|прикрыл[аи]?|поддержал[аи]?|союзник|союзница|союзником|союзники|друг|другом|подруга|подругой|подружил(?:ся|ась|ись)|присоединил(?:ся|ась|ись)|на нашей стороне|поклял(?:ся|ась) в верности|доверяет нам)(?![а-яё])/i;

const STATE_CUE = /^(враг|врагом|враги|ненавидит|шпион|шпионит|шпионка|предатель|предательница|предал[аи]?|союзник|союзница|союзником|союзники|друг|другом|подруга|подругой|подружил|присоединил|на нашей стороне|поклял|доверяет нам)/i;

const NEG = /(?<![а-яё])(не|нет|никогда не|вряд ли|если)\s+$/i;

function personHits(c, clause, matcher, sec = "people") {
  const plain = esc(clause);
  matcher.re.lastIndex = 0;
  const out = [];
  for (const m of plain.matchAll(matcher.re)) {
    const hit = matcher.find(m[2]);
    if (hit && hit.sec === sec) out.push({ hit, at: m.index + m[1].length, end: m.index + m[1].length + m[2].length });
  }
  return out;
}

export function findRelations(c, text, known) {
  const matcher = known === undefined ? mentionMatcher(c) : known;
  if (!matcher) return [];
  const people = (c.notes && c.notes.people) || [];
  const me = String(c.name || "").split(/\s+/)[0];
  const us = new RegExp(`(?<![а-яё])(нас|нам|меня|мне|мы|партию|партии|отряд|группу|команду${me && me.length >= 3 ? "|" + stem(me) + "[а-яё]{0,3}" : ""})(?![а-яё])`, "i");
  const out = [];
  const seen = new Set();
  for (const clause of String(text || "").replace(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g, "$1").split(/[.!?…;\n]+|,\s(?=а|но|однако|зато|хотя)/i)) {
    for (const [att, re] of [["hostile", HOSTILE], ["ally", FRIEND]]) {
      const m = clause.match(re);
      if (!m || NEG.test(clause.slice(0, m.index))) continue;
      const cueAt = esc(clause.slice(0, m.index)).length;
      const hits = personHits(c, clause, matcher);
      const subj = hits.filter(h => h.end <= cueAt).pop();
      const after = hits.filter(h => h.at > cueAt);
      const toUs = us.test(clause.slice(m.index));
      if (!subj || (!STATE_CUE.test(m[1]) && !toUs) || (after.length && !toUs)) continue;
      const n = people.find(x => x.id === subj.hit.id);
      if (!n || n.dead || n.attitude === att || seen.has(n.id)) continue;
      seen.add(n.id);
      out.push({ kind: "att", id: n.id, title: n.title || subj.hit.name, att, key: `att:${n.id}:${att}` });
    }
  }
  return out;
}

const QUEST_VERBS = "найти|отыскать|убить|доставить|спасти|принести|отнести|защитить|вернуть|узнать|освободить|выследить|поймать|сопроводить|охранять|отвезти|передать|украсть|вскрыть|открыть|разгадать|уничтожить|изгнать|очистить|исследовать|допросить|забрать|достать|выкупить|предупредить|расследовать|разузнать|отомстить|похоронить|снять проклятие";

const QUEST_ASK = new RegExp(`(?:попросил[аи]?\\s+(?:нас|меня)|просит\\s+(?:нас|меня)|поручил[аи]?\\s+(?:нам|мне)|нанял[аи]?\\s+(?:нас|меня)|наняли нас|обещали|пообещали|пообещал[аи]?|согласились|взялись|должны|должен|должна|надо|нужно|необходимо|хотим|решили)\\s+(?:(?:нам|мне|нас|бы|ему|ей|им)\\s+)?((?:${QUEST_VERBS})(?![а-яё])[^.!?;,]*)`, "i");

const QUEST_HEAD = /(?:^|\s)(?:задани[ея]|квест|заказ|поручени[ея]|миссия|цель)\s*[:–-]\s*([^.!?;]+)/i;

const DONE_CUE = /(?<![а-яё])(выполнили|выполнено|выполнила|выполнил|сдали|сдал|сдала|завершили|завершено|закончили|закрыли|справились с)(?![а-яё])/i;

const FAIL_CUE = /(?<![а-яё])(провалили|провалено|провалил|провалила|не успели|упустили|опоздали)(?![а-яё])/i;

const PAST = { найти: "нашл|нашел|нашёл|нашла|нашли|отыскал", отыскать: "отыскал", спасти: "спасл|спас", принести: "принесл|принёс|принес", отнести: "отнесл|отнёс|отнес", убить: "убил|убили|убила|прикончил", доставить: "доставил", вернуть: "вернул", освободить: "освободил", узнать: "узнал|выяснил", поймать: "поймал", уничтожить: "уничтожил", допросить: "допросил", забрать: "забрал", достать: "достал", открыть: "открыл", вскрыть: "вскрыл", передать: "передал", очистить: "очистил", изгнать: "изгнал", похоронить: "похоронил", отомстить: "отомстил", выследить: "выследил", украсть: "украл", разгадать: "разгадал", защитить: "защитил", сопроводить: "сопроводил", отвезти: "отвез|отвёз|отвезл" };

const questWords = t => words(t).filter(w => w.length >= 4).map(stem);

function sameQuest(a, b) {
  const wa = questWords(a);
  const wb = new Set(questWords(b));
  if (!wa.length || !wb.size) return false;
  const shared = wa.filter(w => wb.has(w)).length;
  return shared / Math.min(wa.length, wb.size) >= 0.6;
}

function cleanTitle(s) {
  const t = String(s || "").replace(/\s+(?:за|по)\s+\d.*$/i, "").replace(/(^|\s)(?:её|ее|его|их|свою|свой|своего|своих|своё|свое)(?=\s)/gi, "$1").replace(/\s+/g, " ").replace(/^[\s,:–-]+|[\s,:–-]+$/g, "");
  const cut = t.length > 70 ? t.slice(0, 70).replace(/\s+\S*$/, "") : t;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

export function findQuests(c, text, known) {
  const matcher = known === undefined ? mentionMatcher(c) : known;
  const quests = (c.notes && c.notes.quests) || [];
  const out = [];
  const seen = new Set();
  for (const { s } of sentences(text)) {
    const m = s.match(QUEST_HEAD) || s.match(QUEST_ASK);
    if (m && !NEG.test(s.slice(0, m.index + m[0].indexOf(m[1])))) {
      const title = cleanTitle(m[1]);
      if (title.length >= 5 && !quests.some(q => sameQuest(title, q.title || "")) && !seen.has(norm(title))) {
        seen.add(norm(title));
        out.push({ kind: "quest", title, key: "quest:" + nameKey(title) });
      }
    }
    const fail = FAIL_CUE.test(s);
    const doneCue = DONE_CUE.test(s);
    for (const q of quests) {
      if (q.status === "done" || q.status === "failed" || seen.has(q.id)) continue;
      const title = String(q.title || "");
      const verb = norm(title.split(/\s+/)[0]);
      const rest = questWords(title.split(/\s+/).slice(1).join(" "));
      const plain = norm(s);
      const restHit = rest.length && rest.filter(w => plain.split(/[^a-zа-я]+/).some(x => x.startsWith(w))).length >= Math.ceil(rest.length / 2);
      const named = matcher && personHits(c, s, matcher, "quests").some(h => h.hit.id === q.id);
      const past = PAST[verb] && new RegExp(`(?<![а-яё])(${PAST[verb]})[а-яё]*`, "i").test(plain);
      let status = "";
      if ((named || restHit) && fail) status = "failed";
      else if ((named || restHit) && doneCue) status = "done";
      else if (past && restHit && !/(?<![а-яё])(не|почти|чуть)\s+$/.test(plain.split(new RegExp(PAST[verb]))[0] || "")) status = "done";
      if (!status) continue;
      seen.add(q.id);
      out.push({ kind: "qdone", id: q.id, title: title || "Задание", status, key: `qdone:${q.id}:${status}` });
    }
  }
  return out;
}

const GET = /(?<![а-яё])(купил[аи]?|прикупил[аи]?|приобрел[аи]?|приобрёл|нашл[аи]|нашел|нашёл|получил[аи]?|подобрал[аи]?|забрал[аи]?|взял[аи]?|достал[аи]?|выиграл[аи]?|сняли с|снял с|стащил[аи]?|украл[аи]?|выменял[аи]?|подарил[аи]? (?:нам|мне)|дал[аи]? (?:нам|мне)|выдал[аи]? (?:нам|мне)|трофе[а-яё]*)(?![а-яё])/i;

const LOSE = /(?<![а-яё])(продал[аи]?|потерял[аи]?|отдал[аи]?|выбросил[аи]?|сломал[аи]?|сломал(?:ся|ась|ось)|разбил[аи]?|выпил[аи]?|использовал[аи]?|истратил[аи]?)(?![а-яё])/i;

const USE = /^(выпил|использовал|истратил)/i;

const COUNT = { один: 1, одну: 1, одно: 1, два: 2, две: 2, пару: 2, пара: 2, три: 3, четыре: 4, пять: 5, шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10, дюжину: 12 };

const ITEM_NOUNS = new Set(["зелье", "кольцо", "плащ", "свиток", "меч", "щит", "посох", "жезл", "палочка", "амулет", "сумка", "книга", "доспех", "перчатки", "сапоги", "шлем", "карта", "кинжал", "лук", "топор", "ключ", "шкатулка", "алебарда", "копье", "арбалет", "мантия", "венец", "корона", "медальон", "печатка", "кубок", "камень", "кристалл", "рубин", "изумруд", "сапфир", "алмаз", "жемчужина", "статуэтка", "идол", "оберег", "талисман", "браслет", "ожерелье", "серьга", "пояс", "маска", "фляга", "бутылка", "склянка", "флакон", "яд", "противоядие", "веревка", "факел", "фонарь", "лампа", "отмычки", "инструменты", "молот", "булава", "цеп", "рапира", "сабля", "праща", "дротик", "стрелы", "болты", "кольчуга", "латы", "кираса", "руна", "реликвия", "артефакт", "компас", "подзорная", "зеркало", "колода", "кость", "череп", "рог", "свисток", "колокольчик", "письмо", "документ", "дневник", "гримуар", "фолиант"].map(stem));

let catalogCache = null;

const ADJ_AFTER = /(ая|яя|ое|ее|ые|ый|ой|ую)$/;

function nameParts(name) {
  const ws = words(String(name).replace(/\([^)]*\)/g, " ")).filter(w => w.length >= 3);
  const head = ws.findIndex(w => !ADJ.test(w));
  if (head < 0) return { need: ws.map(stem), opt: [] };
  const opt = ws.filter((w, i) => (i < head && ADJ.test(w)) || (i > head && ADJ_AFTER.test(w)));
  return { need: ws.filter(w => !opt.includes(w)).map(stem), opt: opt.map(stem) };
}

function itemCatalog() {
  if (catalogCache) return catalogCache;
  const seen = new Set();
  const out = [];
  const add = (name, make) => {
    const k = norm(name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ name, ...nameParts(name), make });
  };
  for (const p of POTIONS) add(p.name, (uid, qty) => potionToItem(p, uid, qty));
  for (const g of GEAR) add(g.name, (uid, qty) => ({ ...gearToItem(g, uid), qty }));
  for (const p of PACKS) for (const x of p.items) add(x.name, (uid, qty) => ({ id: "it-" + uid(), name: x.name, type: x.type, rarity: "common", qty, weight: x.weight, value: x.value, equipped: false, attuned: false, requiresAttunement: false, action: "", uses: "", recharge: "long", used: 0, damage: [], description: x.description || "", effect: "", atkAbility: "", atkProf: false, atkBonus: 0, range: "", acBase: null, acDex: "full", acBonus: 0 }));
  catalogCache = out;
  return out;
}

function matchEntry(entries, seg) {
  const ws = words(seg).map(stem);
  const has = s => ws.some(w => w === s || (s.length >= 4 && w.startsWith(s)) || (w.length >= 4 && s.startsWith(w)));
  const fit = entries.filter(e => e.need.length && e.need.every(has)).map(e => ({ e, score: e.need.length * 2 + e.opt.filter(has).length - e.opt.filter(s => !has(s)).length * 0.5 }));
  if (!fit.length) return null;
  fit.sort((a, b) => b.score - a.score);
  if (fit.length > 1 && fit[0].score === fit[1].score) return null;
  return fit[0].e;
}

function nomPhrase(seg) {
  const ws = seg.trim().split(/\s+/).filter(Boolean);
  const out = ws.map((w, i) => {
    const lo = norm(w);
    if (/(ую)$/.test(lo)) return w.slice(0, -2) + "ая";
    if (/(юю)$/.test(lo)) return w.slice(0, -2) + "яя";
    if (i === ws.length - 1 || ITEM_NOUNS.has(stem(w))) {
      if (/[^аеиоуыэюяь]у$/.test(lo)) return w.slice(0, -1) + "а";
      if (/ю$/.test(lo) && !/ию$/.test(lo)) return w.slice(0, -1) + "я";
      if (/ию$/.test(lo)) return w.slice(0, -1) + "я";
    }
    return w;
  }).join(" ");
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function findItems(c, text) {
  const out = [];
  const inv = (c.items || []).filter(it => String(it.name || "").trim()).map(it => ({ name: it.name, id: it.id, ...nameParts(it.name) }));
  for (const { s } of sentences(text)) {
    const get = s.match(GET);
    const lose = s.match(LOSE);
    const cue = get && (!lose || get.index <= lose.index) ? get : lose;
    if (!cue || NEG.test(s.slice(0, cue.index))) continue;
    const gain = cue === get;
    const tail = s.slice(cue.index + cue[0].length).replace(/\s+(?:за|по)\s+\d[\s\S]*$/i, "").replace(/\s+(?:после|когда|потому|чтобы|пока|но|а)\s[\s\S]*$/i, "").replace(/[.!?…:;"«»()]/g, " ");
    const segs = tail.split(/,|\s+и\s+|\s+а также\s+/).map(x => x.trim()).filter(Boolean).slice(0, 4);
    const found = [];
    for (const raw of segs) {
      let seg = raw;
      for (let k = 0; k < 3; k++) seg = seg.replace(/^(?:ещё|еще|нам|мне|себе|тут|там|вдобавок|(?:у|в|во|на|под|из|с|со|от|возле|около|для|при|над)\s+\S+)\s+/i, "");
      seg = seg.split(/\s+(?:у|в|во|на|под|из|с|со|от|возле|около|для|при|над|за|без)\s+/i)[0].trim();
      let qty = 1;
      const num = seg.match(/^(\d{1,3})\s*(?:шт\.?\s*)?/) || seg.match(/[x×]\s*(\d{1,3})\s*$/i);
      if (num) {
        qty = Number(num[1]);
        seg = seg.replace(num[0], " ").trim();
      } else {
        const w = norm(seg.split(/\s+/)[0]);
        if (COUNT[w]) {
          qty = COUNT[w];
          seg = seg.split(/\s+/).slice(1).join(" ");
        }
      }
      if (!seg) continue;
      const have = matchEntry(inv, seg);
      if (!gain) {
        if (have) found.push({ id: have.id, name: have.name, qty });
        continue;
      }
      const lib = matchEntry(itemCatalog(), seg);
      if (have) found.push({ id: have.id, name: have.name, qty });
      else if (lib) found.push({ lib: lib.name, name: lib.name, qty });
      else {
        const ws = seg.split(/\s+/).slice(0, 4);
        const head = ws.findIndex(w => ITEM_NOUNS.has(stem(w)));
        if (head < 0) continue;
        found.push({ name: nomPhrase(ws.slice(0, Math.max(head + 2, 1)).join(" ").replace(/[^A-Za-zА-Яа-яЁё\s-]/g, "").trim()), qty, generic: true });
      }
    }
    if (!found.length) continue;
    const coins = findCoins(s);
    const price = found.length === 1 && coins.length === 1 && /(?<![а-яё])(купил|приобрел|приобрёл|прикупил|продал|выменял)/i.test(s) ? { amount: coins[0].amount, unit: coins[0].unit, coinKey: coins[0].key } : null;
    for (const f of found) {
      const mode = gain ? "add" : USE.test(norm(cue[1])) ? "use" : "remove";
      out.push({ kind: "item", mode, ...f, price, key: `item:${hash(norm(s))}:${nameKey(f.name)}:${mode}` });
    }
  }
  return out;
}

export function itemFromHint(h, uid) {
  const lib = h.lib && itemCatalog().find(e => e.name === h.lib);
  if (lib) return lib.make(uid, h.qty || 1);
  return { id: "it-" + uid(), name: h.name, type: "gear", rarity: "common", qty: h.qty || 1, weight: 0, value: "", equipped: false, attuned: false, requiresAttunement: false, action: "", uses: "", recharge: "long", used: 0, damage: [], description: "", effect: "", atkAbility: "", atkProf: false, atkBonus: 0, range: "", acBase: null, acDex: "full", acBonus: 0 };
}

const XP_RE = /(?:^|[^\d])([+]?\s*\d[\d\s]{0,6}\d|\d)\s*(?:очк[а-яё]*\s+)?(?:опыта|опыт|оп|exp|xp|экспы|экспа)(?![a-zа-яё])/i;

const LEVEL_RE = /(?<![а-яё])(новый уровень|\+\s*1 уровень|поднял[аи]? уровень|повысил[аи]? уровень|апнул[аи]?с[ья]|апнулся|левел ?ап|level ?up|(?:получил[аи]?|взял[аи]?|достиг[а-яё]*|перешл[аи] на|теперь)\s+(\d{1,2})[- ]?(?:й|ый|ой)?\s+уровень)/i;

export function findXp(c, text) {
  const out = [];
  const lvl = Number(c.info && c.info.level) || 1;
  for (const { s } of sentences(text)) {
    const m = s.match(XP_RE);
    if (m && !NEG.test(s.slice(0, m.index))) {
      const amount = Number(m[1].replace(/[\s+]/g, ""));
      if (amount > 0 && amount < 400000) out.push({ kind: "xp", amount, key: `xp:${hash(norm(s))}` });
    }
    const l = s.match(LEVEL_RE);
    if (l && !NEG.test(s.slice(0, l.index))) {
      const target = Number(l[2]) || 0;
      if ((!target || target > lvl) && !out.some(h => h.kind === "level")) out.push({ kind: "level", target, key: `level:${lvl}` });
    }
  }
  return out;
}

const ANSWER_CUE = /(?<![а-яё])(оказал(?:ось|ся|ась|ись)|выяснил[аи]?|выяснилось|узнал[аи]?|теперь ясно|теперь понятно|стало ясно|понятно|понял[аи]?|ответ|потому что|из-за того|это был[аио]?|это были|значит|разгадал[аи]?|признал(?:ся|ась)|рассказал[аи]?|сказал[аи]?, что|призналась|нашл[аи]сь)(?![а-яё])/i;

function sameAsk(a, b) {
  const wa = askStems(a);
  const wb = new Set(askStems(b));
  if (!wa.length || !wb.size) return norm(a) === norm(b);
  return wa.filter(w => wb.has(w)).length / Math.min(wa.length, wb.size) >= 0.7;
}

export function findAsks(c, text) {
  const out = [];
  const qs = (c.notes && c.notes.questions) || [];
  for (const { s } of sentences(text)) {
    if (!/\?\s*[)»"]*$/.test(s)) continue;
    const title = s.replace(/^[-•*\s]+/, "").replace(/\?+/g, "?").replace(/\s+/g, " ").trim();
    if (title.length < 12 || askStems(title).length < 1) continue;
    if (qs.some(q => sameAsk(title, q.title || "")) || out.some(h => sameAsk(title, h.title))) continue;
    out.push({ kind: "ask", title: title.slice(0, 200), key: "ask:" + nameKey(title.slice(0, 120)) });
  }
  return out;
}

export function findAnswers(c, text, known) {
  const matcher = known === undefined ? mentionMatcher(c) : known;
  const index = linkIndex(c);
  const open = ((c.notes && c.notes.questions) || []).filter(q => q.status !== "answered" && String(q.title || "").trim());
  if (!open.length) return [];
  const out = [];
  for (const { s } of sentences(text)) {
    if (/\?\s*$/.test(s) || !ANSWER_CUE.test(s)) continue;
    const ws = new Set(askStems(s));
    const ids = referencedIds(c, { id: "", text: s }, index, matcher);
    let best = null;
    for (const q of open) {
      const qs = askStems(q.title + " " + (q.text || ""));
      const qids = referencedIds(c, { id: q.id, text: q.title }, index, matcher);
      const shared = qs.filter(x => ws.has(x)).length;
      const people = [...qids].filter(x => ids.has(x)).length;
      const score = shared + people * 2;
      if ((shared >= 2 || (people >= 1 && shared >= 1)) && (!best || score > best.score)) best = { q, score };
    }
    if (best && !out.some(h => h.id === best.q.id)) out.push({ kind: "answer", id: best.q.id, title: best.q.title, answer: s.trim().slice(0, 400), key: `answer:${best.q.id}:${hash(norm(s))}` });
  }
  return out;
}

export function entryHints(c, text, { ignore = [] } = {}) {
  const known = mentionMatcher(c);
  const items = findItems(c, text);
  const paid = new Set(items.filter(h => h.price).map(h => h.price.coinKey));
  return [...findNames(c, text, { ignore, known }), ...items, ...findCoins(text).filter(h => !paid.has(h.key)), ...findXp(c, text), ...findDeaths(c, text, known), ...findRelations(c, text, known), ...findQuests(c, text, known), ...findAsks(c, text), ...findAnswers(c, text, known)];
}

export function liveHints(c, list) {
  if (!list || !list.length) return [];
  const index = linkIndex(c);
  const matcher = mentionMatcher(c);
  const knownStems = knownStemsOf(c);
  const people = (c.notes && c.notes.people) || [];
  return list.filter(h => {
    if (h.kind === "name") {
      const words = String(h.name).split(/\s+/).filter(w => !JOIN.has(norm(w)));
      return !index.has(norm(h.name)) && !(matcher && matcher.find(esc(h.name))) && !words.every(w => knownStems.has(stem(w)));
    }
    if (h.kind === "dead") {
      const n = people.find(x => x.id === h.id);
      return !!n && !n.dead;
    }
    if (h.kind === "alias") {
      const n = ((c.notes && c.notes[h.sec]) || []).find(x => x.id === h.id);
      return !!n && !index.has(norm(h.name));
    }
    if (h.kind === "att") {
      const n = people.find(x => x.id === h.id);
      return !!n && !n.dead && n.attitude !== h.att;
    }
    if (h.kind === "item" && h.mode !== "add") return (c.items || []).some(it => it.id === h.id);
    if (h.kind === "level") return (Number(c.info && c.info.level) || 1) <= Number(String(h.key).split(":")[1] || 0);
    if (h.kind === "ask") return !((c.notes && c.notes.questions) || []).some(q => sameAsk(h.title, q.title || ""));
    if (h.kind === "answer") {
      const q = ((c.notes && c.notes.questions) || []).find(x => x.id === h.id);
      return !!q && q.status !== "answered";
    }
    if (h.kind === "quest") return !((c.notes && c.notes.quests) || []).some(q => sameQuest(h.title, q.title || ""));
    if (h.kind === "qdone") {
      const q = ((c.notes && c.notes.quests) || []).find(x => x.id === h.id);
      return !!q && q.status !== "done" && q.status !== "failed";
    }
    return true;
  });
}

export function mergeHints(old, add, max = 15) {
  const keys = new Set(add.map(h => h.key));
  return [...add, ...(old || []).filter(h => !keys.has(h.key))].slice(0, max);
}
