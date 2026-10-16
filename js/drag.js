export function enableItemDrag(root, { canDrag = () => true, onDrop }) {
  let st = null;
  let suppress = false;
  const HOLD = 230;

  const clear = () => {
    if (!st) return;
    clearTimeout(st.timer);
    clearTimeout(st.still);
    cancelAnimationFrame(st.raf);
    if (st.ghost) st.ghost.remove();
    if (st.el) st.el.classList.remove("drag-src");
    if (st.over) st.over.classList.remove("drop-over");
    root.classList.remove("item-dragging");
    st = null;
  };

  const lift = () => {
    if (!st || st.ghost) return;
    const r = st.el.getBoundingClientRect();
    const ghost = st.el.cloneNode(true);
    ghost.classList.add("drag-ghost", "item-ghost");
    ghost.removeAttribute("data-dz");
    Object.assign(ghost.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    document.body.appendChild(ghost);
    st.ghost = ghost;
    st.dx = st.x - r.left;
    st.dy = st.y - r.top;
    st.el.classList.add("drag-src");
    root.classList.add("item-dragging");
    if (st.touch) st.still = setTimeout(() => st && !st.moved && clear(), 240);
    if (st.touch && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    const tick = () => {
      if (!st) return;
      const edge = st.y < 90 ? -1 : st.y > window.innerHeight - 120 ? 1 : 0;
      if (edge) {
        window.scrollBy(0, edge * 12);
        hover();
      }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  };

  const targetAt = (x, y) => {
    if (st.ghost) st.ghost.style.display = "none";
    const under = document.elementFromPoint(x, y);
    if (st.ghost) st.ghost.style.display = "";
    const t = under && under.closest("[data-dz]");
    return t && root.contains(t) && t !== st.el ? t : null;
  };

  const hover = () => {
    const t = targetAt(st.x, st.y);
    if (t === st.over) return;
    if (st.over) st.over.classList.remove("drop-over");
    st.over = t;
    if (t) t.classList.add("drop-over");
  };

  const down = e => {
    if (e.button > 0 || st) return;
    const el = e.target.closest("[data-drag]");
    if (!el || !root.contains(el) || e.target.closest("input, textarea, select, .drag-h") || !canDrag(el)) return;
    st = { el, id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, touch: e.pointerType !== "mouse" };
    if (st.touch) st.timer = setTimeout(lift, HOLD);
  };

  const move = e => {
    if (!st || e.pointerId !== st.id) return;
    st.x = e.clientX;
    st.y = e.clientY;
    if (!st.ghost) {
      const far = Math.hypot(st.x - st.sx, st.y - st.sy);
      if (st.touch) {
        if (far > 8) clear();
        return;
      }
      if (far < 6) return;
      lift();
    }
    e.preventDefault();
    if (Math.hypot(st.x - st.sx, st.y - st.sy) > 6) st.moved = true;
    st.ghost.style.left = st.x - st.dx + "px";
    st.ghost.style.top = st.y - st.dy + "px";
    hover();
  };

  const up = e => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.ghost) return clear();
    const t = targetAt(e.clientX, e.clientY);
    const src = st.el;
    clear();
    suppress = true;
    setTimeout(() => (suppress = false), 400);
    if (t) onDrop(src, t);
  };

  const touchMove = e => {
    if (st && st.ghost && e.cancelable) e.preventDefault();
  };
  const click = e => {
    if (!suppress) return;
    suppress = false;
    e.preventDefault();
    e.stopPropagation();
  };
  const menu = e => {
    if (st && st.ghost) e.preventDefault();
  };

  root.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", clear);
  document.addEventListener("touchmove", touchMove, { passive: false });
  root.addEventListener("click", click, true);
  root.addEventListener("contextmenu", menu);
  return () => {
    clear();
    root.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", clear);
    document.removeEventListener("touchmove", touchMove);
    root.removeEventListener("click", click, true);
    root.removeEventListener("contextmenu", menu);
  };
}
