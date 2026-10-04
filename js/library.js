import { SCHOOLS, normalize, uid } from "./rules.js";
import { icon } from "./icons.js";
import { esc, card, openModal, toast } from "./ui.js";
import { spellModel } from "./entities.js";

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

export function guessClass(c) {
  const s = String((c.info && c.info.cls) || "").toLowerCase();
  return Object.keys(CLASSES).find(k => s.includes(CLASSES[k].toLowerCase().slice(0, 5))) || "";
}

export function itemCharges(lib) {
  const lvl = Number(lib.level) || 0;
  const charges = Math.max(1, lvl - 1);
  const first = (lib.damage || [])[0];
  const grows = !!first && first.type !== "temp" && (lvl === 0 || !!lib.upcast);
  return { charges, maxCharges: grows ? charges + 2 : charges, upcast: grows ? (lvl === 0 ? first.dice : lib.upcast) : "" };
}

export function toSpell(lib, item) {
  const sp = { id: "sp-" + uid(), castAt: null, source: "SRD 5.1", cost: "slot", uses: "", recharge: "long", used: 0, prepared: true };
  for (const k of FIELDS) sp[k] = lib[k] ?? (k === "damage" ? [] : k === "level" ? 0 : "");
  if (item) Object.assign(sp, { cost: "item", itemId: item.id, scaling: "none", source: item.name || "Предмет", ...itemCharges(lib) });
  return normalize({ name: "x", spells: [sp] }).spells[0];
}

const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");

export async function openSpellLibrary({ get, onAdd, item = null }) {
  const { c } = get();
  const m = openModal({ title: item ? `Заклинание для «${item.name || "предмета"}»` : "Библиотека заклинаний", wide: true, cls: "library", body: `<div class="loading small">${icon("hourglass")} Загружаю...</div>` });
  let list;
  try {
    list = await loadSpells();
  } catch {
    m.body.innerHTML = `<p class="empty">Не удалось загрузить библиотеку. Проверь интернет и попробуй ещё раз.</p>`;
    return;
  }
  const st = { q: "", level: "all", cls: item ? "" : guessClass(c), open: "" };
  const have = () => new Set(get().c.spells.flatMap(s => [norm(s.nameEn), norm(s.name)]).filter(Boolean));
  m.body.innerHTML = `
    <div class="lib-tools">
      <label class="search-box">${icon("search")}<input type="search" data-q placeholder="Название по-русски или по-английски" aria-label="Поиск заклинания"></label>
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
          <span class="lib-names"><b>${esc(s.name)}</b><small>${esc(s.nameEn || "")} · ${esc(school)}${s.concentration ? " · К" : ""}${s.ritual ? " · Р" : ""}</small></span>
          ${got ? `<span class="badge" style="--c:#4fcf6a">уже есть</span>` : ""}
          <span class="lib-chev">${icon("down")}</span>
        </button>
        ${open ? `<div class="lib-card">${card(spellModel(get().c, get().d, toSpell(s, item)))}<div class="lib-cls-line">${s.classes.map(k => CLASSES[k]).join(", ")}</div><div class="lib-actions"><button class="btn gold" data-add="${esc(s.key)}">${icon("plus")}${item ? "Добавить в предмет" : got ? "Добавить ещё раз" : "Добавить в лист"}</button></div></div>` : ""}
      </div>`;
    }).join("") || `<p class="empty">Ничего не нашлось</p>`;
  };
  draw();
  m.body.querySelector("[data-q]").addEventListener("input", e => {
    st.q = e.target.value;
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
      if (s && onAdd(toSpell(s, item)) !== false) {
        toast(`${icon("check")} «${esc(s.name)}» добавлено в лист`, { kind: "good", timeout: 2200 });
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
