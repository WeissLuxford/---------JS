import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SW = path.join(ROOT, "sw.js");
const TEXT = /\.(js|css|html|json|svg|webmanifest|txt|md)$/i;

export function precacheList(src = readFileSync(SW, "utf8")) {
  const block = src.match(/const PRECACHE = \[([\s\S]*?)\];/);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(f => f !== "./");
}

export function computeBuild(src = readFileSync(SW, "utf8")) {
  const h = createHash("sha256");
  const files = [...precacheList(src), "assets/icons/used.json"].sort();
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    h.update(f + "\n");
    h.update(TEXT.test(f) ? buf.toString("utf8").replace(/\r\n/g, "\n") : buf);
  }
  return h.digest("hex").slice(0, 10);
}

export function currentBuild(src = readFileSync(SW, "utf8")) {
  const m = src.match(/const BUILD = "([^"]*)";/);
  return m ? m[1] : "";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = readFileSync(SW, "utf8");
  const build = computeBuild(src);
  if (currentBuild(src) === build) {
    console.log("sw.js BUILD уже актуален:", build);
  } else {
    const nl = src.includes("\r\n") ? "\r\n" : "\n";
    const next = /const BUILD = "[^"]*";/.test(src) ? src.replace(/const BUILD = "[^"]*";/, `const BUILD = "${build}";`) : src.replace(/(const VERSION = "[^"]*";)/, `$1${nl}const BUILD = "${build}";`);
    writeFileSync(SW, next);
    console.log("sw.js BUILD:", build);
  }
}
