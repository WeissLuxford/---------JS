const KEY = "dnd.shake";

export function shakeSupported() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

export function shakeOn() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export async function setShake(on) {
  let ok = !!on;
  if (ok && shakeSupported() && typeof window.DeviceMotionEvent.requestPermission === "function") {
    try {
      ok = (await window.DeviceMotionEvent.requestPermission()) === "granted";
    } catch {
      ok = false;
    }
  }
  try {
    localStorage.setItem(KEY, ok ? "1" : "0");
  } catch {}
  return ok;
}

export function shakeForce(e) {
  const a = e && e.acceleration;
  if (a && (a.x != null || a.y != null || a.z != null)) return Math.hypot(a.x || 0, a.y || 0, a.z || 0);
  const g = e && e.accelerationIncludingGravity;
  if (!g) return 0;
  return Math.abs(Math.hypot(g.x || 0, g.y || 0, g.z || 0) - 9.81);
}

export function shakeDetector(cb, { threshold = 14, peaks = 2, window: span = 700, cooldown = 1500, now = () => Date.now() } = {}) {
  let hits = [];
  let quietUntil = 0;
  return e => {
    const t = now();
    if (t < quietUntil || shakeForce(e) < threshold) return;
    hits = hits.filter(x => t - x < span);
    if (hits.length && t - hits[hits.length - 1] < 90) return;
    hits.push(t);
    if (hits.length >= peaks) {
      hits = [];
      quietUntil = t + cooldown;
      cb();
    }
  };
}

export function watchShake(cb) {
  if (!shakeSupported()) return () => {};
  const h = shakeDetector(cb);
  window.addEventListener("devicemotion", h);
  return () => window.removeEventListener("devicemotion", h);
}
