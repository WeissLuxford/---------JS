import { chromium, launchOpts } from "./env.mjs";
const r = [];
const ok = (n, c, x = "") => r.push(`${c ? "PASS" : "FAIL"} ${n}${x ? " :: " + x : ""}`);
const sleep = ms => new Promise(res => setTimeout(res, ms));
const browser = await chromium.launch(launchOpts);
for (const mobile of [false, true]) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: mobile, isMobile: mobile, serviceWorkers: "block" });
  await ctx.route(/gstatic\.com|googleapis\.com|google\.com/, x => x.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  const tag = mobile ? "m" : "d";
  const M = ".modal-back.in";
  await page.goto("http://localhost:8765/#/c/kirion-thorndike/notes");
  await page.waitForSelector(".sheet");
  await page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem("dnd.chars"));
    const c = all["kirion-thorndike"];
    const ids = o => (Array.isArray(o) ? o.map(x => x.id) : Object.keys(o));
    const list = [...ids(c.notes.people), ...ids(c.notes.places)];
    const saved = {};
    list.forEach((id, i) => {
      saved[id] = { x: (i % 4) * 520 - 700, y: Math.floor(i / 4) * 420 - 500 };
    });
    localStorage.setItem("dnd.board.kirion-thorndike", JSON.stringify(saved));
  });
  await page.click("[data-act=board]");
  await sleep(800);
  const boxes = await page.evaluate(sel => {
    const svg = document.querySelector(sel + " .bd-svg").getBoundingClientRect();
    const items = [...document.querySelectorAll(sel + " .bd-node")].map(n => {
      const b = n.querySelector(".bd-paper").getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    return { svg: { x: svg.x, y: svg.y, w: svg.width, h: svg.height }, items };
  }, M);
  const inside = boxes.items.every(b => b.x >= boxes.svg.x - 1 && b.y >= boxes.svg.y - 1 && b.x + b.w <= boxes.svg.x + boxes.svg.w + 1 && b.y + b.h <= boxes.svg.y + boxes.svg.h + 1);
  ok(tag + " far-away saved cards are brought into view by zoom", boxes.items.length >= 5 && inside, JSON.stringify(boxes.svg));
  let overlaps = 0;
  for (let i = 0; i < boxes.items.length; i++) {
    for (let j = i + 1; j < boxes.items.length; j++) {
      const a = boxes.items[i];
      const b = boxes.items[j];
      if (a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2) overlaps++;
    }
  }
  ok(tag + " cards keep their places and do not stack", overlaps === 0, String(overlaps));
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("dnd.board.kirion-thorndike")));
  ok(tag + " saved positions are not rewritten", Object.values(kept).some(p => p.x === -700 || p.x === 820));
  ok(tag + " no errors", errors.length === 0, errors.join("|"));
  await ctx.close();
}
await browser.close();
console.log(r.join("\n"));
