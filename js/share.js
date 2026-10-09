import { icon } from "./icons.js";
import { esc, openModal, toast } from "./ui.js";
import { getAcl, saveAcl, getMode, setVisibility } from "./store.js";
import { getAccess } from "./access.js";

export function shareUrl(id) {
  return location.href.split("#")[0].split("?")[0] + `#/c/${encodeURIComponent(id)}`;
}

const coarse = () => window.matchMedia("(pointer: coarse)").matches;

function canManage(c) {
  const a = getAccess();
  return getMode() === "cloud" && a.enforced && a.signedIn && !a.banned && (a.isAdmin || c.ownerUid === a.uid);
}

function enforced() {
  return getMode() === "cloud" && getAccess().enforced;
}

function openLink(c) {
  if (!enforced() || !canManage(c) || c.visibility !== "private") return;
  c.visibility = "link";
  setVisibility(c.id, "link").catch(() => toast("Не получилось открыть доступ по ссылке", { kind: "bad" }));
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast(`${icon("link")} Ссылка скопирована`, { kind: "good" });
  } catch {
    toast("Не получилось скопировать: выдели ссылку и скопируй вручную", { kind: "bad" });
  }
}

async function nativeShare(c, url) {
  try {
    await navigator.share({ title: c.name, text: `Лист персонажа: ${c.name}`, url });
  } catch (e) {
    if (e && e.name !== "AbortError") copyLink(url);
  }
}

export function quickShare(c) {
  const url = shareUrl(c.id);
  if (coarse() && navigator.share) {
    openLink(c);
    nativeShare(c, url);
    return;
  }
  openShare(c);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function openShare(c) {
  const a = getAccess();
  const url = shareUrl(c.id);
  const cloud = getMode() === "cloud";
  const manage = canManage(c);
  const strict = enforced();
  let emails = null;
  let busy = false;

  const linkState = () => !strict || c.visibility !== "private";
  const m = openModal({
    title: "Поделиться",
    cls: "small",
    body: `<div class="share">
        <section>
          <h4>${icon("eye")} Ссылка для просмотра</h4>
          <p class="hint" data-linkhint></p>
          <input class="copy-input" readonly value="${esc(url)}">
          <div class="form-actions share-actions">
            ${manage && strict ? `<label class="share-toggle"><input type="checkbox" data-vis ${linkState() ? "checked" : ""}><span>Доступ по ссылке</span></label><span class="spacer"></span>` : ""}
            <button class="btn ${coarse() ? "" : "gold"}" data-copy>${icon("copy")}Копировать</button>
            ${navigator.share ? `<button class="btn ${coarse() ? "gold" : ""}" data-send>${icon("link")}Отправить</button>` : ""}
          </div>
        </section>
        ${manage ? `<section>
          <h4>${icon("edit")} Редакторы</h4>
          <p class="hint">Человек с этой Google-почтой после входа через Google сможет предлагать правки: ты увидишь их на листе и решишь, принять или отклонить. Персонаж появится у него в разделе «Со мной поделились». Почты редакторов видишь только ты.</p>
          <div class="ed-list" data-list><div class="loading small">${icon("hourglass")} Загружаю...</div></div>
          <form class="ed-add" data-add><input type="email" inputmode="email" autocomplete="off" placeholder="почта@gmail.com" aria-label="Google-почта редактора"><button class="btn" type="submit">${icon("plus")}Пригласить</button></form>
          <p class="hint small">Нужен точный адрес Google-аккаунта, как в Gmail.</p>
        </section>` : cloud ? "" : `<p class="hint">Облако недоступно, поэтому ссылка откроется только в этом браузере.</p>`}
      </div>`
  });

  const hint = m.body.querySelector("[data-linkhint]");
  const paintHint = () => {
    hint.textContent = !strict && cloud
      ? "Пока правила базы не обновлены, любой, у кого есть ссылка, может и смотреть, и править лист."
      : linkState()
      ? `Любой, у кого есть ссылка, сможет открыть лист «${c.name}» и смотреть его. Править он не сможет.`
      : "Сейчас лист закрыт: по ссылке его видят только ты и редакторы. Кнопки «Копировать» и «Отправить» откроют доступ по ссылке.";
  };
  paintHint();

  const vis = m.body.querySelector("[data-vis]");
  if (vis) vis.addEventListener("change", async () => {
    const next = vis.checked ? "link" : "private";
    vis.disabled = true;
    try {
      await setVisibility(c.id, next);
      c.visibility = next;
      toast(next === "link" ? "Доступ по ссылке включён" : "Доступ по ссылке выключен: посторонние больше не откроют лист", { kind: "good" });
    } catch {
      vis.checked = !vis.checked;
      toast("Не получилось изменить доступ", { kind: "bad" });
    } finally {
      vis.disabled = false;
      paintHint();
    }
  });

  const beforeSend = () => {
    if (manage && strict && c.visibility === "private") {
      openLink(c);
      if (vis) vis.checked = true;
      paintHint();
    }
  };
  m.body.querySelector("[data-copy]").onclick = () => {
    beforeSend();
    copyLink(url);
  };
  const send = m.body.querySelector("[data-send]");
  if (send) send.onclick = () => {
    beforeSend();
    nativeShare(c, url);
  };
  m.body.querySelector(".copy-input").addEventListener("focus", e => e.target.select());
  if (!manage) return;

  const listEl = m.body.querySelector("[data-list]");
  const paint = () => {
    listEl.innerHTML = emails.length
      ? emails.map(e => `<div class="ed-row">${icon("user")}<span>${esc(e)}</span><button class="icon-btn" data-rm="${esc(e)}" title="Убрать доступ">${icon("close")}</button></div>`).join("")
      : `<p class="empty">Редакторов нет: лист можешь править только ты</p>`;
  };
  const form = m.body.querySelector("[data-add]");
  const setBusy = v => {
    busy = v;
    form.querySelectorAll("input, button").forEach(el => (el.disabled = v));
    listEl.querySelectorAll("button").forEach(el => (el.disabled = v));
  };
  const save = async change => {
    if (busy) return false;
    setBusy(true);
    try {
      emails = await saveAcl(c.id, change, { name: c.name, ownerName: c.ownerName || a.name, ownerUid: c.ownerUid || a.uid });
      paint();
      return true;
    } catch {
      toast("Не получилось сохранить доступ", { kind: "bad", timeout: 7000 });
      return false;
    } finally {
      setBusy(false);
    }
  };
  getAcl(c.id).then(acl => {
    emails = (acl && acl.emails) || [];
    paint();
  }).catch(() => {
    listEl.innerHTML = `<p class="empty">Нет доступа к списку редакторов. Обнови правила Firestore.</p>`;
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const input = form.querySelector("input");
    const v = input.value.trim().toLowerCase();
    if (!EMAIL.test(v)) return toast("Это не похоже на почту", { kind: "bad" });
    if (emails === null) return;
    if (v === (a.email || "").toLowerCase()) return toast("Это твоя почта: ты и так можешь править", { kind: "bad" });
    if (emails.includes(v)) return toast("Этот человек уже редактор");
    if (emails.length >= 20) return toast("Не больше 20 редакторов", { kind: "bad" });
    if (await save({ add: v })) input.value = "";
  });
  listEl.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]");
    if (b && emails) save({ remove: b.dataset.rm });
  });
}
