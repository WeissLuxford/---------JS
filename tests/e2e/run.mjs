import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname);
const only = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith(".mjs") && !["env.mjs", "run.mjs"].includes(f)).filter(f => !only.length || only.includes(f.replace(/\.mjs$/, ""))).sort();

try {
  const res = await fetch("http://localhost:8765/");
  if (!res.ok) throw new Error(String(res.status));
} catch {
  console.error("Сначала запусти сервер: python3 -m http.server 8765");
  process.exit(2);
}

let bad = 0;
let total = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: "utf8", timeout: 240000 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  const pass = (out.match(/^PASS /gm) || []).length;
  const fails = out.split("\n").filter(l => l.startsWith("FAIL "));
  total += pass + fails.length;
  const crashed = r.status !== 0 || (!pass && !fails.length);
  if (fails.length || crashed) bad++;
  console.log(`${fails.length || crashed ? "✗" : "✓"} ${f.replace(/\.mjs$/, "")}: ${pass} ок${fails.length ? `, ${fails.length} ошибок` : ""}${crashed ? " (сценарий упал)" : ""}`);
  for (const l of fails) console.log("    " + l);
  if (crashed) console.log(out.split("\n").slice(-8).map(l => "    " + l).join("\n"));
}
console.log(`\nПроверок: ${total}, сценариев с ошибками: ${bad} из ${files.length}`);
process.exit(bad ? 1 : 0);
