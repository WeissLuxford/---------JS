export function enableItemDrag(root, { canDrag = () => true, onDrop, onEnd = () => {} }) {
  let st = null;
  let suppress = false;
  const HOLD = 230;

  const clear = () => {
    if (!st) return;
    clearTimeout(st.timer);
    cancelAnimationFrame(st.raf);
    if (st.ghost) st.ghost.remove();
    if (st.el) st.el.classList.remove("drag-src");
    if (st.over) st.over.classList.remove("drop-over");
    root.classList.remove("item-dragging");
    st = null;
    setTimeout(onEnd, 0);
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

  const begin = (el, x, y, touch, id) => {
    st = { el, id, x, y, sx: x, sy: y, touch };
    if (touch) st.timer = setTimeout(lift, HOLD);
  };

  const pick = target => {
    const el = target.closest && target.closest("[data-drag]");
    if (!el || !root.contains(el) || target.closest("input, textarea, select, .drag-h") || !canDrag(el)) return null;
    return el;
  };

  const follow = (x, y) => {
    st.x = x;
    st.y = y;
    st.ghost.style.left = x - st.dx + "px";
    st.ghost.style.top = y - st.dy + "px";
    hover();
  };

  const finish = (x, y) => {
    if (!st.ghost) return clear();
    const t = targetAt(x, y);
    const src = st.el;
    clear();
    suppress = true;
    setTimeout(() => (suppress = false), 500);
    if (t) onDrop(src, t);
  };

  const down = e => {
    if (e.pointerType === "touch" || e.button > 0 || st) return;
    const el = pick(e.target);
    if (el) begin(el, e.clientX, e.clientY, false, e.pointerId);
  };

  const move = e => {
    if (!st || st.touch || e.pointerId !== st.id) return;
    if (!st.ghost) {
      if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) < 6) return;
      st.x = e.clientX;
      st.y = e.clientY;
      lift();
    }
    e.preventDefault();
    follow(e.clientX, e.clientY);
  };

  const up = e => {
    if (!st || st.touch || e.pointerId !== st.id) return;
    finish(e.clientX, e.clientY);
  };

  const pointerCancel = e => {
    if (st && !st.touch) clear();
  };

  const touchStart = e => {
    if (st || e.touches.length !== 1) return clear();
    const el = pick(e.target);
    const t = e.touches[0];
    if (el) begin(el, t.clientX, t.clientY, true, t.identifier);
  };

  const touchMove = e => {
    if (!st || !st.touch) return;
    const t = Array.from(e.touches).find(x => x.identifier === st.id);
    if (!t) return;
    if (!st.ghost) {
      if (Math.hypot(t.clientX - st.sx, t.clientY - st.sy) > 8) clear();
      return;
    }
    if (e.cancelable) e.preventDefault();
    follow(t.clientX, t.clientY);
  };

  const touchEnd = e => {
    if (!st || !st.touch) return;
    const t = Array.from(e.changedTouches).find(x => x.identifier === st.id);
    if (!t) return;
    if (st.ghost && e.cancelable) e.preventDefault();
    finish(t.clientX, t.clientY);
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
  window.addEventListener("pointercancel", pointerCancel);
  root.addEventListener("touchstart", touchStart, { passive: true });
  document.addEventListener("touchmove", touchMove, { passive: false });
  document.addEventListener("touchend", touchEnd, { passive: false });
  document.addEventListener("touchcancel", clear);
  root.addEventListener("click", click, true);
  root.addEventListener("contextmenu", menu);
  const off = () => {
    clear();
    root.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", pointerCancel);
    root.removeEventListener("touchstart", touchStart);
    document.removeEventListener("touchmove", touchMove);
    document.removeEventListener("touchend", touchEnd);
    document.removeEventListener("touchcancel", clear);
    root.removeEventListener("click", click, true);
    root.removeEventListener("contextmenu", menu);
  };
  off.busy = () => !!st;
  return off;
}
