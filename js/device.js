const LS_DEVICE = "dnd.device";

function read(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function write(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}

let deviceId = read(LS_DEVICE);
if (!deviceId) {
  deviceId = Math.random().toString(36).slice(2, 10);
  write(LS_DEVICE, deviceId);
}

function detect() {
  const ua = navigator.userAgent || "";
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const tablet = /iPad|Tablet/i.test(ua) || touchMac || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const phone = !tablet && /Mobi|iPhone|iPod|Android/i.test(ua);
  const kind = phone ? "phone" : tablet ? "tablet" : "desktop";
  const os = /iPhone|iPad|iPod/.test(ua) || touchMac ? "iOS" : /Android/i.test(ua) ? "Android" : /Windows/i.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "";
  const browser = /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return { kind, os, browser };
}

const info = detect();

export const KIND_NAMES = { phone: "Телефон", tablet: "Планшет", desktop: "Компьютер" };
export const KIND_ICONS = { phone: "phone", tablet: "tablet", desktop: "monitor" };

let identity = () => ({ uid: "", name: "" });

export function bindIdentity(fn) {
  identity = fn;
}

export function whoAmI() {
  const me = identity();
  return { uid: me.uid, name: me.name, kind: info.kind };
}

export function isMe(by) {
  if (!by) return false;
  const uid = identity().uid;
  if (by.uid && uid) return by.uid === uid;
  return by.id === deviceId;
}

export function describeWho(by) {
  if (!by || !by.kind) return "Неизвестное устройство";
  const device = [KIND_NAMES[by.kind] || "Устройство", [by.os, by.browser].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  return by.name ? `${by.name}, ${device.toLowerCase()}` : device;
}

export function shortWho(by) {
  if (!by || !by.kind) return "";
  const where = { phone: "с телефона", tablet: "с планшета", desktop: "с компьютера" }[by.kind] || "";
  return by.name ? `${by.name}, ${where}` : where;
}
