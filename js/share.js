import { icon } from "./icons.js";
import { esc, openModal, toast } from "./ui.js";
import { getAcl, saveAcl, getMode } from "./store.js";
import { getAccess } from "./access.js";

export function shareUrl(id) {
  return location.href.split("#")[0].split("?")[0] + `#/c/${encodeURIComponent(id)}`;
}

async function sendLink(name, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title: name, text: `Лист персонажа: ${name}`, url });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(`${icon("link")} Ссылка скопирована`, { kind: "good" });
  } catch {
    toast("Не получилось скопировать: выдели ссылку и скопируй вручную", { kind: "bad" });
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function openShare(c) {
  const a = getAccess();
  const url = shareUrl(c.id);
  const cloud = getMode() === "cloud";
  const canManage = cloud && a.signedIn && (a.isAdmin || c.ownerUid === a.uid);
  let emails = null;
  let busy = false;

  const m = openModal({
    title: "Поделиться",
    cls: "small",
    body: `<div class="share">
        <section>
          <h4>${icon("eye")} Ссылка для просмотра</h4>
          <p class="hint">Любой, у кого есть ссылка, сможет открыть лист «${esc(c.name)}» и смотреть его. Править он не сможет.</p>
          <input class="copy-input" readonly value="${esc(url)}">
          <div class="form-actions"><button class="btn gold" data-send>${icon("link")}${navigator.share ? "Отправить" : "Скопировать ссылку"}</button></div>
        </section>
        ${canManage ? `<section>
          <h4>${icon("edit")} Редакторы</h4>
          <p class="hint">Человек с этой Google-почтой сможет править лист после входа на сайт через Google. Персонаж появится у него в разделе «Со мной поделились». Почты редакторов видишь только ты.</p>
          <div class="ed-list" data-list><div class="loading small">${icon("hourglass")} Загружаю...</div></div>
          <form class="ed-add" data-add><input type="email" inputmode="email" autocomplete="off" placeholder="почта@gmail.com" aria-label="Google-почта редактора"><button class="btn" type="submit">${icon("plus")}Пригласить</button></form>
        </section>` : cloud ? "" : `<p class="hint">Облако недоступно, поэтому ссылка откроется только в этом браузере.</p>`}
      </div>`
  });

  m.body.querySelector("[data-send]").onclick = () => sendLink(c.name, url);
  m.body.querySelector(".copy-input").addEventListener("focus", e => e.target.select());
  if (!canManage) return;

  const listEl = m.body.querySelector("[data-list]");
  const paint = () => {
    listEl.innerHTML = emails.length
      ? emails.map(e => `<div class="ed-row">${icon("user")}<span>${esc(e)}</span><button class="icon-btn" data-rm="${esc(e)}" title="Убрать доступ">${icon("close")}</button></div>`).join("")
      : `<p class="empty">Редакторов нет: лист можешь править только ты</p>`;
  };
  const save = async next => {
    if (busy) return;
    busy = true;
    try {
      emails = await saveAcl(c.id, next, { name: c.name, ownerName: c.ownerName || a.name, ownerUid: c.ownerUid || a.uid });
      paint();
    } catch {
      toast("Не получилось сохранить доступ: проверь, что правила Firestore обновлены", { kind: "bad", timeout: 7000 });
    } finally {
      busy = false;
    }
  };
  getAcl(c.id).then(acl => {
    emails = (acl && acl.emails) || [];
    paint();
  }).catch(() => {
    listEl.innerHTML = `<p class="empty">Нет доступа к списку редакторов. Обнови правила Firestore.</p>`;
  });
  m.body.querySelector("[data-add]").addEventListener("submit", e => {
    e.preventDefault();
    const input = e.target.querySelector("input");
    const v = input.value.trim().toLowerCase();
    if (!EMAIL.test(v)) return toast("Это не похоже на почту", { kind: "bad" });
    if (emails === null) return;
    if (v === (a.email || "").toLowerCase()) return toast("Это твоя почта: ты и так можешь править", { kind: "bad" });
    if (emails.includes(v)) return toast("Этот человек уже редактор");
    if (emails.length >= 20) return toast("Не больше 20 редакторов", { kind: "bad" });
    input.value = "";
    save([...emails, v]);
  });
  listEl.addEventListener("click", e => {
    const b = e.target.closest("[data-rm]");
    if (b && emails) save(emails.filter(x => x !== b.dataset.rm));
  });
}
