import { bindIdentity } from "./device.js";

let authMod = null;
let auth = null;
let fs = null;
let db = null;
let user = null;
let unsubs = [];
const listeners = new Set();

const state = {
  enabled: false,
  ready: false,
  authError: "",
  uid: "",
  name: "",
  email: "",
  photo: "",
  isAdmin: false,
  banned: false,
  enforced: false
};

const LS_ENFORCED = "dnd.rulesV2";

export const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|VKClient|Telegram|; wv\)|GSA\//i.test(navigator.userAgent || "") || !!(window.TelegramWebviewProxy || window.TelegramWebview);

export const IN_APP_HINT = "Google не пускает войти из встроенного браузера приложения. Открой ссылку в обычном браузере: на iPhone ⋯ → Открыть в Safari, на Android ⋮ → Открыть в браузере.";

export function currentUid() {
  return state.uid;
}

export function myEmail() {
  return (state.email || "").toLowerCase();
}

bindIdentity(() => ({ uid: state.uid, name: state.name }));

function snapshot() {
  const signedIn = !!state.uid;
  return { ...state, signedIn, canCreate: !state.enforced || (signedIn && !state.banned) };
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
  if (code.includes("configuration-not-found") || code.includes("operation-not-allowed") || code.includes("admin-restricted")) return "Вход через Google ещё не включён в Firebase (Authentication, Sign-in method, Google)";
  if (code.includes("unauthorized-domain")) return "Адрес сайта не добавлен в Firebase: Authentication, Settings, Authorized domains";
  if (code.includes("popup-blocked")) return "Браузер заблокировал окно входа: разреши всплывающие окна для сайта и попробуй ещё раз";
  if (code.includes("popup-closed") || code.includes("cancelled-popup")) return "Окно входа закрыто";
  if (code.includes("network")) return "Нет связи с сервером входа";
  if (code.includes("web-storage-unsupported")) return "Браузер запрещает хранить данные сайта: вход невозможен в этом режиме";
  if (code === "timeout") return "Сервер входа не ответил";
  if (code.includes("internal-error") || code.includes("operation-not-supported") || code.includes("disallowed")) return IN_APP_HINT;
  return (e && e.message) || "Ошибка входа";
}

export async function initAccess({ app, fsMod, database, cdn, emulator }) {
  fs = fsMod;
  db = database;
  try {
    authMod = await import(`${cdn}/firebase-auth.js`);
    auth = authMod.getAuth(app);
    if (emulator) {
      authMod.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      window.__emuSignIn = (sub, email, name) => authMod.signInWithCredential(auth, authMod.GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true, name })));
    }
    state.enabled = true;
    state.enforced = await detectRules();
    await withTimeout(new Promise(res => {
      const off = authMod.onAuthStateChanged(auth, u => {
        off();
        res(u);
      });
    }), 5000).catch(() => {});
    authMod.onAuthStateChanged(auth, u => setUser(u));
    await setUser(auth.currentUser);
  } catch (e) {
    state.authError = authMessage(e);
  }
  state.ready = true;
  emit();
}

const isDenied = e => String(e && e.code).includes("permission-denied");

async function probeRules() {
  const meta = await withTimeout(fs.getDocFromServer(fs.doc(db, "meta", "rules")), 6000).then(() => "ok", e => (isDenied(e) ? "denied" : "unknown"));
  if (meta === "denied") return false;
  if (meta === "unknown") return null;
  const deny = await withTimeout(fs.getDocFromServer(fs.doc(db, "probe", "deny")), 6000).then(() => "ok", e => (isDenied(e) ? "denied" : "unknown"));
  if (deny === "unknown") return null;
  return deny === "denied";
}

let reprobeTimer = null;

function scheduleReprobe(delay) {
  clearTimeout(reprobeTimer);
  reprobeTimer = setTimeout(async () => {
    const v = await probeRules();
    if (v === null) return scheduleReprobe(Math.min(delay * 2, 120000));
    remember(v);
    if (v !== state.enforced) {
      state.enforced = v;
      if (user) await refreshAdmin(user);
      emit();
    }
  }, delay);
}

async function detectRules() {
  const v = await probeRules();
  if (v !== null) {
    remember(v);
    return v;
  }
  scheduleReprobe(5000);
  window.addEventListener("online", () => scheduleReprobe(500), { once: true });
  try {
    const saved = localStorage.getItem(LS_ENFORCED);
    return saved === null ? true : saved === "1";
  } catch {
    return true;
  }
}

function remember(v) {
  try {
    localStorage.setItem(LS_ENFORCED, v ? "1" : "0");
  } catch {}
}

function clearSubs() {
  unsubs.forEach(fn => fn());
  unsubs = [];
}

async function setUser(u) {
  if (u && u.isAnonymous) {
    try {
      await authMod.signOut(auth);
    } catch {}
    u = null;
  }
  if ((u && user && u.uid === user.uid) || (!u && !user && state.ready)) return;
  user = u;
  clearSubs();
  state.uid = u ? u.uid : "";
  state.name = u ? String(u.displayName || "").trim().slice(0, 60) || "Игрок" : "";
  state.email = u ? u.email || "" : "";
  state.photo = u ? u.photoURL || "" : "";
  state.isAdmin = false;
  state.banned = false;
  emit();
  if (!u) return;
  try {
    const off = fs.onSnapshot(fs.doc(db, "bans", u.uid), s => {
      state.banned = s.exists();
      emit();
    }, () => {});
    unsubs.push(off);
  } catch {}
  saveProfile(u);
  await refreshAdmin(u);
}

async function refreshAdmin(u) {
  if (!state.enforced) {
    state.isAdmin = false;
    emit();
    return;
  }
  const cacheKey = "dnd.admin." + u.uid;
  let cached = null;
  try {
    cached = sessionStorage.getItem(cacheKey);
  } catch {}
  if (cached !== null) {
    state.isAdmin = cached === "1";
    emit();
    return;
  }
  try {
    await fs.getDocFromServer(fs.doc(db, "admin", "probe"));
    state.isAdmin = true;
  } catch (e) {
    state.isAdmin = false;
    if (!isDenied(e)) {
      emit();
      return;
    }
  }
  try {
    sessionStorage.setItem(cacheKey, state.isAdmin ? "1" : "0");
  } catch {}
  emit();
}

async function saveProfile(u) {
  if (!state.enforced) return;
  const key = "dnd.profile." + u.uid;
  try {
    if (Date.now() - Number(localStorage.getItem(key) || 0) < 12 * 3600 * 1000) return;
  } catch {}
  try {
    const ref = fs.doc(db, "users", u.uid);
    const snap = await fs.getDoc(ref);
    const data = { name: state.name, email: state.email, photo: state.photo, lastSeen: Date.now() };
    if (!snap.exists()) data.createdAt = Date.now();
    await fs.setDoc(ref, data, { merge: true });
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {}
  } catch {}
}

export async function signIn() {
  if (!authMod || !auth) throw new Error(state.authError || "Вход недоступен: облако не подключено");
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    throw new Error(authMessage(e));
  }
}

export async function signOut() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("dnd.admin.")) sessionStorage.removeItem(k);
  } catch {}
  if (auth) await authMod.signOut(auth);
}

export async function deleteAccountData(deleteChars) {
  if (!auth || !auth.currentUser) throw new Error("Сначала войди");
  const u = auth.currentUser;
  const provider = new authMod.GoogleAuthProvider();
  try {
    await authMod.reauthenticateWithPopup(u, provider);
  } catch (e) {
    throw new Error(authMessage(e));
  }
  if (auth.currentUser !== u || !state.enforced) throw new Error("Сессия изменилась, попробуй ещё раз");
  await deleteChars(u.uid);
  await fs.deleteDoc(fs.doc(db, "users", u.uid)).catch(() => {});
  try {
    await authMod.deleteUser(u);
  } catch {
    await authMod.signOut(auth);
  }
}

export function subscribeUsers(cb) {
  const data = { users: [], bans: new Map() };
  const push = () => cb({ users: data.users, bans: data.bans });
  const offs = [
    fs.onSnapshot(fs.collection(db, "users"), s => {
      data.users = s.docs.map(d => ({ ...d.data(), uid: d.id }));
      push();
    }, () => cb(null)),
    fs.onSnapshot(fs.collection(db, "bans"), s => {
      data.bans = new Map(s.docs.map(d => [d.id, d.data()]));
      push();
    }, () => {})
  ];
  return () => offs.forEach(fn => fn());
}

export async function setBan(uid, on, info = {}) {
  const ref = fs.doc(db, "bans", uid);
  if (on) await fs.setDoc(ref, { at: Date.now(), who: info });
  else await fs.deleteDoc(ref);
}
