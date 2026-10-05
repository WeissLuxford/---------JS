import fs from "node:fs";
import path from "node:path";
import { chromium, launchOpts, E2E_OUT } from "./env.mjs";

const BASE = new URL("../visual/", import.meta.url).pathname;
const UPDATE = process.env.VISUAL_UPDATE === "1";
const PIXEL = 48;
const LIMIT = 0.005;
const TABS = ["char", "combat", "spells", "features", "inventory", "notes", "story"];
const SIZES = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true }, desktop: { width: 1280, height: 900 } };
const FREEZE = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
  #toasts, #undo-bar, .ambient, .fab-quick { visibility: hidden !important; }`;

const r = [];
const ok = (n, c, x = "") => r.push(`${c ? "PASS" : "FAIL"} ${n}${x ? " :: " + x : ""}`);
const sleep = ms => new Promise(res => setTimeout(res, ms));
fs.mkdirSync(BASE, { recursive: true });

const browser = await chromium.launch(launchOpts);
const cmpPage = await browser.newPage();

async function compare(a, b) {
  return cmpPage.evaluate(async ({ a, b, PIXEL }) => {
    const load = src => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    const [x, y] = await Promise.all([load(a), load(b)]);
    if (x.width !== y.width || x.height !== y.height) return { size: `${x.width}x${x.height} против ${y.width}x${y.height}` };
    const w = x.width;
    const h = x.height;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(x, 0, 0);
    const da = g.getImageData(0, 0, w, h);
    g.drawImage(y, 0, 0);
    const db = g.getImageData(0, 0, w, h);
    const out = g.createImageData(w, h);
    let bad = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      const d = Math.max(Math.abs(da.data[i] - db.data[i]), Math.abs(da.data[i + 1] - db.data[i + 1]), Math.abs(da.data[i + 2] - db.data[i + 2]));
      const lum = (db.data[i] + db.data[i + 1] + db.data[i + 2]) / 9;
      if (d > PIXEL) {
        bad++;
        out.data.set([255, 40, 40, 255], i);
      } else out.data.set([lum, lum, lum, 255], i);
    }
    g.putImageData(out, 0, 0);
    return { ratio: bad / (w * h), diff: cv.toDataURL("image/png") };
  }, { a, b, PIXEL });
}

async function shot(name, page) {
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(250);
  const buf = await page.screenshot({ type: "jpeg", quality: 82 });
  const file = path.join(BASE, name + ".jpg");
  if (UPDATE || !fs.existsSync(file)) {
    fs.writeFileSync(file, buf);
    return ok(`${name}: эталон ${UPDATE ? "обновлён" : "создан"}`, true);
  }
  const url = b => "data:image/jpeg;base64," + b.toString("base64");
  const res = await compare(url(fs.readFileSync(file)), url(buf));
  if (res.size) {
    fs.writeFileSync(path.join(E2E_OUT, `visual-${name}-actual.jpg`), buf);
    return ok(`${name}: размер совпадает`, false, res.size);
  }
  const pass = res.ratio <= LIMIT;
  if (!pass) {
    fs.writeFileSync(path.join(E2E_OUT, `visual-${name}-actual.jpg`), buf);
    fs.writeFileSync(path.join(E2E_OUT, `visual-${name}-diff.png`), Buffer.from(res.diff.split(",")[1], "base64"));
  }
  ok(`${name}: как на эталоне`, pass, `отличается ${(res.ratio * 100).toFixed(2)}% точек${pass ? "" : `, разница: ${path.join(E2E_OUT, `visual-${name}-diff.png`)}`}`);
}

for (const [size, vp] of Object.entries(SIZES)) {
  const { isMobile, hasTouch, ...viewport } = vp;
  const ctx = await browser.newContext({ viewport, isMobile: !!isMobile, hasTouch: !!hasTouch, serviceWorkers: "block", reducedMotion: "reduce", deviceScaleFactor: 1 });
  await ctx.clock.setFixedTime(new Date("2026-10-01T12:00:00"));
  await ctx.route(/gstatic\.com|googleapis\.com|google\.com/, x => x.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:8765/#/");
  await page.waitForSelector(".ch-card.tpl");
  await shot(`${size}-home`, page);
  for (const tab of TABS) {
    await page.goto(`http://localhost:8765/#/c/kirion-thorndike/${tab}`);
    await page.waitForSelector(".sheet");
    await sleep(300);
    await shot(`${size}-${tab}`, page);
  }
  ok(`${size}: без ошибок`, errors.length === 0, errors.join("|"));
  await ctx.close();
}

await browser.close();
console.log(r.join("\n"));
