import { FIREBASE_CONFIG, FIREBASE_VERSION } from "./config.js";
import { DELETE, applyPaths } from "./sync.js";
import { whoAmI } from "./device.js";
import { initAccess, currentUid, getAccess } from "./access.js";

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const LS_CHARS = "dnd.chars";
const LS_HIST = "dnd.hist.";
const HISTORY_LIMIT = 40;
const OFFLINE_MSG = "Нет связи: изменения сохранятся, когда появится интернет";

let fs = null;
let db = null;
let mode = "local";
let pending = 0;
const statusListeners = new Set();
const localListeners = new Set();
let status = { mode: "local", state: "idle", error: "" };

function setStatus(patch) {
  status = { ...status, ...patch, mode };
  statusListeners.forEach(fn => fn(status));
}

export function onStatus(fn) {
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

export function getMode() {
  return mode;
}

export const validId = id => typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);

const clone = v => JSON.parse(JSON.stringify(v ?? null));

const who = () => whoAmI();

export const EMULATOR = new URLSearchParams(location.search).has("emu");
const LS_RECENT = "dnd.recent";

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_CHARS) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function writeLocal(map) {
  try {
    localStorage.setItem(LS_CHARS, JSON.stringify(map));
  } catch (e) {
    pruneLocalHistory();
    try {
      localStorage.setItem(LS_CHARS, JSON.stringify(map));
    } catch {
      setStatus({ state: "error", error: "Память браузера переполнена: изменения не сохранены. Скачай персонажа в файл или уменьши портрет." });
      throw e;
    }
  }
  localListeners.forEach(fn => fn(map));
}

function pruneLocalHistory() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_HIST)) localStorage.removeItem(k);
    }
  } catch {}
}

function storageOk() {
  try {
    const k = "__dnd_probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

window.addEventListener("storage", e => {
  if (mode === "local" && e.key === LS_CHARS) {
    const map = readLocal();
    localListeners.forEach(fn => fn(map));
  }
});

window.addEventListener("offline", () => {
  if (mode === "cloud") setStatus({ state: "offline", error: OFFLINE_MSG });
});

window.addEventListener("online", () => {
  if (mode === "cloud" && status.state === "offline") setStatus({ state: pending ? "saving" : "saved", error: "" });
});

export async function initStore() {
  try {
    const [appMod, fsMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-firestore.js`)
    ]);
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    try {
      db = fsMod.initializeFirestore(app, {
        localCache: storageOk() && !EMULATOR
          ? fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() })
          : fsMod.memoryLocalCache()
      });
    } catch {
      db = fsMod.getFirestore(app);
    }
    if (EMULATOR) fsMod.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    fs = fsMod;
    mode = "cloud";
    await initAccess({ app, fsMod, database: db, cdn: CDN, emulator: EMULATOR });
    setStatus({ state: navigator.onLine === false ? "offline" : "idle", error: navigator.onLine === false ? OFFLINE_MSG : "" });
  } catch {
    mode = "local";
    setStatus({ state: "idle", error: "Облако недоступно, данные хранятся только в этом браузере" });
  }
  return mode;
}

function listFrom(q, cb) {
  return fs.onSnapshot(
    q,
    { includeMetadataChanges: true },
    snap => {
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      cb(list, { fromCache: snap.metadata.fromCache });
    },
    err => {
      if (!String(err && err.code).includes("permission-denied")) setStatus({ state: "error", error: humanError(err) });
      cb(null, { error: err });
    }
  );
}

export function subscribeList(cb, scope = "mine") {
  if (mode === "cloud") {
    const uid = currentUid();
    if (scope === "all") return listFrom(fs.collection(db, "characters"), cb);
    if (!uid) {
      cb([], {});
      return () => {};
    }
    return listFrom(fs.query(fs.collection(db, "characters"), fs.where("ownerUid", "==", uid)), cb);
  }
  const emit = map => cb(Object.entries(map).map(([id, c]) => ({ ...c, id })), {});
  emit(readLocal());
  localListeners.add(emit);
  return () => localListeners.delete(emit);
}

export function subscribeInvites(email, cb) {
  if (mode !== "cloud" || !email) {
    cb([], {});
    return () => {};
  }
  return listFrom(fs.collection(db, "invites", email.toLowerCase(), "chars"), cb);
}

export function subscribeChar(id, cb) {
  if (mode === "cloud") {
    try {
      return fs.onSnapshot(
        fs.doc(db, "characters", id),
        { includeMetadataChanges: true },
        snap => {
          if (!snap.exists()) {
            if (snap.metadata.fromCache) return cb(undefined, { offline: true });
            return cb(null, {});
          }
          cb({ ...snap.data(), id: snap.id }, { pendingWrites: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache });
        },
        err => {
          setStatus({ state: "error", error: humanError(err) });
          cb(undefined, { error: err });
        }
      );
    } catch (e) {
      cb(null, {});
      return () => {};
    }
  }
  let last = "";
  const emit = map => {
    const json = map[id] ? JSON.stringify(map[id]) : "";
    if (json === last) return;
    last = json;
    cb(map[id] ? { ...clone(map[id]), id } : null, {});
  };
  emit(readLocal());
  localListeners.add(emit);
  return () => localListeners.delete(emit);
}

function stripId(c) {
  const data = clone(c);
  delete data.id;
  return data;
}

export async function saveChanges(id, changes, full) {
  const now = Date.now();
  if (mode === "local") {
    const map = readLocal();
    const doc = map[id] ? map[id] : stripId(full);
    applyPaths(doc, changes);
    doc.updatedAt = now;
    doc.updatedBy = who();
    map[id] = doc;
    writeLocal(map);
    setStatus({ state: "saved", error: "" });
    return;
  }
  const ref = fs.doc(db, "characters", id);
  const args = [];
  for (const [path, value] of changes) {
    args.push(new fs.FieldPath(...path), value === DELETE ? fs.deleteField() : value);
  }
  args.push("updatedAt", now, "updatedBy", who());
  pending++;
  setStatus({ state: navigator.onLine === false ? "offline" : "saving", error: navigator.onLine === false ? OFFLINE_MSG : "" });
  const slow = setTimeout(() => setStatus({ state: "offline", error: OFFLINE_MSG }), 6000);
  try {
    try {
      await fs.updateDoc(ref, ...args);
    } catch (e) {
      if (!String(e && e.code).includes("not-found")) throw e;
      await fs.setDoc(ref, { ...stripId(full), updatedAt: now });
    }
    pending--;
    if (!pending) setStatus({ state: "saved", error: "" });
  } catch (e) {
    pending--;
    setStatus({ state: "error", error: humanError(e) });
    throw e;
  } finally {
    clearTimeout(slow);
  }
}

export async function createChar(id, c) {
  const now = Date.now();
  const data = { ...stripId(c), createdAt: now, updatedAt: now, updatedBy: who() };
  delete data.archived;
  data.archived = false;
  if (mode === "cloud") {
    const a = getAccess();
    data.ownerUid = a.uid;
    data.ownerName = a.name;
  }
  if (mode === "local") {
    const map = readLocal();
    map[id] = data;
    writeLocal(map);
    return id;
  }
  await fs.setDoc(fs.doc(db, "characters", id), data);
  return id;
}

export async function createIfMissing(id, c) {
  if (mode === "local") {
    if (!readLocal()[id]) await createChar(id, c);
    return;
  }
  const ref = fs.doc(db, "characters", id);
  const snap = await fs.getDoc(ref);
  if (snap.exists()) return;
  const now = Date.now();
  await fs.runTransaction(db, async t => {
    const cur = await t.get(ref);
    if (!cur.exists()) t.set(ref, { ...stripId(c), createdAt: now, updatedAt: now });
  });
}

export async function claimCharacter(id) {
  const a = getAccess();
  await fs.updateDoc(fs.doc(db, "characters", id), { ownerUid: a.uid, ownerName: a.name, updatedAt: Date.now(), updatedBy: who() });
}

export async function getAcl(id) {
  if (mode !== "cloud") return null;
  const snap = await fs.getDoc(fs.doc(db, "characters", id, "acl", "main"));
  return snap.exists() ? snap.data() : { emails: [] };
}

export async function saveAcl(id, emails, meta) {
  const prev = await getAcl(id).catch(() => ({ emails: [] }));
  const clean = [...new Set(emails.map(e => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  await fs.setDoc(fs.doc(db, "characters", id, "acl", "main"), { emails: clean, updatedAt: Date.now() });
  const removed = (prev.emails || []).filter(e => !clean.includes(e));
  const added = clean.filter(e => !(prev.emails || []).includes(e));
  await Promise.all([
    ...added.map(e => fs.setDoc(fs.doc(db, "invites", e, "chars", id), { ...meta, at: Date.now() }).catch(() => {})),
    ...removed.map(e => fs.deleteDoc(fs.doc(db, "invites", e, "chars", id)).catch(() => {}))
  ]);
  return clean;
}

export async function deleteCharacter(id) {
  if (mode !== "cloud") {
    const map = readLocal();
    delete map[id];
    writeLocal(map);
    try {
      localStorage.removeItem(LS_HIST + id);
    } catch {}
    removeRecent(id);
    return;
  }
  const acl = await getAcl(id).catch(() => null);
  const hist = await fs.getDocs(fs.collection(db, "characters", id, "history")).catch(() => null);
  if (hist) await Promise.all(hist.docs.map(d => fs.deleteDoc(d.ref).catch(() => {})));
  if (acl && acl.emails) await Promise.all(acl.emails.map(e => fs.deleteDoc(fs.doc(db, "invites", e, "chars", id)).catch(() => {})));
  await fs.deleteDoc(fs.doc(db, "characters", id, "acl", "main")).catch(() => {});
  await fs.deleteDoc(fs.doc(db, "characters", id));
  removeRecent(id);
}

export function getRecents() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
    return Array.isArray(v) ? v.filter(x => x && validId(x.id)) : [];
  } catch {
    return [];
  }
}

export function addRecent(c) {
  if (!c || !validId(c.id)) return;
  const list = getRecents().filter(x => x.id !== c.id);
  list.unshift({ id: c.id, name: String(c.name || "").slice(0, 120), sub: String(c.sub || "").slice(0, 120), at: Date.now() });
  try {
    localStorage.setItem(LS_RECENT, JSON.stringify(list.slice(0, 24)));
  } catch {}
}

export function removeRecent(id) {
  try {
    localStorage.setItem(LS_RECENT, JSON.stringify(getRecents().filter(x => x.id !== id)));
  } catch {}
}

export async function getCharOnce(id) {
  if (mode !== "cloud") {
    const c = readLocal()[id];
    return c ? { ...c, id } : null;
  }
  const snap = await fs.getDoc(fs.doc(db, "characters", id));
  return snap.exists() ? { ...snap.data(), id } : null;
}

export async function addHistory(id, data, reason) {
  const body = stripId(data);
  delete body.portrait;
  delete body.updatedBy;
  const entry = { at: Date.now(), reason: reason || "", by: who(), data: body };
  try {
    if (mode === "cloud") {
      await fs.addDoc(fs.collection(db, "characters", id, "history"), entry);
    } else {
      const key = LS_HIST + id;
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {}
      list.unshift({ ...entry, id: String(entry.at) });
      list = list.slice(0, HISTORY_LIMIT);
      try {
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        localStorage.setItem(key, JSON.stringify(list.slice(0, 5)));
      }
    }
  } catch (e) {
    console.warn("history", e);
  }
}

export async function listHistory(id) {
  if (mode === "cloud") {
    const q = fs.query(fs.collection(db, "characters", id, "history"), fs.orderBy("at", "desc"), fs.limit(HISTORY_LIMIT));
    const snap = await fs.getDocs(q);
    const out = [];
    snap.forEach(d => out.push({ ...d.data(), id: d.id }));
    return out;
  }
  try {
    return JSON.parse(localStorage.getItem(LS_HIST + id) || "[]");
  } catch {
    return [];
  }
}

export function humanError(e) {
  const code = String((e && (e.code || e.name)) || "");
  const msg = String((e && e.message) || "");
  if (code.includes("permission-denied")) return "Нет прав на правку: устройство запрещено, редактирование закрыто владельцем или правила Firestore не пускают";
  if (code.includes("unavailable")) return OFFLINE_MSG;
  if (code.includes("resource-exhausted")) return "Превышен бесплатный лимит Firebase на сегодня";
  if (code.includes("QuotaExceeded") || msg.includes("quota")) return "Память браузера переполнена";
  if (msg.includes("exceeds the maximum") || code.includes("invalid-argument")) return "Персонаж слишком большой: уменьши портрет";
  return msg || "Неизвестная ошибка";
}
