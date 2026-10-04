import { icon, die, actionMark } from "./icons.js";
import { DAMAGE, ACTIONS, parseDice, rollDice, fmt } from "./rules.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

export function rich(text) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  return s.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`).join("");
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

const toastHost = () => {
  let el = $("#toasts");
  if (!el) {
    el = document.createElement("div");
    el.id = "toasts";
    document.body.appendChild(el);
  }
  return el;
};

export function toast(html, { kind = "", timeout = 3200 } = {}) {
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = html;
  toastHost().appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  const close = () => {
    el.classList.remove("in");
    setTimeout(() => el.remove(), 250);
  };
  el.addEventListener("click", close);
  if (timeout) setTimeout(close, timeout);
  return close;
}

export const rollLog = [];

function logRoll(entry) {
  rollLog.unshift({ ...entry, at: Date.now() });
  if (rollLog.length > 40) rollLog.pop();
}

export function showD20(label, modifier, result, mode) {
  const cls = result.nat20 ? "crit" : result.nat1 ? "fumble" : "";
  const both = result.b != null ? `<span class="r-both">${result.a} / ${result.b} ${mode === "adv" ? "преим." : "помеха"}</span>` : "";
  const note = result.nat20 ? "Естественная 20!" : result.nat1 ? "Естественная 1" : "";
  logRoll({ label, text: `${result.total} (${result.pick}${fmt(modifier)})` });
  toast(
    `<div class="roll ${cls}">${die(20, result.nat20 ? "#f4d66d" : result.nat1 ? "#e5533d" : "#cbbfa8", result.pick)}<div class="r-body"><div class="r-label">${esc(label)}</div><div class="r-calc">${result.pick} ${fmt(modifier).replace(/^([+−])/, "$1 ")} ${both}</div>${note ? `<div class="r-note">${note}</div>` : ""}</div><div class="r-total">${result.total}</div></div>`,
    { timeout: 4500 }
  );
}

export function showDamage(label, lines, crit = false) {
  const parts = [];
  let total = 0;
  for (const line of lines) {
    const expr = crit ? critExpr(line.dice) : line.dice;
    const r = rollDice(expr);
    if (!r) continue;
    total += r.total;
    const dt = DAMAGE[line.type] || DAMAGE.bludgeoning;
    const rolls = r.rolls.length ? `<span class="r-rolls">[${r.rolls.map(x => (x.sign < 0 ? "−" : "") + x.r).join(", ")}]</span>` : "";
    parts.push(`<div class="r-line" style="--c:${dt.color}"><span>${esc(expr)}</span>${rolls}<b>${r.total}</b> ${icon(dt.icon)} ${esc(dt.name)}</div>`);
  }
  if (!parts.length) return;
  logRoll({ label, text: String(total) });
  const firstType = DAMAGE[lines[0].type] || DAMAGE.bludgeoning;
  toast(
    `<div class="roll dmg">${die(maxFace(lines[0].dice), firstType.color, "")}<div class="r-body"><div class="r-label">${esc(label)}${crit ? " · крит" : ""}</div>${parts.join("")}</div><div class="r-total">${total}</div></div>`,
    { timeout: 5500 }
  );
  return total;
}

function critExpr(expr) {
  const p = parseDice(expr);
  if (!p) return expr;
  const dice = p.dice.map(d => `${d.n * 2}d${d.f}`).join("+");
  return dice + (p.flat ? (p.flat > 0 ? "+" : "") + p.flat : "");
}

export function maxFace(expr) {
  const p = parseDice(expr);
  if (!p || !p.dice.length) return 6;
  return Math.max(...p.dice.map(d => d.f));
}

const modalStack = [];

export function openModal({ title = "", body = "", wide = false, cls = "", onClose } = {}) {
  hideHoverCard();
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal ${wide ? "wide" : ""} ${cls}" role="dialog" aria-modal="true">${title ? `<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close title="Закрыть">${icon("close")}</button></div>` : `<button class="icon-btn modal-x" data-close title="Закрыть">${icon("close")}</button>`}<div class="modal-body"></div></div>`;
  const bodyEl = back.querySelector(".modal-body");
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);
  document.body.appendChild(back);
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => back.classList.add("in"));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove("in");
    const i = modalStack.indexOf(api);
    if (i >= 0) modalStack.splice(i, 1);
    if (!modalStack.length) document.body.classList.remove("no-scroll");
    setTimeout(() => back.remove(), 200);
    onClose && onClose();
  };
  back.addEventListener("mousedown", e => {
    if (e.target === back) back.dataset.down = "1";
  });
  back.addEventListener("click", e => {
    if (e.target === back && back.dataset.down === "1") close();
    back.dataset.down = "";
    if (e.target.closest("[data-close]")) close();
  });
  const api = { el: back, body: bodyEl, close };
  modalStack.push(api);
  return api;
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && modalStack.length) modalStack[modalStack.length - 1].close();
});

export function closeAllModals() {
  modalStack.slice().forEach(m => m.close());
}

export function confirmDialog(text, { ok = "Да", danger = false } = {}) {
  return new Promise(resolve => {
    let answered = false;
    const m = openModal({
      title: "Подтверждение",
      body: `<p class="confirm-text">${esc(text)}</p><div class="form-actions"><button class="btn ghost" data-no>Отмена</button><button class="btn ${danger ? "danger" : "gold"}" data-yes>${esc(ok)}</button></div>`,
      onClose: () => !answered && resolve(false)
    });
    m.body.querySelector("[data-yes]").onclick = () => { answered = true; m.close(); resolve(true); };
    m.body.querySelector("[data-no]").onclick = () => { answered = true; m.close(); resolve(false); };
  });
}

export function promptNumber(title, { label = "", value = "", buttons }) {
  return new Promise(resolve => {
    let answered = false;
    const m = openModal({
      title,
      cls: "small",
      body: `<label class="fld"><span>${esc(label)}</span><input type="number" inputmode="numeric" class="num-big" value="${esc(value)}"></label><div class="form-actions">${buttons.map((b, i) => `<button class="btn ${b.cls || "gold"}" data-i="${i}">${esc(b.label)}</button>`).join("")}</div>`,
      onClose: () => !answered && resolve(null)
    });
    const input = m.body.querySelector("input");
    setTimeout(() => input.focus(), 50);
    const done = i => {
      answered = true;
      const v = Number(input.value);
      m.close();
      resolve({ value: Number.isFinite(v) ? v : 0, action: buttons[i].value });
    };
    m.body.querySelectorAll("[data-i]").forEach(b => (b.onclick = () => done(Number(b.dataset.i))));
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && buttons.length === 1) done(0);
    });
  });
}

export function damageLine(line, { showDie = true } = {}) {
  const dt = DAMAGE[line.type] || { name: line.type || "", color: "#cbbfa8", icon: "sparkle" };
  return `<div class="dmg-line" style="--c:${dt.color}">${showDie ? `<span class="dmg-die">${die(maxFace(line.dice), dt.color, maxFace(line.dice))}</span>` : ""}<span class="dmg-text">${esc(line.prefix || "")}${esc(line.dice)} ${icon(dt.icon)} ${esc(dt.name)}${line.swapped ? ' <span class="swap-note">(было: ' + esc((DAMAGE[line.origType] || {}).name || "") + ")</span>" : ""}</span></div>`;
}

export function diceStack(lines) {
  if (!lines.length) return "";
  const dice = lines.slice(0, 3).map(l => {
    const dt = DAMAGE[l.type] || { color: "#cbbfa8" };
    return die(maxFace(l.dice), dt.color, maxFace(l.dice));
  }).join("");
  const texts = lines.map((l, i) => damageLine({ ...l, prefix: l.prefix || (i && l.or ? "или " : i ? "+" : "") }, { showDie: false })).join("");
  return `<div class="dice-block"><div class="dice-stack n${Math.min(3, lines.length)}">${dice}</div><div class="dice-texts">${texts}</div></div>`;
}

export function card(m) {
  const art = m.art ? `<div class="card-art" style="--c:${m.art.color || "#e9c77a"}">${icon(m.art.icon)}</div>` : "";
  const badges = (m.badges || []).filter(b => b && b.text).map(b => `<span class="badge" style="--c:${b.color || "#c9a35b"}">${esc(b.text)}</span>`).join("");
  const meta = (m.meta || []).filter(x => x && x.text).map(x => `<span class="meta-i">${icon(x.icon)}${esc(x.text)}</span>`).join("");
  const footer = (m.footer || []).filter(Boolean).map(f => `<span class="foot-i">${f.mark || ""}${esc(f.text)}</span>`).join("");
  const uses = m.uses ? `<div class="card-uses">${pips(m.uses.max, m.uses.left, m.usesColor)}<span>${m.uses.left} / ${m.uses.max}</span></div>` : "";
  return `<article class="bg-card" style="--rar:${m.rarityColor || "transparent"}">
    ${art}
    <header class="card-head"><h3>${esc(m.title)}</h3>${m.subtitle ? `<div class="card-sub">${esc(m.subtitle)}</div>` : ""}${badges ? `<div class="card-badges">${badges}</div>` : ""}</header>
    ${m.dice && m.dice.length ? diceStack(m.dice) : ""}
    ${m.stats ? `<div class="card-stats">${m.stats}</div>` : ""}
    ${m.body ? `<div class="card-desc">${m.body}</div>` : ""}
    ${m.effect ? `<div class="card-effect">${esc(m.effect)}</div>` : ""}
    ${uses}
    ${meta ? `<div class="card-meta">${meta}</div>` : ""}
    ${footer ? `<footer class="card-foot">${footer}</footer>` : ""}
  </article>`;
}

export function pips(max, left, color = "") {
  const n = Math.min(Number(max) || 0, 30);
  let out = "";
  for (let i = 0; i < n; i++) out += `<i class="pip ${i < left ? "on" : ""}"${color ? ` style="--c:${color}"` : ""}></i>`;
  return `<span class="pips">${out}</span>`;
}

export function actionFoot(actionKey) {
  const a = ACTIONS[actionKey];
  if (!a) return null;
  return { mark: actionMark(a.shape, a.color), text: a.name };
}

let hoverEl = null;
let hoverTarget = null;

export function hideHoverCard() {
  if (hoverEl) hoverEl.classList.remove("in");
  hoverTarget = null;
}

export function enableHoverCards(root, resolve) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const over = e => {
    const t = e.target.closest("[data-card]");
    if (!t || t === hoverTarget) return;
    if (document.querySelector(".modal-back")) return;
    const html = resolve(t.dataset.card);
    if (!html) return;
    hoverTarget = t;
    if (!hoverEl) {
      hoverEl = document.createElement("div");
      hoverEl.className = "hover-card";
      document.body.appendChild(hoverEl);
    }
    hoverEl.innerHTML = html;
    const r = t.getBoundingClientRect();
    const w = Math.min(420, window.innerWidth - 24);
    hoverEl.style.width = w + "px";
    let left = r.right + 12;
    if (left + w > window.innerWidth - 12) left = r.left - w - 12;
    if (left < 12) left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
    hoverEl.style.left = left + "px";
    hoverEl.style.top = "0px";
    hoverEl.classList.add("in");
    const h = hoverEl.offsetHeight;
    let top = r.top;
    if (top + h > window.innerHeight - 12) top = Math.max(12, window.innerHeight - h - 12);
    hoverEl.style.top = top + "px";
  };
  const out = e => {
    const t = e.target.closest("[data-card]");
    if (t && !t.contains(e.relatedTarget)) hideHoverCard();
  };
  root.addEventListener("mouseover", over);
  root.addEventListener("mouseout", out);
  window.addEventListener("scroll", hideHoverCard, { passive: true });
  return () => {
    root.removeEventListener("mouseover", over);
    root.removeEventListener("mouseout", out);
    window.removeEventListener("scroll", hideHoverCard);
    hideHoverCard();
  };
}

function optionList(options) {
  if (Array.isArray(options)) return options.map(o => (Array.isArray(o) ? o : [o, o]));
  return Object.entries(options).map(([k, v]) => [k, typeof v === "string" ? v : v.name]);
}

function fieldHtml(f, v) {
  const id = "f_" + f.key.replace(/\W/g, "_");
  const span = f.span ? ` style="grid-column: span ${f.span}"` : "";
  const hint = f.hint ? `<small>${esc(f.hint)}</small>` : "";
  if (f.type === "heading") return `<div class="fld-heading">${esc(f.label)}</div>`;
  if (f.type === "checkbox") {
    return `<label class="fld chk"${span}><input type="checkbox" data-k="${esc(f.key)}" ${v ? "checked" : ""}><span>${esc(f.label)}</span>${hint}</label>`;
  }
  if (f.type === "select") {
    const opts = optionList(f.options).map(([k, l]) => `<option value="${esc(k)}" ${String(v ?? "") === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("");
    return `<label class="fld"${span} for="${id}"><span>${esc(f.label)}</span><select id="${id}" data-k="${esc(f.key)}">${opts}</select>${hint}</label>`;
  }
  if (f.type === "textarea") {
    return `<label class="fld"${span} for="${id}"><span>${esc(f.label)}</span><textarea id="${id}" data-k="${esc(f.key)}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || "")}">${esc(v ?? "")}</textarea>${hint}</label>`;
  }
  if (f.type === "dicelist") {
    const rows = (Array.isArray(v) ? v : []).map(d => diceRow(d)).join("");
    return `<div class="fld dicelist"${span} data-k="${esc(f.key)}" data-dl><span>${esc(f.label)}</span><div class="dl-rows">${rows}</div><button type="button" class="btn ghost sm" data-dl-add>${icon("plus")} Добавить кубы</button>${hint}</div>`;
  }
  const type = f.type === "number" ? "number" : "text";
  const list = f.suggest ? `<datalist id="${id}_dl">${f.suggest.map(o => `<option value="${esc(o)}"></option>`).join("")}</datalist>` : "";
  return `<label class="fld"${span} for="${id}"><span>${esc(f.label)}</span><input id="${id}" type="${type}" ${type === "number" ? 'inputmode="decimal" step="any"' : ""} ${list ? `list="${id}_dl"` : ""} data-k="${esc(f.key)}" value="${esc(v ?? "")}" placeholder="${esc(f.placeholder || "")}">${list}${hint}</label>`;
}

function diceRow(d = {}) {
  const opts = Object.entries(DAMAGE).map(([k, t]) => `<option value="${k}" ${d.type === k ? "selected" : ""}>${esc(t.name)}</option>`).join("");
  return `<div class="dl-row"><input type="text" placeholder="2d8" value="${esc(d.dice || "")}" data-dl-dice><select data-dl-type>${opts}</select><label class="mini-chk" title="Прибавлять модификатор заклинательной характеристики"><input type="checkbox" data-dl-mod ${d.addMod ? "checked" : ""}>+мод</label><button type="button" class="icon-btn" data-dl-rm>${icon("close")}</button></div>`;
}

export function openForm({ title, fields, value = {}, onSave, onDelete, saveLabel = "Сохранить", extra = "" }) {
  const form = document.createElement("form");
  form.className = "form-grid";
  form.innerHTML = fields.map(f => fieldHtml(f, getPath(value, f.key))).join("") + extra +
    `<div class="form-actions" style="grid-column: 1 / -1">${onDelete ? `<button type="button" class="btn danger" data-del>${icon("trash")} Удалить</button>` : ""}<span class="spacer"></span><button type="button" class="btn ghost" data-close>Отмена</button><button type="submit" class="btn gold">${esc(saveLabel)}</button></div>`;
  const m = openModal({ title, body: form, wide: fields.length > 8 });
  form.addEventListener("click", e => {
    if (e.target.closest("[data-dl-add]")) {
      e.target.closest("[data-dl]").querySelector(".dl-rows").insertAdjacentHTML("beforeend", diceRow({ type: "fire" }));
    }
    if (e.target.closest("[data-dl-rm]")) e.target.closest(".dl-row").remove();
  });
  let submitted = false;
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (submitted) return;
    const out = JSON.parse(JSON.stringify(value));
    for (const f of fields) {
      if (f.type === "heading") continue;
      if (f.type === "dicelist") {
        const box = form.querySelector(`[data-dl][data-k="${CSS.escape(f.key)}"]`);
        const list = Array.from(box.querySelectorAll(".dl-row")).map(r => ({
          dice: r.querySelector("[data-dl-dice]").value.trim(),
          type: r.querySelector("[data-dl-type]").value,
          addMod: r.querySelector("[data-dl-mod]").checked
        })).filter(x => x.dice);
        setPath(out, f.key, list);
        continue;
      }
      const el = form.querySelector(`[data-k="${CSS.escape(f.key)}"]`);
      if (!el) continue;
      let v;
      if (f.type === "checkbox") v = el.checked;
      else if (f.type === "number") v = el.value === "" ? (f.nullable ? null : 0) : Number(el.value);
      else v = el.value;
      setPath(out, f.key, v);
    }
    const res = onSave(out);
    if (res !== false) {
      submitted = true;
      m.close();
    }
  });
  const del = form.querySelector("[data-del]");
  if (del) {
    del.onclick = async () => {
      if (await confirmDialog("Удалить без возможности вернуть? (Старая версия останется в истории изменений)", { ok: "Удалить", danger: true })) {
        onDelete();
        m.close();
      }
    };
  }
  setTimeout(() => {
    const first = form.querySelector("input[type=text], textarea");
    if (first && window.matchMedia("(pointer: fine)").matches) first.focus();
  }, 60);
  return m;
}

export function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

export function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "только что";
  if (s < 3600) return Math.floor(s / 60) + " мин назад";
  if (s < 86400) return Math.floor(s / 3600) + " ч назад";
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(ts, seconds = false) {
  return new Date(ts).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function encodeCanvas(canvas, quality = 0.85) {
  let data = canvas.toDataURL("image/webp", quality);
  if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", quality);
  let q = quality;
  while (data.length > 260000 && q > 0.4) {
    q -= 0.1;
    data = canvas.toDataURL("image/jpeg", q);
  }
  return data;
}

export async function cropImage(source, { aspect = 5 / 6, outW = 520, title = "Кадр портрета" } = {}) {
  const owned = typeof source !== "string";
  const url = owned ? URL.createObjectURL(source) : source;
  let img;
  try {
    img = await loadImage(url);
  } catch (e) {
    if (owned) URL.revokeObjectURL(url);
    throw e;
  }
  return new Promise(resolve => {
    let done = false;
    const m = openModal({
      title,
      cls: "small",
      onClose: () => {
        if (owned) setTimeout(() => URL.revokeObjectURL(url), 300);
        if (!done) resolve(null);
      },
      body: `<div class="crop">
          <div class="crop-frame" style="aspect-ratio:${aspect}"><img alt="" draggable="false"><span class="crop-grid"></span></div>
          <div class="crop-zoom">${icon("minus")}<input type="range" min="1" max="4" step="0.01" value="1" aria-label="Масштаб">${icon("plus")}</div>
          <p class="hint">Двигай картинку пальцем или мышью. Масштаб: ползунок, колёсико мыши или два пальца.</p>
          <div class="form-actions"><button class="btn ghost" data-close>Отмена</button><button class="btn gold" data-ok>${icon("check")}Сохранить</button></div>
        </div>`
    });
    const frame = m.body.querySelector(".crop-frame");
    const el = frame.querySelector("img");
    const range = m.body.querySelector("input[type=range]");
    el.src = img.src;
    let W = 0, H = 0, base = 1, zoom = 1, x = 0, y = 0;
    const scale = () => base * zoom;
    const clamp = () => {
      const s = scale();
      x = Math.min(0, Math.max(W - img.naturalWidth * s, x));
      y = Math.min(0, Math.max(H - img.naturalHeight * s, y));
    };
    const paint = () => {
      const s = scale();
      el.style.width = img.naturalWidth * s + "px";
      el.style.height = img.naturalHeight * s + "px";
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const measure = () => {
      const r = frame.getBoundingClientRect();
      const cx = W ? (W / 2 - x) / scale() : img.naturalWidth / 2;
      const cy = H ? (H / 2 - y) / scale() : img.naturalHeight / 2;
      W = r.width;
      H = r.height;
      base = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      x = W / 2 - cx * scale();
      y = H / 2 - cy * scale();
      clamp();
      paint();
    };
    const setZoom = (z, px = W / 2, py = H / 2) => {
      const nz = Math.min(4, Math.max(1, z));
      const ix = (px - x) / scale();
      const iy = (py - y) / scale();
      zoom = nz;
      x = px - ix * scale();
      y = py - iy * scale();
      clamp();
      paint();
      range.value = String(zoom);
      range.style.setProperty("--p", ((zoom - 1) / 3) * 100 + "%");
    };
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(frame);
    const pts = new Map();
    let pinch = null;
    frame.addEventListener("pointerdown", e => {
      frame.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      }
    });
    frame.addEventListener("pointermove", e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        const r = frame.getBoundingClientRect();
        setZoom(pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d)), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        return;
      }
      x += dx;
      y += dy;
      clamp();
      paint();
    });
    const up = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
    };
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);
    frame.addEventListener("wheel", e => {
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    range.addEventListener("input", () => setZoom(Number(range.value)));
    m.body.querySelector("[data-ok]").onclick = () => {
      const s = scale();
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, -x / s, -y / s, W / s, H / s, 0, 0, outW, outH);
      done = true;
      ro.disconnect();
      m.close();
      resolve(encodeCanvas(canvas));
    };
  });
}

export function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

export function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}
