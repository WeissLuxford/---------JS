import { SCHOOLS, DAMAGE, ACTIONS, RECHARGE, FEATURE_CATS, normalize, uid, itemCharges } from "./rules.js";

export { itemCharges };
import { icon } from "./icons.js";
import { esc, card, openModal, toast, rich } from "./ui.js";
import { spellModel, spellIcon, featureIcon, itemIcon } from "./entities.js";
import { INVOCATIONS, detectClass, CLASSES as CLASS_TABLE } from "./classes.js";
import { GEAR, gearToItem } from "./gear.js";
import { PACKS, packItems, packWeight } from "./packs.js";
import { stem, words } from "./notes.js";

export const CLASSES = { bard: "Бард", cleric: "Жрец", druid: "Друид", paladin: "Паладин", ranger: "Следопыт", sorcerer: "Чародей", warlock: "Колдун", wizard: "Волшебник" };

const FIELDS = ["name", "nameEn", "level", "school", "action", "castTime", "range", "area", "duration", "concentration", "ritual", "components", "save", "attack", "damage", "scaling", "upcast", "onSave", "description", "higher"];

let cache = null;

export async function loadSpells() {
  if (cache) return cache;
  const res = await fetch(new URL("../data/spells-srd.json", import.meta.url));
  if (!res.ok) throw new Error("load");
  const raw = await res.json();
  cache = (Array.isArray(raw) ? raw : []).filter(x => x && typeof x === "object" && typeof x.name === "string").map((x, i) => ({ ...x, key: String(x.nameEn || x.name) + "#" + i, classes: Array.isArray(x.classes) ? x.classes.filter(k => k in CLASSES) : [] }));
  return cache;
}

function libIcon(x) {
  return `<span class="lib-ic" style="${x.color ? `--c:${esc(x.color)}` : ""}">${icon(x.icon)}</span>`;
}

export function guessClass(c) {
  const s = String((c.info && c.info.cls) || "").toLowerCase();
  return Object.keys(CLASSES).find(k => s.includes(CLASSES[k].toLowerCase().slice(0, 5))) || "";
}

export function toSpell(lib, item) {
  const sp = { id: "sp-" + uid(), castAt: null, source: "SRD 5.1", cost: "slot", uses: "", recharge: "long", used: 0, prepared: true };
  for (const k of FIELDS) sp[k] = lib[k] ?? (k === "damage" ? [] : k === "level" ? 0 : "");
  if (item) Object.assign(sp, { cost: "item", itemId: item.id, scaling: "none", source: item.name || "Предмет", ...itemCharges(lib) });
  return normalize({ name: "x", spells: [sp] }).spells[0];
}

const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");

let featCache = null;

export async function loadFeatures() {
  if (featCache) return featCache;
  const res = await fetch(new URL("../data/features-srd.json", import.meta.url));
  if (!res.ok) throw new Error("load");
  const raw = await res.json();
  const base = (Array.isArray(raw) ? raw : []).filter(x => x && typeof x === "object" && typeof x.name === "string" && typeof x.key === "string");
  const inv = INVOCATIONS.map(x => ({ key: "inv-" + x.key, group: "invocation", cls: "warlock", sub: "", subEn: "", race: "", subrace: "", level: x.level || 0, name: x.name, nameEn: "", action: /неограниченно|раз за длинный отдых/i.test(x.description) ? "action" : "passive", recharge: /раз за длинный отдых/i.test(x.description) ? "long" : "always", uses: /раз за длинный отдых/i.test(x.description) ? "1" : "", description: x.description + (x.level ? ` Нужен ${x.level} уровень колдуна.` : "") + (x.pact ? ` Нужен ${{ tome: "Договор гримуара", blade: "Договор клинка", chain: "Договор цепи" }[x.pact]}.` : "") + (x.cantrip ? " Нужен заговор Мистический заряд." : "") }));
  featCache = [...base, ...inv];
  return featCache;
}

const GROUP_CAT = { class: "class", invocation: "invocation", race: "race", style: "feat", feat: "feat", background: "background" };
const GROUP_SRC = { class: "class", invocation: "class", race: "race", style: "class", feat: "", background: "" };

export function featureFromLib(x) {
  return { id: "ft-" + uid(), name: x.name, nameEn: x.nameEn || "", category: GROUP_CAT[x.group] || "other", source: GROUP_SRC[x.group] || "", action: x.action || "passive", recharge: x.recharge || "always", uses: x.uses || "", used: 0, slot: "none", range: "", duration: "", save: "", damage: Array.isArray(x.damage) ? x.damage.map(d => ({ dice: d.dice, type: d.type, addMod: !!d.addMod })) : [], description: x.description || "", effect: "" };
}

export function matchesSubclass(c, x) {
  if (!x.sub) return true;
  const s = norm(`${(c.info && c.info.subclass) || ""} ${(c.info && c.info.patron) || ""}`);
  if (!s.trim()) return false;
  if (x.subEn && s.includes(norm(x.subEn))) return true;
  const have = words(s);
  if (words(x.subEn).filter(w => w.length >= 5 && !["school", "circle", "college", "domain"].includes(w)).some(w => have.some(h => h.startsWith(w.slice(0, -1))))) return true;
  return words(x.sub).map(stem).filter(w => w.length >= 4 && !["путь", "школ", "круг", "колледж", "домен", "клятв", "архетип"].includes(w)).some(w => have.some(h => h.startsWith(w)));
}

export function classFeaturesAt(lib, c, clsKey, level) {
  return lib.filter(x => x.group === "class" && x.cls === clsKey && x.level === level && matchesSubclass(c, x));
}

const RACE_ALIASES = { "Дварф": ["дварф", "дворф", "гном-дварф"], "Эльф": ["эльф"], "Полурослик": ["полурослик", "хоббит"], "Человек": ["человек"], "Драконорождённый": ["драконорожд", "драконорожденный"], "Гном": ["гном"], "Полуэльф": ["полуэльф"], "Полуорк": ["полуорк"], "Тифлинг": ["тифлинг"] };

function guessRace(c, races) {
  const s = norm((c.info && c.info.race) || "");
  if (!s) return "";
  const sorted = races.slice().sort((a, b) => b.length - a.length);
  return sorted.find(r => (RACE_ALIASES[r] || [norm(r)]).some(a => s.includes(norm(a)))) || "";
}

function libTabs(cur, only) {
  const tabs = [["spells", "Заклинания", "book"], ["features", "Умения", "pact"], ["gear", "Снаряжение", "swords"]];
  if (only) return "";
  return `<div class="subtabs lib-tabs" role="tablist">${tabs.map(([k, l, ic]) => `<button class="subtab ${k === cur ? "on" : ""}" data-lib-tab="${k}" role="tab" aria-selected="${k === cur ? "true" : "false"}">${icon(ic)}${l}</button>`).join("")}</div>`;
}

export function openLibrary({ tab = "spells", get, onAddSpell, onAddFeature, onAddItem, item = null }) {
  const titles = { spells: "Библиотека: заклинания", features: "Библиотека: умения", gear: "Библиотека: снаряжение" };
  const m = openModal({ title: item ? `Заклинание для «${item.name || "предмета"}»` : titles[tab], wide: true, cls: "library", body: `${libTabs(tab, !!item)}<div data-pane></div>` });
  const pane = m.body.querySelector("[data-pane]");
  const show = t => {
    const box = document.createElement("div");
    pane.replaceChildren(box);
    const h = m.body.closest(".modal").querySelector(".modal-head h2");
    if (h && !item) h.textContent = titles[t];
    if (t === "spells") return renderSpells(box, { get, onAdd: onAddSpell, item });
    if (t === "features") return renderFeatures(box, { get, onAdd: onAddFeature });
    return renderGear(box, { get, onAdd: onAddItem });
  };
  m.body.addEventListener("click", e => {
    const b = e.target.closest("[data-lib-tab]");
    if (!b) return;
    m.body.querySelectorAll("[data-lib-tab]").forEach(x => {
      x.classList.toggle("on", x === b);
      x.setAttribute("aria-selected", String(x === b));
    });
    show(b.dataset.libTab);
  });
  show(tab);
  return m;
}

export async function openSpellLibrary({ get, onAdd, item = null }) {
  return openLibrary({ tab: "spells", get, onAddSpell: onAdd, item });
}

async function renderSpells(box, { get, onAdd, item = null }) {
  const { c } = get();
  box.innerHTML = `<div class="loading small">${icon("hourglass")} Загружаю...</div>`;
  let list;
  try {
    list = await loadSpells();
  } catch {
    box.innerHTML = `<p class="empty">Не удалось загрузить библиотеку. Проверь интернет и попробуй ещё раз.</p>`;
    return;
  }
  const m = { body: box };
  const st = { q: "", level: "all", cls: item ? "" : guessClass(c), open: "", target: item ? item.id : "" };
  const wandish = it => (it.type === "wand" || /палочк|жезл|посох/i.test(it.name || "") ? 0 : 1);
  const charged = item ? [] : get().c.items.filter(it => get().d.uses[it.id] != null).sort((a, b) => wandish(a) - wandish(b));
  const targetItem = () => item || get().c.items.find(it => it.id === st.target) || null;
  const have = () => new Set(get().c.spells.flatMap(s => [norm(s.nameEn), norm(s.name)]).filter(Boolean));
  m.body.innerHTML = `
    <div class="lib-tools">
      <label class="search-box">${icon("search")}<input type="search" data-q placeholder="Название по-русски или по-английски" aria-label="Поиск заклинания"></label>
      ${charged.length ? `<label class="fld compact lib-cls"><span>Куда добавить</span><select data-target><option value="">Мои заклинания</option>${charged.map(it => `<option value="${esc(it.id)}">${esc(it.name || "Предмет")} (заряды)</option>`).join("")}</select></label>` : ""}
      <label class="fld compact lib-cls"><span>Класс</span><select data-cls><option value="">Все классы</option>${Object.entries(CLASSES).map(([k, v]) => `<option value="${k}" ${st.cls === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    </div>
    <div class="chips filter lib-levels">${[["all", "Все"], ["0", "Заговоры"], ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [String(n), n + " круг"])].map(([k, l]) => `<button class="chip toggle ${k === "all" ? "on" : ""}" data-lvl="${k}">${l}</button>`).join("")}</div>
    ${item ? `<p class="hint">Заклинание будет тратить заряды «${esc(item.name || "предмета")}». Сколько зарядов и сколько урона даёт лишний заряд, видно на карточке; поменять можно кнопкой «Изменить» у заклинания.</p>` : ""}
    <div class="lib-count hint" data-count></div>
    <div class="lib-list" data-list></div>
    <p class="hint small lib-src">Заклинания из System Reference Document 5.1, Wizards of the Coast LLC, лицензия CC-BY-4.0. Тексты переведены и сокращены для этого сайта. После добавления заклинание можно изменить как угодно.</p>`;
  const listEl = m.body.querySelector("[data-list]");
  const countEl = m.body.querySelector("[data-count]");
  const draw = () => {
    const q = norm(st.q.trim());
    const owned = have();
    const rows = list.filter(s => (st.level === "all" || String(s.level) === st.level) && (q || !st.cls || s.classes.includes(st.cls)) && (!q || norm(s.name).includes(q) || norm(s.nameEn).includes(q)));
    countEl.textContent = `Найдено: ${rows.length}${q && st.cls ? " (поиск идёт по всем классам)" : ""}`;
    listEl.innerHTML = rows.slice(0, 400).map(s => {
      const got = owned.has(norm(s.nameEn)) || owned.has(norm(s.name));
      const school = (SCHOOLS[s.school] || {}).name || "";
      const open = st.open === s.key;
      return `<div class="lib-row ${open ? "open" : ""}">
        <button class="lib-head" data-lib-open="${esc(s.key)}" aria-expanded="${open ? "true" : "false"}">
          <span class="lib-lvl">${esc(Number(s.level) || 0)}</span>
          ${libIcon(spellIcon(get().c, s))}
          <span class="lib-names"><b>${esc(s.name)}</b><small>${esc(s.nameEn || "")} · ${esc(school)}${s.concentration ? " · К" : ""}${s.ritual ? " · Р" : ""}</small></span>
          ${got ? `<span class="badge" style="--c:#4fcf6a">уже есть</span>` : ""}
          <span class="lib-chev">${icon("down")}</span>
        </button>
        ${open ? `<div class="lib-card">${card(spellModel(get().c, get().d, toSpell(s, targetItem())))}<div class="lib-cls-line">${s.classes.map(k => CLASSES[k]).join(", ")}</div><div class="lib-actions"><button class="btn gold" data-add="${esc(s.key)}">${icon("plus")}${targetItem() ? `Добавить в «${esc(targetItem().name || "предмет")}»` : got ? "Добавить ещё раз" : "Добавить в лист"}</button></div></div>` : ""}
      </div>`;
    }).join("") || `<p class="empty">Ничего не нашлось</p>`;
  };
  draw();
  m.body.querySelector("[data-q]").addEventListener("input", e => {
    st.q = e.target.value;
    draw();
  });
  const tgt = m.body.querySelector("[data-target]");
  if (tgt) tgt.addEventListener("change", e => {
    st.target = e.target.value;
    draw();
  });
  m.body.querySelector("[data-cls]").addEventListener("change", e => {
    st.cls = e.target.value;
    draw();
  });
  m.body.addEventListener("click", e => {
    const lv = e.target.closest("[data-lvl]");
    if (lv) {
      st.level = lv.dataset.lvl;
      m.body.querySelectorAll("[data-lvl]").forEach(b => b.classList.toggle("on", b === lv));
      return draw();
    }
    const add = e.target.closest("[data-add]");
    if (add) {
      const s = list.find(x => x.key === add.dataset.add);
      const ti = targetItem();
      if (s && onAdd(toSpell(s, ti)) !== false) {
        toast(`${icon("check")} «${esc(s.name)}» добавлено ${ti ? `в «${esc(ti.name || "предмет")}»` : "в лист"}`, { kind: "good", timeout: 2200 });
        st.open = "";
        draw();
      }
      return;
    }
    const op = e.target.closest("[data-lib-open]");
    if (op) {
      st.open = st.open === op.dataset.libOpen ? "" : op.dataset.libOpen;
      draw();
      const row = listEl.querySelector(".lib-row.open");
      if (row) row.scrollIntoView({ block: "nearest" });
    }
  });
}

const packBox = p => GEAR.find(g => g.name === (p.key === "diplomat" ? "Сундук" : "Рюкзак"));
const GEAR_ROWS = [...GEAR, ...PACKS.map(p => ({ kind: "pack", group: "Наборы", name: p.name, nameEn: "", props: `${p.note} В ${p.key === "diplomat" ? "сундуке" : "рюкзаке"}: ${p.items.map(x => (x.qty > 1 ? `${x.name} × ${x.qty}` : x.name)).join(", ")}`, value: p.value, pack: p.key, count: p.items.length + 1, weight: Math.round((packWeight(p) + packBox(p).weight) * 100) / 100 }))];

function renderGear(box, { get, onAdd }) {
  const prof = String(get().c.proficiencies.weapons || "").toLowerCase();
  box.innerHTML = `<div class="lib-tools"><label class="search-box">${icon("search")}<input type="search" data-q placeholder="Кинжал, кольчуга, рюкзак, набор..." aria-label="Поиск"></label></div><div class="lib-list" data-list></div><p class="hint small lib-src">Базовое оружие и доспехи из SRD 5.1 (CC-BY-4.0). После добавления предмет можно изменить: сделать магическим, переименовать, добавить свойства.</p>`;
  const listEl = box.querySelector("[data-list]");
  const draw = q => {
    const n = norm(q.trim());
    let group = "";
    listEl.innerHTML = GEAR_ROWS.map((g, i) => ({ g, i })).filter(({ g }) => !n || norm(g.name).includes(n) || norm(g.nameEn).includes(n) || norm(g.props).includes(n)).map(({ g, i }) => {
      const head = g.group !== group ? `<div class="atk-group">${esc((group = g.group))}</div>` : "";
      const stat = g.kind === "weapon" ? `${g.dice} ${((DAMAGE[g.type] || {}).name || "").toLowerCase()}` : g.kind === "armor" ? `КД ${g.base}${g.dex === "0" ? "" : g.dex === "2" ? " + Лов (макс. 2)" : " + Лов"}` : g.kind === "shield" ? "+2 КД" : g.kind === "pack" ? `${g.count} вещей, ${String(g.weight).replace(".", ",")} фнт` : g.capacity ? `вмещает ${g.capacity} фнт` : "";
      const ic = g.kind === "pack" ? "backpack" : itemIcon({ name: g.name, type: g.kind === "weapon" ? "weapon" : g.kind === "gear" ? "gear" : "armor" });
      return `${head}<button class="lib-head gear-row" data-g="${i}">${libIcon({ icon: ic })}<span class="lib-names"><b>${esc(g.name)}</b><small>${esc([g.nameEn, stat, g.props, g.value].filter(Boolean).join(" · "))}</small></span><span class="btn ghost sm">${icon("plus")}</span></button>`;
    }).join("") || `<p class="empty">Ничего не нашлось</p>`;
  };
  draw("");
  box.querySelector("[data-q]").addEventListener("input", e => draw(e.target.value));
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-g]");
    if (!b) return;
    const g = GEAR_ROWS[Number(b.dataset.g)];
    if (g.kind === "pack") {
      const p = PACKS.find(x => x.key === g.pack);
      const holder = gearToItem(packBox(p), uid);
      if (onAdd([holder, ...packItems(p.key, holder.id, uid)]) !== false) toast(`${icon("check")} ${esc(p.name)}: «${esc(holder.name)}» и ${p.items.length} вещей в снаряжении`, { kind: "good", timeout: 3200 });
      return;
    }
    const it = gearToItem(g, uid);
    if (g.kind === "weapon") it.atkProf = g.group.startsWith("Простое") ? /прост/.test(prof) : /воинск/.test(prof) || prof.includes(g.name.toLowerCase());
    if (onAdd(it) !== false) toast(`${icon("check")} «${esc(g.name)}» в снаряжении.${g.kind === "gear" ? (g.capacity >= 20 ? " Открой его и нажми «Сложить набор», чтобы наполнить." : "") : " Надень, чтобы он считался в бою и в КД."}`, { kind: "good", timeout: 3200 });
  });
}

const USE_WORDS = { pb: "бонус мастерства", lvl: "уровень", str: "мод. Силы", dex: "мод. Ловкости", con: "мод. Телосложения", int: "мод. Интеллекта", wis: "мод. Мудрости", cha: "мод. Харизмы" };

export function usesText(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const w = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "раза" : "раз";
    return `${n} ${w}`;
  }
  return "использований: " + s.replace(/^=/, "").replace(/[a-z]+/g, v => USE_WORDS[v] || v).replace(/\*/g, " × ").replace(/\+/g, " + ");
}

const FEAT_GROUPS = [["class", "Классы"], ["invocation", "Воззвания"], ["race", "Расы"], ["style", "Стили и черты"], ["background", "Предыстории"]];

async function renderFeatures(box, { get, onAdd }) {
  box.innerHTML = `<div class="loading small">${icon("hourglass")} Загружаю...</div>`;
  let list;
  try {
    list = await loadFeatures();
  } catch {
    box.innerHTML = `<p class="empty">Не удалось загрузить библиотеку умений. Проверь интернет и попробуй ещё раз.</p>`;
    return;
  }
  const { c } = get();
  const cls = detectClass(c);
  const races = [...new Set(list.filter(x => x.group === "race").map(x => x.race))];
  const st = { group: "class", cls: cls ? cls.key : "", race: guessRace(c, races), mine: !!cls, q: "", open: "" };
  const have = () => new Set(get().c.features.map(f => norm(f.name)));
  box.innerHTML = `
    <div class="lib-tools">
      <label class="search-box">${icon("search")}<input type="search" data-q placeholder="Название умения: Ярость, Скрытая атака..." aria-label="Поиск умения"></label>
      <label class="fld compact lib-cls" data-for="class"><span>Класс</span><select data-cls><option value="">Все классы</option>${Object.entries(CLASS_TABLE).map(([k, v]) => `<option value="${k}" ${st.cls === k ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
      <label class="fld compact lib-cls" data-for="race" hidden><span>Раса</span><select data-race><option value="">Все расы</option>${races.map(r => `<option value="${esc(r)}" ${st.race === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
    </div>
    <div class="chips filter lib-levels">${FEAT_GROUPS.map(([k, l]) => `<button class="chip toggle ${k === st.group ? "on" : ""}" data-fg="${k}">${l}</button>`).join("")}</div>
    <label class="fld chk lib-mine"><input type="checkbox" data-mine ${st.mine ? "checked" : ""}><span>Только до моего уровня и моего подкласса</span></label>
    <div class="lib-count hint" data-count></div>
    <div class="lib-list" data-list></div>
    <p class="hint small lib-src">Умения из System Reference Document 5.1, Wizards of the Coast LLC, лицензия CC-BY-4.0. Описания пересказаны своими словами. После добавления умение можно изменить как угодно.</p>`;
  const listEl = box.querySelector("[data-list]");
  const countEl = box.querySelector("[data-count]");
  const sync = () => {
    box.querySelector(".lib-cls[data-for=class]").hidden = !!st.q || st.group !== "class";
    box.querySelector(".lib-cls[data-for=race]").hidden = !!st.q || st.group !== "race";
    box.querySelector(".lib-mine").hidden = !!st.q || (st.group !== "class" && st.group !== "invocation");
  };
  const visible = () => {
    const q = norm(st.q.trim());
    const level = get().d.level;
    if (q) return list.filter(x => norm(x.name).includes(q) || norm(x.nameEn).includes(q) || norm(x.sub).includes(q) || norm(x.race).includes(q));
    if (st.group === "class") return list.filter(x => x.group === "class" && (!st.cls || x.cls === st.cls) && (!st.mine || !cls || st.cls !== cls.key || (x.level <= level && matchesSubclass(get().c, x)))).sort((a, b) => (a.cls === b.cls ? 0 : a.cls < b.cls ? -1 : 1) || a.level - b.level);
    if (st.group === "invocation") return list.filter(x => x.group === "invocation" && (!st.mine || !x.level || x.level <= level));
    if (st.group === "race") return list.filter(x => x.group === "race" && (!st.race || x.race === st.race));
    if (st.group === "style") return list.filter(x => x.group === "style" || x.group === "feat");
    return list.filter(x => x.group === st.group);
  };
  const where = x => (x.group === "class" ? `${(CLASS_TABLE[x.cls] || {}).name || ""} · ${x.level} ур.${x.sub ? ` · ${x.sub}` : ""}` : x.group === "race" ? `${x.race}${x.subrace ? ` · ${x.subrace}` : ""}` : x.group === "invocation" ? `Воззвание колдуна${x.level ? ` · с ${x.level} ур.` : ""}` : x.group === "style" ? "Боевой стиль" : x.group === "feat" ? "Черта" : "Предыстория");
  const draw = () => {
    sync();
    const owned = have();
    const rows = visible();
    countEl.textContent = `Найдено: ${rows.length}${st.q ? " (поиск по всей библиотеке)" : ""}`;
    let group = "";
    listEl.innerHTML = rows.slice(0, 400).map(x => {
      const got = owned.has(norm(x.name));
      const open = st.open === x.key;
      const g = !st.q && st.group === "class" ? `${(CLASS_TABLE[x.cls] || {}).name || ""}${st.cls ? ` · ${x.level} уровень` : ""}` : "";
      const head = g && g !== group ? `<div class="atk-group">${esc((group = g))}</div>` : "";
      const act = ACTIONS[x.action] || ACTIONS.passive;
      const meta = [act.name, usesText(x.uses), x.recharge !== "always" ? (RECHARGE[x.recharge] || "").toLowerCase() : ""].filter(Boolean).join(" · ");
      const cat = FEATURE_CATS[GROUP_CAT[x.group]] || FEATURE_CATS.other;
      return `${head}<div class="lib-row ${open ? "open" : ""}">
        <button class="lib-head" data-lib-open="${esc(x.key)}" aria-expanded="${open ? "true" : "false"}">
          ${x.level ? `<span class="lib-lvl" title="Уровень">${esc(x.level)}</span>` : ""}
          ${libIcon({ icon: featureIcon({ ...x, category: GROUP_CAT[x.group] || "other" }), color: cat.color || "" })}
          <span class="lib-names"><b>${esc(x.name)}</b><small>${esc(where(x))}${x.nameEn ? ` · ${esc(x.nameEn)}` : ""}</small></span>
          ${got ? `<span class="badge" style="--c:#4fcf6a">уже есть</span>` : ""}
          <span class="lib-chev">${icon("down")}</span>
        </button>
        ${open ? `<div class="lib-card lib-feat"><div class="lib-meta">${esc(meta)}${(x.damage || []).length ? ` · ${x.damage.map(dm => `${esc(dm.dice)} ${esc(((DAMAGE[dm.type] || {}).name || "").toLowerCase())}`).join(", ")}` : ""}</div><div class="note-text">${rich(x.description)}</div><div class="lib-actions"><span class="hint">Попадёт в «${esc(cat.name)}»</span><button class="btn gold" data-add="${esc(x.key)}">${icon("plus")}${got ? "Добавить ещё раз" : "Добавить в умения"}</button></div></div>` : ""}
      </div>`;
    }).join("") || `<p class="empty">Ничего не нашлось</p>`;
  };
  draw();
  box.querySelector("[data-q]").addEventListener("input", e => {
    st.q = e.target.value;
    draw();
  });
  box.addEventListener("change", e => {
    if (e.target.matches("[data-q]")) return;
    if (e.target.matches("[data-cls]")) st.cls = e.target.value;
    if (e.target.matches("[data-race]")) st.race = e.target.value;
    if (e.target.matches("[data-mine]")) st.mine = e.target.checked;
    draw();
  });
  box.addEventListener("click", e => {
    const fg = e.target.closest("[data-fg]");
    if (fg) {
      st.group = fg.dataset.fg;
      st.open = "";
      box.querySelectorAll("[data-fg]").forEach(b => b.classList.toggle("on", b === fg));
      return draw();
    }
    const add = e.target.closest("[data-add]");
    if (add) {
      const x = list.find(y => y.key === add.dataset.add);
      if (x && onAdd(featureFromLib(x)) !== false) {
        toast(`${icon("check")} «${esc(x.name)}» добавлено в умения`, { kind: "good", timeout: 2200 });
        st.open = "";
        draw();
      }
      return;
    }
    const op = e.target.closest("[data-lib-open]");
    if (op) {
      st.open = st.open === op.dataset.libOpen ? "" : op.dataset.libOpen;
      draw();
      const row = listEl.querySelector(".lib-row.open");
      if (row) row.scrollIntoView({ block: "nearest" });
    }
  });
}
