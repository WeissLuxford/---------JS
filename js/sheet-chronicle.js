import { icon } from "./icons.js";
import { esc, openModal, playSound, fxSettings, reducedMotion, dateTime } from "./ui.js";
import { ACHIEVEMENTS, ACH_CATS, DICE_SKINS, skinFor, today } from "./achievements.js";
import { previewDice } from "./dice3d.js";

const n = v => Number(v) || 0;
const plural = (k, one, few, many) => {
  const a = Math.abs(k) % 100;
  const b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
};

export function installChronicle(X) {
  const { S } = X;
  const queue = [];
  let showing = false;
  let checking = false;

  const canTrack = () => !!(S.c && !S.disposed && !S.preview && !X.readOnly() && !X.rights().propose);

  function stats() {
    if (!S.c.stats || typeof S.c.stats !== "object") S.c.stats = {};
    return S.c.stats;
  }

  function dayRoll(st) {
    const d = today();
    if (st.day === d) return;
    st.day = d;
    st.dayRolls = 0;
    st.daySum = 0;
    st.dayCrit = 0;
    st.dayFumble = 0;
  }

  function count(st, ev, x) {
    if (ev === "d20") {
      dayRoll(st);
      const pick = x.pick;
      st.rolls = n(st.rolls) + 1;
      st.sum = n(st.sum) + pick;
      st.faces = { ...(st.faces || {}), [pick]: n((st.faces || {})[pick]) + 1 };
      st.crit = n(st.crit) + (pick === 20 ? 1 : 0);
      st.fumble = n(st.fumble) + (pick === 1 ? 1 : 0);
      st.run20 = pick === 20 ? n(st.run20) + 1 : 0;
      st.run1 = pick === 1 ? n(st.run1) + 1 : 0;
      st.streakLow = pick < 10 ? n(st.streakLow) + 1 : 0;
      st.streakHigh = pick >= 15 ? n(st.streakHigh) + 1 : 0;
      st.bestLow = Math.max(n(st.bestLow), st.streakLow);
      st.bestHigh = Math.max(n(st.bestHigh), st.streakHigh);
      st.dayRolls += 1;
      st.daySum += pick;
      st.dayCrit += pick === 20 ? 1 : 0;
      st.dayFumble += pick === 1 ? 1 : 0;
      if (st.dayCrit > n(st.bestDayCrit)) Object.assign(st, { bestDayCrit: st.dayCrit, bestDay: st.day });
      if (st.dayFumble > n(st.worstDayFumble)) Object.assign(st, { worstDayFumble: st.dayFumble, worstDay: st.day });
    } else if (ev === "dmg") {
      st.dmgRolls = n(st.dmgRolls) + 1;
      st.dmgTotal = n(st.dmgTotal) + x.dealt;
      st.dmgMax = Math.max(n(st.dmgMax), x.dealt);
    } else if (ev === "hp") {
      const lost = Math.max(0, x.before + x.tempBefore - x.after - x.tempAfter);
      if (x.action === "dmg") {
        st.taken = n(st.taken) + lost;
        st.takenMax = Math.max(n(st.takenMax), lost);
      }
      if (x.after > x.before) st.healed = n(st.healed) + x.after - x.before;
      if (x.before > 0 && x.after <= 0) {
        st.downs = n(st.downs) + 1;
        st.downDay = today();
      }
      if (x.failBefore < 3 && x.failAfter >= 3) st.deaths = n(st.deaths) + 1;
      if (x.failBefore >= 3 && x.after > 0) st.revived = n(st.revived) + 1;
    } else if (ev === "death") {
      if (x.outcome === "stable" || x.outcome === "up") st.stabilized = n(st.stabilized) + 1;
      if (x.outcome === "up") st.phoenix = n(st.phoenix) + 1;
      if (x.outcome === "dead") st.deaths = n(st.deaths) + 1;
    } else if (ev === "cast") {
      st.casts = n(st.casts) + 1;
      if (!x.level) st.cantrips = n(st.cantrips) + 1;
      st.maxCast = Math.max(n(st.maxCast), n(x.slot) || n(x.level));
    } else if (ev === "use") {
      if (x.emptied) st.emptied = n(st.emptied) + 1;
      if (x.broke) st.broken = n(st.broken) + 1;
    } else if (ev === "rest") {
      if (x.long) st.longRests = n(st.longRests) + 1;
      else st.shortRests = n(st.shortRests) + 1;
    } else if (ev === "pay") st.paidGp = n(st.paidGp) + x.gp;
    else if (["rounds", "combats", "insp", "hd", "concLost", "levelUps"].includes(ev)) st[ev] = n(st[ev]) + 1;
  }

  function unlocked() {
    if (!S.c.achievements || typeof S.c.achievements !== "object") S.c.achievements = {};
    return S.c.achievements;
  }

  function evaluate(ev, data) {
    const got = unlocked();
    const fresh = [];
    for (let pass = 0; pass < 2; pass++) {
      for (const a of ACHIEVEMENTS) {
        if (got[a.key]) continue;
        let ok = false;
        try {
          ok = !!a.test({ ev, data: data || {}, st: stats(), c: S.c, d: S.d, count: Object.keys(got).length });
        } catch {}
        if (!ok) continue;
        got[a.key] = Date.now();
        fresh.push(a);
      }
    }
    return fresh;
  }

  function track(ev, data = {}) {
    if (!canTrack() || checking) return;
    checking = true;
    try {
      const st = stats();
      const silent = st.since ? [] : start(st);
      count(st, ev, data);
      const fresh = evaluate(ev, data);
      X.changed({ render: false });
      if (silent.length) queue.push({ many: silent.length });
      announce(fresh);
    } finally {
      checking = false;
    }
  }

  function checkState() {
    if (!canTrack() || checking) return;
    checking = true;
    try {
      const st = stats();
      if (!st.since) {
        const silent = start(st);
        X.changed({ render: false });
        if (silent.length) queue.push({ many: silent.length });
        return pump();
      }
      const fresh = evaluate("state", {});
      if (!fresh.length) return;
      X.changed({ render: false });
      announce(fresh);
    } finally {
      checking = false;
    }
  }

  function start(st) {
    st.since = Date.now();
    return evaluate("state", {});
  }

  function announce(list) {
    if (!list.length) return;
    if (list.length > 3) queue.push({ many: list.length });
    else list.forEach(a => queue.push({ a }));
    pump();
  }

  function pump() {
    if (showing || !queue.length || S.disposed) return;
    showing = true;
    const item = queue.shift();
    let el = document.getElementById("ach-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ach-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    const a = item.a;
    el.innerHTML = a
      ? `<span class="ach-medal">${icon(a.icon)}</span><span class="ach-t"><small>Достижение</small><b>${esc(a.name)}</b></span>`
      : `<span class="ach-medal">${icon("crown")}</span><span class="ach-t"><small>Достижения</small><b>Уже заработано: ${item.many}</b></span>`;
    if (fxSettings().sound) playSound("achievement");
    el.className = reducedMotion() || !fxSettings().anim ? "in calm" : "in";
    setTimeout(() => {
      el.className = el.className.replace("in", "").trim();
      setTimeout(() => {
        showing = false;
        pump();
      }, 400);
    }, 3200);
  }

  function medal(a, at) {
    const hidden = a.secret && !at;
    return `<div class="ach ${at ? "on" : ""}" title="${esc(hidden ? "Секретное достижение" : a.desc)}">
      <span class="ach-medal">${icon(hidden ? "lock" : a.icon)}</span>
      <span class="ach-t"><b>${esc(hidden ? "???" : a.name)}</b><small>${esc(hidden ? "Секретное достижение" : a.desc)}</small>${at ? `<em>${esc(dateTime(at))}</em>` : ""}</span>
    </div>`;
  }

  function trophiesHtml() {
    const got = S.c.achievements || {};
    const total = ACHIEVEMENTS.length;
    const have = ACHIEVEMENTS.filter(a => got[a.key]).length;
    const recent = ACHIEVEMENTS.filter(a => got[a.key]).sort((a, b) => got[b.key] - got[a.key]).slice(0, 3);
    return `<div class="ach-head"><b>${have}</b><span>из ${total}</span><div class="ach-bar"><i style="width:${Math.round((have / total) * 100)}%"></i></div></div>
      ${recent.length ? `<h4 class="lu-h">Последние</h4><div class="ach-grid">${recent.map(a => medal(a, got[a.key])).join("")}</div>` : ""}
      ${ACH_CATS.map(([cat, title]) => {
        const list = ACHIEVEMENTS.filter(a => a.cat === cat);
        const own = list.filter(a => got[a.key]).length;
        return `<h4 class="lu-h">${esc(title)} <span>${own}/${list.length}</span></h4><div class="ach-grid">${list.map(a => medal(a, got[a.key])).join("")}</div>`;
      }).join("")}`;
  }

  function chronicleHtml() {
    const st = (S.c && S.c.stats) || {};
    const rolls = n(st.rolls);
    if (!rolls) return `<p class="empty">Летопись пока пуста: брось d20, и она начнётся.</p>`;
    const avg = n(st.sum) / rolls;
    const mood = avg >= 11.5 ? "Кубы к тебе благосклонны" : avg <= 9.5 ? "Кубы капризничают" : "Кубы честны";
    const face = Array.from({ length: 20 }, (_, i) => n((st.faces || {})[i + 1]));
    const top = Math.max(1, ...face);
    const expect = rolls / 20;
    const tile = (label, value, sub = "") => `<div class="chr-tile"><small>${esc(label)}</small><b>${esc(value)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
    const day = s => (s ? s.split("-").reverse().join(".") : "");
    return `<div class="chr-hero"><b>${avg.toFixed(1).replace(".", ",")}</b><span>средний d20 · ${esc(mood)}</span></div>
      <div class="chr-tiles">
        ${tile("Бросков d20", String(rolls))}
        ${tile("Естественных 20", String(n(st.crit)), `${((n(st.crit) / rolls) * 100).toFixed(1).replace(".", ",")}%`)}
        ${tile("Естественных 1", String(n(st.fumble)), `${((n(st.fumble) / rolls) * 100).toFixed(1).replace(".", ",")}%`)}
        ${tile("В ударе", `${n(st.bestHigh)} подряд`, "лучшая серия 15+")}
        ${tile("Чёрная полоса", `${n(st.bestLow)} подряд`, "худшая серия ниже 10")}
        ${tile("Звёздный вечер", n(st.bestDayCrit) ? `${n(st.bestDayCrit)} × 20` : "пока нет", day(st.bestDay))}
        ${tile("Проклятый вечер", n(st.worstDayFumble) ? `${n(st.worstDayFumble)} × 1` : "пока нет", day(st.worstDay))}
        ${tile("Сегодня", `${n(st.day === today() ? st.dayRolls : 0)} бросков`, st.day === today() && n(st.dayRolls) ? `в среднем ${(n(st.daySum) / n(st.dayRolls)).toFixed(1).replace(".", ",")}` : "")}
      </div>
      <h4 class="lu-h">Как падает d20</h4>
      <div class="chr-chart" role="img" aria-label="Сколько раз выпадала каждая грань d20">
        <i class="chr-expect" style="bottom:${(expect / top) * 100}%" title="Столько было бы при идеально честном кубе: ${expect.toFixed(1).replace(".", ",")}"></i>
        ${face.map((v, i) => `<button class="chr-bar ${i === 19 ? "top" : i === 0 ? "low" : ""}" style="--h:${(v / top) * 100}%" title="${i + 1}: ${v} ${plural(v, "раз", "раза", "раз")}" aria-label="${i + 1}: ${v}"><i></i><span>${v}</span></button>`).join("")}
      </div>
      <div class="chr-axis">${face.map((_, i) => `<span>${i + 1}</span>`).join("")}</div>
      <p class="chr-note">Черта поперёк: столько выпадало бы каждой грани у идеально честного куба.</p>
      <h4 class="lu-h">Подвиги</h4>
      <div class="chr-tiles">
        ${tile("Урон нанесён", String(n(st.dmgTotal)), n(st.dmgMax) ? `лучший бросок ${n(st.dmgMax)}` : "")}
        ${tile("Урон получен", String(n(st.taken)), n(st.takenMax) ? `худший удар ${n(st.takenMax)}` : "")}
        ${tile("Вылечено", String(n(st.healed)))}
        ${tile("Падений до 0", String(n(st.downs)), n(st.stabilized) ? `выкарабкался ${n(st.stabilized)}` : "")}
        ${tile("Заклинаний", String(n(st.casts)), n(st.cantrips) ? `из них заговоров ${n(st.cantrips)}` : "")}
        ${tile("Отдыхов", String(n(st.longRests) + n(st.shortRests)), `длинных ${n(st.longRests)}`)}
        ${tile("Раундов", String(n(st.rounds)), n(st.combats) ? `боёв ${n(st.combats)}` : "")}
        ${tile("Потрачено золота", String(Math.round(n(st.paidGp))))}
      </div>
      ${st.since ? `<p class="chr-note">Летопись ведётся с ${esc(dateTime(st.since))}.</p>` : ""}`;
  }

  function openTrophies(tab = "trophies") {
    const body = document.createElement("div");
    let cur = tab;
    const paint = () => {
      const tab = (k, ic, l) => `<button class="subtab ${cur === k ? "on" : ""}" data-t="${k}" role="tab" aria-selected="${cur === k}">${icon(ic)}${l}</button>`;
      body.innerHTML = `<div class="subtabs lib-tabs" role="tablist">${tab("trophies", "crown", "Достижения")}${tab("chronicle", "scroll", "Летопись удачи")}</div>
        <div class="chr-body">${cur === "trophies" ? trophiesHtml() : chronicleHtml()}</div>`;
    };
    paint();
    openModal({ title: "Достижения и летопись", body, cls: "trophies" });
    body.addEventListener("click", e => {
      const t = e.target.closest("[data-t]");
      if (t && t.dataset.t !== cur) {
        cur = t.dataset.t;
        paint();
      }
    });
  }

  function openSkins() {
    const got = S.c.achievements || {};
    const cur = skinFor(S.c.diceSkin).key;
    const body = document.createElement("div");
    const by = Object.fromEntries(ACHIEVEMENTS.map(a => [a.key, a]));
    body.innerHTML = `<p class="hint">Материал 3D-кубиков этого персонажа. Классика, гладкие и самоцвет берут цвет листа.</p>
      <div class="skin-grid">${DICE_SKINS.map(s => {
        const locked = s.unlock && !got[s.unlock];
        return `<button class="skin ${s.key === cur ? "on" : ""} ${locked ? "locked" : ""}" data-skin="${s.key}" ${locked ? "disabled" : ""}>
          <span class="skin-swatch skin-${s.key}">${locked ? icon("lock") : icon("d20")}</span>
          <b>${esc(s.name)}</b>
          ${locked ? `<small>Откроет «${esc(by[s.unlock].secret ? "секретное достижение" : by[s.unlock].name)}»</small>` : ""}
        </button>`;
      }).join("")}</div>`;
    const m = openModal({ title: "Кубики", body, cls: "small" });
    body.addEventListener("click", e => {
      const b = e.target.closest("[data-skin]");
      if (!b || b.disabled) return;
      const key = b.dataset.skin;
      if (X.readOnly()) return;
      X.mutate(c => { c.diceSkin = key; }, { render: false });
      body.querySelectorAll("[data-skin]").forEach(x => x.classList.toggle("on", x === b));
      X.applyDiceSkin();
      track("skin");
      setTimeout(() => m.close(), 250);
      setTimeout(() => previewDice(), 450);
    });
  }

  Object.assign(X, { track, checkAchievements: checkState, openTrophies, openSkins });
}
