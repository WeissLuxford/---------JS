import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const core = process.env.PW_CORE || "/opt/node-tools/node_modules/playwright-core/index.mjs";
const chrome = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const { chromium: real } = await import(core);
const quietDice = () => {
  try {
    if (localStorage.getItem("dnd.dice3d") === null) localStorage.setItem("dnd.dice3d", "0");
    if (localStorage.getItem("dnd.rollcard") === null) localStorage.setItem("dnd.rollcard", "0");
  } catch {}
};
export const chromium = {
  async launch(...args) {
    const browser = await real.launch(...args);
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async (...opts) => {
      const ctx = await newContext(...opts);
      await ctx.addInitScript(quietDice);
      return ctx;
    };
    return browser;
  }
};
export const launchOpts = fs.existsSync(chrome) ? { executablePath: chrome } : {};
export const E2E_OUT = path.join(process.env.E2E_OUT || os.tmpdir(), "dnd-e2e") + path.sep;
fs.mkdirSync(E2E_OUT, { recursive: true });
