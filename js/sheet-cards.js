import { normalize, fmt, spellCast, usesInfo, addDice, swapType, effectDamage, weaponStats, asWeapon, uid } from "./rules.js";
import { icon, PORTRAIT_PLACEHOLDER } from "./icons.js";
import { esc, $, toast, openModal, openForm, getPath, setPath, cropImage, pickFile } from "./ui.js";
import { SECTION_NAME, linkTargets } from "./notes.js";
import { itemIcon, cardFor, findEntity, openEditor, noteFields, infoFields, armorFields, LIST_KEY, EDITORS, itemSpellInfo, spellAtk, chargeWord } from "./entities.js";
import { addHistory } from "./store.js";
import { PACKS, packItems, packWeight, COMPONENT_POUCH_NOTE } from "./packs.js";
import { lastSnapshot, clone } from "./sheet-util.js";
export function installCards(X) {
  const { S, id } = X;

  function entityButtons(kind, e) {
    const { d } = S;
    const b = [];
    if (X.readOnly()) {
      if (kind === "spell") {
        if (e.attack) b.push(`<button class="btn" data-x="spell-atk">${icon("d20")}Атака ${fmt(d.spell.atk)}</button>`);
        if ((e.damage || []).length) b.push(`<button class="btn" data-x="spell-dmg">${icon("force")}Бросить кубы</button>`);
      }
      if ((kind === "feature" || kind === "item") && (e.damage || []).length) b.push(`<button class="btn" data-x="${kind === "item" ? "item-dmg" : "feat-dmg"}">${icon("d20")}Бросить кубы</button>`);
      if (kind === "attack") {
        const s = d.attacks[e.id];
        if (s.kind === "attack") b.push(`<button class="btn gold" data-x="atk">${icon("d20")}Атака ${fmt(s.hit)}${s.beams > 1 ? ` ×${s.beams}` : ""}</button>`);
        b.push(`<button class="btn" data-x="dmg">${icon("swords")}Урон</button>`);
        b.push(`<button class="btn ghost" data-x="crit">Крит</button>`);
      }
      return b.join("");
    }
    if (kind === "spell" && e.cost === "item") {
      const info = itemSpellInfo(S.c, d, e);
      if (!info || !info.uses) b.push(`<button class="btn" disabled>Не выбран предмет с зарядами</button>`);
      else if (info.left < info.min) b.push(`<button class="btn" disabled>Не хватает зарядов (${info.left})</button>`);
      else for (let n = info.min; n <= Math.min(info.max, info.left); n++) b.push(`<button class="btn gold" data-x="cast" data-lvl="${n}">${icon("wand")}${n} ${chargeWord(n)}</button>`);
    }
    if (kind === "spell" && e.cost !== "item") {
      const lvl = Number(e.level) || 0;
      if (lvl > 0 || e.concentration) {
        if (lvl > 0 && e.cost === "slot" && d.pact) {
          if (lvl > d.pact.level) b.push(`<button class="btn" disabled>Нужна ячейка ${lvl} круга</button>`);
          else if (!X.pactLeft()) b.push(`<button class="btn" disabled>Нет ячеек договора</button>`);
          else b.push(`<button class="btn gold" data-x="cast">${icon("sparkle")}Сотворить</button>`);
        } else if (lvl > 0 && e.cost === "slot") {
          const av = X.availableSlotLevels(lvl);
          av.forEach(l => b.push(`<button class="btn gold" data-x="cast" data-lvl="${l}">${icon("sparkle")}Сотворить (${l} круг)</button>`));
          if (!av.length) b.push(`<button class="btn" disabled>Нет ячеек</button>`);
        } else if (e.cost === "uses" && usesInfo(d, e) && usesInfo(d, e).left <= 0) {
          b.push(`<button class="btn" disabled>Использования закончились</button>`);
        } else {
          b.push(`<button class="btn gold" data-x="cast">${icon("sparkle")}Сотворить</button>`);
        }
      }
      if (e.cost === "uses" && usesInfo(d, e)) b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть использование</button>`);
    }
    if (kind === "spell") {
      if (e.attack) b.push(`<button class="btn" data-x="spell-atk">${icon("d20")}Атака ${fmt(spellAtk(d, e))}</button>`);
      if (e.cost === "item") b.push(`<button class="btn ghost" data-x="to-own">${icon("book")}В мои заклинания</button>`);
      else if (S.c.items.some(it => usesInfo(d, it))) b.push(`<button class="btn ghost" data-x="to-item">${icon("wand")}В предмет</button>`);
      if ((e.damage || []).length) {
        const lv = S.lastCast[e.id];
        const ex = e.cost === "item" ? S.lastExtra[e.id] || 0 : 0;
        b.push(`<button class="btn" data-x="spell-dmg">${icon("force")}Бросить кубы${ex ? ` (+${ex} ${chargeWord(ex)})` : lv && lv !== Number(e.level) && e.cost !== "item" ? ` (${lv} круг)` : ""}</button>`);
        if (e.attack) b.push(`<button class="btn ghost" data-x="spell-crit">Крит</button>`);
      }
    }
    if (kind === "feature") {
      const u = usesInfo(d, e);
      if (u || e.slot === "pact") b.push(`<button class="btn gold" data-x="use">${icon("check")}Использовать</button>`);
      if (u) b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть</button>`);
      if ((e.damage || []).length) b.push(`<button class="btn" data-x="feat-dmg">${icon("d20")}Бросить кубы</button>`);
    }
    if (kind === "item") {
      const u = usesInfo(d, e);
      if (u) {
        b.push(`<button class="btn gold" data-x="use">${icon("check")}Использовать</button>`);
        b.push(`<button class="btn ghost" data-x="restore">${icon("history")}Вернуть</button>`);
      }
      const w = asWeapon(e) ? weaponStats(S.c, d, asWeapon(e)) : null;
      if (w) {
        b.push(`<button class="btn gold" data-x="w-atk">${icon("d20")}Атака ${fmt(w.hit)}</button>`);
        b.push(`<button class="btn" data-x="w-dmg">${icon("swords")}Урон</button>`);
        b.push(`<button class="btn ghost" data-x="w-crit">Крит</button>`);
      } else if ((e.damage || []).length) b.push(`<button class="btn" data-x="item-dmg">${icon("d20")}Бросить кубы</button>`);
      S.c.spells.filter(sp => sp.cost === "item" && sp.itemId === e.id).forEach(sp => b.push(`<button class="btn" data-x="open-spell" data-sid="${esc(sp.id)}">${icon("sparkle")}${esc(sp.name)}</button>`));
      if (u) b.push(`<button class="btn ghost" data-x="item-add-spell">${icon("plus")}Добавить заклинание</button>`);
      b.push(`<button class="btn" data-x="equip">${e.equipped ? "Снять" : "Экипировать"}</button>`);
      if (e.requiresAttunement) b.push(`<button class="btn" data-x="attune">${e.attuned ? "Снять настройку" : "Настроиться"}</button>`);
      if (S.c.items.some(x => x.isContainer && x.id !== e.id)) b.push(`<button class="btn ghost" data-x="move">${icon("bag")}${e.container ? `В «${esc((S.c.items.find(x => x.id === e.container) || {}).name || "контейнер")}»` : "Переложить"}</button>`);
      if (e.isContainer && !X.readOnly()) b.push(/компонент/i.test(e.name || "") ? `<button class="btn ghost" data-x="pouch-info">${icon("info")}Что внутри</button>` : `<button class="btn ghost" data-x="pack">${icon("download")}Сложить набор</button>`);
      if (e.isContainer) b.push(`<button class="btn ghost" data-x="stored">${icon(e.stored ? "bag" : "door")}${e.stored ? "Взять с собой" : "Оставить (не нести)"}</button>`);
      if (!X.readOnly()) {
        const inner = innerIds(S.c, e.id).length;
        if (inner) b.push(`<button class="btn ghost" data-x="empty">${icon("trash")}Выбросить содержимое (${inner})</button>`);
        b.push(`<button class="btn ghost drop-btn" data-x="drop" title="Выбросить предмет">${icon("trash")}Выбросить</button>`);
      }
      b.push(`<span class="qty-ctl"><button class="icon-btn" data-x="qty-" title="Меньше">${icon("minus")}</button><b>${esc(e.qty)}</b><button class="icon-btn" data-x="qty+" title="Больше">${icon("plus")}</button></span>`);
    }
    if (kind === "attack") {
      const s = d.attacks[e.id];
      if (s.kind === "attack") b.push(`<button class="btn gold" data-x="atk">${icon("d20")}Атака ${fmt(s.hit)}${s.beams > 1 ? ` ×${s.beams}` : ""}</button>`);
      b.push(`<button class="btn" data-x="dmg">${icon("swords")}Урон</button>`);
      b.push(`<button class="btn ghost" data-x="crit">Крит</button>`);
    }
    b.push(`<span class="spacer"></span><button class="btn ghost" data-x="edit">${icon("edit")}Изменить</button>`);
    return b.join("");
  }

  function entityBody(ref) {
    const [kind, eid] = ref.split(":");
    const e = findEntity(S.c, kind, eid);
    if (!e) return null;
    return `${cardFor(S.c, S.d, ref, { slotLevel: kind === "spell" ? S.lastCast[eid] : null, extra: kind === "spell" ? S.lastExtra[eid] || 0 : 0 })}<div class="entity-actions">${entityButtons(kind, e)}</div>`;
  }

  function refreshEntityModal() {
    const html = entityBody(S.openRef);
    if (!html) {
      S.openModalApi.close();
      return;
    }
    S.openModalApi.body.innerHTML = html;
  }

  function openEntity(ref) {
    const html = entityBody(ref);
    if (!html) return;
    const [kind, eid] = ref.split(":");
    const m = openModal({
      body: html,
      cls: "entity",
      onClose: () => {
        if (S.openModalApi === m) {
          S.openRef = null;
          S.openModalApi = null;
        }
      }
    });
    S.openRef = ref;
    S.openModalApi = m;
    m.body.addEventListener("click", ev => {
      const btn = ev.target.closest("[data-x]");
      if (!btn || S.disposed) return;
      const e = findEntity(S.c, kind, eid);
      if (!e) return;
      const x = btn.dataset.x;
      if (x === "edit") {
        m.close();
        return editEntity(kind, e);
      }
      if (x === "cast") return X.withUndo(`Каст: ${e.name}`, () => X.castSpell(e, Number(btn.dataset.lvl) || null));
      if (x === "spell-atk") return X.d20(`${e.name}: атака`, spellAtk(S.d, e), "attack");
      if (x === "to-item") {
        m.close();
        return X.moveSpellToItem(e);
      }
      if (x === "to-own") return X.mutate(c => {
        const sp = findEntity(c, "spell", eid);
        if (sp) Object.assign(sp, { cost: Number(sp.level) > 0 ? "slot" : "free", itemId: "" });
      });
      if (x === "item-add-spell") {
        m.close();
        return X.openLibrary(e);
      }
      if (x === "open-spell") {
        m.close();
        return openEntity("spell:" + btn.dataset.sid);
      }
      if (x === "spell-dmg" || x === "spell-crit") {
        const cast = spellCast(S.c, S.d, e, S.lastCast[e.id] || null, e.cost === "item" ? S.lastExtra[e.id] || 0 : 0);
        const lines = [];
        const extra = e.attack ? effectDamage(S.c, { weapon: false }) : [];
        for (let i = 0; i < cast.beams; i++) {
          lines.push(...cast.lines);
          extra.forEach(x => lines.push({ dice: x.dice, type: x.type || (cast.lines[0] || {}).type || "force", tag: x.name }));
        }
        return X.rollDamage(`${e.name}${cast.level && cast.level !== Number(e.level) ? ` (${cast.level} круг)` : ""}`, lines, x === "spell-crit");
      }
      if (x === "use") return X.withUndo(`Использовано: ${e.name}`, () => X.useEntity(kind, e, 1));
      if (x === "restore") return X.withUndo(`Возвращено: ${e.name}`, () => X.useEntity(kind, e, -1));
      if (x === "feat-dmg" || x === "item-dmg") {
        const lines = (e.damage || []).map(l => ({ dice: l.addMod ? addDice(l.dice, S.d.spell.mod) : l.dice, type: swapType(S.c, l.type) }));
        return X.rollDamage(e.name, lines);
      }
      if (x === "move") {
        m.close();
        return X.moveItem(eid);
      }
      if (x === "drop") {
        const inner = innerIds(S.c, eid);
        if (inner.length) return dropDialog(e, inner, m);
        m.close();
        return X.withUndo(`Выброшено: ${e.name}`, () => X.mutate(c => { c.items = c.items.filter(it => it.id !== eid); }));
      }
      if (x === "empty") {
        const inner = new Set(innerIds(S.c, eid));
        m.close();
        return X.withUndo(`Выброшено содержимое: ${e.name}`, () => X.mutate(c => { c.items = c.items.filter(it => !inner.has(it.id)); }));
      }
      if (x === "pouch-info") return openModal({ title: e.name || "Мешочек с компонентами", cls: "small", body: `<p>${esc(COMPONENT_POUCH_NOTE)}</p>` });
      if (x === "pack") return packDialog(e, m);
      if (x === "stored") return X.mutate(c => { const it = findEntity(c, "item", eid); if (it) it.stored = !it.stored; });
      if (x === "equip") return X.withUndo(e.equipped ? `Снято: ${e.name}` : `Надето: ${e.name}`, () => X.mutate(c => { const it = findEntity(c, "item", eid); if (it) it.equipped = !it.equipped; }));
      if (x === "attune") {
        if (!e.attuned && S.d.attuned >= 3) return toast("Уже настроено 3 предмета: это максимум", { kind: "bad" });
        return X.mutate(c => { const it = findEntity(c, "item", eid); if (it) it.attuned = !it.attuned; });
      }
      if (x === "qty-" || x === "qty+") return X.mutate(c => { const it = findEntity(c, "item", eid); if (it) it.qty = Math.max(0, (Number(it.qty) || 0) + (x === "qty+" ? 1 : -1)); });
      if (x === "w-atk") return X.doRoll("iattack:" + eid);
      if (x === "w-dmg") return X.doRoll("idmg:" + eid);
      if (x === "w-crit") return X.doRoll("icrit:" + eid);
      if (x === "atk") return X.doRoll("attack:" + eid);
      if (x === "dmg") return X.doRoll("dmg:" + eid);
      if (x === "crit") return X.doRoll("crit:" + eid);
    });
  }

  function changedKeys(before, after) {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    return [...keys].filter(k => JSON.stringify(before ? before[k] : undefined) !== JSON.stringify(after ? after[k] : undefined));
  }

  function editEntity(kind, e, makeArg) {
    const key = LIST_KEY[kind];
    const initial = e ? clone(e) : null;
    openEditor(kind, e, {
      makeArg,
      items: S.c.items,
      onSave: val => {
        if (!String(val.name || "").trim()) {
          toast("Нужно название", { kind: "bad" });
          return false;
        }
        if (kind === "item") {
          if (!val.requiresAttunement) val.attuned = false;
          if (val.attuned && !(e && e.attuned) && S.d.attuned >= 3) {
            toast("Уже настроено 3 предмета: это максимум", { kind: "bad" });
            return false;
          }
        }
        X.mutate(c => {
          const list = c[key];
          const i = list.findIndex(x => x.id === val.id);
          if (i >= 0 && initial) {
            const next = { ...list[i] };
            for (const k of changedKeys(initial, val)) next[k] = clone(val[k] === undefined ? null : val[k]);
            list[i] = next;
          } else if (i >= 0) list[i] = val;
          else list.push(val);
          const n = normalize(c);
          c[key] = n[key];
        });
      },
      onDelete: () => X.mutate(c => { c[key] = c[key].filter(x => x.id !== e.id); })
    });
  }

  function editNote(section, n, preset = {}) {
    const value = n || { ...EDITORS.note.make(), tags: S.ui.noteTag || "", ...preset };
    const initial = clone(value);
    openForm({
      title: n ? `Изменить: ${SECTION_NAME[section] || "запись"}` : `Новая запись: ${SECTION_NAME[section] || "заметки"}`,
      fields: noteFields(section, () => linkTargets(S.c)),
      value,
      onSave: val => X.mutate(c => {
        const list = c.notes[section];
        const i = list.findIndex(x => x.id === val.id);
        if (i >= 0) {
          const next = { ...list[i] };
          for (const k of changedKeys(initial, val)) next[k] = val[k];
          list[i] = next;
        } else list.unshift(val);
      }),
      onDelete: n ? () => X.mutate(c => { c.notes[section] = c.notes[section].filter(x => x.id !== n.id); }) : null
    });
  }

  function editInfo() {
    const fields = infoFields().filter(f => f.type !== "heading");
    const initial = clone(S.c);
    openForm({
      title: "Основное",
      fields: infoFields(),
      value: S.c,
      onSave: val => {
        X.mutate(c => {
          for (const f of fields) {
            const v = getPath(val, f.key);
            if (JSON.stringify(v) !== JSON.stringify(getPath(initial, f.key))) setPath(c, f.key, v);
          }
          if (!String(c.name || "").trim()) c.name = "Без имени";
          const n = normalize(c);
          for (const k of ["info", "hp", "speed", "initBonus", "hitDie", "casterType", "spellAbility", "damageSwap", "defenses", "resistances", "accent"]) c[k] = n[k];
          X.clampHp(c);
        }, { render: false });
        X.renderAll(true);
      }
    });
  }

  function editArmor() {
    const initial = clone(S.c.armor);
    openForm({
      title: "Класс доспеха",
      fields: armorFields(),
      value: S.c,
      onSave: val => X.mutate(c => {
        for (const k of changedKeys(initial, val.armor)) c.armor[k] = val.armor[k];
        c.armor = normalize(c).armor;
      })
    });
  }

  function portraitDialog() {
    const m = openModal({
      title: "Портрет",
      cls: "small",
      body: `<div class="portrait-big">${S.c.portrait ? `<img src="${esc(S.c.portrait)}" alt="">` : PORTRAIT_PLACEHOLDER}</div>
        <div class="form-actions">${S.c.portrait ? `<button class="btn danger" data-rm>${icon("trash")}Убрать</button><span class="spacer"></span><button class="btn" data-crop>${icon("target")}Изменить кадр</button>` : `<span class="spacer"></span>`}<button class="btn gold" data-up>${icon("upload")}Загрузить картинку</button></div>
        <p class="hint">После выбора картинки можно подвинуть и приблизить нужную часть. Портрет сохранится вместе с персонажем.</p>`
    });
    const apply = data => {
      if (!data || S.disposed) return;
      X.mutate(c => { c.portrait = data; }, { render: false });
      m.close();
      X.renderAll(true);
    };
    m.body.querySelector("[data-up]").onclick = async () => {
      const f = await pickFile("image/*");
      if (!f) return;
      try {
        apply(await cropImage(f));
      } catch {
        toast("Не получилось прочитать картинку", { kind: "bad" });
      }
    };
    const crop = m.body.querySelector("[data-crop]");
    if (crop) crop.onclick = async () => {
      try {
        apply(await cropImage(S.c.portrait));
      } catch {
        toast("Не получилось открыть картинку", { kind: "bad" });
      }
    };
    const rm = m.body.querySelector("[data-rm]");
    if (rm) rm.onclick = () => {
      X.mutate(c => { c.portrait = ""; }, { render: false });
      m.close();
      X.renderAll(true);
    };
  }

  function replaceWith(data, reason) {
    if (X.readOnly()) return;
    data = { ...data, ownerUid: S.c.ownerUid, ownerName: S.c.ownerName };
    addHistory(id, clone(S.c), reason);
    lastSnapshot.set(id, Date.now());
    const portrait = S.c.portrait;
    const next = normalize(data);
    if (!next.portrait && portrait && !("portrait" in data)) next.portrait = portrait;
    next.id = id;
    S.c = next;
    X.changed({ render: false });
    X.renderAll(true);
  }

  function moveItem(itemId) {
    const it = findEntity(S.c, "item", itemId);
    if (!it) return;
    const inside = id => {
      let cur = S.c.items.find(x => x.id === id);
      const seen = new Set();
      while (cur && !seen.has(cur.id)) {
        if (cur.id === it.id) return true;
        seen.add(cur.id);
        cur = S.c.items.find(x => x.id === cur.container);
      }
      return false;
    };
    const targets = S.c.items.filter(x => x.isContainer && x.id !== it.id && !inside(x.id));
    const m = openModal({
      title: `Куда положить «${it.name}»`,
      cls: "small",
      body: `<div class="menu-list"><button class="menu-item ${!it.container ? "on" : ""}" data-to="">${icon("user")}<span><b>При себе</b><small>в руках, на поясе, надето</small></span></button>${targets.map(x => `<button class="menu-item ${it.container === x.id ? "on" : ""}" data-to="${esc(x.id)}">${icon(itemIcon(x))}<span><b>${esc(x.name)}</b><small>${x.stored ? "не при мне" : x.weightless ? "вес внутри не считается" : Number(x.capacity) ? `вмещает ${x.capacity} фнт` : "контейнер"}</small></span></button>`).join("")}</div>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-to]");
      if (!b) return;
      m.close();
      const to = b.dataset.to;
      X.withUndo(`Переложено: ${it.name}`, () => X.mutate(c => {
        const x = findEntity(c, "item", itemId);
        if (x) {
          x.container = to;
          if (to) x.equipped = false;
        }
      }));
    });
  }

  function innerIds(c, boxId) {
    const out = [];
    const walk = id => (c.items || []).filter(it => it.container === id && !out.includes(it.id)).forEach(it => {
      out.push(it.id);
      walk(it.id);
    });
    walk(boxId);
    return out;
  }

  function dropDialog(box, inner, card) {
    const m = openModal({
      title: `Выбросить «${box.name || "контейнер"}»?`,
      cls: "small",
      body: `<p>Внутри ${inner.length} ${inner.length === 1 ? "вещь" : inner.length < 5 ? "вещи" : "вещей"}. Что сделать с ними?</p><div class="form-actions drop-actions"><button class="btn ghost" data-drop="spill">${icon("download")}Высыпать и выбросить только «${esc(box.name)}»</button><button class="btn danger" data-drop="all">${icon("trash")}Выбросить вместе с вещами</button></div>`
    });
    m.body.addEventListener("click", ev => {
      const b = ev.target.closest("[data-drop]");
      if (!b) return;
      const all = b.dataset.drop === "all";
      const gone = new Set(all ? [box.id, ...inner] : [box.id]);
      m.close();
      if (card) card.close();
      X.withUndo(all ? `Выброшено с вещами: ${box.name}` : `Выброшено: ${box.name}`, () => X.mutate(c => {
        const self = c.items.find(it => it.id === box.id);
        const parent = (self && self.container) || "";
        c.items = c.items.filter(it => !gone.has(it.id)).map(it => (it.container === box.id ? { ...it, container: parent } : it));
      }));
    });
  }

  function packDialog(box, card) {
    const m = openModal({
      title: `Сложить в «${box.name || "контейнер"}»`,
      cls: "small",
      body: `<p class="hint">Стандартные наборы из книги игрока. Вещи с весом и ценой лягут внутрь, потом их можно править или выбросить. Деньги не списываются: стартовый набор уже оплачен. Спальник, одеяло и верёвку по традиции привязывают снаружи, они лягут рядом, «при себе».</p><div class="pack-list">${PACKS.map(p => `<button class="pack-row" data-pack="${esc(p.key)}"><span><b>${esc(p.name)}</b><small>${esc(p.note)}</small><small class="pack-items">${esc(p.items.map(x => (x.qty > 1 ? `${x.name} × ${x.qty}` : x.name)).join(", "))}</small></span><em>${esc(String(packWeight(p)).replace(".", ","))} фнт<br>${esc(p.value)}</em></button>`).join("")}</div>`
    });
    m.body.addEventListener("click", ev => {
      const b = ev.target.closest("[data-pack]");
      if (!b) return;
      const p = PACKS.find(x => x.key === b.dataset.pack);
      m.close();
      if (card) card.close();
      X.withUndo(`Сложен набор: ${p.name}`, () => X.mutate(c => {
        c.items.push(...packItems(p.key, box.id, uid));
      }));
      toast(`${icon("check")} ${esc(p.name)}: ${p.items.length} предметов в «${esc(box.name)}»`, { kind: "good", timeout: 2600 });
    });
  }

  Object.assign(X, { moveItem, entityButtons, entityBody, refreshEntityModal, openEntity, changedKeys, editEntity, editNote, editInfo, editArmor, portraitDialog, replaceWith });
}
