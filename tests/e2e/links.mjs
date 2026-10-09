import { chromium, launchOpts, E2E_OUT } from "./env.mjs";
const r = [];
const ok = (n, c, x = "") => r.push(`${c ? "PASS" : "FAIL"} ${n}${x ? " :: " + x : ""}`);
const sleep = ms => new Promise(res => setTimeout(res, ms));
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", isMobile: true, hasTouch: true });
await ctx.route(/gstatic\.com|googleapis\.com|google\.com/, x => x.abort());
await ctx.addInitScript(() => {
  window.__wake = { requests: 0, released: 0 };
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: {
      request: async () => {
        window.__wake.requests++;
        const l = new EventTarget();
        l.release = async () => {
          window.__wake.released++;
          l.dispatchEvent(new Event("release"));
        };
        return l;
      }
    }
  });
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto("http://localhost:8765/#/c/kirion-thorndike/combat");
await page.waitForSelector(".sheet");
await sleep(300);
ok("screen wake lock requested on the sheet", (await page.evaluate(() => window.__wake.requests)) >= 1);
ok("crossbow item replaces the manual attack", (await page.locator(".p-attacks [data-open^='item:']", { hasText: "Лёгкий арбалет" }).count()) === 1);
ok("fireball shows up as a prepared damage spell", (await page.locator(".p-attacks", { hasText: "Огненный шар" }).count()) === 1);

await page.click(".tab[data-tab=inventory]");
await page.click("[data-act=add-item]");
await page.fill(".modal-back.in input[data-k=name]", "Длинный меч деда");
await page.selectOption(".modal-back.in select[data-k=type]", "weapon");
await page.click(".modal-back.in button[type=submit]");
await sleep(300);
await page.click(".tab[data-tab=combat]");
ok("unworn sword is not in combat", (await page.locator(".p-attacks", { hasText: "Длинный меч деда" }).count()) === 0);
await page.click(".tab[data-tab=inventory]");
await page.click("[data-open^='item:']:has-text('Длинный меч деда')");
await page.waitForSelector(".modal-back.in");
const wear = page.locator(".modal-back.in [data-x=equip], .modal-back.in button:has-text('Надеть'), .modal-back.in button:has-text('Взять')").first();
await wear.click();
await sleep(300);
await page.keyboard.press("Escape");
await sleep(300);
await page.click(".tab[data-tab=combat]");
const row = page.locator(".p-attacks .atk-row", { hasText: "Длинный меч деда" });
ok("worn hand-made sword appears in attacks", (await row.count()) === 1);
ok("sword row has a damage chip", /1d8/.test(await row.innerText()), await row.innerText());

ok("martial sword without proficiency marks the portrait", (await page.locator(".tb-portrait.has-issues").count()) === 1);
await page.click("[data-act=menu]");
await page.waitForSelector(".menu-group");
ok("menu has the screen switch", (await page.locator("[data-sw=wake-toggle].on").count()) === 1);
await page.keyboard.press("Escape");
await sleep(300);
await page.click(".tb-id[data-act=profile]");
await page.waitForSelector(".modal.profile [data-m=sheet-check]");
ok("profile has the sheet check with a count", /Проверка листа: 1/.test(await page.locator("[data-m=sheet-check]").innerText()));
await page.click("[data-m=sheet-check]");
await page.waitForSelector(".modal-back.in .check-row");
ok("check explains the missing proficiency", /воинского оружия/.test(await page.locator(".modal-back.in .check-row").innerText()));
await page.screenshot({ path: E2E_OUT + "links-check.png" });
await page.click(".modal-back.in [data-ck]");
await sleep(400);
ok("show opens the item", (await page.locator(".modal-back.in", { hasText: "Длинный меч деда" }).count()) === 1);
await page.keyboard.press("Escape");
await sleep(300);

await page.click("[data-act=hp-quick][data-n='-5']");
await sleep(80);
ok("damage shakes the hp block", (await page.locator(".hp-hit").count()) > 0);
ok("damage flashes the screen", await page.evaluate(() => document.body.classList.contains("fx-hit")));
await sleep(900);
await page.click("[data-act=hp-quick][data-n='5']");
await sleep(80);
ok("healing glows", (await page.locator(".hp-heal").count()) > 0);
for (let i = 0; i < 5; i++) {
  await page.click("[data-act=hp-quick][data-n='-10']");
  await sleep(60);
}
await sleep(300);
ok("at 0 hp the screen goes grey and pulses", await page.evaluate(() => document.body.classList.contains("hp-down") && document.body.classList.contains("hp-dying")));
await page.screenshot({ path: E2E_OUT + "links-dying.png" });
await page.click("[data-act=hp-quick][data-n='10']");
await sleep(300);
ok("healing lifts the grey", await page.evaluate(() => !document.body.classList.contains("hp-down")));

await page.click("[data-act=menu]");
await page.click("[data-sw=wake-toggle]");
await sleep(200);
ok("switching the screen lock off releases it", (await page.evaluate(() => window.__wake.released)) >= 1);
await page.keyboard.press("Escape");
await page.goto("http://localhost:8765/#/");
await page.waitForSelector(".home");
ok("leaving the sheet clears the grey", await page.evaluate(() => !document.body.classList.contains("hp-down")));
ok("no errors", errors.length === 0, errors.join("|"));
await browser.close();
console.log(r.join("\n"));
