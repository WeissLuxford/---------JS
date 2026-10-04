import { DAMAGE, normalize, rollDice, usesInfo, uid, itemCharges } from "./rules.js";
import { icon } from "./icons.js";
import { esc, $, toast, openModal } from "./ui.js";
import { findEntity, itemIcon, itemSpellInfo, chargeWord } from "./entities.js";
export function installMagic(X) {
  const { S } = X;

  function spellReady(sp) {
    const lvl = Number(sp.level) || 0;
    if (sp.cost === "item") {
      const info = itemSpellInfo(S.c, S.d, sp);
      return info && info.uses ? (info.left >= info.min ? `${info.left} ${chargeWord(info.left)}` : false) : false;
    }
    if (sp.cost === "uses") {
      const u = usesInfo(S.d, sp);
      return u ? (u.left > 0 ? `${u.left}/${u.max}` : false) : "";
    }
    if (lvl === 0 || sp.cost === "free") return "";
    if (S.d.pact) return lvl <= S.d.pact.level && pactLeft() > 0 ? `ячейка ${S.d.pact.level} круга` : false;
    return availableSlotLevels(lvl).length ? "" : false;
  }

  function resetUses(c, kinds) {
    for (const list of [c.features, c.items, c.spells]) {
      for (const e of list) if (kinds.includes(e.recharge)) e.used = 0;
    }
  }

  function spendSlot(c, level) {
    const d = S.d;
    if (d.pact) {
      if ((Number(c.pactUsed) || 0) >= d.pact.count) return false;
      c.pactUsed = (Number(c.pactUsed) || 0) + 1;
      return true;
    }
    const total = d.slots[level - 1] || 0;
    const used = Number(c.slotsUsed[level]) || 0;
    if (used >= total) return false;
    c.slotsUsed[level] = used + 1;
    return true;
  }

  function availableSlotLevels(min) {
    const { c, d } = S;
    const out = [];
    d.slots.forEach((n, i) => {
      const lvl = i + 1;
      if (lvl >= min && n - (Number(c.slotsUsed[lvl]) || 0) > 0) out.push(lvl);
    });
    return out;
  }

  function pactLeft() {
    return S.d.pact ? Math.max(0, S.d.pact.count - (Number(S.c.pactUsed) || 0)) : 0;
  }

  function castFromItem(sp, chosen) {
    X.markAction(sp.action || "action");
    const info = itemSpellInfo(S.c, S.d, sp);
    if (!info) return toast("Выбери в заклинании предмет с зарядами (кнопка «Изменить»)", { kind: "bad" });
    if (!info.uses) return toast(`У предмета «${esc(info.item.name)}» не указаны заряды`, { kind: "bad" });
    const n = Math.max(info.min, Math.min(info.max, chosen || info.min));
    if (info.left < n) return toast(`Не хватает зарядов: нужно ${n}, осталось ${info.left}`, { kind: "bad" });
    S.lastExtra[sp.id] = n - info.min;
    let concNote = "";
    let emptied = false;
    X.mutate(c => {
      const it = findEntity(c, "item", info.item.id);
      const e = findEntity(c, "spell", sp.id);
      if (!it || !e) return;
      it.used = Math.min(info.uses.max, (Number(it.used) || 0) + n);
      emptied = it.used >= info.uses.max;
      if (e.concentration) {
        if (c.concentration && c.concentration !== e.name) concNote = ` Концентрация на «${c.concentration}» прервана.`;
        c.concentration = e.name;
      }
    });
    X.offerEffect(sp);
    toast(`${icon("wand")} <b>${esc(sp.name)}</b>: ${n} ${chargeWord(n)} из «${esc(info.item.name)}», осталось ${Math.max(0, info.left - n)}.${esc(concNote)}`, { kind: "info" });
    const brk = Number(info.item.breakOn);
    if (emptied && brk) {
      const r = rollDice("1d20");
      const broke = r.total === brk;
      toast(`${icon("d20")} Последний заряд, d20: <b>${r.total}</b>. ${broke ? `«${esc(info.item.name)}» разрушается!` : "Предмет уцелел."}`, { kind: broke ? "bad" : "good", timeout: 9000 });
    }
  }

  function castSpell(sp, chosenLevel) {
    const { d } = S;
    if (X.readOnly()) return;
    if (sp.cost === "item") return castFromItem(sp, chosenLevel);
    X.markAction(sp.action || "action");
    const lvl = Number(sp.level) || 0;
    let castLevel = null;
    if (lvl > 0 && sp.cost === "slot") {
      if (d.pact) {
        if (lvl > d.pact.level) return toast(`Нужна ячейка ${lvl} круга, а ячейки договора ${d.pact.level} круга`, { kind: "bad" });
        if (!pactLeft()) return toast("Нет свободных ячеек договора. Нужен короткий отдых.", { kind: "bad" });
        castLevel = d.pact.level;
      } else {
        const avail = availableSlotLevels(lvl);
        if (!avail.length) return toast("Нет свободных ячеек подходящего круга", { kind: "bad" });
        castLevel = chosenLevel && avail.includes(chosenLevel) ? chosenLevel : avail[0];
      }
    }
    if (sp.cost === "uses") {
      const u = usesInfo(d, sp);
      if (u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    }
    let concNote = "";
    S.lastCast[sp.id] = castLevel || (sp.castAt ? Number(sp.castAt) : null);
    X.mutate(c => {
      const e = findEntity(c, "spell", sp.id);
      if (!e) return;
      if (castLevel) spendSlot(c, castLevel);
      if (e.cost === "uses" && usesInfo(S.d, e)) e.used = (Number(e.used) || 0) + 1;
      if (e.concentration) {
        if (c.concentration && c.concentration !== e.name) concNote = ` Концентрация на «${c.concentration}» прервана.`;
        c.concentration = e.name;
      }
    });
    toast(`${icon("sparkle")} <b>${esc(sp.name)}</b>${castLevel ? ` (${castLevel} круг)` : ""}.${esc(concNote)}`, { kind: "info" });
    X.offerEffect(sp);
    X.castTemp(sp, castLevel || Number(sp.level) || 0);
  }

  function useEntity(kind, e, delta = 1) {
    if (!e || X.readOnly()) return;
    const u = usesInfo(S.d, e);
    const pactCost = kind === "feature" && e.slot === "pact";
    if (!u && !pactCost) return;
    if (delta > 0 && u && u.left <= 0) return toast("Использования закончились", { kind: "bad" });
    if (pactCost && delta > 0 && S.d.pact && !pactLeft()) return toast("Нет свободных ячеек договора", { kind: "bad" });
    if (delta > 0) X.markAction(e.action);
    X.mutate(c => {
      const x = findEntity(c, kind, e.id);
      if (!x) return;
      if (u) x.used = Math.max(0, Math.min(u.max, (Number(x.used) || 0) + delta));
      if (pactCost && delta > 0) spendSlot(c, S.d.pact ? S.d.pact.level : 1);
    });
  }

  function moveSpellToItem(sp) {
    const wandish = it => (it.type === "wand" || /палочк|жезл|посох/i.test(it.name || "") ? 0 : 1);
    const items = S.c.items.filter(it => usesInfo(S.d, it)).sort((a, b) => wandish(a) - wandish(b));
    const m = openModal({
      title: `«${sp.name}» в предмет`,
      cls: "small",
      body: `<p class="hint">Заклинание будет тратить заряды выбранного предмета. Числа можно поменять потом кнопкой «Изменить».</p><div class="menu-list">${items.map(it => `<button class="menu-item" data-it="${esc(it.id)}">${icon(itemIcon(it))}<span>${esc(it.name || "Без названия")} · ${usesInfo(S.d, it).left}/${usesInfo(S.d, it).max}</span></button>`).join("")}</div>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-it]");
      if (!b) return;
      const it = items.find(x => x.id === b.dataset.it);
      m.close();
      if (!it) return;
      X.mutate(c => {
        const x = findEntity(c, "spell", sp.id);
        if (x) Object.assign(x, { cost: "item", itemId: it.id, scaling: "none", ...itemCharges(x) });
        c.spells = normalize(c).spells;
      });
      toast(`${icon("wand")} «${esc(sp.name)}» теперь тратит заряды «${esc(it.name)}»`, { kind: "good" });
    });
  }

  async function gearTable() {
    const { GEAR, gearToItem } = await import("./gear.js");
    const prof = String(S.c.proficiencies.weapons || "").toLowerCase();
    const m = openModal({
      title: "Оружие и доспехи",
      wide: true,
      cls: "library",
      body: `<div class="lib-tools"><label class="search-box">${icon("search")}<input type="search" data-q placeholder="Кинжал, рапира, кольчуга..." aria-label="Поиск"></label></div><div class="lib-list" data-list></div><p class="hint small lib-src">Базовое оружие и доспехи из SRD 5.1 (CC-BY-4.0). После добавления предмет можно изменить: сделать магическим, переименовать, добавить свойства.</p>`
    });
    const listEl = m.body.querySelector("[data-list]");
    const draw = q => {
      const n = q.trim().toLowerCase().replace(/ё/g, "е");
      let group = "";
      listEl.innerHTML = GEAR.map((g, i) => ({ g, i })).filter(({ g }) => !n || g.name.toLowerCase().replace(/ё/g, "е").includes(n) || g.nameEn.toLowerCase().includes(n)).map(({ g, i }) => {
        const head = g.group !== group ? `<div class="atk-group">${esc((group = g.group))}</div>` : "";
        const stat = g.kind === "weapon" ? `${g.dice} ${(DAMAGE[g.type] || {}).name.toLowerCase()}` : g.kind === "armor" ? `КД ${g.base}${g.dex === "0" ? "" : g.dex === "2" ? " + Лов (макс. 2)" : " + Лов"}` : "+2 КД";
        return `${head}<button class="lib-head gear-row" data-g="${i}"><span class="lib-names"><b>${esc(g.name)}</b><small>${esc(g.nameEn)} · ${esc(stat)}${g.props ? " · " + esc(g.props) : ""} · ${esc(g.value)}</small></span><span class="btn ghost sm">${icon("plus")}</span></button>`;
      }).join("") || `<p class="empty">Ничего не нашлось</p>`;
    };
    draw("");
    m.body.querySelector("[data-q]").addEventListener("input", e => draw(e.target.value));
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-g]");
      if (!b) return;
      const g = GEAR[Number(b.dataset.g)];
      const it = gearToItem(g, uid);
      if (g.kind === "weapon") it.atkProf = g.group.startsWith("Простое") ? /прост/.test(prof) : /воинск/.test(prof) || prof.includes(g.name.toLowerCase());
      const ok = X.mutate(c => {
        c.items.push(it);
        c.items = normalize(c).items;
      });
      if (ok !== false) toast(`${icon("check")} «${esc(g.name)}» в снаряжении. Надень, чтобы он считался в бою и в КД.`, { kind: "good", timeout: 3200 });
    });
  }

  async function openLibrary(item) {
    if (X.readOnly()) return toast(`${icon("eye")} ${esc(X.roText())}`, { kind: "bad" });
    const { openSpellLibrary } = await import("./library.js");
    return openSpellLibrary({
      item,
      get: () => ({ c: S.c, d: S.d }),
      onAdd: sp => X.mutate(ch => {
        ch.spells.push(sp);
        ch.spells = normalize(ch).spells;
      })
    });
  }

  Object.assign(X, { spellReady, resetUses, spendSlot, availableSlotLevels, pactLeft, castFromItem, castSpell, useEntity, moveSpellToItem, gearTable, openLibrary });
}
