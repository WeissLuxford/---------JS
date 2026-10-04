const LS_DEVICE = "dnd.device";
const LS_NAME = "dnd.editorName";

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

function detectGpu() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const raw = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "");
    const angle = raw.match(/ANGLE \(([^,]+),\s*([^,]+?)(?:\s+Direct3D|\s+\(0x|\s+OpenGL|\s+Vulkan|,|\))/);
    let name = angle ? angle[2] : raw;
    name = name.replace(/^ANGLE Metal Renderer:\s*/i, "").replace(/\(TM\)|\(R\)|Series|Graphics|\/PCIe\/SSE2|Mesa|DRI/gi, "").replace(/\s+/g, " ").trim();
    if (/^(WebKit WebGL|Google SwiftShader|llvmpipe)/i.test(name)) return "";
    return name.slice(0, 40);
  } catch {
    return "";
  }
}

const info = { ...detect(), gpu: detectGpu() };

export const KIND_NAMES = { phone: "Телефон", tablet: "Планшет", desktop: "Компьютер" };
export const KIND_ICONS = { phone: "phone", tablet: "tablet", desktop: "monitor" };

export function editorName() {
  return read(LS_NAME).slice(0, 40);
}

export function setEditorName(name) {
  write(LS_NAME, String(name || "").trim().slice(0, 40));
}

export function whoAmI() {
  return { id: deviceId, kind: info.kind, os: info.os, browser: info.browser, gpu: info.gpu, name: editorName() };
}

let currentUid = () => "";

export function bindUid(fn) {
  currentUid = fn;
}

export function isMe(by) {
  if (!by) return false;
  const uid = currentUid();
  if (by.uid && uid) return by.uid === uid;
  return by.id === deviceId;
}

export function describeWho(by) {
  if (!by || !by.kind) return "Неизвестное устройство";
  const device = [KIND_NAMES[by.kind] || "Устройство", [by.os, by.browser].filter(Boolean).join(", "), by.gpu || ""].filter(Boolean).join(" · ");
  return by.name ? `${by.name} (${device})` : device;
}

export function shortWho(by) {
  if (!by || !by.kind) return "";
  const where = { phone: "с телефона", tablet: "с планшета", desktop: "с компьютера" }[by.kind] || "";
  return by.name ? `${by.name}, ${where}` : where;
}
