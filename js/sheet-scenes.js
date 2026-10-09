import { compute } from "./rules.js";
import { icon } from "./icons.js";
import { esc, openModal, playSound, fxSettings, reducedMotion, closeRollCard } from "./ui.js";
import { featureIcon, spellIcon, attackIcon } from "./entities.js";

const rnd = (a, b) => a + Math.random() * (b - a);

function stars(n) {
  let out = "";
  for (let i = 0; i < n; i++) out += `<i class="sc-star" style="--x:${rnd(2, 98).toFixed(1)}%;--y:${rnd(4, 62).toFixed(1)}%;--s:${rnd(1, 2.6).toFixed(1)}px;--dl:${rnd(-4, 0).toFixed(2)}s"></i>`;
  return out;
}

function sparks(n) {
  let out = "";
  for (let i = 0; i < n; i++) out += `<i class="cf-spark" style="--x:${rnd(-26, 26).toFixed(0)}px;--dx:${rnd(-30, 30).toFixed(0)}px;--d:${rnd(1.6, 3.2).toFixed(2)}s;--dl:${rnd(-3, 0).toFixed(2)}s"></i>`;
  return out;
}

function fire(small = false) {
  return `<div class="camp-fire ${small ? "small" : ""}" aria-hidden="true"><i class="cf-glow"></i><span class="cf-flames"><i></i><i></i><i></i><i></i></span><span class="cf-logs"><i></i><i></i></span>${sparks(small ? 6 : 12)}</div>`;
}

function candles(lit) {
  return `<div class="sc-candles" aria-hidden="true">${[0, 1, 2].map(i => `<span class="sc-candle ${lit ? "lit" : "out"}" style="--dl:${(i * 0.35).toFixed(2)}s"><i class="sc-flame"></i><i class="sc-smoke"></i></span>`).join("")}</div>`;
}

export function installScenes(X) {
  const { S } = X;

  const calm = () => !fxSettings().anim || reducedMotion();
  const row = (ic, label, value) => `<div class="lu-row">${icon(ic)}<span>${esc(label)}</span><b>${value}</b></div>`;
  const change = (from, to) => `<s>${esc(from)}</s> ${esc(to)}`;

  function restScene(title, long, before) {
    const after = S.c;
    const db = compute(before);
    const rows = [];
    const hp0 = Math.min(db.hpMax, Number(before.hp.current) || 0);
    const hp1 = X.curHp();
    if (hp1 > hp0) rows.push(row("heart", "Хиты", change(hp0, hp1)));
    const hd = (Number(before.hp.hitDiceUsed) || 0) - (Number(after.hp.hitDiceUsed) || 0);
    if (hd > 0) rows.push(row("d20", "Кости хитов", `+${hd}`));
    const pact = (Number(before.pactUsed) || 0) - (Number(after.pactUsed) || 0);
    if (pact > 0) rows.push(row("pact", "Ячейки договора", `+${pact}`));
    const sum = o => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    const slots = sum(before.slotsUsed) - sum(after.slotsUsed);
    if (slots > 0) rows.push(row("sparkle", "Ячейки заклинаний", `+${slots}`));
    if (before.exhaustion > after.exhaustion) rows.push(row("hourglass", "Истощение", change(before.exhaustion, after.exhaustion)));
    const got = [];
    for (const key of ["features", "items", "spells"]) {
      for (const e of after[key]) {
        const was = (before[key].find(x => x.id === e.id) || {}).used;
        if ((Number(was) || 0) <= (Number(e.used) || 0)) continue;
        const ic = key === "features" ? { icon: featureIcon(e) } : key === "spells" ? spellIcon(after, e) : { icon: e.icon || attackIcon(e.name) || "bag" };
        got.push(`<li ${ic.color ? `style="--c:${ic.color}"` : ""}>${icon(ic.icon)}<span>${esc(e.name)}</span></li>`);
      }
    }
    const gone = (before.effects || []).filter(e => !(after.effects || []).some(x => x.id === e.id)).map(e => e.name);
    const ended = [...gone, ...(before.concentration && !after.concentration ? [`концентрация на «${before.concentration}»`] : [])];
    const name = after.name || "Герой";
    const sub = long ? `${name} встречает рассвет, полный сил` : `${name} переводит дух у костра`;
    if (fxSettings().sound) playSound(long ? "dawn" : "campfire");
    return openModal({
      cls: `small scene-card camp ${long ? "long" : "short"} ${calm() ? "calm" : ""}`,
      body: `<div class="camp-scene" aria-hidden="true"><div class="camp-sky"><i class="sky-dawn"></i>${stars(long ? 34 : 14)}<i class="camp-moon"></i><i class="camp-sun"></i></div><i class="camp-hills"></i>${fire()}</div>
        <h2 class="scene-title">${esc(title)}</h2>
        <p class="scene-sub">${esc(sub)}</p>
        ${rows.length ? `<div class="lu-rows">${rows.join("")}</div>` : ""}
        ${got.length ? `<h4 class="lu-h">Снова готово</h4><ul class="lu-got">${got.join("")}</ul>` : ""}
        ${ended.length ? `<p class="lu-left">${icon("hourglass")}Закончилось: ${esc(ended.join(", "))}.</p>` : ""}
        ${!rows.length && !got.length && !ended.length ? `<p class="scene-sub">Восстанавливать было нечего</p>` : ""}
        <div class="form-actions"><button class="btn gold" data-close>${icon(long ? "sunrise" : "boot")}В путь</button></div>`
    });
  }

  function deathScene(outcome, why = "") {
    const name = S.c.name || "Герой";
    const sound = { up: "revive", stable: "candle", dead: "toll" }[outcome];
    if (sound && fxSettings().sound) playSound(sound);
    closeRollCard();
    const body = {
      up: `<div class="lu-burst" aria-hidden="true"><i></i><i></i><i></i>${icon("heart")}</div>
        <h2 class="scene-title">Естественная 20</h2>
        <p class="scene-sub">${esc(name)} открывает глаза</p>
        <div class="lu-rows">${row("heart", "Хиты", "1")}</div>`,
      stable: `${candles(true)}
        <h2 class="scene-title">Стабилизирован</h2>
        <p class="scene-sub">${esc(name)} без сознания, но смерть отступила</p>
        <p class="lu-left">${icon("sleep")}Через 1d4 часа придёт в себя с 1 хитом. Любое лечение поднимет сразу.</p>`,
      dead: `${candles(false)}
        <div class="sc-skulls" aria-hidden="true">${icon("skull")}${icon("skull")}${icon("skull")}</div>
        <h2 class="scene-title">Персонаж погиб</h2>
        <p class="scene-sub">${why ? esc(why) : `Три свечи погасли. ${esc(name)} пал.`}</p>
        <p class="lu-left">${icon("sparkle")}Вернуть может только магия: «Возрождение» в течение минуты, «Оживление» в течение 10 дней.</p>`
    }[outcome];
    if (!body) return null;
    return openModal({
      cls: `small scene-card death-scene ${outcome} ${calm() ? "calm" : ""}`,
      body: `${body}<div class="form-actions"><button class="btn ${outcome === "dead" ? "ghost" : "gold"}" data-close>${icon(outcome === "dead" ? "coffin" : "check")}${outcome === "dead" ? "Закрыть" : "Дальше"}</button></div>`
    });
  }

  function markDeath(k, from, to) {
    if (calm()) return;
    for (let i = from; i < to; i++) {
      X.root.querySelectorAll(`.ds[data-k="${k}"][data-i="${i}"]`).forEach(b => {
        b.classList.remove("fresh");
        void b.offsetWidth;
        b.classList.add("fresh");
      });
    }
  }

  Object.assign(X, { restScene, deathScene, markDeath });
}
