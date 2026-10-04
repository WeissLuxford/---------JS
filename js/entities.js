import {
  ABILITIES, SKILLS, DAMAGE, SCHOOLS, ACTIONS, RECHARGE, RARITY, ITEM_TYPES, FEATURE_CATS, FEATURE_SOURCES,
  CONDITIONS, CASTER_TYPES, HIT_DICE, ALIGNMENTS, ACCENTS, fmt, spellCast, usesInfo, swapType, uid, addDice, effectSummary, weaponStats
} from "./rules.js";
import { icon, slotMark, actionMark } from "./icons.js";
import { card, rich, esc, actionFoot, openForm } from "./ui.js";

const ABIL_OPTS = ABILITIES.map(a => [a.key, a.name]);
const SAVE_OPTS = [["", "Нет"], ...ABIL_OPTS];
const abName = k => (ABILITIES.find(a => a.key === k) || {}).name || "";
const abShort = k => (ABILITIES.find(a => a.key === k) || {}).short || "";

const FEATURE_SINGULAR = {
  class: "Классовое умение",
  invocation: "Таинственное воззвание",
  gift: "Дар покровителя",
  race: "Расовая черта",
  background: "Умение предыстории",
  feat: "Черта",
  other: "Умение"
};

export const LIST_KEY ={ spell: "spells", feature: "features", item: "items", attack: "attacks" };

export function findEntity(c, kind, id) {
  const list = c[LIST_KEY[kind]];
  return list ? list.find(x => x.id === id) : null;
}

function rechargeText(e, u) {
  if (!u) return "";
  const r = RECHARGE[e.recharge] || "";
  return `${u.left} из ${u.max}` + (r && e.recharge !== "always" ? ` · ${r.toLowerCase()}` : "");
}

export function spellLevelText(sp) {
  const lvl = Number(sp.level) || 0;
  const school = (SCHOOLS[sp.school] || {}).name || "";
  return lvl === 0 ? `Заговор · ${school}` : `Заклинание ${lvl} круга · ${school}`;
}

const W = s => new RegExp("(^|[^а-яё])(" + s + ")", "i");

const ITEM_WORDS = [
  ["кольц|перстен", "ring"], ["амулет|кулон|ожерель|медальон|талисман", "amulet"], ["плащ|мантия|накидк|роба", "cloak"],
  ["перчат|рукавиц|наруч", "glove"], ["шлем", "helmet"], ["шляп|капюшон|берет|цилиндр", "hat"], ["корон|диадем|тиар", "crown"], ["арбалет", "crossbow"], ["лук(?![а-яё])", "bow"],
  ["колчан", "quiver"], ["стрел|болт", "arrow"], ["копь|пика|трезуб|алебард|глеф", "spear"], ["булав|моргенштерн|палиц", "mace"], ["цеп(?![а-яё])|кистен", "flail"], ["кнут|плеть|хлыст", "whip"], ["праща", "sling"],
  ["сапог|ботин|обувь|туфл", "boots"], ["пояс|ремен", "belt"], ["отмычк|воровск", "lockpick"], ["трав|корень|цветок|лепест", "herb"], ["гриб", "mushroom"], ["мяс|колбас|окорок", "meat"], ["рыб", "fish"], ["зеркал", "mirror"], ["карты|игральн|колод", "cards"], ["весы", "scales"], ["ручк|чернил", "quill"],
  ["посох|жезл|палочк", "wand"], ["хрустальн|сфер|шар(?![а-яё])", "orb"], ["ключ|отмычк", "key"], ["карта|карты|атлас", "map"],
  ["письм|конверт|записк|приглашен|документ|паспорт|лицензи", "letter"], ["факел|свеч", "torch"], ["бутыл|фляг|флакон", "bottle"],
  ["колокол", "bell"], ["палатк|шатёр|шатер", "tent"], ["кирк|лопат", "pickaxe"], ["лютн|флейт|барабан|скрипк|арф|рожок", "lute"],
  ["кристал", "crystal"], ["бомб|гранат|взрывчат|порох", "bomb"], ["пистол|мушкет|револьвер|ружь|винтовк", "pistol"],
  ["очки|гогл|линз", "goggles"], ["часы|хронометр", "clock"], ["якор", "anchor"], ["монокл", "monocle"], ["компас", "compass"],
  ["конденсатор|батаре|аккумулятор", "battery"], ["перо", "feather"], ["кружк|чаш|кубок", "mug"], ["верёвк|веревк|цеп", "rope"],
  ["фонар", "lantern"], ["рацион|хлеб|еда|сухар", "bread"], ["блокнот|дневник|журнал", "notebook"], ["целител|аптечк|бинт", "medkit"],
  ["книг|том(?![а-яё])|гримуар", "book"], ["свиток", "scroll"], ["щит", "shield"], ["доспех|кольчуг|латы|кираса|кожа", "armor"],
  ["меч|сабл|рапир|клинок|шпаг", "sword"], ["топор|секир", "axe"], ["молот|булав|дубин", "hammer"], ["кинжал|нож", "dagger"],
  ["зель|эликсир|масло|яд(?![а-яё])", "potion"], ["камен|самоцвет|рубин|изумруд|сапфир|алмаз|жемчуг", "gem"],
  ["шестер|механизм|инструмент|ключ гаечн", "gear"], ["рюкзак|сумк|мешок", "bag"], ["кошел|монет", "coin"]
].map(([w, ic]) => [W(w), ic]);

const SPELL_WORDS = [
  ["щит|доспех|защит|ограж|броня|оберег", "shield"], ["лечен|исцел|восстанов|воскреш|жизн|оживл", "heart"], ["свет|сиян|солн|рассвет", "sun"],
  ["тьм|темнот|ночь|тени|тень", "moon"], ["невидим|иллюз|образ|маск|облик|личин|мираж", "mask"], ["телепорт|шаг|портал|врата|перенос|план", "portal"],
  ["полёт|полет|левитац|падени|прыж|крыл", "wings"], ["паут", "web"], ["ветер|ветр|вихр|порыв|смерч|туман|облак", "wind"],
  ["камен|земл|стен|скал", "rock"], ["раст|лоз|шип|ягод|дуб|кор", "leaf"], ["звер|живот|скакун|фамильяр", "paw"], ["дракон", "dragon"], ["призрак|дух(?![а-яё])|эфир|бестелес", "ghost"], ["смерч", "tornado"], ["щупальц", "tentacle"], ["дерев|лес", "tree"],
  ["землетряс|гора", "mountain"], ["клетк", "cage"], ["двер|запор|стук", "door"], ["пузыр", "bubble"], ["цепн|разряд|шок", "lightning2"], ["руна|глиф", "rune"], ["астрал", "planet"],
  ["обнаруж|зрени|видени|поиск|прорица|ясновид|знани|опознан", "eye"], ["внуш|очаров|подчин|дружб|убежд|приказ|разум|мысл", "brain"],
  ["страх|ужас|проклят", "skull"], ["слов|язык|послан|телепат|голос|связ", "letter"], ["призыв|вызов|знак|символ|глиф|рун", "sigil"],
  ["время|ускор|замедл|спешк", "clock"], ["тишин|звук|гром|крик", "bell"], ["удерж|оков|опута|цеп|клетк|тюрьм", "chain"],
  ["сфер|шар(?![а-яё])", "orb"], ["музык|песн|танец|пляск", "music"], ["рук(?![а-яё])|рука", "hand"], ["огн|пламен", "flame"], ["молни", "bolt"]
].map(([w, ic]) => [W(w), ic]);

const FEATURE_WORDS = [
  ["зрени|глаз|взор", "eye"], ["маск|облик|личин", "mask"], ["живуч|жизн|здоров|крепк", "heart"], ["крыл|полёт|полет", "wings"],
  ["рог|наследи|тифлинг|дьявол|адск", "horns"], ["гримуар|книг|архив|знани|учён|учен", "book"], ["сопротивл|защит|стойк", "shield"],
  ["механ|инжене|изобрет", "gear"], ["договор|контракт|пакт", "pact"], ["голос|речь|язык", "letter"], ["скрыт|тень|тен(?![а-яё])", "moon"],
  ["ярост|сил(?![а-яё])", "swords"], ["звер|живот", "paw"], ["удач|везен", "star"], ["огн|пламен", "flame"], ["холод|лёд|лед(?![а-яё])|мороз", "snow"]
].map(([w, ic]) => [W(w), ic]);

export const ATTACK_WORDS = [["кулак|безоруж|рукопаш", "fist"], ["укус|клык", "fang"], ["коготь|когти|царап", "claw"], ["хвост|щупальц", "tentacle"]].map(([w, ic]) => [W(w), ic]);

export function attackIcon(name) {
  return guessIcon(name, ATTACK_WORDS) || guessIcon(name, ITEM_WORDS);
}

export function guessIcon(name, words) {
  const n = String(name || "").toLowerCase();
  const hit = words.find(([re]) => re.test(n));
  return hit ? hit[1] : "";
}

export function featureIcon(f) {
  return f.icon || guessIcon(f.name, FEATURE_WORDS) || (FEATURE_CATS[f.category] || FEATURE_CATS.other).icon;
}

export function spellIcon(c, sp) {
  if (sp.icon) {
    const first = (sp.damage || [])[0];
    const t = first && DAMAGE[swapType(c, first.type)];
    return { icon: sp.icon, color: t ? t.color : (SCHOOLS[sp.school] || { color: "#e9c77a" }).color };
  }
  const first = (sp.damage || [])[0];
  if (first && DAMAGE[swapType(c, first.type)]) {
    const t = DAMAGE[swapType(c, first.type)];
    return { icon: t.icon, color: t.color };
  }
  const sc = SCHOOLS[sp.school] || { color: "#e9c77a" };
  const guess = guessIcon(sp.name, SPELL_WORDS);
  if (guess) return { icon: guess, color: sc.color };
  const map = { abjuration: "shield", conjuration: "sparkle", divination: "eye", enchantment: "brain", evocation: "force", illusion: "mask", necromancy: "skull", transmutation: "gear" };
  return { icon: map[sp.school] || "sparkle", color: sc.color };
}

export function itemSpellInfo(c, d, sp) {
  const it = sp.cost === "item" ? (c.items || []).find(x => x.id === sp.itemId) : null;
  if (!it) return null;
  const u = usesInfo(d, it);
  const min = Math.max(1, Number(sp.charges) || 1);
  const max = Math.max(min, Number(sp.maxCharges) || min);
  return { item: it, uses: u, min, max, left: u ? u.left : 0 };
}

export function spellDc(d, sp) {
  return sp.dcOverride != null && sp.dcOverride !== "" ? Number(sp.dcOverride) : d.spell.dc;
}

export function spellAtk(d, sp) {
  return sp.atkOverride != null && sp.atkOverride !== "" ? Number(sp.atkOverride) : d.spell.atk;
}

export function spellCostText(c, d, sp, cast) {
  const lvl = Number(sp.level) || 0;
  if (sp.cost === "item") {
    const info = itemSpellInfo(c, d, sp);
    if (!info) return { mark: slotMark("#8d8577"), text: "Заряды предмета: предмет не выбран" };
    const n = info.min === info.max ? `${info.min} ${chargeWord(info.min)}` : `${info.min}-${info.max} ${chargeWord(info.max)}`;
    return { mark: slotMark("#4fcf6a"), text: `${n} · ${info.item.name}${info.uses ? ` (${info.left}/${info.uses.max})` : ""}` };
  }
  if (lvl === 0 || sp.cost === "free") return { mark: slotMark("#8d8577"), text: lvl === 0 ? "Заговор, без ячейки" : "Без ячейки" };
  if (sp.cost === "uses") {
    const u = usesInfo(d, sp);
    return { mark: slotMark("#e9a54a"), text: u ? `${u.left}/${u.max} · ${(RECHARGE[sp.recharge] || "").toLowerCase()}` : "Особое использование" };
  }
  if (d.pact) return { mark: slotMark("#c07cff"), text: `Ячейка договора ${d.pact.level} круга` };
  return { mark: slotMark("#5fc7ff"), text: `Ячейка ${cast.level} круга` };
}

export function chargeWord(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? "заряд" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "заряда" : "зарядов";
}

export function spellModel(c, d, sp, slotLevel, extra = 0) {
  const cast = spellCast(c, d, sp, slotLevel, extra);
  const lines = cast.lines.map((l, i) => ({ ...l, prefix: cast.beams > 1 && i === 0 ? cast.beams + " × " : "" }));
  const meta = [
    { icon: "range", text: sp.range },
    { icon: "area", text: sp.area },
    { icon: "timer", text: sp.duration },
    sp.save ? { icon: "drop", text: `Спасбросок ${abShort(sp.save)} · СЛ ${spellDc(d, sp)}` } : null,
    sp.attack ? { icon: "target", text: `Атака ${fmt(spellAtk(d, sp))}` } : null,
    sp.concentration ? { icon: "spiral", text: "Концентрация" } : null,
    sp.ritual ? { icon: "candle", text: "Ритуал" } : null,
    sp.components ? { icon: "hand", text: sp.components } : null
  ];
  const body = rich(sp.description) + (sp.higher ? `<p class="higher"><b>На больших кругах:</b> ${esc(sp.higher)}</p>` : "") +
    (cast.lines.some(l => l.swapped) && c.damageSwap.label ? `<p class="swap-p">${icon("snow")} ${esc(c.damageSwap.label)}: ${esc(DAMAGE[c.damageSwap.from].name.toLowerCase())} → ${esc(DAMAGE[c.damageSwap.to].name.toLowerCase())}</p>` : "");
  const action = ACTIONS[sp.action] || ACTIONS.action;
  const castTime = sp.castTime && sp.castTime !== action.name ? sp.castTime : action.name;
  const castLvlNote = extra > 0 ? `Ещё ${extra} ${chargeWord(extra)}` : sp.cost !== "item" && Number(sp.level) > 0 && cast.level !== Number(sp.level) ? `Накладывается на ${cast.level} круге` : "";
  const u = sp.cost === "uses" ? usesInfo(d, sp) : null;
  return {
    title: sp.name,
    subtitle: spellLevelText(sp) + (sp.nameEn ? ` · ${sp.nameEn}` : ""),
    art: spellIcon(c, sp),
    badges: [sp.source ? { text: sp.source } : null, castLvlNote ? { text: castLvlNote, color: "#c07cff" } : null],
    dice: lines,
    body,
    effect: sp.onSave,
    uses: u,
    usesColor: "#e9a54a",
    meta,
    footer: [{ mark: actionMark(action.shape, action.color), text: castTime }, spellCostText(c, d, sp, cast)]
  };
}

export function featureModel(c, d, f) {
  const cat = FEATURE_CATS[f.category] || FEATURE_CATS.other;
  const u = usesInfo(d, f);
  const lines = (f.damage || []).map(x => ({ dice: x.addMod ? addDice(x.dice, d.spell.mod) : x.dice, type: swapType(c, x.type), swapped: swapType(c, x.type) !== x.type, origType: x.type }));
  const src = FEATURE_SOURCES[f.source];
  const footer = [actionFoot(f.action || "passive")];
  if (u) footer.push({ mark: slotMark("#e9a54a"), text: rechargeText(f, u) });
  else if (f.recharge === "always" && f.action && f.action !== "passive") footer.push({ mark: slotMark("#8d8577"), text: "Всегда доступно" });
  if (f.slot === "pact") footer.push({ mark: slotMark("#c07cff"), text: "Тратит ячейку договора" });
  return {
    title: f.name,
    subtitle: (FEATURE_SINGULAR[f.category] || "Умение") + (f.nameEn ? ` · ${f.nameEn}` : ""),
    art: { icon: featureIcon(f), color: f.source === "dm" ? "#f0c46a" : "#c9a0ff" },
    badges: [src ? { text: src, color: f.source === "dm" ? "#f0c46a" : f.source === "own" ? "#6fd3c4" : "#c9a35b" } : null],
    dice: lines,
    body: rich(f.description),
    effect: f.effect,
    uses: u,
    usesColor: "#e9a54a",
    meta: [{ icon: "range", text: f.range }, { icon: "timer", text: f.duration }, f.save ? { icon: "drop", text: `Спасбросок ${abShort(f.save)} · СЛ ${d.spell.dc}` } : null],
    footer
  };
}

export function itemModel(c, d, it) {
  const t = ITEM_TYPES[it.type] || ITEM_TYPES.misc;
  const r = RARITY[it.rarity] || RARITY.common;
  const u = usesInfo(d, it);
  const w = it.atkAbility ? weaponStats(c, d, it) : null;
  const lines = w ? w.lines.map(x => ({ ...x })) : (it.damage || []).map(x => ({ dice: x.dice, type: swapType(c, x.type), swapped: swapType(c, x.type) !== x.type, origType: x.type }));
  const armorLine = Number(it.acBase) > 0 ? `КД ${it.acBase}${it.acDex === "0" ? "" : it.acDex === "2" ? " + Лов (макс. 2)" : " + Лов"}` : Number(it.acBonus) ? `${Number(it.acBonus) > 0 ? "+" : ""}${Number(it.acBonus)} к КД` : "";
  const stats = [
    w ? `<span>${icon("target")}Атака ${fmt(w.hit)}</span>` : "",
    armorLine ? `<span>${icon("shield")}${esc(armorLine)}</span>` : "",
    Number(it.weight) ? `<span>${icon("hourglass")}Вес: ${fmtNum(it.weight)} фнт${Number(it.qty) > 1 ? ` × ${it.qty}` : ""}</span>` : "",
    it.value ? `<span>${icon("coin")}${esc(it.value)}</span>` : "",
    Number(it.qty) > 1 ? `<span>${icon("bag")}Количество: ${it.qty}</span>` : ""
  ].join("");
  const footer = [];
  if (it.action) footer.push(actionFoot(it.action));
  if (u) footer.push({ mark: slotMark("#e9a54a"), text: rechargeText(it, u) });
  const linked = (c.spells || []).filter(sp => sp.cost === "item" && sp.itemId === it.id);
  const breakNote = it.breakOn ? `После последнего заряда бросок d20: на ${it.breakOn} предмет разрушается.` : "";
  const hint = w && !it.equipped ? "Надень, чтобы оружие появилось на вкладке «Бой»." : (Number(it.acBase) > 0 || Number(it.acBonus)) && !it.equipped ? "Надень, чтобы предмет считался в КД." : "";
  return {
    title: it.name,
    subtitle: `${t.name} · ${r.name}`,
    art: { icon: itemIcon(it), color: r.color },
    rarityColor: r.color,
    badges: [it.equipped ? { text: "Экипировано", color: "#e9c77a" } : null, it.requiresAttunement ? { text: it.attuned ? "Настроено" : "Требует настройки", color: it.attuned ? "#b46bff" : "#8d8577" } : null],
    dice: lines,
    stats,
    body: rich(it.description) + (linked.length ? `<p class="item-spells"><b>Заклинания:</b> ${linked.map(sp => esc(sp.name)).join(", ")}</p>` : "") + (breakNote ? `<p class="higher">${esc(breakNote)}</p>` : "") + (hint ? `<p class="higher">${esc(hint)}</p>` : ""),
    effect: it.effect,
    meta: w && w.range ? [{ icon: "range", text: w.range }] : [],
    uses: u,
    usesColor: "#e9a54a",
    footer
  };
}

export function attackModel(c, d, at) {
  const s = d.attacks[at.id];
  const dt = DAMAGE[s.type] || DAMAGE.bludgeoning;
  const lines = [{ dice: s.dmg, type: s.type, prefix: s.beams > 1 ? s.beams + " × " : "", swapped: s.type !== at.damageType, origType: at.damageType }];
  const head = s.kind === "save" ? `Спасбросок ${abShort(s.save)} · СЛ ${s.dc}` : `Бросок атаки ${fmt(s.hit)}`;
  return {
    title: at.name,
    subtitle: s.kind === "save" ? "Атака со спасброском" : at.ability === "spell" ? "Атака заклинанием" : "Атака оружием",
    art: { icon: dt.icon, color: dt.color },
    badges: [{ text: head, color: "#e9c77a" }],
    dice: lines,
    body: rich(at.notes),
    meta: [{ icon: "range", text: at.range }],
    footer: [actionFoot(at.action || "action")]
  };
}

export function skillModel(c, d, key) {
  const s = SKILLS.find(x => x.key === key);
  const p = Number(c.skills[key]) || 0;
  return {
    title: s.name,
    subtitle: `Навык · ${abName(s.ab)}`,
    art: { icon: "d20", color: "#e9c77a" },
    badges: [{ text: p === 2 ? "Компетентность" : p === 1 ? "Владение" : "Без владения", color: p ? "#e9c77a" : "#8d8577" }],
    stats: `<span class="big-num">${fmt(d.skills[key])}</span><span>${abShort(s.ab)} ${fmt(d.mods[s.ab])}${p ? ` · мастерство ${fmt(p === 2 ? d.pb * 2 : d.pb)}` : ""}</span>`,
    body: rich(s.desc + (key === "perception" ? `\n\nПассивная Внимательность: ${d.passive.perception}.` : "")),
    footer: [{ mark: actionMark("ring", "#e9c77a"), text: "Нажми, чтобы бросить" }]
  };
}

export function abilityModel(c, d, key) {
  const a = ABILITIES.find(x => x.key === key);
  return {
    title: a.name,
    subtitle: "Характеристика",
    art: { icon: "star", color: "#e9c77a" },
    stats: `<span class="big-num">${esc(c.abilities[key])}</span><span>Модификатор ${fmt(d.mods[key])} · Спасбросок ${fmt(d.saves[key])}${c.saves[key] ? " (владение)" : ""}</span>`,
    body: rich(a.desc)
  };
}

export function conditionModel(key) {
  const k = CONDITIONS.find(x => x.key === key);
  if (!k) return null;
  return { title: k.name, subtitle: "Состояние", art: { icon: "skull", color: "#e5533d" }, body: rich(k.desc), footer: [{ mark: actionMark("ring", "#e5533d"), text: "Влияет на броски сам" }] };
}

const EXHAUSTION = ["Нет", "Помеха на проверки характеристик", "Скорость уменьшается вдвое", "Помеха на атаки и спасброски", "Максимум хитов уменьшается вдвое", "Скорость равна 0", "Смерть"];

const defNames = list => list.map(t => (DAMAGE[t] || {}).name || t).join(", ");

export function effectModel(c, id) {
  const e = (c.effects || []).find(x => x.id === id);
  if (!e) return null;
  const sum = effectSummary(e);
  const left = e.rounds == null ? "Пока не снимешь" : e.rounds >= 10 ? `Осталось около ${e.rounds >= 600 ? Math.round(e.rounds / 600) + " ч" : Math.round(e.rounds / 10) + " мин"}` : `Осталось раундов: ${e.rounds}`;
  return {
    title: e.name,
    subtitle: "Эффект",
    art: { icon: "sparkle", color: "#c07cff" },
    badges: [e.mine ? { text: "Твоя концентрация", color: "#c07cff" } : null, e.once ? { text: "Один раз", color: "#e9c77a" } : null],
    body: rich([sum ? `**Действует:** ${sum}` : "", e.note && e.note !== sum ? e.note : "", left].filter(Boolean).join("\n\n")),
    footer: [{ mark: actionMark("ring", "#c07cff"), text: "Учитывается в бросках сам" }]
  };
}

export function statModel(c, d, key) {
  const line = (label, v) => `${label} ${typeof v === "number" ? fmt(v) : esc(v)}`;
  if (key === "ac") {
    const a = c.armor;
    const ai = d.armorItem ? (c.items || []).find(x => x.id === d.armorItem) : null;
    const cap = ai ? String(ai.acDex || "full") : a.dexCap;
    const dex = cap === "0" ? 0 : cap === "2" ? Math.min(d.mods.dex, 2) : d.mods.dex;
    const parts = [ai ? `${esc(ai.name)} ${Number(ai.acBase)}` : `${esc(a.name || "Доспех")} ${Number(a.base) || 10}`];
    if (cap !== "0") parts.push(line("Ловкость", dex) + (cap === "2" && d.mods.dex > 2 ? " (не больше +2)" : ""));
    (c.items || []).filter(x => x.equipped && Number(x.acBonus) && (!x.requiresAttunement || x.attuned)).forEach(x => parts.push(`${esc(x.name)} ${Number(x.acBonus) > 0 ? "+" : "−"}${Math.abs(Number(x.acBonus))}`));
    if (a.addAbility && d.addAbilityOn) parts.push(line(abName(a.addAbility), d.mods[a.addAbility]));
    if (a.addAbility && !d.addAbilityOn) parts.push(`${esc(abName(a.addAbility))} не считается: ${a.addAbility === "int" ? "средний или тяжёлый доспех или щит" : a.addAbility === "con" ? "надет доспех" : "надет доспех или щит"}`);
    if (a.shield && !d.shieldItem) parts.push("Щит +2");
    if (Number(a.bonus)) parts.push(line("Прочее", Number(a.bonus)));
    (c.effects || []).filter(e => e.ac).forEach(e => parts.push(`${esc(e.name)} ${e.ac > 0 ? "+" : "−"}${Math.abs(e.ac)}`));
    return { title: "Класс доспеха", subtitle: "Насколько сложно попасть", art: { icon: "shield", color: "#e9c77a" }, stats: `<span class="big-num">${d.ac}</span><span>${parts.join(" · ")}</span>`, body: rich("Атака попадает, если результат броска не меньше КД. Нажми на медаль, чтобы поменять доспех вручную, или надень доспех с указанным КД в снаряжении: тогда он считается сам.") };
  }
  if (key === "init") {
    return { title: "Инициатива", subtitle: "Порядок ходов в бою", art: { icon: "bolt", color: "#e9c77a" }, stats: `<span class="big-num">${fmt(d.init)}</span><span>${line("Ловкость", d.mods.dex)}${Number(c.initBonus) ? " · " + line("бонус", Number(c.initBonus)) : ""}</span>`, body: rich("Бросок d20 в начале боя. Истощение и состояния, дающие помеху на проверки, учитываются сами.") };
  }
  if (key === "speed") {
    const why = [];
    const ex = Number(c.exhaustion) || 0;
    if (ex >= 5) why.push(`Истощение ${ex}: скорость 0`);
    else if (ex >= 2) why.push(`Истощение ${ex}: вдвое меньше`);
    CONDITIONS.filter(k => c.conditions[k.key] && ["grappled", "restrained", "paralyzed", "stunned", "unconscious", "petrified"].includes(k.key)).forEach(k => why.push(`${k.name}: скорость 0`));
    return { title: "Скорость", subtitle: "Сколько футов за ход", art: { icon: "boot", color: "#e9c77a" }, stats: `<span class="big-num">${d.speed} фт</span><span>Обычная ${d.baseSpeed} фт</span>`, body: rich(why.length ? why.map(w => "- " + w).join("\n") : "Ничто не замедляет.") };
  }
  if (key === "pb") {
    return { title: "Бонус мастерства", subtitle: `${d.level} уровень`, art: { icon: "star", color: "#e9c77a" }, stats: `<span class="big-num">${fmt(d.pb)}</span><span>+2 на 1-4, +3 на 5-8, +4 на 9-12, +5 на 13-16, +6 на 17-20</span>`, body: rich("Прибавляется к атакам и навыкам, которыми персонаж владеет, к спасброскам с владением и к СЛ заклинаний.") };
  }
  if (key === "hp") {
    const die = Number(String(c.hitDie).replace(/\D/g, "")) || 8;
    const per = Math.floor(die / 2) + 1;
    const con = d.mods.con;
    const manual = c.hp.maxOverride != null && c.hp.maxOverride !== "";
    const calc = manual ? "Задано вручную" : `1 уровень: ${die} ${fmt(con)}${d.level > 1 ? `, дальше ${per} ${fmt(con)} за уровень × ${d.level - 1}` : ""}${Number(c.hp.bonusPerLevel) ? `, ещё ${Number(c.hp.bonusPerLevel)} × ${d.level}` : ""}`;
    return { title: "Хиты", subtitle: `Кость хитов ${esc(c.hitDie)}`, art: { icon: "heart", color: "#e5533d" }, stats: `<span class="big-num">${d.hpMax}</span><span>${esc(calc)}${d.hpMax !== d.fullMax ? ` · Истощение 4+: максимум вдвое меньше (${d.fullMax})` : ""}</span>`, body: rich(d.defenses.resist.length || d.defenses.vuln.length || d.defenses.immune.length ? [d.defenses.resist.length ? `**Сопротивление:** ${defNames(d.defenses.resist)}` : "", d.defenses.vuln.length ? `**Уязвимость:** ${defNames(d.defenses.vuln)}` : "", d.defenses.immune.length ? `**Иммунитет:** ${defNames(d.defenses.immune)}` : ""].filter(Boolean).join("\n") : "Сопротивлений нет.") };
  }
  if (key === "inspiration") {
    return { title: "Вдохновение", subtitle: c.inspiration ? "Есть" : "Нет", art: { icon: "sun", color: "#f4d66d" }, body: rich("Мастер даёт вдохновение за хорошую игру. Его можно потратить, чтобы получить преимущество на один бросок d20.\n\nНажми, когда оно есть: следующий бросок пойдёт с преимуществом. Нажми, когда его нет: отметить, что Мастер дал вдохновение.") };
  }
  if (key === "exhaustion") {
    const ex = Number(c.exhaustion) || 0;
    return { title: "Истощение", subtitle: `Уровень ${ex}`, art: { icon: "skull", color: "#e5533d" }, body: rich(EXHAUSTION.slice(1).map((t, i) => `- ${i + 1 <= ex ? "**" : ""}${i + 1}: ${t}${i + 1 <= ex ? "**" : ""}`).join("\n") + "\n\nЭффекты складываются. Длинный отдых снимает 1 уровень."), footer: [{ mark: actionMark("ring", "#e5533d"), text: "Влияет на броски, скорость и хиты сам" }] };
  }
  return null;
}

export function modelFor(c, d, ref, opts = {}) {
  const [kind, id] = ref.split(":");
  if (kind === "skill") return skillModel(c, d, id);
  if (kind === "ability") return abilityModel(c, d, id);
  if (kind === "condition") return conditionModel(id);
  if (kind === "stat") return statModel(c, d, id);
  if (kind === "effect") return effectModel(c, id);
  const e = findEntity(c, kind, id);
  if (!e) return null;
  if (kind === "spell") return spellModel(c, d, e, opts.slotLevel, opts.extra || 0);
  if (kind === "feature") return featureModel(c, d, e);
  if (kind === "item") return itemModel(c, d, e);
  if (kind === "attack") return attackModel(c, d, e);
  return null;
}

export function cardFor(c, d, ref, opts) {
  const m = modelFor(c, d, ref, opts);
  return m ? card(m) : "";
}

export function itemIcon(it) {
  if (it.icon) return it.icon;
  return guessIcon(it.name, ITEM_WORDS) || (ITEM_TYPES[it.type] || ITEM_TYPES.misc).icon;
}

export function fmtNum(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return String(v).replace(".", ",");
}

const actionOpts = Object.entries(ACTIONS).map(([k, v]) => [k, v.name]);
const rechargeOpts = Object.entries(RECHARGE);
const usesHint = "Число или формула: =pb (бонус мастерства), =int+lvl, =cha. Пусто, если без ограничений";

export const EDITORS = {
  spell: {
    title: "Заклинание",
    make: () => ({ id: "sp-" + uid(), name: "", nameEn: "", level: 1, school: "evocation", action: "action", castTime: "", range: "", area: "", duration: "Мгновенно", concentration: false, ritual: false, components: "", save: "", attack: false, damage: [], scaling: "none", upcast: "", castAt: null, onSave: "", description: "", higher: "", source: "", cost: "slot", uses: "", recharge: "long", used: 0, prepared: true }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "nameEn", label: "Англ. название" },
      { key: "level", label: "Круг (0 = заговор)", type: "number" },
      { key: "school", label: "Школа", type: "select", options: SCHOOLS },
      { key: "action", label: "Время накладывания", type: "select", options: actionOpts },
      { key: "castTime", label: "Своё время (необязательно)", placeholder: "10 минут" },
      { key: "range", label: "Дистанция", placeholder: "120 фт" },
      { key: "area", label: "Область", placeholder: "сфера 20 фт" },
      { key: "duration", label: "Длительность" },
      { key: "components", label: "Компоненты", placeholder: "В, С, М" },
      { key: "source", label: "Источник", placeholder: "Колдун, Раса..." },
      { key: "concentration", label: "Концентрация", type: "checkbox" },
      { key: "ritual", label: "Ритуал", type: "checkbox" },
      { key: "combat", label: "В панели боя", type: "select", options: [["", "Авто (атакующие заговоры)"], ["yes", "Показывать"], ["no", "Не показывать"]] },
      { key: "prepared", label: "Подготовлено", type: "checkbox", hint: "Для жрецов, друидов, волшебников и паладинов. Колдуну и барду не нужно" },
      { key: "attack", label: "Бросок атаки заклинанием", type: "checkbox" },
      { key: "save", label: "Спасбросок цели", type: "select", options: SAVE_OPTS },
      { key: "damage", label: "Урон / эффект", type: "dicelist", span: 3 },
      { key: "scaling", label: "Рост заговора", type: "select", options: [["none", "Нет"], ["cantrip-dice", "Больше кубов на 5/11/17 ур."], ["cantrip-beams", "Больше лучей на 5/11/17 ур."]] },
      { key: "upcast", label: "Кубы за круг выше (или за доп. заряд)", placeholder: "1d6" },
      { key: "castAt", label: "Всегда на круге", type: "number", nullable: true, hint: "Для врождённых заклинаний" },
      { key: "cost", label: "Чем платишь", type: "select", options: [["slot", "Ячейка заклинаний"], ["uses", "Свои использования"], ["item", "Заряды предмета"], ["free", "Бесплатно"]] },
      { key: "itemId", label: "Предмет с зарядами", type: "select", options: [["", "Не выбран"]], hint: "Только для «Заряды предмета»" },
      { key: "charges", label: "Зарядов за каст", type: "number", placeholder: "1" },
      { key: "maxCharges", label: "Можно потратить до", type: "number", placeholder: "1", hint: "Каждый заряд сверх минимума добавляет «Кубы за круг выше»" },
      { key: "dcOverride", label: "Своя СЛ", type: "number", nullable: true, hint: "Пусто = СЛ персонажа" },
      { key: "atkOverride", label: "Своя атака", type: "number", nullable: true, hint: "Пусто = атака персонажа" },
      { key: "uses", label: "Использований", placeholder: "1", hint: usesHint },
      { key: "recharge", label: "Восстановление", type: "select", options: rechargeOpts },
      { key: "onSave", label: "Строка-итог (жирным)", placeholder: "При успехе: половина урона", span: 3 },
      { key: "description", label: "Описание", type: "textarea", rows: 6, span: 3 },
      { key: "higher", label: "На больших кругах", type: "textarea", rows: 2, span: 3 },
      { key: "icon", label: "Иконка", type: "icon", span: 3 }
    ]
  },
  feature: {
    title: "Умение",
    make: (cat = "other") => ({ id: "ft-" + uid(), name: "", nameEn: "", category: cat, source: "", action: "passive", recharge: "always", uses: "", used: 0, slot: "none", range: "", duration: "", save: "", damage: [], description: "", effect: "" }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "nameEn", label: "Англ. название" },
      { key: "category", label: "Раздел", type: "select", options: FEATURE_CATS },
      { key: "source", label: "Откуда", type: "select", options: Object.entries(FEATURE_SOURCES).map(([k, v]) => [k, v || "Не указано"]) },
      { key: "action", label: "Действие", type: "select", options: actionOpts },
      { key: "uses", label: "Использований", placeholder: "1 или =pb", hint: usesHint },
      { key: "recharge", label: "Перезарядка", type: "select", options: rechargeOpts },
      { key: "slot", label: "Ячейка", type: "select", options: [["none", "Не тратит ячейку"], ["pact", "Тратит ячейку договора"]] },
      { key: "range", label: "Дистанция" },
      { key: "duration", label: "Длительность" },
      { key: "save", label: "Спасбросок цели", type: "select", options: SAVE_OPTS },
      { key: "damage", label: "Кубы (урон, лечение, врем. хиты)", type: "dicelist", span: 3 },
      { key: "combat", label: "Показывать в бою", type: "select", options: [["", "Нет"], ["yes", "Да, закрепить"]] },
      { key: "effect", label: "Строка-итог (жирным)", span: 3 },
      { key: "description", label: "Описание", type: "textarea", rows: 6, span: 3 },
      { key: "icon", label: "Иконка", type: "icon", span: 3 }
    ]
  },
  item: {
    title: "Предмет",
    make: (type = "gear") => ({ id: "it-" + uid(), name: "", type, rarity: "common", qty: 1, weight: 0, equipped: false, attuned: false, requiresAttunement: false, action: "", uses: "", recharge: "long", used: 0, damage: [], description: "", effect: "", value: "", atkAbility: type === "weapon" ? "str" : "", atkProf: true, atkBonus: 0, range: "", acBase: null, acDex: "full", acBonus: 0 }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "type", label: "Тип", type: "select", options: ITEM_TYPES },
      { key: "rarity", label: "Редкость", type: "select", options: RARITY },
      { key: "qty", label: "Количество", type: "number" },
      { key: "weight", label: "Вес одного, фнт", type: "number" },
      { key: "value", label: "Цена", placeholder: "25 зм" },
      { key: "equipped", label: "Экипировано", type: "checkbox" },
      { key: "requiresAttunement", label: "Требует настройки", type: "checkbox" },
      { key: "attuned", label: "Настроено", type: "checkbox" },
      { key: "action", label: "Применение", type: "select", options: [["", "Нет"], ...actionOpts] },
      { key: "uses", label: "Заряды / использования", hint: usesHint },
      { key: "recharge", label: "Восстановление", type: "select", options: rechargeOpts },
      { key: "breakOn", label: "Ломается на d20", type: "number", nullable: true, hint: "После последнего заряда бросок d20; пусто = не ломается" },
      { key: "damage", label: "Кубы (у оружия первая строка: урон оружия, модификатор прибавится сам)", type: "dicelist", span: 3 },
      { type: "heading", key: "_hw", label: "Если это оружие: появится в бою, когда надето", span: 3 },
      { key: "atkAbility", label: "Атака", type: "select", options: [["", "Не оружие"], ["str", "Сила"], ["dex", "Ловкость"], ["finesse", "Сила или Ловкость (фехтовальное)"], ["spell", "Заклинательная"]] },
      { key: "atkProf", label: "Есть владение", type: "checkbox" },
      { key: "atkBonus", label: "Магический бонус", type: "number", hint: "+1 к попаданию и урону у оружия +1" },
      { key: "range", label: "Дистанция", placeholder: "5 фт / 20/60 фт", span: 2 },
      { key: "ammoId", label: "Боеприпасы", type: "select", options: [] },
      { type: "heading", key: "_ha", label: "Если это доспех, щит или кольцо защиты: считается в КД, когда надето", span: 3 },
      { key: "acBase", label: "КД доспеха", type: "number", nullable: true, hint: "Пусто, если не доспех" },
      { key: "acDex", label: "Ловкость", type: "select", options: [["full", "Полностью (лёгкий)"], ["2", "Не больше +2 (средний)"], ["0", "Без Ловкости (тяжёлый)"]] },
      { key: "acBonus", label: "Прибавка к КД", type: "number", hint: "Щит +2, кольцо защиты +1" },
      { key: "combat", label: "Показывать в бою", type: "select", options: [["", "Нет"], ["yes", "Да, закрепить"]] },
      { key: "effect", label: "Строка-итог (жирным)", span: 3 },
      { key: "description", label: "Описание", type: "textarea", rows: 5, span: 3 },
      { key: "icon", label: "Иконка", type: "icon", span: 3 }
    ]
  },
  attack: {
    title: "Атака",
    make: () => ({ id: "at-" + uid(), name: "", kind: "attack", ability: "str", proficient: true, bonus: 0, damage: "1d6", addMod: true, dmgBonus: 0, damageType: "slashing", saveAbility: "dex", range: "5 фт", scaling: "none", count: 1, action: "action", notes: "" }),
    fields: [
      { key: "name", label: "Название", span: 2, max: 120 },
      { key: "kind", label: "Тип", type: "select", options: [["attack", "Бросок атаки"], ["save", "Спасбросок цели"]] },
      { key: "ability", label: "Характеристика", type: "select", options: [...ABIL_OPTS, ["spell", "Заклинательная"], ["none", "Нет"]] },
      { key: "proficient", label: "Владение", type: "checkbox" },
      { key: "bonus", label: "Доп. бонус к попаданию / СЛ", type: "number" },
      { key: "damage", label: "Кубы урона", placeholder: "1d8" },
      { key: "damageType", label: "Тип урона", type: "select", options: DAMAGE },
      { key: "addMod", label: "Прибавлять модификатор к урону", type: "checkbox" },
      { key: "dmgBonus", label: "Доп. урон", type: "number" },
      { key: "saveAbility", label: "Спасбросок цели", type: "select", options: ABIL_OPTS },
      { key: "range", label: "Дистанция" },
      { key: "scaling", label: "Рост заговора", type: "select", options: [["none", "Нет"], ["cantrip-dice", "Больше кубов"], ["cantrip-beams", "Больше лучей"]] },
      { key: "count", label: "Атак / лучей", type: "number" },
      { key: "action", label: "Действие", type: "select", options: actionOpts },
      { key: "ammoId", label: "Боеприпасы", type: "select", options: [] },
      { key: "notes", label: "Заметки", type: "textarea", rows: 3, span: 3 },
      { key: "icon", label: "Иконка", type: "icon", span: 3 }
    ]
  },
  note: {
    title: "Запись",
    make: () => ({ id: "nt-" + uid(), title: "", subtitle: "", status: "", attitude: "", text: "" })
  }
};

const ROLL_FLAGS = [["attack", "Атаки"], ["save", "Все спасброски"], ["check", "Все проверки"], ["save:str", "Спасброски Силы"], ["save:dex", "Спасброски Ловкости"], ["save:con", "Спасброски Телосложения"], ["save:wis", "Спасброски Мудрости"], ["check:str", "Проверки Силы"], ["check:dex", "Проверки Ловкости"]];

export function effectFields() {
  return [
    { key: "name", label: "Название", span: 2, max: 80 },
    { key: "rounds", label: "Длительность, раундов", type: "number", nullable: true, hint: "10 = 1 минута, 600 = 1 час, пусто = пока не снимешь" },
    { key: "attack", label: "К атакам", placeholder: "1d4 или 2" },
    { key: "save", label: "К спасброскам", placeholder: "1d4" },
    { key: "check", label: "К проверкам", placeholder: "1d4" },
    { key: "ac", label: "К КД", type: "number" },
    { key: "speed", label: "К скорости, фт", type: "number" },
    { key: "speedX2", label: "Скорость вдвое", type: "checkbox" },
    { key: "dmg", label: "К урону атак", placeholder: "1d6" },
    { key: "dmgType", label: "Тип доп. урона", type: "select", options: [["", "Как у атаки"], ...Object.entries(DAMAGE).filter(([k]) => k !== "healing" && k !== "temp").map(([k, t]) => [k, t.name])] },
    { key: "until", label: "Снимается отдыхом", type: "select", options: [["", "Длинным"], ["short", "Коротким"]] },
    { key: "adv", label: "Преимущество на", type: "flags", options: ROLL_FLAGS, span: 3 },
    { key: "dis", label: "Помеха на", type: "flags", options: ROLL_FLAGS, span: 3 },
    { key: "resist", label: "Сопротивление урону", type: "types", span: 3 },
    { key: "once", label: "Один раз (снимается после первого броска)", type: "checkbox", span: 2 },
    { key: "mine", label: "Моя концентрация", type: "checkbox", hint: "Снимется, когда концентрация прервётся" },
    { key: "note", label: "Заметка", span: 3 }
  ];
}

export function noteFields(section) {
  const f = [
    { key: "title", label: section === "people" ? "Имя" : "Заголовок", span: 2 },
    { key: "subtitle", label: section === "people" ? "Кто это" : "Подзаголовок" }
  ];
  if (section === "quests") f.push({ key: "status", label: "Статус", type: "select", options: [["active", "Активно"], ["done", "Выполнено"], ["failed", "Провалено"], ["", "Без статуса"]] });
  if (section === "people") f.push({ key: "attitude", label: "Отношение", type: "select", options: [["ally", "Союзник"], ["neutral", "Нейтрально"], ["hostile", "Враг"], ["", "Неизвестно"]] });
  f.push({ key: "tags", label: "Метки через запятую", span: 3, placeholder: "Нижний город, гильдия, должник" });
  f.push({ key: "text", label: "Текст", type: "richtext", rows: 12, span: 3, hint: "**жирный**, *курсив*, ## заголовок, - список, > цитата, ==маркер==. Кнопка «Просмотр» показывает, как будет выглядеть" });
  f.push({ key: "collapsed", label: "Показывать свёрнутой (только название)", type: "checkbox", span: 3 });
  return f;
}

export function infoFields() {
  return [
    { type: "heading", key: "_h1", label: "Персонаж", span: 3 },
    { key: "name", label: "Имя", span: 2, max: 120 },
    { key: "info.player", label: "Игрок" },
    { key: "info.race", label: "Раса" },
    { key: "info.subrace", label: "Подраса" },
    { key: "info.age", label: "Возраст" },
    { key: "info.cls", label: "Класс" },
    { key: "info.subclass", label: "Подкласс" },
    { key: "info.level", label: "Уровень", type: "number" },
    { key: "info.background", label: "Предыстория" },
    { key: "info.alignment", label: "Мировоззрение", suggest: ALIGNMENTS },
    { key: "info.xp", label: "Опыт", type: "number" },
    { key: "info.patron", label: "Покровитель / божество" },
    { key: "info.pactBoon", label: "Дар договора / путь" },
    { key: "info.setting", label: "Сеттинг" },
    { type: "heading", key: "_h2", label: "Механика", span: 3 },
    { key: "hitDie", label: "Кость хитов", type: "select", options: HIT_DICE },
    { key: "casterType", label: "Заклинатель", type: "select", options: CASTER_TYPES },
    { key: "spellAbility", label: "Заклинательная характеристика", type: "select", options: ABIL_OPTS },
    { key: "speed", label: "Скорость, фт", type: "number" },
    { key: "initBonus", label: "Доп. бонус инициативы", type: "number" },
    { key: "hp.maxOverride", label: "Макс. хиты вручную", type: "number", nullable: true, hint: "Пусто = считается автоматически" },
    { key: "hp.bonusPerLevel", label: "Доп. хиты за уровень", type: "number", hint: "Например, черта Крепкий: 2" },
    { key: "accent", label: "Цвет листа", type: "select", options: Object.entries(ACCENTS).map(([k, v]) => [k, v.name]) },
    { key: "senses", label: "Чувства", placeholder: "Тёмное зрение 60 фт", span: 2 },
    { type: "heading", key: "_h5", label: "Сопротивления, уязвимости, иммунитеты", span: 3 },
    { key: "defenses.resist", label: "Сопротивление (урон пополам)", type: "types", span: 3 },
    { key: "defenses.vuln", label: "Уязвимость (урон вдвое)", type: "types", span: 3 },
    { key: "defenses.immune", label: "Иммунитет (без урона)", type: "types", span: 3 },
    { key: "resistances", label: "Заметка о защите", span: 3, placeholder: "Огонь (Адское сопротивление)", hint: "Отмеченные типы считаются сами, когда вводишь урон с типом" },
    { type: "heading", key: "_h3", label: "Спасброски с владением", span: 3 },
    ...ABILITIES.map(a => ({ key: "saves." + a.key, label: a.name, type: "checkbox" })),
    { type: "heading", key: "_h4", label: "Замена типа урона (хоумбрю)", span: 3 },
    { key: "damageSwap.enabled", label: "Включено", type: "checkbox" },
    { key: "damageSwap.from", label: "Из", type: "select", options: DAMAGE },
    { key: "damageSwap.to", label: "В", type: "select", options: DAMAGE },
    { key: "damageSwap.label", label: "Название эффекта", span: 3 }
  ];
}

export function armorFields() {
  return [
    { key: "armor.name", label: "Доспех", span: 2 },
    { key: "armor.base", label: "Базовый КД", type: "number" },
    { key: "armor.dexCap", label: "Ловкость", type: "select", options: [["full", "Полностью (лёгкий / без доспеха)"], ["2", "Не больше +2 (средний)"], ["0", "Не учитывается (тяжёлый)"]] },
    { key: "armor.addAbility", label: "Ещё прибавлять к КД", type: "select", options: [["", "Ничего"], ["con", "Телосложение (Защита без доспехов варвара)"], ["wis", "Мудрость (Защита без доспехов монаха)"], ["int", "Интеллект"], ["cha", "Харизма"]], span: 2 },
    { key: "armor.shield", label: "Щит (+2)", type: "checkbox" },
    { key: "armor.bonus", label: "Прочие бонусы", type: "number", hint: "Кольцо защиты, магия и т.п." }
  ];
}

export function openEditor(kind, entity, { onSave, onDelete, makeArg, items = [], value: preset } = {}) {
  const ed = EDITORS[kind];
  const value = entity || preset || ed.make(makeArg);
  const fields = ed.fields.map(f => {
    if (f.key === "itemId") return { ...f, options: [["", "Не выбран"], ...items.map(it => [it.id, it.name || "Без названия"])] };
    if (f.key === "ammoId") return { ...f, options: [["", "Авто по названию"], ["none", "Не тратит"], ...items.filter(it => !entity || it.id !== entity.id).map(it => [it.id, it.name || "Без названия"])] };
    return f;
  });
  return openForm({ title: (entity ? "Изменить: " : "Новое: ") + ed.title.toLowerCase(), fields, value, onSave, onDelete: entity ? onDelete : null });
}
