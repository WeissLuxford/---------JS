export const BACKUP_GAP = 2 * 60 * 60 * 1000;
export const BACKUP_MAX = 8;
export const FILE_DAYS = 7;

const KEY = id => "dnd.backup." + id;
const FILE_KEY = id => "dnd.backup.file." + id;
const VOLATILE = ["id", "updatedAt", "updatedBy", "createdAt"];

export function backupPayload(c) {
  const data = JSON.parse(JSON.stringify(c || {}));
  for (const k of VOLATILE) delete data[k];
  return data;
}

export function backupFile(c) {
  return JSON.stringify({ format: "dnd-sheet", version: 1, character: backupPayload(c) }, null, 2);
}

const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };

export function translit(s) {
  return String(s || "").replace(/[а-яё]/gi, ch => {
    const t = TR[ch.toLowerCase()] ?? "";
    return ch === ch.toLowerCase() ? t : t.charAt(0).toUpperCase() + t.slice(1);
  });
}

export function backupName(c, now = Date.now()) {
  const d = new Date(now);
  const pad = n => String(n).padStart(2, "0");
  const name = translit((c && c.name) || "character").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "character";
  return `${name}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export function listBackups(id, store = globalThis.localStorage) {
  try {
    const v = JSON.parse(store.getItem(KEY(id)) || "[]");
    return Array.isArray(v) ? v.filter(x => x && typeof x.data === "string" && Number(x.at) > 0).sort((a, b) => b.at - a.at) : [];
  } catch {
    return [];
  }
}

export function saveBackup(id, c, { now = Date.now(), force = false, store = globalThis.localStorage } = {}) {
  if (!id || !c || !store) return false;
  const list = listBackups(id, store);
  const last = list[0];
  if (last && !force && now - last.at < BACKUP_GAP) return false;
  const data = JSON.stringify(backupPayload(c));
  if (last && last.data === data) return false;
  const entry = { at: now, name: String(c.name || ""), level: Number(c.info && c.info.level) || 1, data };
  let next = [entry, ...list].slice(0, BACKUP_MAX);
  while (next.length) {
    try {
      store.setItem(KEY(id), JSON.stringify(next));
      return true;
    } catch {
      next = next.slice(0, -1);
    }
  }
  return false;
}

export function readBackup(entry) {
  try {
    return JSON.parse(entry.data);
  } catch {
    return null;
  }
}

export function fileDue(id, now = Date.now(), store = globalThis.localStorage) {
  try {
    const last = Number(store.getItem(FILE_KEY(id))) || 0;
    return now - last > FILE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function lastFile(id, store = globalThis.localStorage) {
  try {
    return Number(store.getItem(FILE_KEY(id))) || 0;
  } catch {
    return 0;
  }
}

export function markFile(id, now = Date.now(), store = globalThis.localStorage) {
  try {
    store.setItem(FILE_KEY(id), String(now));
  } catch {}
}
