import { icon } from "./icons.js";
import { esc, openModal, confirmDialog, toast, timeAgo, download } from "./ui.js";
import { fetchAllCharacters, deleteCharactersOf } from "./store.js";
import { subscribeUsers, setBan, currentUid, getAccess } from "./access.js";
import { describeWho } from "./device.js";

const shortId = uid => String(uid || "").slice(0, 8);

export async function banAccount(by) {
  if (!by || !by.uid) return toast("У этой записи нет аккаунта: правка сделана до включения входа", { kind: "bad" });
  if (by.uid === currentUid()) return toast("Нельзя запретить самого себя", { kind: "bad" });
  if (!(await confirmDialog(`Запретить правки аккаунту «${by.name || describeWho(by)}»? Он сможет смотреть листы по ссылке, но не сможет ничего менять и создавать. Запрет снимается в разделе «Аккаунты».`, { ok: "Запретить", danger: true }))) return;
  try {
    await setBan(by.uid, true, { name: by.name || "", kind: by.kind || "", os: by.os || "", browser: by.browser || "" });
    toast(`${icon("check")} Аккаунт запрещён`, { kind: "good" });
  } catch {
    toast("Не получилось: проверь, что правила Firestore обновлены и в них стоит твой ID", { kind: "bad", timeout: 7000 });
  }
}

export async function backupAll() {
  try {
    const list = await fetchAllCharacters();
    const stamp = new Date().toISOString().slice(0, 10);
    download(`backup-${stamp}.json`, JSON.stringify({ format: "dnd-sheet-backup", version: 1, at: Date.now(), characters: list }, null, 1));
    toast(`${icon("download")} Скачано персонажей: ${list.length}`, { kind: "good" });
  } catch {
    toast("Не получилось собрать копию: нужны права владельца сайта", { kind: "bad" });
  }
}

export function openAccounts() {
  if (!getAccess().isAdmin) return toast("Это доступно только владельцу сайта", { kind: "bad" });
  let data = null;
  let failed = false;
  const m = openModal({
    title: "Аккаунты",
    body: `<div class="loading small">${icon("hourglass")} Загружаю...</div>`,
    onClose: () => off()
  });

  function row(u, banned) {
    const me = u.uid === currentUid();
    return `<article class="dev ${banned ? "is-banned" : ""}">
      <span class="acc-ava">${u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : icon("user")}</span>
      <div class="dev-main"><b>${esc(u.name || "Без имени")}</b>${me ? `<span class="hist-tag me">это ты</span>` : ""}${banned ? `<span class="hist-tag bad">запрещён</span>` : ""}<small>${esc(u.email || "")}${u.lastSeen ? ` · заходил ${timeAgo(u.lastSeen)}` : ""} · ID ${esc(shortId(u.uid))}</small></div>
      <div class="dev-actions">${me ? "" : banned
        ? `<button class="btn sm" data-unban="${esc(u.uid)}">${icon("check")}Снять запрет</button>`
        : `<button class="btn sm danger" data-ban="${esc(u.uid)}">${icon("close")}Запретить</button>`}${me ? "" : `<button class="btn sm ghost" data-wipe="${esc(u.uid)}" title="Запретить и удалить всех его персонажей">${icon("trash")}Удалить персонажей</button>`}</div>
    </article>`;
  }

  function paint() {
    if (failed) {
      m.body.innerHTML = `<p class="empty">Нет доступа к списку аккаунтов. Проверь, что правила Firestore обновлены и в них стоит твой ID.</p>`;
      return;
    }
    if (!data) return;
    const users = data.users.slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const extra = [...data.bans.entries()].filter(([uid]) => !users.some(u => u.uid === uid)).map(([uid, b]) => ({ uid, name: (b.who && b.who.name) || "Неизвестный аккаунт" }));
    m.body.innerHTML = `<p class="hint">Все, кто входил на сайт через Google. Запрещённый аккаунт может только смотреть листы по ссылке.</p>
      <div class="dev-list">${[...users, ...extra].map(u => row(u, data.bans.has(u.uid))).join("") || `<p class="empty">Пока никто не входил</p>`}</div>`;
  }

  const off = subscribeUsers(d => {
    if (!d) failed = true;
    else data = d;
    paint();
  });

  m.body.addEventListener("click", async e => {
    const b = e.target.closest("[data-ban], [data-unban], [data-wipe]");
    if (!b || !data) return;
    const uid = b.dataset.ban || b.dataset.unban || b.dataset.wipe;
    const u = data.users.find(x => x.uid === uid) || { uid };
    b.disabled = true;
    try {
      if (b.dataset.wipe) {
        if (!(await confirmDialog(`Запретить аккаунт «${u.name || u.email || shortId(uid)}» и удалить всех его персонажей вместе с историей? Это необратимо.`, { ok: "Запретить и удалить", danger: true }))) return;
        await setBan(uid, true, { name: u.name || "", email: u.email || "" });
        const n = await deleteCharactersOf(uid);
        toast(`Аккаунт запрещён, удалено персонажей: ${n}`, { kind: "good" });
      } else if (b.dataset.ban) {
        if (!(await confirmDialog(`Запретить аккаунт «${u.name || u.email || shortId(uid)}»?`, { ok: "Запретить", danger: true }))) return;
        await setBan(uid, true, { name: u.name || "", email: u.email || "" });
      } else {
        await setBan(uid, false);
      }
    } catch {
      toast("Не получилось сохранить", { kind: "bad" });
    } finally {
      b.disabled = false;
    }
  });
}
