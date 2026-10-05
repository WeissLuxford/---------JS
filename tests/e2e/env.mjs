import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const core = process.env.PW_CORE || "/opt/node-tools/node_modules/playwright-core/index.mjs";
const chrome = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export const { chromium } = await import(core);
export const launchOpts = fs.existsSync(chrome) ? { executablePath: chrome } : {};
export const E2E_OUT = path.join(process.env.E2E_OUT || os.tmpdir(), "dnd-e2e") + path.sep;
fs.mkdirSync(E2E_OUT, { recursive: true });
