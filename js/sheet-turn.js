import { DAMAGE, fmt, usesInfo, uid, presetEffect, cleanEffect, EFFECT_PRESETS, STANDARD_ACTIONS, movementInfo, ACTIONS } from "./rules.js";
import { icon, actionMark } from "./icons.js";
import { esc, $, toast, openModal, openForm } from "./ui.js";
import { combatSources } from "./tabs.js";
import { itemIcon, spellIcon, featureIcon, attackIcon, effectFields } from "./entities.js";
import { clone } from "./sheet-util.js";
export function installTurn(X) {
  const { S, id } = X;

  function actionMenu(kind) {
    const { c, d } = S;
    const a = ACTIONS[kind];
    const used = !!S.ui.turn[kind];
    const rows = [];
    const row = (ref, ic, color, name, sub, off = false) => rows.push({ html: `<button class="am-row ${off ? "off" : ""}" data-am-open="${esc(ref)}" style="--c:${color}">${icon(ic)}<span><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>` });
    const groups = [];
    const flushGroup = title => {
      if (rows.length) groups.push(`<div class="am-group">${esc(title)}</div>${rows.splice(0).map(r => r.html).join("")}`);
    };
    if (kind === "action") {
      const src = combatSources(c, d);
      src.weapons.filter(it => (it.action || "action") === kind).forEach(it => row("item:" + it.id, itemIcon(it), "#cbbfa8", it.name, `атака ${fmt(d.weapons[it.id].hit)} · ${d.weapons[it.id].dmg}`));
      src.own.filter(at => (at.action || "action") === kind).forEach(at => {
        const st = d.attacks[at.id];
        row("attack:" + at.id, at.icon || attackIcon(at.name) || "swords", (DAMAGE[st.type] || {}).color || "#cbbfa8", at.name, st.kind === "save" ? `СЛ ${st.dc}` : `атака ${fmt(st.hit)} · ${st.dmg}`);
      });
      flushGroup("Атаки");
    }
    c.spells.filter(sp => (sp.action || "action") === kind).forEach(sp => {
      const ready = X.spellReady(sp);
      const ic = spellIcon(c, sp);
      row("spell:" + sp.id, ic.icon, ic.color, sp.name, [Number(sp.level) ? `${sp.level} круг` : "заговор", ready === false ? "нечем заплатить" : ready].filter(Boolean).join(" · "), ready === false);
    });
    flushGroup("Заклинания");
    c.features.filter(f => f.action === kind).forEach(f => {
      const u = usesInfo(d, f);
      row("feature:" + f.id, featureIcon(f), "#c9a0ff", f.name, u ? `${u.left}/${u.max}` : f.effect || "", !!u && u.left <= 0);
    });
    c.items.filter(it => it.action === kind && !(kind === "action" && d.weapons[it.id])).forEach(it => {
      const u = usesInfo(d, it);
      row("item:" + it.id, itemIcon(it), "#4fcf6a", it.name, u ? `${u.left}/${u.max}` : "", !!u && u.left <= 0);
    });
    flushGroup(kind === "action" ? "Умения и предметы" : "Твоё");
    const mine = groups.length;
    const std = (STANDARD_ACTIONS[kind] || []).map(x => `<button class="am-row std" data-am-std="${x.key}" style="--c:${a.color}">${icon(x.icon)}<span><b>${esc(x.name)}${x.roll ? ` <i class="am-roll">${icon("d20")}</i>` : ""}</b><small>${esc(x.desc)}</small></span></button>`).join("");
    const empty = kind === "bonus" && !mine ? `<p class="am-empty">${icon("info")}Своих бонусных действий сейчас нет. Их дают только заклинания, умения или класс.</p>` : "";
    const hint = kind === "bonus" ? `<p class="hint am-hint">В BG3 прыжок и толчок бонусные действия. По настольным правилам прыжок входит в движение, а толчок заменяет атаку.</p>` : "";
    const m = openModal({
      title: a.name,
      cls: "action-menu",
      body: `<div class="am-head" style="--c:${a.color}"><span class="am-state ${used ? "used" : ""}">${actionMark(a.shape, a.color)}${used ? "Уже потрачено в этом ходу" : "Доступно в этом ходу"}</span><button class="btn sm ${used ? "gold" : "ghost"}" data-am-toggle>${used ? "Вернуть" : "Отметить потраченным"}</button></div>${empty}${groups.join("")}${std ? `<div class="am-group">Общие действия</div>${std}` : ""}${hint}`
    });
    m.body.addEventListener("click", e => {
      if (e.target.closest("[data-am-toggle]")) {
        S.ui.turn[kind] = !S.ui.turn[kind];
        X.saveTurn();
        return m.close();
      }
      const op = e.target.closest("[data-am-open]");
      if (op) {
        m.close();
        return X.openEntity(op.dataset.amOpen);
      }
      const st = e.target.closest("[data-am-std]");
      if (!st) return;
      const x = (STANDARD_ACTIONS[kind] || []).find(y => y.key === st.dataset.amStd);
      m.close();
      if (!x) return;
      X.markAction(kind);
      if (x.roll) return X.doRoll(x.roll);
      if (x.effect && !X.readOnly()) return addEffect(presetEffect(x.effect));
      if (x.key === "dash") return toast(`${icon("boot")} Рывок: ещё ${d.speed} фт перемещения в этом ходу`, { kind: "good" });
      toast(`${icon("check")} ${esc(x.name)}`, { timeout: 2000 });
    });
  }

  function movementMenu() {
    const info = movementInfo(S.c, S.d);
    openModal({
      title: `Движение · ${S.d.speed} фт`,
      cls: "action-menu",
      body: `${info.map(x => `<div class="am-row static" style="--c:#c9b48a">${icon(x.name.startsWith("Прыжок") ? "wings" : x.name === "Рывок" ? "bolt" : "boot")}<span><b>${esc(x.name)}: ${esc(x.value)}</b><small>${esc(x.desc)}</small></span></div>`).join("")}<p class="hint am-hint">Перемещение можно делить: пройти часть, ударить, пройти остаток. Трудная местность стоит вдвое.</p>`
    });
  }

  function addEffect(ef) {
    if (!ef) return;
    X.mutate(c => {
      c.effects = [...(c.effects || []).filter(x => !(ef.preset && x.preset === ef.preset)), ef];
    });
    toast(`${icon("sparkle")} Эффект «${esc(ef.name)}» добавлен`, { kind: "good", timeout: 2400 });
  }

  function effectPicker() {
    const m = openModal({
      title: "Добавить эффект",
      cls: "small",
      body: `<div class="menu-list">${Object.entries(EFFECT_PRESETS).map(([k, p]) => `<button class="menu-item eff-pick" data-pre="${k}">${icon("sparkle")}<span><b>${esc(p.name)}</b><small>${esc(p.note || "")}</small></span></button>`).join("")}<button class="menu-item eff-pick" data-pre="">${icon("edit")}<span><b>Свой эффект</b><small>Любые бонусы, помехи и длительность</small></span></button></div>`
    });
    m.body.addEventListener("click", e => {
      const b = e.target.closest("[data-pre]");
      if (!b) return;
      m.close();
      if (!b.dataset.pre) return editEffect(null);
      addEffect(presetEffect(b.dataset.pre));
    });
  }

  function editEffect(ef) {
    const value = ef ? clone(ef) : cleanEffect({ id: "ef-" + uid(), name: "", rounds: 10 });
    openForm({
      title: ef ? "Изменить эффект" : "Свой эффект",
      fields: effectFields(),
      value,
      onSave: val => {
        if (!String(val.name || "").trim()) {
          toast("Нужно название", { kind: "bad" });
          return false;
        }
        const clean = cleanEffect({ ...val, id: value.id, concName: val.mine ? value.concName || S.c.concentration : "" });
        X.mutate(c => {
          const list = c.effects || [];
          const i = list.findIndex(x => x.id === clean.id);
          if (i >= 0) list[i] = clean;
          else list.push(clean);
          c.effects = list;
        });
      },
      onDelete: ef ? () => X.mutate(c => { c.effects = c.effects.filter(x => x.id !== ef.id); }) : null
    });
  }

  function offerEffect(sp) {
    const key = Object.keys(EFFECT_PRESETS).find(k => EFFECT_PRESETS[k].name.toLowerCase() === String(sp.name || "").trim().toLowerCase());
    if (!key) return;
    const mine = !!sp.concentration;
    if (["hex", "huntersMark", "shield"].includes(key)) return addEffect(presetEffect(key, { mine, concName: mine ? sp.name : "" }));
    toast(`${icon("sparkle")} «${esc(sp.name)}» на тебе? <button class="btn sm" data-add-effect="${key}" data-mine="${mine ? 1 : 0}" data-conc="${esc(sp.name)}">Добавить эффект себе</button>`, { timeout: 8000 });
  }

  Object.assign(X, { actionMenu, movementMenu, addEffect, effectPicker, editEffect, offerEffect });
}
