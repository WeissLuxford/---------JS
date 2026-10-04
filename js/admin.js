import { icon } from "./icons.js";
import { esc, openModal, confirmDialog, toast, timeAgo } from "./ui.js";
import { subscribeDevices, setBan, setAllowed, setLocked, onAccess, currentUid, signInOwner, signOutOwner } from "./access.js";
import { describeWho, KIND_ICONS } from "./device.js";

const shortId = uid => String(uid || "").slice(0, 6);

export async function ownerSignIn() {
  try {
    await signInOwner();
    toast(`${icon("check")} Ты вошёл как владелец`, { kind: "good" });
  } catch (e) {
    toast(esc(e.message || "Не получилось войти"), { kind: "bad", timeout: 7000 });
  }
}

export async function ownerSignOut() {
  if (!(await confirmDialog("Выйти из режима владельца на этом устройстве?", { ok: "Выйти" }))) return;
  await signOutOwner();
  toast("Режим владельца выключен");
}

export async function banDevice(by) {
  if (!by || !by.uid) return toast("У этой записи нет ID устройства: она сделана до включения запретов", { kind: "bad" });
  if (by.uid === currentUid()) return toast("Нельзя запретить самого себя", { kind: "bad" });
  if (!(await confirmDialog(`Запретить правки устройству «${describeWho(by)}»? Смотреть лист оно сможет, менять нет. Запрет можно снять в разделе «Устройства».`, { ok: "Запретить", danger: true }))) return;
  try {
    await setBan(by.uid, true, by);
    toast(`${icon("check")} Устройство запрещено`, { kind: "good" });
  } catch {
    toast("Не получилось: проверь, что ты вошёл как владелец и правила Firestore обновлены", { kind: "bad", timeout: 7000 });
  }
}

export function openDeviceManager() {
  let data = null;
  let failed = false;
  let access = null;
  const m = openModal({
    title: "Устройства",
    body: `<div class="loading small">${icon("hourglass")} Загружаю...</div>`,
    onClose: () => {
      off();
      offAccess();
    }
  });

  function row(d) {
    const me = d.uid === currentUid();
    const banned = data.bans.has(d.uid);
    const allowed = data.allowed.has(d.uid);
    const badges = [
      me ? `<span class="hist-tag me">это ты</span>` : "",
      banned ? `<span class="hist-tag bad">запрещено</span>` : "",
      access.locked && (allowed || me) && !banned ? `<span class="hist-tag ok">пущено</span>` : "",
      d.anonymous === false ? `<span class="hist-tag gold">владелец</span>` : ""
    ].join("");
    const actions = me ? "" : [
      banned
        ? `<button class="btn sm" data-unban="${esc(d.uid)}">${icon("check")}Снять запрет</button>`
        : `<button class="btn sm danger" data-ban="${esc(d.uid)}">${icon("close")}Запретить</button>`,
      access.locked && !banned
        ? allowed
          ? `<button class="btn sm ghost" data-disallow="${esc(d.uid)}">Убрать доступ</button>`
          : `<button class="btn sm gold" data-allow="${esc(d.uid)}">${icon("check")}Пустить</button>`
        : ""
    ].join("");
    return `<article class="dev ${banned ? "is-banned" : ""}">
      <span class="hist-dev">${icon(KIND_ICONS[d.kind] || "info")}</span>
      <div class="dev-main"><b>${esc(describeWho(d))}</b>${badges}<small>${d.lastSeen ? "заходило " + timeAgo(d.lastSeen) : ""} · ID ${esc(shortId(d.uid))}</small></div>
      <div class="dev-actions">${actions}</div>
    </article>`;
  }

  function paint() {
    if (!access) return;
    if (!access.isOwner) {
      m.body.innerHTML = `<p class="empty">Это видит только владелец.</p>`;
      return;
    }
    if (failed) {
      m.body.innerHTML = `<p class="empty">Нет доступа к списку устройств. Обнови правила Firestore по инструкции.</p>`;
      return;
    }
    if (!data) return;
    const list = data.devices.slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const bannedOnly = [...data.bans.keys()].filter(uid => !list.some(d => d.uid === uid)).map(uid => ({ uid, ...(data.bans.get(uid).device || {}) }));
    m.body.innerHTML = `
      <div class="lock-box ${access.locked ? "on" : ""}">
        <div>${icon(access.locked ? "shield" : "people")}<b>${access.locked ? "Закрыто: править могут только пущенные устройства" : "Открыто: править может любой, у кого есть ссылка"}</b>
        <small>${access.locked ? "Новые устройства могут только смотреть. Пусти нужные кнопкой «Пустить»." : "Запрещённые устройства всё равно не могут править. Если кто-то обходит запрет через режим инкогнито, закрой редактирование."}</small></div>
        <button class="btn ${access.locked ? "" : "danger"}" data-lock="${access.locked ? "0" : "1"}">${access.locked ? "Открыть для всех" : "Закрыть редактирование"}</button>
      </div>
      <div class="dev-list">${[...list, ...bannedOnly].map(row).join("") || `<p class="empty">Устройств пока нет</p>`}</div>`;
  }

  const offAccess = onAccess(a => {
    access = a;
    paint();
  });
  const off = subscribeDevices(d => {
    if (!d) failed = true;
    else data = d;
    paint();
  });

  m.body.addEventListener("click", async e => {
    const b = e.target.closest("[data-ban], [data-unban], [data-allow], [data-disallow], [data-lock]");
    if (!b || !data) return;
    const uid = b.dataset.ban || b.dataset.unban || b.dataset.allow || b.dataset.disallow;
    const dev = (uid && data.devices.find(d => d.uid === uid)) || {};
    const info = { kind: dev.kind || "", os: dev.os || "", browser: dev.browser || "", gpu: dev.gpu || "", name: dev.name || "", uid: uid || "" };
    b.disabled = true;
    try {
      if (b.dataset.ban) {
        if (!(await confirmDialog(`Запретить правки устройству «${describeWho(info)}»?`, { ok: "Запретить", danger: true }))) return;
        await setBan(uid, true, info);
      } else if (b.dataset.unban) await setBan(uid, false);
      else if (b.dataset.allow) await setAllowed(uid, true, info);
      else if (b.dataset.disallow) await setAllowed(uid, false);
      else if (b.dataset.lock) {
        const on = b.dataset.lock === "1";
        if (on && !(await confirmDialog("Закрыть редактирование? Править смогут только ты и устройства, которые ты пустишь. Остальные смогут только смотреть.", { ok: "Закрыть", danger: true }))) return;
        await setLocked(on);
      }
    } catch {
      toast("Не получилось сохранить: проверь правила Firestore", { kind: "bad" });
    } finally {
      b.disabled = false;
    }
  });
}
