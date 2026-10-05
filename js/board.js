import { icon } from "./icons.js";
import { esc, openModal } from "./ui.js";
import { NOTE_SECTIONS, SECTION_NAME, NOTE_ATTITUDE, CLUE_STATE, NOTE_STATUS, referencedIds, linkIndex, mentionMatcher, plainText, norm } from "./notes.js";

export const BOARD_SECTIONS = { people: "#e9c77a", places: "#6fc7b8", quests: "#f29b4b", clues: "#e5674f", sessions: "#9aa3b5", patron: "#c07cff", misc: "#b9ab92" };
const DEFAULT_ON = ["people", "places", "quests", "clues"];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function buildGraph(c, { sections = DEFAULT_ON, onlyLinked = false } = {}) {
  const on = new Set(sections);
  const index = linkIndex(c);
  const matcher = mentionMatcher(c);
  const nodes = [];
  const byId = new Map();
  for (const s of NOTE_SECTIONS) {
    if (!on.has(s.key)) continue;
    for (const n of (c.notes && c.notes[s.key]) || []) {
      const node = { id: n.id, sec: s.key, title: n.title || "Без названия", subtitle: n.subtitle || "", text: n.text || "", status: n.status || n.attitude || n.state || "", pinned: !!n.pinned };
      nodes.push(node);
      byId.set(n.id, node);
    }
  }
  const edges = new Map();
  for (const s of NOTE_SECTIONS) {
    for (const n of (c.notes && c.notes[s.key]) || []) {
      const refs = referencedIds(c, n, index, matcher);
      for (const to of refs) {
        if (byId.has(n.id) && byId.has(to)) {
          const key = n.id < to ? `${n.id}|${to}` : `${to}|${n.id}`;
          const e = edges.get(key) || { a: n.id < to ? n.id : to, b: n.id < to ? to : n.id, w: 0, via: [] };
          e.w += 1;
          edges.set(key, e);
        } else if (!byId.has(n.id) && byId.has(to)) {
          for (const other of refs) {
            if (other === to || !byId.has(other)) continue;
            const key = to < other ? `${to}|${other}` : `${other}|${to}`;
            const e = edges.get(key) || { a: to < other ? to : other, b: to < other ? other : to, w: 0, via: [] };
            if (!e.via.includes(n.title)) {
              e.w += 1;
              e.via.push(n.title || "заметка");
            }
            edges.set(key, e);
          }
        }
      }
    }
  }
  const list = [...edges.values()];
  const degree = new Map();
  for (const e of list) {
    degree.set(e.a, (degree.get(e.a) || 0) + 1);
    degree.set(e.b, (degree.get(e.b) || 0) + 1);
  }
  const kept = onlyLinked ? nodes.filter(n => degree.has(n.id)) : nodes;
  for (const n of kept) n.degree = degree.get(n.id) || 0;
  return { nodes: kept, edges: list };
}

export function layoutGraph(graph, saved = {}, { width = 1000, height = 700, iterations = 260 } = {}) {
  const nodes = graph.nodes;
  const n = nodes.length;
  const pos = new Map();
  if (!n) return pos;
  const cx = width / 2;
  const cy = height / 2;
  nodes.forEach((node, i) => {
    const s = saved[node.id];
    if (s && Number.isFinite(s.x) && Number.isFinite(s.y)) pos.set(node.id, { x: s.x, y: s.y, fixed: true });
    else {
      const a = hash(node.id) * Math.PI * 2;
      const r = 80 + hash(node.id + "r") * Math.min(width, height) * 0.38;
      pos.set(node.id, { x: cx + Math.cos(a) * r + (i % 3), y: cy + Math.sin(a) * r, fixed: false });
    }
  });
  const k = Math.sqrt((width * height) / Math.max(1, n)) * 0.75;
  let t = width / 8;
  const ids = nodes.map(x => x.id);
  for (let it = 0; it < iterations; it++) {
    const disp = new Map(ids.map(id => [id, { x: 0, y: 0 }]));
    for (let i = 0; i < n; i++) {
      const a = pos.get(ids[i]);
      for (let j = i + 1; j < n; j++) {
        const b = pos.get(ids[j]);
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d = Math.hypot(dx, dy);
        if (d < 0.01) {
          dx = 0.01 * (i - j);
          dy = 0.01;
          d = 0.02;
        }
        const f = (k * k) / d;
        const da = disp.get(ids[i]);
        const db = disp.get(ids[j]);
        da.x += (dx / d) * f;
        da.y += (dy / d) * f;
        db.x -= (dx / d) * f;
        db.y -= (dy / d) * f;
      }
    }
    for (const e of graph.edges) {
      const a = pos.get(e.a);
      const b = pos.get(e.b);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const f = ((d * d) / k) * Math.min(2, 0.6 + 0.2 * e.w);
      const da = disp.get(e.a);
      const db = disp.get(e.b);
      da.x -= (dx / d) * f;
      da.y -= (dy / d) * f;
      db.x += (dx / d) * f;
      db.y += (dy / d) * f;
    }
    for (const id of ids) {
      const p = pos.get(id);
      if (p.fixed) continue;
      const dp = disp.get(id);
      dp.x += (cx - p.x) * 0.02 * k / 10;
      dp.y += (cy - p.y) * 0.02 * k / 10;
      const d = Math.max(0.01, Math.hypot(dp.x, dp.y));
      p.x += (dp.x / d) * Math.min(d, t);
      p.y += (dp.y / d) * Math.min(d, t);
      p.x = Math.max(85, Math.min(width - 85, p.x));
      p.y = Math.max(40, Math.min(height - 50, p.y));
    }
    t = Math.max(1, t * 0.97);
  }
  return pos;
}

const SAVE_KEY = id => "dnd.board." + id;

function loadSaved(id) {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY(id)) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function storeSaved(id, v) {
  try {
    localStorage.setItem(SAVE_KEY(id), JSON.stringify(v));
  } catch {}
}

const STATUS_COLOR = sec => (sec === "people" ? NOTE_ATTITUDE : sec === "clues" ? CLUE_STATE : sec === "quests" ? NOTE_STATUS : {});
const SEC_ICON = Object.fromEntries(NOTE_SECTIONS.map(s => [s.key, s.icon]));

export function openBoard({ c, charId, onOpen }) {
  const st = { sections: new Set(DEFAULT_ON), onlyLinked: false, sel: "", q: "", view: { x: 0, y: 0, s: 1 } };
  let W = 1000;
  let H = 700;
  let saved = loadSaved(charId);
  let graph;
  let pos;
  const m = openModal({ title: "Доска расследования", wide: true, cls: "board-modal", body: "" });
  m.body.innerHTML = `<div class="bd-tools">
      <div class="chips">${NOTE_SECTIONS.map(s => `<button class="chip toggle ${st.sections.has(s.key) ? "on" : ""}" data-bd-sec="${s.key}" style="--c:${BOARD_SECTIONS[s.key]}">${icon(s.icon)}${esc(s.name)}</button>`).join("")}</div>
      <div class="bd-row"><label class="search-box">${icon("search")}<input type="search" data-bd-q placeholder="Найти на доске"></label><label class="fld chk"><input type="checkbox" data-bd-linked><span>Только со связями</span></label></div>
    </div>
    <div class="bd-wrap"><svg class="bd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Связи заметок"><g data-bd-view></g></svg>
      <div class="bd-zoom"><button class="icon-btn" data-bd-zoom="1.25" title="Ближе">${icon("plus")}</button><button class="icon-btn" data-bd-zoom="0.8" title="Дальше">${icon("minus")}</button><button class="icon-btn" data-bd-reset title="Разложить заново">${icon("history")}</button></div>
      <div class="bd-empty" data-bd-empty hidden></div>
    </div>
    <div class="bd-card" data-bd-card hidden></div>
    <p class="hint bd-hint">Нити тянутся по ссылкам [[Имя]] и упоминаниям имён в заметках, а также через журнал: если двое упомянуты в одной записи, между ними тоже нить. Узлы можно двигать, место запомнится на этом устройстве.</p>`;
  const svg = m.body.querySelector(".bd-svg");
  const rect = svg.getBoundingClientRect();
  if (rect.width > 0 && rect.width < 700) {
    W = Math.max(420, Math.round(rect.width * 1.2));
    H = Math.max(420, Math.round((W * rect.height) / rect.width));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  }
  const clampSaved = v => Object.fromEntries(Object.entries(v).filter(([, p]) => p && Number.isFinite(p.x) && Number.isFinite(p.y)).map(([k, p]) => [k, { x: Math.max(85, Math.min(W - 85, p.x)), y: Math.max(40, Math.min(H - 50, p.y)) }]));
  const view = m.body.querySelector("[data-bd-view]");
  const card = m.body.querySelector("[data-bd-card]");
  const emptyEl = m.body.querySelector("[data-bd-empty]");
  const neighbors = id => new Set(graph.edges.filter(e => e.a === id || e.b === id).map(e => (e.a === id ? e.b : e.a)));
  const applyView = () => view.setAttribute("transform", `translate(${st.view.x} ${st.view.y}) scale(${st.view.s})`);
  const draw = () => {
    const near = st.sel ? neighbors(st.sel) : null;
    const q = norm(st.q.trim());
    const hit = q ? new Set(graph.nodes.filter(n => norm(n.title).includes(q) || norm(n.subtitle).includes(q)).map(n => n.id)) : null;
    const dim = id => (st.sel ? id !== st.sel && !near.has(id) : hit ? !hit.has(id) : false);
    const edgesSvg = graph.edges.map(e => {
      const a = pos.get(e.a);
      const b = pos.get(e.b);
      if (!a || !b) return "";
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 + Math.min(40, Math.hypot(a.x - b.x, a.y - b.y) * 0.08);
      const on = st.sel && (e.a === st.sel || e.b === st.sel);
      return `<path class="bd-edge ${on ? "on" : ""} ${st.sel && !on ? "dim" : ""}" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" stroke-width="${Math.min(5, 1.4 + e.w * 0.6).toFixed(1)}"><title>${esc(e.via.length ? "Через: " + e.via.join(", ") : "Ссылка в заметке")}</title></path>`;
    }).join("");
    const nodesSvg = graph.nodes.map(n => {
      const p = pos.get(n.id);
      const col = BOARD_SECTIONS[n.sec];
      const ring = (STATUS_COLOR(n.sec)[n.status] || [])[1] || col;
      const r = Math.min(30, 17 + n.degree * 2);
      const label = n.title.length > 22 ? n.title.slice(0, 21) + "…" : n.title;
      return `<g class="bd-node ${dim(n.id) ? "dim" : ""} ${st.sel === n.id ? "sel" : ""} ${hit && hit.has(n.id) ? "hit" : ""} ${n.status === "false" ? "false" : ""}" data-node="${esc(n.id)}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(SECTION_NAME[n.sec])}: ${esc(n.title)}">
        <circle class="bd-pin" r="${r}" style="--c:${col};--ring:${ring}"></circle>
        <circle class="bd-tack" cy="${-r + 3}" r="3.5"></circle>
        <svg class="bd-ic" x="-11" y="-11" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon(SEC_ICON[n.sec]).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>
        <text class="bd-label" y="${r + 15}" text-anchor="middle">${esc(label)}</text>
      </g>`;
    }).join("");
    view.innerHTML = `<g class="bd-edges">${edgesSvg}</g><g class="bd-nodes">${nodesSvg}</g>`;
    applyView();
    emptyEl.hidden = graph.nodes.length > 0 && graph.edges.length > 0;
    emptyEl.innerHTML = !graph.nodes.length ? `${icon("web")}<p>Здесь пока пусто. Добавь людей, места, задания и улики в «Заметках»: они появятся на доске.</p>` : `<p>Связей пока нет. Пиши [[Имя]] в заметках или просто упоминай людей и места в журнале: нити появятся сами.</p>`;
    if (graph.nodes.length && !graph.edges.length) emptyEl.classList.add("soft");
    else emptyEl.classList.remove("soft");
    showCard();
  };
  const showCard = () => {
    const n = graph.nodes.find(x => x.id === st.sel);
    card.hidden = !n;
    if (!n) return;
    const near = [...neighbors(n.id)].map(id => graph.nodes.find(x => x.id === id)).filter(Boolean);
    const stc = (STATUS_COLOR(n.sec)[n.status] || [])[0];
    card.innerHTML = `<div class="bd-card-h"><span class="badge" style="--c:${BOARD_SECTIONS[n.sec]}">${esc(SECTION_NAME[n.sec])}</span>${stc ? `<span class="badge">${esc(stc)}</span>` : ""}<b>${esc(n.title)}</b>${n.subtitle ? `<small>${esc(n.subtitle)}</small>` : ""}</div>
      <p>${esc(plainText(n.text).slice(0, 220) || "Пусто")}</p>
      ${near.length ? `<div class="bd-near">${icon("link")}${near.map(x => `<button class="tag" data-bd-go="${esc(x.id)}">${esc(x.title)}</button>`).join("")}</div>` : ""}
      <div class="form-actions"><button class="btn ghost sm" data-bd-unsel>Снять выделение</button><button class="btn gold sm" data-bd-open>${icon("scroll")}Открыть заметку</button></div>`;
  };
  const rebuild = (relayout = false) => {
    graph = buildGraph(c, { sections: [...st.sections], onlyLinked: st.onlyLinked });
    if (relayout || !pos) pos = layoutGraph(graph, clampSaved(saved), { width: W, height: H });
    else {
      const fresh = layoutGraph(graph, Object.fromEntries([...pos].map(([id, p]) => [id, { x: p.x, y: p.y }])), { width: W, height: H, iterations: 120 });
      pos = fresh;
    }
    if (st.sel && !graph.nodes.some(n => n.id === st.sel)) st.sel = "";
    draw();
  };
  const toLocal = (clientX, clientY) => {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: (p.x - st.view.x) / st.view.s, y: (p.y - st.view.y) / st.view.s, sx: p.x, sy: p.y };
  };
  const pointers = new Map();
  let drag = null;
  svg.addEventListener("pointerdown", e => {
    svg.setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    pointers.set(e.pointerId, p);
    const node = e.target.closest("[data-node]");
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      drag = { type: "pinch", d: Math.hypot(a.sx - b.sx, a.sy - b.sy), s: st.view.s, cx: (a.sx + b.sx) / 2, cy: (a.sy + b.sy) / 2, vx: st.view.x, vy: st.view.y };
      return;
    }
    drag = node ? { type: "node", id: node.dataset.node, moved: false, start: p } : { type: "pan", sx: p.sx, sy: p.sy, vx: st.view.x, vy: st.view.y, moved: false };
  });
  svg.addEventListener("pointermove", e => {
    if (!drag || !pointers.has(e.pointerId)) return;
    const p = toLocal(e.clientX, e.clientY);
    pointers.set(e.pointerId, p);
    if (drag.type === "pinch" && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
      const s = Math.max(0.35, Math.min(3, drag.s * (d / Math.max(1, drag.d))));
      st.view.x = drag.cx - ((drag.cx - drag.vx) * s) / drag.s;
      st.view.y = drag.cy - ((drag.cy - drag.vy) * s) / drag.s;
      st.view.s = s;
      return applyView();
    }
    if (drag.type === "node") {
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4) return;
      drag.moved = true;
      const q = pos.get(drag.id);
      q.x = p.x;
      q.y = p.y;
      q.fixed = true;
      return draw();
    }
    if (drag.type === "pan") {
      const dx = p.sx - drag.sx;
      const dy = p.sy - drag.sy;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      st.view.x = drag.vx + dx;
      st.view.y = drag.vy + dy;
      applyView();
    }
  });
  const end = e => {
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (drag.type === "pinch") {
      if (!pointers.size) drag = null;
      return;
    }
    if (drag.type === "node") {
      if (drag.moved) {
        const q = pos.get(drag.id);
        saved = { ...saved, [drag.id]: { x: Math.round(q.x), y: Math.round(q.y) } };
        storeSaved(charId, saved);
      } else {
        st.sel = st.sel === drag.id ? "" : drag.id;
        draw();
      }
    } else if (drag.type === "pan" && !drag.moved) {
      st.sel = "";
      draw();
    }
    if (!pointers.size || drag.type === "pinch") drag = null;
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    const s = Math.max(0.35, Math.min(3, st.view.s * (e.deltaY < 0 ? 1.12 : 0.89)));
    st.view.x = p.sx - (p.sx - st.view.x) * (s / st.view.s);
    st.view.y = p.sy - (p.sy - st.view.y) * (s / st.view.s);
    st.view.s = s;
    applyView();
  }, { passive: false });
  svg.addEventListener("keydown", e => {
    const node = e.target.closest && e.target.closest("[data-node]");
    if (node && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      st.sel = node.dataset.node;
      draw();
    }
  });
  m.body.addEventListener("click", e => {
    const sec = e.target.closest("[data-bd-sec]");
    if (sec) {
      const k = sec.dataset.bdSec;
      if (st.sections.has(k)) st.sections.delete(k);
      else st.sections.add(k);
      sec.classList.toggle("on", st.sections.has(k));
      return rebuild();
    }
    const z = e.target.closest("[data-bd-zoom]");
    if (z) {
      const f = Number(z.dataset.bdZoom);
      const s = Math.max(0.35, Math.min(3, st.view.s * f));
      st.view.x = W / 2 - ((W / 2 - st.view.x) * s) / st.view.s;
      st.view.y = H / 2 - ((H / 2 - st.view.y) * s) / st.view.s;
      st.view.s = s;
      return applyView();
    }
    if (e.target.closest("[data-bd-reset]")) {
      saved = {};
      storeSaved(charId, saved);
      st.view = { x: 0, y: 0, s: 1 };
      return rebuild(true);
    }
    const go = e.target.closest("[data-bd-go]");
    if (go) {
      st.sel = go.dataset.bdGo;
      return draw();
    }
    if (e.target.closest("[data-bd-unsel]")) {
      st.sel = "";
      return draw();
    }
    if (e.target.closest("[data-bd-open]")) {
      const n = graph.nodes.find(x => x.id === st.sel);
      if (!n) return;
      m.close();
      onOpen(n.sec, n.id);
    }
  });
  m.body.querySelector("[data-bd-q]").addEventListener("input", e => {
    st.q = e.target.value;
    draw();
  });
  m.body.querySelector("[data-bd-linked]").addEventListener("change", e => {
    st.onlyLinked = e.target.checked;
    rebuild();
  });
  rebuild(true);
  return m;
}
