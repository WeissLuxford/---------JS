import { SKILLS, DAMAGE, DAMAGE_TYPES, fmt, rollD20, rollDice, spellCast, maxDie, rollContext, resolveMode, rollReasons, applyDefenses, effectDamage, weaponStats, asWeapon, ammoFor } from "./rules.js";
import { icon } from "./icons.js";
import { esc, $, toast, promptNumber, showD20, showBeams, showDamage, landDice, playSound } from "./ui.js";
import { turnBar } from "./tabs.js";
import { findEntity, spellAtk } from "./entities.js";
import { abName } from "./sheet-util.js";
import { throw3d, dice3dReady, dice3dBusy } from "./dice3d.js";
export function installRolls(X) {
  const { S, root, id } = X;

  function rollSetup(kind, ability, manual) {
    const ctx = rollContext(S.c, kind, ability);
    return { mode: resolveMode(manual, ctx), why: rollReasons(manual, ctx), fail: ctx.autoFail, bonus: ctx.bonus };
  }

  function addBonus(r, st, skipOnce = false) {
    const parts = st.bonus.filter(b => !(skipOnce && b.once)).map(b => {
      const x = rollDice(b.expr);
      return { ...b, value: x ? x.total : 0 };
    });
    r.total += parts.reduce((sum, p) => sum + p.value, 0);
    return parts;
  }

  function bonusLines(list) {
    const by = new Map();
    for (const p of list) {
      const cur = by.get(p.name) || { expr: p.expr, values: [] };
      cur.values.push(p.value);
      by.set(p.name, cur);
    }
    return [...by].map(([name, v]) => `${name}: ${v.values.map(x => (x < 0 ? "−" : "+") + Math.abs(x)).join(", ")} (${v.expr.replace(/^-/, "−")})`);
  }

  function consumeOnce(st) {
    const ids = st.bonus.filter(b => b.once).map(b => b.id);
    if (!ids.length || X.readOnly()) return;
    const names = st.bonus.filter(b => b.once).map(b => b.name);
    X.mutate(c => { c.effects = c.effects.filter(e => !ids.includes(e.id)); });
    toast(`${icon("sparkle")} Потрачено: ${esc([...new Set(names)].join(", "))}`, { timeout: 2200 });
  }

  const twoDice = mode => mode === "adv" || mode === "dis";
  const roll3d = n => (dice3dReady() ? throw3d(n) : null);
  const dropped = (r, mode) => (r.b == null ? -1 : mode === "adv" ? (r.a >= r.b ? 1 : 0) : r.a <= r.b ? 1 : 0);
  const landD20 = (r, mode, text = String(r.total), special = "attack") => landDice({ text, kind: !special ? "" : r.nat20 ? "crit" : r.nat1 ? "fumble" : "", discard: dropped(r, mode) });

  const trackD20 = (r, mode, tag) => X.track("d20", { pick: r.pick, a: r.a, b: r.b, mode, total: r.total, kind: tag });

  async function d20(label, modifier, kind, ability, extra, tag = kind) {
    if (dice3dBusy()) return null;
    const st = rollSetup(kind, ability, X.takeMode());
    const pending = roll3d(twoDice(st.mode) ? 2 : 1);
    const preset = pending ? await pending : null;
    if (S.disposed) return null;
    const r = rollD20(modifier, st.mode, preset || []);
    const parts = addBonus(r, st);
    const special = kind === "attack" ? "attack" : "";
    if (preset) landD20(r, st.mode, st.fail ? "✕" : String(r.total), special);
    showD20(label, modifier, r, st.mode, { why: [...bonusLines(parts), ...st.why], fail: st.fail, extra: typeof extra === "function" ? extra(r) : extra || "", landed: !!preset, special });
    consumeOnce(st);
    trackD20(r, st.mode, tag);
    return r;
  }

  function saveTurn() {
    try {
      localStorage.setItem("dnd.turn." + id, JSON.stringify(S.ui.turn));
    } catch {}
    const bar = $("[data-turn]", root);
    if (bar) bar.outerHTML = turnBar({ ui: S.ui });
  }

  function markAction(kind) {
    if (!["action", "bonus", "reaction"].includes(kind) || S.ui.turn[kind]) return;
    S.ui.turn[kind] = true;
    saveTurn();
  }

  function spendAmmo(holder, n = 1) {
    if (X.readOnly()) return;
    const a = ammoFor(S.c, holder);
    if (!a) return;
    const qty = Number(a.qty) || 0;
    if (qty <= 0) return toast(`${icon("arrow")} «${esc(a.name)}» закончились`, { kind: "bad" });
    const take = Math.min(qty, n);
    X.mutate(c => {
      const it = findEntity(c, "item", a.id);
      if (it) it.qty = Math.max(0, (Number(it.qty) || 0) - take);
    }, { render: false });
    S.ui.ammoSpent[a.id] = (S.ui.ammoSpent[a.id] || 0) + take;
    saveAmmo();
    X.renderTab();
    if (qty - take <= 3) toast(`${icon("arrow")} «${esc(a.name)}»: осталось ${qty - take}`, { kind: "info", timeout: 2500 });
  }

  function saveAmmo() {
    try {
      localStorage.setItem("dnd.ammo." + id, JSON.stringify(S.ui.ammoSpent));
    } catch {}
  }

  function giveTemp(n, force = false) {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    if (!v || X.readOnly()) return;
    const cur = Number(S.c.hp.temp) || 0;
    if (!force && cur >= v) {
      toast(`${icon("shield")} Временных хитов уже ${cur}, это не меньше нового броска (${v}). Оставил ${cur}: они не складываются. <button class="btn sm" data-temp-force="${v}">Заменить на ${v}</button>`, { kind: "info", timeout: 9000 });
      return;
    }
    X.mutate(c => { c.hp.temp = v; }, { render: false });
    X.renderTab();
    toast(`${icon("shield")} Временные хиты: ${v}${cur ? ` (были ${cur}, не складываются)` : ""}`, { kind: "good", timeout: 3500 });
  }

  function castTemp(sp, level) {
    if (/agathys|агатис/i.test(`${sp.nameEn || ""} ${sp.name || ""}`)) return giveTemp(5 * Math.max(1, level));
    const cast = spellCast(S.c, S.d, sp, level || null);
    const lines = cast.lines.filter(l => l.type === "temp");
    if (!lines.length) return;
    const total = lines.reduce((sum, l) => sum + ((rollDice(l.dice) || {}).total || 0), 0);
    giveTemp(total);
  }

  function rollDamage(label, lines, crit = false) {
    const res = showDamage(label, lines, crit, {
      after: bt => (bt.healing && !X.readOnly() ? `<button class="btn sm heal" data-heal-self="${bt.healing}">${icon("heart")}Вылечить себя на ${bt.healing}</button>` : "")
    });
    const done = r => {
      if (r && r.byType.temp && !S.disposed) giveTemp(r.byType.temp);
      const dealt = r ? r.total - (r.byType.healing || 0) - (r.byType.temp || 0) : 0;
      if (dealt > 0 && !S.disposed) X.track("dmg", { dealt, crit, allMax: r.allMax });
      return r;
    };
    return res && typeof res.then === "function" ? res.then(done) : done(res);
  }

  function attackProfile(kind, id) {
    const { c, d } = S;
    if (kind === "attack") {
      const at = findEntity(c, "attack", id);
      const s = d.attacks[id];
      return at && s ? { name: at.name, hit: s.hit, beams: s.beams, lines: [{ dice: s.dmg, type: s.type }], attack: s.kind === "attack", weapon: at.ability !== "spell", ability: at.ability, action: at.action || "action" } : null;
    }
    if (kind === "item") {
      const it = findEntity(c, "item", id);
      const w = asWeapon(it) ? d.weapons[id] || weaponStats(c, d, asWeapon(it)) : null;
      return w ? { name: it.name, hit: w.hit, beams: 1, lines: w.lines, attack: true, weapon: true, ability: w.ability, action: it.action || "action" } : null;
    }
    if (kind === "spell") {
      const sp = findEntity(c, "spell", id);
      if (!sp) return null;
      const cast = spellCast(c, d, sp, S.lastCast[id] || null, sp.cost === "item" ? S.lastExtra[id] || 0 : 0);
      return { name: sp.name, hit: spellAtk(d, sp), beams: cast.beams, lines: cast.lines.map(l => ({ dice: l.dice, type: l.type })), attack: !!sp.attack, action: sp.action || "action" };
    }
    return null;
  }

  function dmgButtons(kind, aid, beams, crits, missAll) {
    if (missAll) return "";
    const b = [];
    const attr = `data-hit-dmg="${esc(aid)}" data-kind="${kind}"`;
    if (beams > 1) {
      b.push(`<span class="r-btns-l">Урон по попавшим:</span>`);
      for (let h = Math.max(1, crits); h <= beams; h++) b.push(`<button class="btn sm ${h === beams ? "gold" : ""}" ${attr} data-n="${h}" data-c="${crits}">${h}</button>`);
    } else if (crits) b.push(`<button class="btn sm gold" ${attr} data-n="1" data-c="1">Урон (крит)</button>`);
    else b.push(`<button class="btn sm" ${attr} data-n="1" data-c="0">Урон</button>`);
    return b.join("");
  }

  function profileLines(p, n, crits) {
    const extra = p.attack ? effectDamage(S.c, { weapon: p.weapon, ability: p.ability }) : [];
    const lines = [];
    for (let i = 0; i < n; i++) {
      const crit = i < crits;
      const tag = n > 1 ? `Луч ${i + 1}${crit ? " · крит" : ""}` : "";
      p.lines.forEach(l => lines.push({ dice: l.dice, type: l.type, crit, tag }));
      extra.forEach(x => lines.push({ dice: x.dice, type: x.type || (p.lines[0] || {}).type || "bludgeoning", crit, tag: (tag ? tag + " · " : "") + x.name }));
    }
    return lines;
  }

  function hitDamage(kind, aid, n, crits) {
    const p = attackProfile(kind, aid);
    if (!p) return;
    rollDamage(`${p.name}: урон${n > 1 ? ` (${n} ${n < 5 ? "луча" : "лучей"})` : ""}`, profileLines(p, n, crits), false);
  }

  async function doRoll(spec) {
    if (dice3dBusy()) return;
    const { c, d } = S;
    if (!c) return;
    const [k, a] = spec.split(":");
    if (k === "check") return d20(`Проверка: ${abName(a)}`, d.mods[a], "check", a);
    if (k === "save") return d20(`Спасбросок: ${abName(a)}`, d.saves[a], "save", a);
    if (k === "skill") {
      const s = SKILLS.find(x => x.key === a);
      return s && d20(s.name, d.skills[a], "check", s.ab, undefined, "skill");
    }
    if (k === "init") return d20("Инициатива", d.init, "check", "dex", undefined, "init");
    if (k === "spellatk") return d20("Атака заклинанием", d.spell.atk, "attack");
    const AK = { attack: "attack", iattack: "item", sattack: "spell" };
    const DK = { dmg: "attack", idmg: "item", sdmg: "spell", crit: "attack", icrit: "item" };
    if (AK[k]) {
      const p = attackProfile(AK[k], a);
      if (!p) return;
      const kind = AK[k];
      markAction(p.action);
      if (kind === "item" || kind === "attack") spendAmmo(findEntity(c, kind, a), p.beams);
      if (p.beams > 1) {
        const st = rollSetup("attack", "", X.takeMode());
        const per = twoDice(st.mode) ? 2 : 1;
        const pending = roll3d(p.beams * per);
        const preset = pending ? await pending : null;
        if (S.disposed) return;
        const rs = Array.from({ length: p.beams }, (_, i) => rollD20(p.hit, st.mode, preset ? preset.slice(i * per, i * per + per) : []));
        const parts = rs.flatMap((r, i) => addBonus(r, st, i > 0));
        const crits = rs.filter(r => r.nat20).length;
        showBeams(`${p.name}: ${p.beams} ${p.beams < 5 ? "луча" : "лучей"}`, p.hit, rs, st.mode, { why: [...bonusLines(parts), ...st.why], extra: dmgButtons(kind, a, p.beams, crits, rs.every(r => r.nat1)), landed: !!preset });
        consumeOnce(st);
        rs.forEach(r => trackD20(r, st.mode, "attack"));
        return;
      }
      return d20(`${p.name}: атака`, p.hit, "attack", "", r => dmgButtons(kind, a, 1, r.nat20 ? 1 : 0, r.nat1));
    }
    if (DK[k]) {
      const p = attackProfile(DK[k], a);
      if (!p) return;
      const crit = k === "crit" || k === "icrit";
      const n = crit ? 1 : p.beams;
      return rollDamage(`${p.name}: урон${n > 1 ? ` (${n} ${n < 5 ? "луча" : "лучей"})` : ""}`, profileLines(p, n, crit ? 1 : 0), crit);
    }
    if (k === "death") {
      if (c.hp.deathFail >= 3) return toast("Персонаж погиб: спасброски больше не нужны", { kind: "bad" });
      if (c.hp.stable || c.hp.deathSuccess >= 3) return toast("Персонаж стабилизирован", { kind: "good" });
      const st = rollSetup("death", "", X.takeMode());
      const pending = roll3d(twoDice(st.mode) ? 2 : 1);
      const preset = pending ? await pending : null;
      if (S.disposed || !S.c) return;
      const r = rollD20(0, st.mode, preset || []);
      const parts = addBonus(r, st);
      if (preset) landD20(r, st.mode, String(r.total), "death");
      showD20("Спасбросок от смерти", 0, r, st.mode, { why: [...bonusLines(parts), ...st.why], landed: !!preset, special: "death" });
      consumeOnce(st);
      trackD20(r, st.mode, "death");
      let outcome = "";
      const was = { deathSuccess: c.hp.deathSuccess, deathFail: c.hp.deathFail };
      X.mutate(ch => {
        const hp = ch.hp;
        if (r.nat20) {
          X.setHp(ch, 1);
          outcome = "up";
        } else if (r.nat1) hp.deathFail = Math.min(3, hp.deathFail + 2);
        else if (r.total >= 10) hp.deathSuccess = Math.min(3, hp.deathSuccess + 1);
        else hp.deathFail = Math.min(3, hp.deathFail + 1);
        if (!outcome && hp.deathFail >= 3) outcome = "dead";
        else if (!outcome && hp.deathSuccess >= 3) {
          hp.stable = true;
          hp.deathSuccess = 0;
          hp.deathFail = 0;
          outcome = "stable";
        }
      });
      if (outcome) X.track("death", { outcome, failBefore: was.deathFail });
      if (outcome) {
        setTimeout(() => {
          if (!S.disposed) X.deathScene(outcome);
        }, 1100);
        return;
      }
      for (const k of ["deathSuccess", "deathFail"]) X.markDeath(k, was[k], S.c.hp[k]);
      playSound(S.c.hp.deathSuccess > was.deathSuccess ? "ignite" : "skull");
    }
  }

  function typeOptions() {
    const def = S.d.defenses;
    const mark = t => (def.immune.includes(t) ? " (иммунитет)" : def.resist.includes(t) && def.vuln.includes(t) ? " (сопр. и уязв.)" : def.resist.includes(t) ? " (сопротивление)" : def.vuln.includes(t) ? " (уязвимость)" : "");
    return [["", "Без типа"], ...DAMAGE_TYPES.map(t => [t, DAMAGE[t].name + mark(t)])];
  }

  function applyHp(action, value, type = "", { crit = false } = {}) {
    const raw = Math.abs(Math.floor(Number(value) || 0));
    if (!raw && action !== "set") return;
    if ((action === "heal" || action === "temp") && (Number(S.c.hp.deathFail) || 0) >= 3) return toast(`${icon("skull")} Погибшего не вылечить обычным лечением. Если персонажа воскресили, задай хиты кнопкой «Задать».`, { kind: "bad", timeout: 6000 });
    let n = raw;
    let note = "";
    if (action === "dmg" && type) {
      const r = applyDefenses(raw, type, S.d.defenses);
      n = r.amount;
      const tn = (DAMAGE[type] || {}).name || type;
      if (r.kind === "immune") note = `${tn}: иммунитет, урон не получен`;
      else if (r.kind === "resist") note = `${tn}: сопротивление, ${raw} → ${n}`;
      else if (r.kind === "vuln") note = `${tn}: уязвимость, ${raw} → ${n}`;
      else if (r.kind === "both") note = `${tn}: сопротивление и уязвимость, ${raw} → ${n}`;
    }
    let concDc = 0;
    let concLost = "";
    let killed = "";
    const failWas = Number(S.c.hp.deathFail) || 0;
    const hpWas = X.curHp();
    const tempWas = Number(S.c.hp.temp) || 0;
    const ok = X.mutate(c => {
      const hp = c.hp;
      hp.current = X.curHp(c);
      if (action === "dmg") {
        const fromTemp = Math.min(hp.temp || 0, n);
        hp.temp = (hp.temp || 0) - fromTemp;
        const rest = n - fromTemp;
        if (hp.current <= 0 && rest > 0) {
          if (hp.stable) hp.deathSuccess = 0;
          hp.stable = false;
          if (rest >= S.d.hpMax) killed = `урон ${rest} не меньше максимума хитов (${S.d.hpMax})`;
          hp.deathFail = killed ? 3 : Math.min(3, hp.deathFail + (crit ? 2 : 1));
        } else {
          const over = rest - hp.current;
          X.setHp(c, hp.current - rest);
          if (over > 0 && over >= S.d.hpMax) {
            killed = `после 0 хитов осталось ${over} урона, это не меньше максимума хитов (${S.d.hpMax})`;
            hp.deathFail = 3;
          }
        }
        if (c.concentration && n > 0) {
          if (hp.current <= 0) {
            concLost = c.concentration;
            c.concentration = "";
          } else concDc = Math.max(10, Math.floor(n / 2));
        }
      } else if (action === "heal") {
        X.setHp(c, hp.current + n);
      } else if (action === "temp") {
        hp.temp = Math.max(hp.temp || 0, n);
      } else if (action === "set") {
        X.setHp(c, n);
      }
    });
    if (ok === false) return;
    const failNow = Number(S.c.hp.deathFail) || 0;
    X.track("hp", { action, before: hpWas, after: X.curHp(), tempBefore: tempWas, tempAfter: Number(S.c.hp.temp) || 0, failBefore: failWas, failAfter: failNow });
    if (concLost) X.track("concLost");
    if (failNow >= 3 && failWas < 3) X.deathScene("dead", killed ? `Мгновенная смерть: ${killed}.` : "");
    else if (failNow > failWas) {
      X.markDeath("deathFail", failWas, failNow);
      playSound("skull");
    }
    if (action === "dmg" && X.curHp() <= 0 && !S.c.hp.stable && S.c.hp.deathFail < 3 && X.tipsOn()) toast(`${icon("skull")} <b>0 хитов: ты без сознания.</b> В начале каждого хода спасбросок от смерти. Лечение сразу поднимает.`, { kind: "bad", timeout: 8000 });
    if (note) toast(`${icon("shield")} ${esc(note)}`, { kind: "info" });
    if (concLost) toast(`${icon("spiral")} Концентрация на «${esc(concLost)}» прервана: персонаж без сознания`, { kind: "bad" });
    if (concDc) toast(`${icon("spiral")} Концентрация на «${esc(S.c.concentration)}»: спасбросок Телосложения, СЛ ${concDc}. <button class="btn sm" data-conc-roll>Бросить</button>`, { timeout: 9000 });
  }

  async function hpDialog(mode) {
    const titles = { dmg: "Урон", heal: "Лечение", temp: "Временные хиты" };
    const withType = !mode || mode === "dmg";
    const down = X.curHp() <= 0 && (Number(S.c.hp.deathFail) || 0) < 3;
    const res = await promptNumber(mode ? titles[mode] : "Хиты", {
      label: `Сейчас: ${X.curHp()} / ${S.d.hpMax}${S.c.hp.temp ? ` (+${S.c.hp.temp} врем.)` : ""}`,
      value: "",
      select: withType ? { label: "Тип урона", options: typeOptions(), value: S.ui.lastDmgType || "", hint: "Сопротивления и уязвимости учтутся сами" } : null,
      buttons: mode
        ? [{ label: titles[mode], value: mode, cls: mode === "dmg" ? "danger" : mode === "heal" ? "heal" : "gold" }, ...(mode === "dmg" && down ? [{ label: "Крит. удар", value: "crit", cls: "danger" }] : [])]
        : [{ label: "Урон", value: "dmg", cls: "danger" }, ...(down ? [{ label: "Крит. удар", value: "crit", cls: "danger" }] : []), { label: "Лечение", value: "heal", cls: "heal" }, { label: "Врем.", value: "temp", cls: "ghost" }, { label: "Задать", value: "set", cls: "ghost" }]
    });
    if (!res || S.disposed) return;
    if (withType) S.ui.lastDmgType = res.type;
    const crit = res.action === "crit";
    const action = crit ? "dmg" : res.action;
    applyHp(action, res.value, action === "dmg" ? res.type : "", { crit });
  }

  function spendHitDie() {
    const { c, d } = S;
    if (X.readOnly()) return;
    if (d.hitDice.left <= 0) return toast("Кости хитов закончились");
    if (X.curHp() <= 0) return toast("Без сознания нельзя тратить кости хитов", { kind: "bad" });
    const r = rollDice(`1d${maxDie(c.hitDie)}`);
    const heal = Math.max(0, r.total + d.mods.con);
    const before = X.curHp();
    X.mutate(ch => {
      ch.hp.hitDiceUsed = (Number(ch.hp.hitDiceUsed) || 0) + 1;
      X.setHp(ch, X.curHp(ch) + heal);
    });
    X.track("hd");
    X.track("hp", { action: "heal", before, after: X.curHp(), tempBefore: 0, tempAfter: 0, failBefore: 0, failAfter: 0 });
    toast(`${icon("heart")} Кость хитов: ${r.total} ${fmt(d.mods.con)} = <b>+${heal}</b> хитов`, { kind: "good" });
  }

  Object.assign(X, { rollSetup, addBonus, bonusLines, consumeOnce, d20, saveTurn, markAction, spendAmmo, saveAmmo, giveTemp, castTemp, rollDamage, attackProfile, dmgButtons, hitDamage, doRoll, typeOptions, applyHp, hpDialog, spendHitDie });
}
