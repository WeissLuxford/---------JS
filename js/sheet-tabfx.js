import { esc, openModal, playSound, fxSettings, liteOn, reducedMotion } from "./ui.js";
import { icon } from "./icons.js";
import { VARIANTS, WEIGHT_WORD, variantById, playFx } from "./tab-fx.js";

const KEY = "dnd.tabfx";
const AUTO_STRONG = "portal";

export function tabFxChoice() {
  try {
    const v = localStorage.getItem(KEY);
    return v && (v === "auto" || variantById(v)) ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setTabFxChoice(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

export function autoTabFx() {
  return liteOn() ? null : variantById(AUTO_STRONG);
}

export function tabFxResolved() {
  if (reducedMotion()) return null;
  const choice = tabFxChoice();
  if (choice === "auto") return typeof navigator !== "undefined" && navigator.webdriver ? null : autoTabFx();
  const v = variantById(choice);
  return v && v.id !== "none" ? v : null;
}

export function tabFxLabel() {
  const choice = tabFxChoice();
  if (choice !== "auto") return variantById(choice).name;
  const auto = autoTabFx();
  return auto ? `Авто, ${auto.name}` : "Авто, лёгкая";
}

function geometry(root) {
  const bar = root.querySelector(".tabs");
  const head = root.querySelector(".topbar");
  const fixed = !!bar && getComputedStyle(bar).position === "fixed";
  const barRect = bar ? bar.getBoundingClientRect() : null;
  const headBottom = head ? Math.max(0, head.getBoundingClientRect().bottom) : 0;
  const top = fixed ? headBottom : Math.max(headBottom, barRect ? barRect.bottom : 0);
  const bottom = fixed && barRect ? barRect.top : window.innerHeight;
  return { top, height: Math.max(0, bottom - top) };
}

function ghost(layer, body, g) {
  const page = document.createElement("div");
  page.className = "fxpage";
  const r = body.getBoundingClientRect();
  const lo = g.top - 120;
  const hi = g.top + g.height + 120;
  const copy = body.cloneNode(false);
  copy.removeAttribute("data-body");
  copy.classList.remove("tab-in", "ordering");
  copy.style.cssText = `position: absolute; margin: 0; left: ${r.left}px; top: ${r.top - g.top}px; width: ${r.width}px`;
  for (const kid of body.children) {
    const kr = kid.getBoundingClientRect();
    if (kr.bottom < lo || kr.top > hi) {
      const stub = kid.cloneNode(false);
      stub.removeAttribute("id");
      stub.style.height = `${Math.round(kr.height)}px`;
      stub.style.overflow = "hidden";
      copy.append(stub);
    } else copy.append(kid.cloneNode(true));
  }
  page.append(copy);
  layer.append(page);
  return page;
}

export function veilOn(root) {
  const sheet = root.querySelector(".sheet");
  if (!sheet) return null;
  const g = geometry(root);
  if (g.height < 120) return null;
  const el = document.createElement("div");
  el.className = "tabveil";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `top: ${g.top}px; height: ${g.height}px`;
  sheet.append(el);
  let anim = el.animate([{ opacity: 0 }, { opacity: .82 }], { duration: 320, easing: "ease-out", fill: "forwards" });
  return {
    clear() {
      anim.cancel();
      el.remove();
    },
    reveal() {
      const from = parseFloat(getComputedStyle(el).opacity) || 0;
      anim.cancel();
      anim = el.animate([{ opacity: from }, { opacity: 0 }], { duration: 300, easing: "ease-in", fill: "forwards" });
      anim.finished.then(() => el.remove(), () => el.remove());
    }
  };
}

export function beginTabFx(root, v) {
  const sheet = root.querySelector(".sheet");
  const body = root.querySelector("[data-body]");
  if (!sheet || !body) return null;
  const g = geometry(root);
  if (g.height < 120) return null;
  const layer = document.createElement("div");
  layer.className = "tabfx";
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = `top: ${g.top}px; height: ${g.height}px`;
  const oldPage = ghost(layer, body, g);
  sheet.append(layer);
  return { layer, g, oldPage, v };
}

function paper(name) {
  const el = document.createElement("div");
  el.className = "fxpage paper";
  el.innerHTML = `<b>${esc(name)}</b>${"<i></i>".repeat(6)}`;
  return el;
}

export function runTabFx(fx, root, { from, to, count, names }) {
  const body = root.querySelector("[data-body]");
  const next = ghost(fx.layer, body, fx.g);
  let played = 0;
  const sound = (kind, delay) => {
    if (!fxSettings().sound || played >= 7) return;
    played++;
    setTimeout(() => (kind === "cloth" ? playSound("equip") : playSound("roll", { dice: kind === "throw" ? 3 : 1 })), delay);
  };
  return playFx(fx.v, {
    stage: fx.layer,
    o: fx.oldPage,
    n: next,
    d: to > from ? 1 : -1,
    from,
    to,
    count,
    sheet: i => paper(names[i] || ""),
    items: n => [...(n.firstElementChild ? n.firstElementChild.children : [])].slice(0, 9),
    sound,
    onEnd: () => fx.layer.remove()
  });
}

export function tabFxPicker(onTry) {
  const choice = tabFxChoice();
  const rows = [{ id: "auto", name: "Авто", w: -1, note: `Сильные устройства: ${variantById(AUTO_STRONG).name}. Слабые: лёгкая смена, страница гаснет, пока катится кубик, и проявляется, когда он встал. Сейчас: ${autoTabFx() ? autoTabFx().name : "лёгкая смена"}` }, ...VARIANTS];
  let grp = "";
  const html = rows.map(v => {
    const head = v.grp && v.grp !== grp ? `<h4 class="fxo-grp">${esc(v.grp)}</h4>` : "";
    if (v.grp) grp = v.grp;
    const tag = v.w >= 0 ? `<span class="fxo-tag fxw${v.w}">${WEIGHT_WORD[v.w]}</span>` : "";
    return `${head}<button type="button" class="fxo ${v.id === choice ? "on" : ""}" data-id="${esc(v.id)}" role="radio" aria-checked="${v.id === choice ? "true" : "false"}"><b>${esc(v.name)}${tag}</b><small>${esc(v.note)}</small></button>`;
  }).join("");
  const m = openModal({
    title: "Анимация вкладок",
    cls: "tabfx-pick",
    body: `<p class="hint">Как меняются вкладки внизу. Пометка показывает, насколько вариант нагружает телефон: «тяжело» может подтормаживать на слабых.</p><div class="fxo-list" role="radiogroup">${html}</div><div class="form-actions"><button class="btn ghost" data-close>Закрыть</button><button class="btn gold" data-try>${icon("d20")}Попробовать</button></div>`
  });
  m.body.addEventListener("click", e => {
    const row = e.target.closest(".fxo");
    if (row) {
      setTabFxChoice(row.dataset.id);
      m.body.querySelectorAll(".fxo").forEach(x => {
        x.classList.toggle("on", x === row);
        x.setAttribute("aria-checked", String(x === row));
      });
      return;
    }
    if (e.target.closest("[data-try]")) {
      m.close();
      setTimeout(onTry, 250);
    }
  });
}
