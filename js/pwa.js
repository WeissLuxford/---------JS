import { esc, openModal, toast } from "./ui.js";
import { icon } from "./icons.js";

let deferred = null;
const listeners = new Set();

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferred = e;
  listeners.forEach(fn => fn());
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  listeners.forEach(fn => fn());
  toast(`${icon("check")} Приложение установлено. Ищи значок «Листы D&D» на экране.`, { kind: "good", timeout: 5000 });
});

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIOS() {
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function canInstall() {
  return !isStandalone() && (!!deferred || isIOS());
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function installApp() {
  if (isStandalone()) return toast("Сайт уже открыт как приложение", { timeout: 2500 });
  if (deferred) {
    const ev = deferred;
    deferred = null;
    ev.prompt();
    try {
      await ev.userChoice;
    } catch {}
    listeners.forEach(fn => fn());
    return;
  }
  const ios = isIOS();
  openModal({
    title: "Установить как приложение",
    cls: "small",
    body: ios
      ? `<ol class="install-steps"><li>Открой сайт в <b>Safari</b> (в других браузерах на iPhone этого пункта может не быть).</li><li>Нажми кнопку <b>«Поделиться»</b> ${icon("upload")} внизу экрана.</li><li>Выбери <b>«На экран „Домой“»</b> и нажми «Добавить».</li></ol><p class="hint">Значок «Листы D&amp;D» появится рядом с другими приложениями и откроется без адресной строки.</p>`
      : `<ol class="install-steps"><li>Открой меню браузера ${icon("dots")} в правом верхнем углу.</li><li>Выбери <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>.</li></ol><p class="hint">Если такого пункта нет, обнови страницу и попробуй ещё раз: браузер предлагает установку после первого посещения.</p>`
  });
}

export function installBanner() {
  if (!canInstall()) return "";
  return `<div class="install-bar"><img src="icon-192.png" alt="" width="40" height="40"><span><b>Листы D&amp;D как приложение</b><small>Значок на экране телефона, открывается без браузера, работает без интернета.</small></span><button class="btn gold sm" data-install>${esc("Установить")}</button></div>`;
}
