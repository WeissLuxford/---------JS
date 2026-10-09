import { chromium, launchOpts, E2E_OUT } from "./env.mjs";
const OUT = E2E_OUT;
const BASE = "http://localhost:8765/";
const results = [];
const ok = (name, cond, extra = "") => { results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " :: " + extra : ""}`); };

const browser = await chromium.launch(launchOpts);

async function newPage(opts) {
  const ctx = await browser.newContext(opts);
  await ctx.route(/gstatic\.com|googleapis\.com|firebaseio|google\.com/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|net::|Failed to load resource|firestore|firebase/i.test(m.text())) errors.push("console: " + m.text()); });
  return { ctx, page, errors };
}
const modals = page => page.locator(".modal-back.in").count();
const sleep = ms => new Promise(r => setTimeout(r, ms));

{
  const { ctx, page, errors } = await newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + "#/");
  await page.waitForSelector(".ch-link, .ch-card, [href*='#/c/']", { timeout: 15000 });
  await page.goto(BASE + "#/c/kirion-thorndike/char");
  await page.waitForSelector(".sheet");
  const hist0 = await page.evaluate(() => history.length);

  await page.click(".tab[data-tab=spells]");
  await page.click(".tile[data-open^='spell:']");
  await page.waitForSelector(".modal-back.in");
  ok("spell card opens", (await modals(page)) === 1);
  await page.goBack();
  await sleep(400);
  ok("back closes card", (await modals(page)) === 0);
  ok("still on sheet after back", page.url().includes("#/c/kirion-thorndike/spells"), page.url());

  await page.click("[data-act=menu]");
  await page.waitForSelector(".menu-list");
  await page.click("[data-m=short-rest]");
  await sleep(300);
  ok("short rest modal after menu", (await modals(page)) === 1);
  await page.goBack();
  await sleep(400);
  ok("back closes short rest", (await modals(page)) === 0 && page.url().includes("#/c/kirion-thorndike"), page.url());

  await page.click(".tile[data-open^='spell:']");
  await page.waitForSelector(".modal-back.in");
  await page.click(".modal-back.in [data-x=edit]");
  await sleep(300);
  ok("edit form replaces card", (await modals(page)) === 1);
  await page.goBack();
  await sleep(400);
  ok("back closes edit form", (await modals(page)) === 0 && page.url().includes("#/c/kirion-thorndike"), page.url());
  await page.click(".tile[data-open^='spell:']");
  await page.waitForSelector(".modal-back.in");
  await page.keyboard.press("Escape");
  await sleep(400);
  ok("escape closes and history is clean", (await modals(page)) === 0 && (await page.evaluate(() => !(history.state && history.state.dndModal))));

  await page.fill("[data-ui=spell-q]", "шар");
  await sleep(100);
  const visible = await page.$$eval(".spell-lists .tile", ts => ts.filter(t => !t.hidden && !t.closest(".panel").hidden).map(t => t.querySelector(".tile-name").textContent));
  ok("spell search", visible.length === 1 && visible[0] === "Огненный шар", visible.join(","));
  await page.fill("[data-ui=spell-q]", "");
  await page.click("[data-act=spell-filter][data-k=conc]");
  const conc = await page.$$eval(".spell-lists .tile .tile-name", ts => ts.map(t => t.textContent));
  ok("concentration filter", conc.length > 0 && conc.length < 10, conc.join(","));
  await page.click("[data-act=spell-filter][data-k=all]");

  await page.click(".tab[data-tab=combat]");
  ok("combat strip", (await page.locator(".combat-strip .medal").count()) === 4);
  await page.click("summary.panel-h");
  await page.click("[data-act=toggle-cond][data-k=poisoned]");
  ok("conditions panel stays open", await page.$eval(".cond-panel", d => d.open));
  const daggerHit = page.locator(".atk-row", { hasText: "Кинжал" }).locator(".chip.hit");
  await daggerHit.click();
  await sleep(200);
  const t1 = await page.locator("#toasts .toast").last().innerText();
  ok("poisoned gives disadvantage with reason", t1.includes("Помеха: Отравлен"), t1.replace(/\n/g, " | "));
  await page.click("[data-act=toggle-cond][data-k=poisoned]");

  const ebHit = page.locator(".atk-row", { hasText: "Мистический заряд" }).locator(".chip.hit");
  await ebHit.click();
  await sleep(200);
  const beams = await page.locator("#toasts .roll.beams .r-beam").count();
  ok("EB beams in one toast", beams === 2, String(beams));
  const btns = await page.locator("#toasts .roll.beams [data-hit-dmg]").count();
  ok("damage-by-hits buttons", btns >= 1, String(btns));
  await page.locator("#toasts .roll.beams [data-hit-dmg]").last().click();
  await sleep(200);
  const dmgLines = await page.locator("#toasts .roll.dmg").last().locator(".r-line").count();
  ok("beam damage toast lines", dmgLines >= 1, String(dmgLines));
  await page.screenshot({ path: OUT + "d-combat.png", fullPage: false });

  const hpOf = async () => Number(await page.locator("[data-calc=hp]").first().innerText());
  const hp0 = await hpOf();
  await page.click("[data-act=hp-quick][data-n='-5']");
  ok("quick -5", (await hpOf()) === hp0 - 5, `${hp0} -> ${await hpOf()}`);
  await page.click(".hp-actions [data-mode=dmg]");
  await page.waitForSelector("[data-sel]");
  await page.selectOption("[data-sel]", "fire");
  await page.fill(".num-big", "10");
  await page.click(".modal-back.in [data-i='0']");
  await sleep(300);
  ok("fire damage halved by resistance", (await hpOf()) === hp0 - 10, String(await hpOf()));
  const note = await page.locator("#toasts .toast").allInnerTexts();
  ok("resistance toast", note.some(t => t.includes("сопротивление, 10 → 5")), note.join(" | ").replace(/\n/g, " "));
  await page.click("[data-act=hp-quick][data-n='10']");
  await page.click("[data-act=hp-quick][data-n='5']");
  ok("heal back to max", (await hpOf()) === 43, String(await hpOf()));

  await page.click("[data-act=exhaustion][data-i='4']");
  await sleep(100);
  ok("exhaustion 4 halves max hp", (await page.locator("[data-calc=hpmax]").first().innerText()) === "21" && (await hpOf()) === 21);
  const speed = await page.locator(".combat-strip [data-calc=speed]").innerText();
  ok("exhaustion slows", speed === "15 фт", speed);
  await page.click("[data-act=exhaustion][data-i='0']");

  await page.click(".turn-bar [data-act=inspiration]");
  ok("inspiration on", await page.locator(".turn-bar .insp.on").count() === 1);
  await page.click(".turn-bar [data-act=inspiration]");
  ok("inspiration spent -> advantage", (await page.locator("[data-act=roll-mode] .rm.adv").count()) === 1);
  await page.click("[data-act=roll-mode]");
  await page.click("[data-act=roll-mode]");

  await page.click(".tab[data-tab=notes]");
  await page.click("[data-act=notes-section][data-k=misc]");
  await page.click("[data-act=add-note]");
  await page.waitForSelector(".rt-field textarea");
  await page.fill(".modal-back.in input[data-k=title]", "Мир и законы");
  await page.fill(".rt-field textarea", "Лицензия на магию");
  await page.$eval(".rt-field textarea", t => t.setSelectionRange(0, 8));
  await page.click("[data-rt=bold]");
  await page.$eval(".rt-field textarea", t => t.setSelectionRange(t.value.length, t.value.length));
  await page.press(".rt-field textarea", "Enter");
  await page.type(".rt-field textarea", "Верхний город");
  await page.click("[data-rt=list]");
  const txt = await page.inputValue(".rt-field textarea");
  ok("toolbar formats", txt === "**Лицензия** на магию\n- Верхний город", JSON.stringify(txt));
  await page.click("[data-rt-preview]");
  ok("preview renders", (await page.locator(".rt-preview b").count()) === 1 && (await page.locator(".rt-preview li").count()) === 1);
  await page.screenshot({ path: OUT + "d-note-editor.png" });
  await page.click(".modal-back.in button[type=submit]");
  await sleep(300);
  ok("note saved and formatted", (await page.locator(".note .note-text b").count()) >= 1);
  await page.click(".note .note-toggle");
  await sleep(100);
  ok("note collapses", (await page.locator(".note.collapsed").count()) === 1 && (await page.locator(".note.collapsed .note-prev").innerText()).includes("Лицензия"));
  await page.screenshot({ path: OUT + "d-notes.png" });

  await page.click(".tab[data-tab=char]");
  await page.click(".tb-id[data-act=profile]");
  await page.click(".modal.profile [data-pf-go=mech]");
  await page.waitForSelector("[data-types]");
  const fireChecked = await page.$eval("[data-types][data-k='defenses.resist'] input[value=fire]", i => i.checked);
  ok("legacy resistance shown as fire chip", fireChecked);
  await page.click("[data-types][data-k='defenses.resist'] label:has(input[value=cold])");
  await sleep(300);
  await page.keyboard.press("Escape");
  await sleep(300);
  const defs = await page.locator(".def-row").innerText();
  ok("defenses saved", defs.includes("Холод") && defs.includes("Огонь"), defs.replace(/\n/g, " "));
  await page.screenshot({ path: OUT + "d-char.png", fullPage: true });

  await page.goBack();
  await sleep(500);
  ok("back from sheet goes home", page.url().endsWith("#/"), page.url());
  ok("no page errors desktop", errors.length === 0, errors.join(" || "));
  await ctx.close();
}

try {
  const { ctx, page, errors } = await newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await page.goto(BASE + "#/c/kirion-thorndike/char");
  await page.waitForSelector(".sheet");
  const order = await page.$$eval(".char-grid > .col > *", els => els.map(e => ({ cls: e.className.split(" ").slice(0, 2).join("."), top: Math.round(e.getBoundingClientRect().top) })).sort((a, b) => a.top - b.top).map(x => x.cls));
  ok("mobile order", order.indexOf("panel.p-abil") > order.indexOf("panel.hp-panel") && order.indexOf("hero") === 0, order.join(" > "));
  await page.screenshot({ path: OUT + "m-char.png", fullPage: true });

  const row = page.locator(".row[data-card^='skill:']").first().locator(".row-name");
  await row.scrollIntoViewIfNeeded();
  await sleep(200);
  const box = await row.boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const toastsBefore = await page.locator("#toasts .toast").count();
  await touch("touchStart", box.x + 20, box.y + 10);
  await sleep(700);
  await touch("touchEnd", box.x + 20, box.y + 10);
  await sleep(400);
  ok("long press opens description", (await modals(page)) === 1);
  ok("long press does not roll", (await page.locator("#toasts .toast").count()) === toastsBefore);
  await page.screenshot({ path: OUT + "m-longpress.png" });
  await page.goBack();
  await sleep(400);
  ok("mobile back closes card", (await modals(page)) === 0 && page.url().includes("#/c/kirion-thorndike"), page.url() + " modals=" + (await modals(page)) + " state=" + JSON.stringify(await page.evaluate(() => history.state)) + " errs=" + errors.join("|"));

  await page.click(".tab[data-tab=combat]");
  await sleep(100);
  await page.screenshot({ path: OUT + "m-combat.png", fullPage: true });
  const ebHit = page.locator(".atk-row", { hasText: "Мистический заряд" }).locator(".chip.hit");
  await ebHit.click();
  await sleep(300);
  await page.screenshot({ path: OUT + "m-beams.png" });
  await page.click(".tab[data-tab=spells]");
  await page.click(".tile[data-open^='spell:']");
  await sleep(400);
  await page.screenshot({ path: OUT + "m-spell.png" });
  await page.goBack();
  await sleep(300);
  await page.click(".tb-id[data-act=profile]");
  await sleep(400);
  await page.screenshot({ path: OUT + "m-profile.png" });
  const fits = await page.$eval(".modal.profile", el => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1 && r.right < window.innerWidth && Math.round(r.height) >= window.innerHeight - 1; });
  ok("profile drawer slides in from the left on phone", fits);
  await page.keyboard.press("Escape");
  ok("no page errors mobile", errors.length === 0, errors.join(" || "));
  await ctx.close();
} catch (e) {
  ok("mobile section crashed", false, e.message.split("\n")[0]);
}

await browser.close();
console.log(results.join("\n"));
