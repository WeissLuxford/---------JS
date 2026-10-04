import { FIREBASE_CONFIG, FIREBASE_VERSION } from "./config.js";
import { DELETE, applyPaths } from "./sync.js";
import { whoAmI } from "./device.js";
import { initAccess, currentUid, getAccess } from "./access.js";

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const LS_CHARS = "dnd.chars";
const LS_HIST = "dnd.hist.";
const HISTORY_LIMIT = 60;
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

const publicWho = () => {
  const w = whoAmI();
  return { uid: w.uid || "", name: w.name || "", kind: w.kind || "" };
};

export const EMULATOR = ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("emu");
const LS_RECENT = "dnd.recent";

function readLocal() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_CHARS) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function writeLocal(map, keepId) {
  const json = JSON.stringify(map);
  let saved = false;
  let pruned = false;
  for (let attempt = 0; attempt < 8 && !saved; attempt++) {
    try {
      localStorage.setItem(LS_CHARS, json);
      saved = true;
    } catch (e) {
      if (!pruneLocalHistory(keepId)) {
        setStatus({ state: "error", error: "Память браузера переполнена: изменения не сохранены. Скачай персонажа в файл или уменьши портрет." });
        throw e;
      }
      pruned = true;
    }
  }
  if (!saved) {
    setStatus({ state: "error", error: "Память браузера переполнена: изменения не сохранены" });
    throw new Error("quota");
  }
  if (pruned) setStatus({ state: "saved", error: "Память браузера почти заполнена: удалены старые версии из истории" });
  localListeners.forEach(fn => fn(map, { self: true }));
}

function pruneLocalHistory(keepId) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_HIST)) keys.push(k);
    }
    keys.sort((a, b) => (a === LS_HIST + keepId) - (b === LS_HIST + keepId));
    for (const k of keys) {
      const list = JSON.parse(localStorage.getItem(k) || "[]");
      if (!Array.isArray(list) || !list.length) {
        localStorage.removeItem(k);
        continue;
      }
      const half = list.slice(0, Math.floor(list.length / 2));
      if (half.length) localStorage.setItem(k, JSON.stringify(half));
      else localStorage.removeItem(k);
      return true;
    }
  } catch {}
  return false;
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
  let live = true;
  const emit = map => live && cb(Object.entries(map).map(([id, c]) => ({ ...c, id })), {});
  queueMicrotask(() => emit(readLocal()));
  localListeners.add(emit);
  return () => {
    live = false;
    localListeners.delete(emit);
  };
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
          const denied = String(err && err.code).includes("permission-denied");
          if (!denied) setStatus({ state: "error", error: humanError(err, "read") });
          cb(undefined, { error: err, denied });
        }
      );
    } catch (e) {
      cb(null, {});
      return () => {};
    }
  }
  let last = null;
  let live = true;
  const emit = (map, meta = {}) => {
    if (!live) return;
    const json = map[id] ? JSON.stringify(map[id]) : "";
    if (json === last) return;
    last = json;
    cb(map[id] ? { ...clone(map[id]), id } : null, { self: !!meta.self });
  };
  queueMicrotask(() => emit(readLocal()));
  localListeners.add(emit);
  return () => {
    live = false;
    localListeners.delete(emit);
  };
}

export function pendingWrites() {
  return pending;
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
    doc.updatedBy = publicWho();
    map[id] = doc;
    writeLocal(map, id);
    setStatus({ state: "saved", error: "" });
    return;
  }
  const ref = fs.doc(db, "characters", id);
  const args = [];
  for (const [path, value] of changes) {
    args.push(new fs.FieldPath(...path), value === DELETE ? fs.deleteField() : value);
  }
  args.push("updatedAt", now, "updatedBy", publicWho());
  pending++;
  setStatus({ state: navigator.onLine === false ? "offline" : "saving", error: navigator.onLine === false ? OFFLINE_MSG : "" });
  const slow = setTimeout(() => setStatus({ state: "offline", error: OFFLINE_MSG }), 6000);
  try {
    await fs.updateDoc(ref, ...args);
    pending--;
    if (!pending) setStatus({ state: "saved", error: "" });
  } catch (e) {
    pending--;
    setStatus({ state: "error", error: humanError(e, "write") });
    throw e;
  } finally {
    clearTimeout(slow);
  }
}

export function newCharId() {
  if (mode === "cloud") return fs.doc(fs.collection(db, "characters")).id;
  return Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

export function setVisibility(id, visibility) {
  if (mode !== "cloud") return Promise.resolve();
  return fs.updateDoc(fs.doc(db, "characters", id), { visibility, updatedAt: Date.now(), updatedBy: publicWho() });
}

export async function createChar(id, c) {
  const now = Date.now();
  const data = { ...stripId(c), createdAt: now, updatedAt: now, updatedBy: publicWho() };
  data.archived = false;
  delete data.ownerUid;
  delete data.ownerName;
  if (mode === "cloud") {
    const a = getAccess();
    data.visibility = "private";
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
  await fs.updateDoc(fs.doc(db, "characters", id), { ownerUid: a.uid, ownerName: a.name, updatedAt: Date.now(), updatedBy: publicWho() });
}

export async function getAcl(id) {
  if (mode !== "cloud") return null;
  const snap = await fs.getDoc(fs.doc(db, "characters", id, "acl", "main"));
  return snap.exists() ? snap.data() : { emails: [] };
}

export async function saveAcl(id, emails, meta) {
  const prev = await getAcl(id).catch(() => ({ emails: [] }));
  const clean = [...new Set(emails.map(e => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  const removed = (prev.emails || []).filter(e => !clean.includes(e));
  const added = clean.filter(e => !(prev.emails || []).includes(e));
  const now = Date.now();
  const batch = fs.writeBatch(db);
  batch.set(fs.doc(db, "characters", id, "acl", "main"), { emails: clean, updatedAt: now });
  for (const e of added) batch.set(fs.doc(db, "invites", e, "chars", id), { name: String(meta.name || "").slice(0, 120), ownerName: String(meta.ownerName || "").slice(0, 60), ownerUid: meta.ownerUid || "", at: now });
  for (const e of removed) batch.delete(fs.doc(db, "invites", e, "chars", id));
  await batch.commit();
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

export async function deleteCharactersOf(uid) {
  const snap = await fs.getDocs(fs.query(fs.collection(db, "characters"), fs.where("ownerUid", "==", uid)));
  for (const d of snap.docs) await deleteCharacter(d.id);
  return snap.size;
}

export async function fetchAllCharacters() {
  if (mode !== "cloud") return Object.entries(readLocal()).map(([id, c]) => ({ ...c, id }));
  const snap = await fs.getDocs(fs.collection(db, "characters"));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

export async function getCharOnce(id) {
  if (mode !== "cloud") {
    const c = readLocal()[id];
    return c ? { ...c, id } : null;
  }
  const snap = await fs.getDoc(fs.doc(db, "characters", id));
  return snap.exists() ? { ...snap.data(), id } : null;
}

let pruneTick = 0;

async function pruneCloudHistory(id) {
  if (pruneTick++ % 5) return;
  try {
    const q = fs.query(fs.collection(db, "characters", id, "history"), fs.orderBy("at", "desc"), fs.limit(HISTORY_LIMIT + 40));
    const snap = await fs.getDocs(q);
    await Promise.all(snap.docs.slice(HISTORY_LIMIT).map(d => fs.deleteDoc(d.ref).catch(() => {})));
  } catch {}
}

export async function addHistory(id, data, reason, { prune = false } = {}) {
  const body = stripId(data);
  delete body.portrait;
  delete body.updatedBy;
  const entry = { at: Date.now(), reason: reason || "", by: who(), data: body };
  try {
    if (mode === "cloud") {
      await fs.addDoc(fs.collection(db, "characters", id, "history"), entry);
      if (prune) pruneCloudHistory(id);
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

export function humanError(e, op = "write") {
  const code = String((e && (e.code || e.name)) || "");
  const msg = String((e && e.message) || "");
  if (code.includes("permission-denied")) return op === "read" ? "Нет доступа к листу" : "Нет прав на правку этого листа";
  if (code.includes("unavailable")) return OFFLINE_MSG;
  if (code.includes("resource-exhausted")) return "Превышен бесплатный лимит Firebase на сегодня";
  if (code.includes("QuotaExceeded") || msg.includes("quota")) return "Память браузера переполнена";
  if (msg.includes("exceeds the maximum") || code.includes("invalid-argument")) return "Персонаж слишком большой: уменьши портрет";
  return msg || "Неизвестная ошибка";
}
