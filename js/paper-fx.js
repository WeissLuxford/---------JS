import { icon } from "./icons.js";
import { liteOn } from "./ui.js";

const calm = () => liteOn() || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);

export function sealFx(kind) {
  if (calm()) return;
  const el = document.createElement("div");
  el.className = `seal-fx ${kind}`;
  el.setAttribute("aria-hidden", "true");
  const seal = icon("gi/lorc/wax-seal");
  el.innerHTML = kind === "crack" ? `<div class="sf"><i class="l">${seal}</i><i class="r">${seal}</i></div>` : `<div class="sf"><i>${seal}</i></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

export function inkLast(root) {
  if (calm() || !root) return;
  const cards = root.querySelectorAll('article.note[data-sec="sessions"]:not(.collapsed)');
  const entry = cards.length ? cards[0].querySelector(".tl-e:last-child") : null;
  const text = entry && entry.querySelector(".tl-t");
  if (!text) return;
  const pen = document.createElement("i");
  pen.className = "pen";
  pen.innerHTML = icon("quill");
  entry.appendChild(pen);
  entry.classList.add("ink");
  setTimeout(() => {
    pen.remove();
    entry.classList.remove("ink");
  }, 1300);
}

export function flip(el) {
  if (calm() || !el) return;
  el.classList.add("flip");
  setTimeout(() => el.classList.remove("flip"), 600);
}
