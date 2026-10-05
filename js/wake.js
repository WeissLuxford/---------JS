const KEY = "dnd.wake";
let lock = null;
let want = false;
let pending = false;

export function wakeSupported() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export function wakeOn() {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

async function grab() {
  if (!want || lock || pending || !wakeSupported() || document.visibilityState !== "visible") return;
  pending = true;
  try {
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => {
      lock = null;
    });
  } catch {
    lock = null;
  }
  pending = false;
  if (!want && lock) drop();
}

function drop() {
  const l = lock;
  lock = null;
  if (l) l.release().catch(() => {});
}

export function keepAwake(on) {
  want = !!on && wakeOn();
  if (want) grab();
  else drop();
}

export function setWake(on) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  keepAwake(on);
  return on;
}

export function isAwake() {
  return !!lock;
}

if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") grab();
  });
  document.addEventListener("pointerdown", () => grab(), { passive: true });
}
