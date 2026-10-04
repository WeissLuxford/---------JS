import { whoAmI, bindUid } from "./device.js";

let authMod = null;
let auth = null;
let fs = null;
let db = null;
let user = null;
let unsubs = [];
const listeners = new Set();

const state = {
  enabled: false,
  authOk: false,
  authError: "",
  uid: "",
  isOwner: false,
  ownerEmail: "",
  banned: false,
  allowed: false,
  locked: false
};

export function currentUid() {
  return state.uid;
}

bindUid(currentUid);

function canEdit() {
  if (!state.enabled) return true;
  if (state.isOwner) return true;
  if (state.banned) return false;
  if (state.locked && !state.allowed) return false;
  return true;
}

function snapshot() {
  return { ...state, canEdit: canEdit(), reason: state.isOwner ? "" : state.banned ? "banned" : state.locked && !state.allowed ? "locked" : "" };
}

function emit() {
  const s = snapshot();
  listeners.forEach(fn => fn(s));
}

export function onAccess(fn) {
  listeners.add(fn);
  fn(snapshot());
  return () => listeners.delete(fn);
}

export function getAccess() {
  return snapshot();
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

function authMessage(e) {
  const code = String((e && (e.code || e.message)) || "");
  if (code.includes("configuration-not-found") || code.includes("CONFIGURATION_NOT_FOUND") || code.includes("operation-not-allowed") || code.includes("admin-restricted")) return "Вход не включён в Firebase (Authentication: Anonymous и Google)";
  if (code.includes("unauthorized-domain")) return "Этот адрес сайта не добавлен в Firebase: Authentication, Settings, Authorized domains";
  if (code.includes("popup-blocked")) return "Браузер заблокировал окно входа: разреши всплывающие окна для сайта";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Окно входа закрыто";
  if (code.includes("network")) return "Нет связи с сервером входа";
  if (code === "timeout") return "Сервер входа не ответил";
  return (e && e.message) || "Ошибка входа";
}

export async function initAccess({ app, fsMod, database, cdn }) {
  fs = fsMod;
  db = database;
  try {
    authMod = await import(`${cdn}/firebase-auth.js`);
    auth = authMod.getAuth(app);
    await withTimeout(new Promise(res => {
      const off = authMod.onAuthStateChanged(auth, u => {
        off();
        res(u);
      });
    }), 5000).catch(() => {});
    if (!auth.currentUser) await withTimeout(authMod.signInAnonymously(auth), 7000);
    state.enabled = true;
    state.authError = "";
    authMod.onAuthStateChanged(auth, u => setUser(u));
    setUser(auth.currentUser);
  } catch (e) {
    state.enabled = false;
    state.authOk = false;
    state.authError = authMessage(e);
    emit();
  }
}

function clearSubs() {
  unsubs.forEach(fn => fn());
  unsubs = [];
}

function watchDoc(path, onValue) {
  try {
    const off = fs.onSnapshot(fs.doc(db, ...path), snap => onValue(snap), () => onValue(null));
    unsubs.push(off);
  } catch {
    onValue(null);
  }
}

async function setUser(u) {
  if (u && user && u.uid === user.uid && state.authOk) return;
  user = u;
  clearSubs();
  state.uid = u ? u.uid : "";
  state.authOk = !!u;
  state.isOwner = false;
  state.ownerEmail = "";
  state.banned = false;
  state.allowed = false;
  emit();
  if (!u) return;
  watchDoc(["bans", u.uid], snap => {
    state.banned = !!(snap && snap.exists());
    emit();
  });
  watchDoc(["allowed", u.uid], snap => {
    state.allowed = !!(snap && snap.exists());
    emit();
  });
  watchDoc(["meta", "access"], snap => {
    state.locked = !!(snap && snap.exists() && snap.data().locked === true);
    emit();
  });
  registerDevice();
  if (!u.isAnonymous) {
    state.isOwner = await probeOwner();
    state.ownerEmail = state.isOwner ? u.email || "" : "";
    emit();
  }
}

async function probeOwner() {
  try {
    await fs.getDoc(fs.doc(db, "admin", "probe"));
    return true;
  } catch {
    return false;
  }
}

export async function registerDevice() {
  if (!user || !fs) return;
  try {
    await fs.setDoc(fs.doc(db, "devices", user.uid), { ...whoAmI(), uid: user.uid, anonymous: !!user.isAnonymous, lastSeen: Date.now() }, { merge: true });
  } catch {}
}

export async function signInOwner() {
  if (!authMod || !auth) throw new Error(state.authError || "Вход не включён в Firebase");
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    throw new Error(authMessage(e));
  }
  if (!(await probeOwner())) {
    await signOutOwner();
    throw new Error("Этот Google-аккаунт не владелец. Проверь, что в правилах Firestore указана именно эта почта.");
  }
  state.isOwner = true;
  state.ownerEmail = (auth.currentUser && auth.currentUser.email) || "";
  emit();
}

export async function signOutOwner() {
  if (!authMod || !auth) return;
  await authMod.signOut(auth);
  try {
    await withTimeout(authMod.signInAnonymously(auth), 7000);
  } catch (e) {
    state.authError = authMessage(e);
    emit();
  }
}

export function subscribeDevices(cb) {
  const data = { devices: [], bans: new Map(), allowed: new Map() };
  const push = () => cb({ devices: data.devices, bans: data.bans, allowed: data.allowed });
  const offs = [
    fs.onSnapshot(fs.collection(db, "devices"), s => {
      data.devices = s.docs.map(d => ({ ...d.data(), uid: d.id }));
      push();
    }, () => cb(null)),
    fs.onSnapshot(fs.collection(db, "bans"), s => {
      data.bans = new Map(s.docs.map(d => [d.id, d.data()]));
      push();
    }, () => {}),
    fs.onSnapshot(fs.collection(db, "allowed"), s => {
      data.allowed = new Map(s.docs.map(d => [d.id, d.data()]));
      push();
    }, () => {})
  ];
  return () => offs.forEach(fn => fn());
}

export async function setBan(uid, on, info = {}) {
  const ref = fs.doc(db, "bans", uid);
  if (on) await fs.setDoc(ref, { at: Date.now(), device: info });
  else await fs.deleteDoc(ref);
}

export async function setAllowed(uid, on, info = {}) {
  const ref = fs.doc(db, "allowed", uid);
  if (on) await fs.setDoc(ref, { at: Date.now(), device: info });
  else await fs.deleteDoc(ref);
}

export async function setLocked(on) {
  await fs.setDoc(fs.doc(db, "meta", "access"), { locked: !!on, at: Date.now() });
}
