import { confirmDialog, toast, esc } from "./ui.js";
import { icon } from "./icons.js";
import { normalize } from "./rules.js";

export const KIRION_ID = "kirion-thorndike";

const GIFTS = {
  spells: ["sp-kania-seal"],
  features: ["g-spell-recognition"],
  drop: { features: ["g-contract-genius"] },
  notes: { patron: ["n-patron-campaign"], places: ["pl-crownspire"], misc: ["n-dm-rules", "n-law-magic", "n-law-crime"] }
};

const BACKSTORY_NOTE = { id: "ses-backstory", title: "Предыстория", subtitle: "До начала игры", status: "", attitude: "", created: 1, text: "**Семья (5-6 лет)**\n- Работорговцы пришли за семьёй Кириона ради денег. Родители не отдали детей и погибли, защищая их.\n- Подоспел Халвар Торндайк, спас Кириона, его брата и сестру и взял к себе домой. Родителей спасти не успел.\n- Кирион запомнил главное: родителей убили из-за рабства.\n\n**Дом Торндайков (примерно с 6 до 15 лет)**\n- Приняли в большую семью, вырастили добрым, научили любить и ценить людей.\n- Ненависть к рабству осталась, особенно к тем, кто наживается на людях.\n- Подростком помогал механикам, учился и изучал артефакты. Учёба стала способом забыть о мире вокруг.\n- Несколько лет назад в городе осел Рэй, и Кирион стал равняться на него: свободный, сильный, умный, самостоятельный и заботливый.\n\n**Договор (около 15 лет)**\n- Изучая запретные знания, случайно наткнулся на Мефистофеля.\n- Сознательно заключил договор ради знаний и силы, стал сильнее, лучше и увереннее. Семья о договоре не знает.\n\n**Начало игры (16 лет)**\n- Попросился к Рэю в дело, чтобы набраться опыта, полный надежд. В компанию его не взяли из-за возраста.\n- Колдун 5 уровня, покровитель Исчадие. Всё равно рвётся в дело." };

const STORY = {
  marker: "ses-backstory",
  personality: ["ideals", "bonds", "flaws", "backstory", "allies"],
  replace: { people: ["p-ray", "p-halvar", "p-siblings", "p-mephistopheles"], patron: ["n-patron-pact"], quests: ["q-prove-to-ray"] }
};

const has = (list, id) => Array.isArray(list) && list.some(x => x && x.id === id);

const storyDone = c => has(c.notes && c.notes.sessions, STORY.marker) || /работорговцы пришли/.test(String((c.personality && c.personality.backstory) || ""));

export function giftsMissing(c) {
  if (!c) return false;
  if (GIFTS.spells.some(id => !has(c.spells, id))) return true;
  if (GIFTS.features.some(id => !has(c.features, id))) return true;
  const notes = c.notes && typeof c.notes === "object" ? c.notes : {};
  if (!storyDone(c)) return true;
  return Object.entries(GIFTS.notes).some(([k, ids]) => ids.some(id => !has(notes[k], id)));
}

export function giftsAvailable(X) {
  const r = X.rights();
  return X.id === KIRION_ID && (r.role === "owner" || r.role === "open") && !X.S.preview && giftsMissing(X.S.c);
}

export function applyGifts(c, seed) {
  const added = [];
  c.spells = Array.isArray(c.spells) ? c.spells : [];
  c.features = Array.isArray(c.features) ? c.features : [];
  for (const id of GIFTS.spells) {
    const sp = (seed.spells || []).find(x => x.id === id);
    if (sp && !has(c.spells, id)) {
      c.spells.push(sp);
      added.push(sp.name);
    }
  }
  const drop = GIFTS.drop.features;
  const before = c.features.length;
  c.features = c.features.filter(f => !drop.includes(f.id) && !(f.nameEn === "Contract Genius"));
  const dropped = before - c.features.length;
  for (const id of GIFTS.features) {
    const f = (seed.features || []).find(x => x.id === id);
    if (f && !has(c.features, id)) {
      c.features.push(f);
      added.push(f.name);
    }
  }
  if (!c.notes || typeof c.notes !== "object" || Array.isArray(c.notes)) c.notes = {};
  for (const [k, ids] of Object.entries(GIFTS.notes)) {
    if (!Array.isArray(c.notes[k])) c.notes[k] = [];
    for (const id of ids) {
      const n = ((seed.notes || {})[k] || []).find(x => x.id === id);
      if (n && !has(c.notes[k], id)) {
        c.notes[k].push(n);
        added.push(n.title);
      }
    }
  }
  if (!storyDone(c)) {
    c.personality = c.personality && typeof c.personality === "object" ? c.personality : {};
    for (const f of STORY.personality) if (seed.personality && typeof seed.personality[f] === "string") c.personality[f] = seed.personality[f];
    for (const [k, ids] of Object.entries(STORY.replace)) {
      if (!Array.isArray(c.notes[k])) c.notes[k] = [];
      for (const id of ids) {
        const n = ((seed.notes || {})[k] || []).find(x => x.id === id);
        if (!n) continue;
        const i = c.notes[k].findIndex(x => x && x.id === id);
        if (i >= 0) c.notes[k][i] = n;
        else c.notes[k].push(n);
      }
    }
    if (!Array.isArray(c.notes.sessions)) c.notes.sessions = [];
    if (!has(c.notes.sessions, BACKSTORY_NOTE.id)) c.notes.sessions.push({ ...BACKSTORY_NOTE });
    added.push(BACKSTORY_NOTE.title);
  }
  return { added, dropped };
}

export async function runDmGifts(X) {
  if (!giftsAvailable(X)) return;
  const ok = await confirmDialog("Добавить в лист дары и заметки Мастера: Печать Кании, умение «Узнавание заклинаний» (вместо Гения договоров), заметки о Кроунспайре, Мефистофеле, правилах и законах, а также новую предысторию: запись в журнале, идеалы, привязанности, слабости, предыстория и заметки о Халваре, Рэе, брате с сестрой и договоре перепишутся (если правил их руками, сначала сохрани копию)? Остальное не трогается. Можно отменить кнопкой «Отменить».", { ok: "Добавить" });
  if (!ok) return;
  let seed;
  try {
    const { kirion } = await import("./seed.js");
    seed = normalize(kirion());
  } catch (e) {
    toast(`${icon("close")} Не удалось загрузить дары Мастера`, { kind: "bad" });
    return;
  }
  let res = null;
  X.withUndo("Дары Мастера", () => X.mutate(c => { res = applyGifts(c, seed); }));
  if (res) toast(`${icon("star")} Добавлено: ${esc(res.added.join(", ") || "ничего")}${res.dropped ? `. Заменён Гений договоров` : ""}`, { kind: "good" });
}
