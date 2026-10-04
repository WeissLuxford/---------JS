import { icon } from "./icons.js";
import { esc, $, toast } from "./ui.js";
import { clone, sameContent } from "./sheet-util.js";
export function installUndo(X) {
  const { S, id } = X;

  function restoreFrom(c, before) {
    const keep = new Set(["id", "ownerUid", "ownerName", "visibility", "createdAt", "updatedAt", "updatedBy"]);
    for (const k of new Set([...Object.keys(c), ...Object.keys(before)])) {
      if (keep.has(k)) continue;
      if (before[k] === undefined) delete c[k];
      else c[k] = clone(before[k]);
    }
  }

  function showUndo(label, before) {
    if (X.readOnly()) return;
    S.undo = { label, before };
    let bar = document.getElementById("undo-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "undo-bar";
      document.body.appendChild(bar);
    }
    bar.innerHTML = `<span>${esc(label)}</span><button class="btn sm" data-undo>${icon("history")}Отменить</button>`;
    bar.classList.add("in");
    clearTimeout(S.undoTimer);
    S.undoTimer = setTimeout(hideUndo, 7000);
  }

  function hideUndo() {
    clearTimeout(S.undoTimer);
    const bar = document.getElementById("undo-bar");
    if (bar) bar.classList.remove("in");
  }

  function doUndo() {
    const u = S.undo;
    S.undo = null;
    hideUndo();
    if (!u || S.disposed) return;
    X.mutate(c => restoreFrom(c, u.before), { render: false });
    X.renderAll(true);
    toast(`${icon("history")} Отменено: ${esc(u.label)}`, { timeout: 2200 });
  }

  function withUndo(label, fn) {
    if (!S.c || X.readOnly()) return fn();
    const before = clone(S.c);
    const done = () => {
      if (!S.disposed && S.c && !sameContent(before, S.c)) showUndo(label, before);
    };
    const r = fn();
    if (r && typeof r.then === "function") r.then(done, done);
    else done();
    return r;
  }

  Object.assign(X, { restoreFrom, showUndo, hideUndo, doUndo, withUndo });
}
