import { FIREBASE_CONFIG, FIREBASE_VERSION } from "./config.js";

const CDN = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const LS_CHARS = "dnd.chars";
const LS_HIST = "dnd.hist.";
const HISTORY_LIMIT = 60;

let fs = null;
let db = null;
let mode = "local";
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

const clone = v => JSON.parse(JSON.stringify(v ?? null));

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_CHARS) || "{}") || {};
  } catch {
    return {};
  }
}

function writeLocal(map) {
  try {
    localStorage.setItem(LS_CHARS, JSON.stringify(map));
  } catch (e) {
    setStatus({ state: "error", error: "Не удалось сохранить в браузере: " + e.message });
  }
  localListeners.forEach(fn => fn(map));
}

export async function initStore() {
  try {
    const [appMod, fsMod] = await Promise.all([
      import(`${CDN}/firebase-app.js`),
      import(`${CDN}/firebase-firestore.js`)
    ]);
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    try {
      db = fsMod.initializeFirestore(app, {
        localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() })
      });
    } catch {
      db = fsMod.getFirestore(app);
    }
    fs = fsMod;
    mode = "cloud";
    setStatus({ state: "idle", error: "" });
  } catch (e) {
    mode = "local";
    setStatus({ state: "idle", error: "Облако недоступно, данные хранятся только в этом браузере" });
  }
  return mode;
}

export function subscribeList(cb) {
  if (mode === "cloud") {
    return fs.onSnapshot(
      fs.collection(db, "characters"),
      snap => {
        const list = [];
        snap.forEach(d => list.push({ ...d.data(), id: d.id }));
        cb(list);
      },
      err => {
        setStatus({ state: "error", error: humanError(err) });
        cb(null, err);
      }
    );
  }
  const emit = map => cb(Object.entries(map).map(([id, c]) => ({ ...c, id })));
  emit(readLocal());
  localListeners.add(emit);
  return () => localListeners.delete(emit);
}

export function subscribeChar(id, cb) {
  if (mode === "cloud") {
    return fs.onSnapshot(
      fs.doc(db, "characters", id),
      snap => {
        if (!snap.exists()) return cb(null, { local: false });
        cb({ ...snap.data(), id: snap.id }, { local: snap.metadata.hasPendingWrites });
      },
      err => {
        setStatus({ state: "error", error: humanError(err) });
        cb(undefined, { error: err });
      }
    );
  }
  const emit = map => cb(map[id] ? { ...clone(map[id]), id } : null, { local: false });
  emit(readLocal());
  return () => {};
}

function stripId(c) {
  const data = clone(c);
  delete data.id;
  return data;
}

export async function saveChar(c) {
  const data = stripId(c);
  data.updatedAt = Date.now();
  setStatus({ state: "saving" });
  try {
    if (mode === "cloud") {
      await fs.setDoc(fs.doc(db, "characters", c.id), data);
    } else {
      const map = readLocal();
      map[c.id] = data;
      writeLocal(map);
    }
    setStatus({ state: "saved", error: "" });
  } catch (e) {
    setStatus({ state: "error", error: humanError(e) });
    throw e;
  }
}

export async function createChar(id, c) {
  await saveChar({ ...c, id, createdAt: Date.now() });
  return id;
}

export async function charExists(id) {
  if (mode === "cloud") {
    const snap = await fs.getDoc(fs.doc(db, "characters", id));
    return snap.exists();
  }
  return !!readLocal()[id];
}

export async function addHistory(id, data, reason) {
  const entry = { at: Date.now(), reason: reason || "", data: stripId(data) };
  try {
    if (mode === "cloud") {
      await fs.addDoc(fs.collection(db, "characters", id, "history"), entry);
    } else {
      const key = LS_HIST + id;
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ ...entry, id: String(entry.at) });
      localStorage.setItem(key, JSON.stringify(list.slice(0, HISTORY_LIMIT)));
    }
  } catch (e) {
    setStatus({ state: "error", error: "История не сохранилась: " + humanError(e) });
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

function humanError(e) {
  const code = e && (e.code || e.name || "");
  if (String(code).includes("permission-denied")) return "Нет доступа к базе: проверь правила Firestore";
  if (String(code).includes("unavailable")) return "Нет связи с сервером, изменения сохранятся при подключении";
  if (String(code).includes("resource-exhausted")) return "Превышен бесплатный лимит Firebase на сегодня";
  if (String(e && e.message || "").includes("exceeds the maximum")) return "Персонаж слишком большой: уменьши портрет";
  return (e && e.message) || "Неизвестная ошибка";
}
