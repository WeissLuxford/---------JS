import { chromium, launchOpts, E2E_OUT } from "./env.mjs";
const r = [];
const ok = (n, c, x = "") => r.push(`${c ? "PASS" : "FAIL"} ${n}${x ? " :: " + x : ""}`);
const sleep = ms => new Promise(res => setTimeout(res, ms));
const browser = await chromium.launch(launchOpts);

async function open(viewport, path) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: "block" });
  await ctx.route(/gstatic\.com|googleapis\.com|google\.com/, x => x.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:8765/#/c/kirion-thorndike/" + path);
  await page.waitForSelector(".sheet");
  return { ctx, page, errors };
}

{
  const { ctx, page, errors } = await open({ width: 1280, height: 900 }, "combat");
  ok("story tab renamed", (await page.locator(".tab[data-tab=story]").innerText()).includes("Личность"));
  ok("inspiration in turn bar", await page.locator(".turn-bar .insp.compact").count() === 1);
  ok("inspiration keeps its label", /вдохновени/i.test(await page.locator(".turn-bar .insp").innerText()));
  ok("no inspiration in combat column", await page.locator(".combat-grid > .insp, .combat-grid .col > .insp").count() === 0);
  const bar = await page.$eval(".turn-bar", el => { const a = el.getBoundingClientRect(); return [...el.children].every(c => { const b = c.getBoundingClientRect(); return b.right <= a.right + 1 && b.left >= a.left - 1; }) && Math.round(el.querySelector(".insp").getBoundingClientRect().top) === Math.round(el.querySelector(".turn-slot").getBoundingClientRect().top); });
  ok("turn bar fits in one row on desktop", bar);

  await page.click("[data-act=menu]");
  await page.waitForSelector(".menu-group");
  const heads = await page.locator(".menu-group h4").allInnerTexts();
  ok("menu grouped", ["Игра", "Найти", "Лист и файлы", "Настройки"].every(h => heads.some(x => x.toLowerCase() === h.toLowerCase())), heads.join(","));
  ok("settings are switches", await page.locator(".menu-switch").count() === 8);
  const explainVisible = () => page.locator(".atk-hint").first().isVisible();
  ok("explanations shown by default", await explainVisible());
  await page.click("[data-sw=explain-toggle]");
  await sleep(150);
  ok("menu stays open after switch", await page.locator(".modal-back.in .menu-group").count() > 0);
  ok("switch shows off", await page.locator("[data-sw=explain-toggle]:not(.on)").count() === 1);
  ok("body marked no-explain", await page.evaluate(() => document.body.classList.contains("no-explain")));
  await page.keyboard.press("Escape");
  await sleep(300);
  ok("explanations hidden", !(await explainVisible()));
  await page.reload();
  await page.waitForSelector(".sheet");
  ok("explain setting survives reload", !(await explainVisible()));
  await page.click("[data-act=menu]");
  await page.click("[data-sw=explain-toggle]");
  await page.keyboard.press("Escape");
  await sleep(300);
  ok("explanations back", await explainVisible());

  await page.click(".tab[data-tab=spells]");
  ok("spell ability line", (await page.locator(".spell-abil").innerText()).includes("Интеллект"));
  ok("no spell ability select", await page.locator("select[data-path=spellAbility]").count() === 0);
  await page.click(".spell-abil");
  await page.waitForSelector(".modal-back.in [data-ab]");
  ok("ability dialog lists six", await page.locator(".modal-back.in [data-ab]").count() === 6);
  await page.click(".modal-back.in [data-ab=cha]");
  await sleep(250);
  ok("spell ability changed", (await page.locator(".spell-abil").innerText()).includes("Харизма"));
  await page.click(".spell-abil");
  await page.click(".modal-back.in [data-ab=int]");
  await sleep(250);
  ok("spell ability restored", (await page.locator(".spell-abil").innerText()).includes("Интеллект"));
  await page.screenshot({ path: E2E_OUT + "ia-spells.png" });
  ok("no errors desktop", errors.length === 0, errors.join("|"));
  await ctx.close();
}

{
  const { ctx, page, errors } = await open({ width: 390, height: 844 }, "combat");
  const fits = await page.$eval(".turn-bar", el => { const a = el.getBoundingClientRect(); return [...el.children].every(c => { const b = c.getBoundingClientRect(); return b.right <= a.right + 1 && b.left >= a.left - 1; }); });
  ok("mobile turn bar fits", fits);
  const sameRow = await page.$eval(".turn-bar", el => Math.round(el.querySelector(".insp").getBoundingClientRect().top) === Math.round(el.querySelector(".turn-new").getBoundingClientRect().top));
  ok("mobile inspiration shares row with new turn", sameRow);
  ok("mobile no horizontal scroll", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: E2E_OUT + "ia-mobile-combat.png" });
  await page.click("[data-act=menu]");
  await page.waitForSelector(".menu-group");
  await page.screenshot({ path: E2E_OUT + "ia-mobile-menu.png" });
  ok("no errors mobile", errors.length === 0, errors.join("|"));
  await ctx.close();
}

await browser.close();
console.log(r.join("\n"));
