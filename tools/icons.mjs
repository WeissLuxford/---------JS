import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { prepare, search } from "./icon-search.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ICONS = path.join(ROOT, "assets/icons");
const CATALOG = path.join(ICONS, "catalog.json");
const STOP = ["of", "the", "a", "an", "and", "in", "on", "with", "to", "for", "at", "by", "from", "into", "or"];
const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
const rel = f => path.relative(ROOT, f).split(path.sep).join("/");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".svg") ? [path.join(dir, e.name)] : []);
}

function hash(s) {
  return crypto.createHash("sha1").update(s.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 12);
}

function ownIcons() {
  const src = fs.readFileSync(path.join(ROOT, "js/icons.js"), "utf8");
  const body = src.slice(src.indexOf("const P = {"), src.indexOf("\n};"));
  return [...body.matchAll(/^  ([a-zA-Z0-9]+): '(.*)',?$/gm)].map(m => ({ key: m[1], svg: m[2] }));
}

function build() {
  const { themes, flags, own } = read(path.join(ICONS, "themes.json"));
  const ru = read(path.join(ICONS, "ru.json"));
  const sources = read(path.join(ICONS, "sources.json"));
  const giIndex = read(path.join(ICONS, "game-icons/index.json"));
  const icons = [];

  for (const { key, svg } of ownIcons()) {
    const extra = own.words[key] || "";
    icons.push({ id: `own/${key}`, pack: "own", file: "js/icons.js", name: [key.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase(), extra].join(" ").trim(), group: own.ui.includes(key) ? "ui" : "", _h: hash(svg) });
  }
  for (const f of walk(path.join(ICONS, "tw-dnd"))) {
    const [group, file] = rel(f).split("/").slice(-2);
    icons.push({ id: `tw/${group}/${file.slice(0, -4)}`, pack: "tw", file: rel(f), name: file.slice(0, -4).replace(/-/g, " "), group, _h: hash(fs.readFileSync(f, "utf8")) });
  }
  for (const f of walk(path.join(ICONS, "game-icons"))) {
    const [author, file] = rel(f).split("/").slice(-2);
    const key = `${author}/${file.slice(0, -4)}`;
    icons.push({ id: `gi/${key}`, pack: "gi", file: rel(f), name: file.slice(0, -4).replace(/-/g, " "), author, tags: giIndex.icons[key] || [], _h: hash(fs.readFileSync(f, "utf8")) });
  }
  for (const f of walk(path.join(ICONS, "dnd5e-logos"))) {
    const [group, file] = rel(f).split("/").slice(-2);
    icons.push({ id: `logo/${group}/${file.slice(0, -4)}`, pack: "logo", file: rel(f), name: file.slice(0, -4).replace(/-/g, " "), group, flags: ["color"], _h: hash(fs.readFileSync(f, "utf8")) });
  }
  for (const f of walk(path.join(ICONS, "noun-project"))) {
    const [author, file] = rel(f).split("/").slice(-2);
    icons.push({ id: `np/${author}/${file.slice(0, -4)}`, pack: "np", file: rel(f), name: file.slice(0, -4).replace(/-/g, " "), author, _h: hash(fs.readFileSync(f, "utf8")) });
  }
  for (const f of walk(path.join(ICONS, "svgrepo"))) {
    const file = path.basename(f, ".svg");
    icons.push({ id: `sr/${file}`, pack: "sr", file: rel(f), name: file.replace(/-v\d+$/, "").replace(/-/g, " "), _h: hash(fs.readFileSync(f, "utf8")) });
  }

  const has = (i, w) => w.includes("-") ? i.name.replace(/ /g, "-").includes(w) : i._w.includes(w);
  const seen = {};
  for (const i of icons) {
    i._w = i.name.split(/\s+/);
    i.themes = themes.filter(t =>
      (i.pack === "tw" && t.tw?.includes(i.group)) ||
      (i.pack === "logo" && t.logo?.includes(i.group)) ||
      (i.pack === "gi" && t.gi?.some(g => i.tags.includes(g))) ||
      (i.pack === "own" && t.key === "ui" && i.group === "ui") ||
      t.words.some(w => has(i, w))
    ).map(t => t.key);
    if (i.themes.includes("brand")) i.themes = ["brand"];
    i.flags = [...(i.flags || [])];
    const twId = i.pack === "tw" ? `${i.group}/${i.id.split("/").pop()}` : "";
    if (flags.face.tw.includes(twId) || flags.face.words.some(w => has(i, w))) i.flags.push("face");
    if (i.themes.includes("offstyle")) i.flags.push("offstyle");
    i.ru = [...new Set(i._w.filter(w => !STOP.includes(w)).flatMap(w => (ru[w] || "").split(/,\s*/)).filter(Boolean))].join(", ");
    if (seen[i._h]) i.dup = seen[i._h];
    else seen[i._h] = i.id;
  }

  const out = icons.map(({ _w, _h, ...i }) => {
    const o = { id: i.id, pack: i.pack, file: i.file, name: i.name, ru: i.ru, themes: i.themes, flags: i.flags };
    if (i.author) o.author = i.author;
    if (i.group) o.group = i.group;
    if (i.tags?.length) o.tags = i.tags;
    if (i.dup) o.dup = i.dup;
    return o;
  });
  const json = `{\n"built": ${JSON.stringify(new Date().toISOString().slice(0, 10))},\n"packs": ${JSON.stringify(Object.fromEntries(Object.entries(sources.packs).map(([k, p]) => [k, { title: p.title, license: p.license, use: p.use }])))},\n"themes": [\n${themes.map(t => JSON.stringify({ key: t.key, ru: t.ru })).join(",\n")}\n],\n"icons": [\n${out.map(o => JSON.stringify(o)).join(",\n")}\n]\n}\n`;
  fs.writeFileSync(CATALOG, json);
  console.log(`каталог: ${out.length} иконок -> ${rel(CATALOG)}`);
  stats(prepare(JSON.parse(json)));
}

function load() {
  if (!fs.existsSync(CATALOG)) build();
  return prepare(read(CATALOG));
}

function stats(c) {
  const by = {};
  for (const i of c.icons) {
    const p = (by[i.pack] ??= { all: 0, bare: 0, dup: 0, face: 0, off: 0 });
    p.all++;
    if (!i.themes.length) p.bare++;
    if (i.dup) p.dup++;
    if (i.flags.includes("face")) p.face++;
    if (i.flags.includes("offstyle")) p.off++;
  }
  console.log("набор  всего  без темы  дубли  лица  не фэнтези");
  for (const [k, p] of Object.entries(by)) console.log(`${k.padEnd(6)} ${String(p.all).padStart(5)} ${String(p.bare).padStart(9)} ${String(p.dup).padStart(6)} ${String(p.face).padStart(5)} ${String(p.off).padStart(11)}`);
}

function themesCmd(c) {
  for (const t of c.themes) {
    const list = c.icons.filter(i => i.themes.includes(t.key) && !i.dup);
    const per = Object.fromEntries(["gi", "tw", "np", "own", "logo", "sr"].map(p => [p, list.filter(i => i.pack === p).length]));
    console.log(`${t.key.padEnd(10)} ${t.ru.padEnd(28)} ${String(list.length).padStart(5)}   ${Object.entries(per).filter(([, n]) => n).map(([p, n]) => `${p} ${n}`).join(", ")}`);
  }
}

function line(i) {
  return `${i.id.padEnd(46)} ${i.ru.slice(0, 40).padEnd(40)} [${i.themes.join(" ")}]${i.flags.length ? " {" + i.flags.join(" ") + "}" : ""}`;
}

function args(argv) {
  const o = { q: [], packs: [], limit: 40 };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === "--theme" || a === "-t") o.theme = argv[++k];
    else if (a === "--pack" || a === "-p") o.packs = argv[++k].split(",");
    else if (a === "--limit" || a === "-n") o.limit = +argv[++k];
    else if (a === "--all") o.all = true;
    else if (a === "--dups") o.dups = true;
    else if (a === "--files") o.files = true;
    else o.q.push(a);
  }
  return o;
}

function credits(c, ids) {
  const src = read(path.join(ICONS, "sources.json")).packs;
  const need = {};
  for (const id of ids) {
    const i = c.icons.find(x => x.id === id);
    if (!i) { console.log(`нет такой иконки: ${id}`); continue; }
    const key = i.author ? `${i.pack}/${i.author}` : i.pack;
    (need[key] ??= []).push(i.name);
  }
  for (const [k, names] of Object.entries(need)) {
    const [p, a] = k.split("/");
    const pack = src[p];
    const who = a ? pack.authors[a] : pack;
    console.log(`${pack.title}${a ? `, ${who?.name || a}` : ""}: ${who?.license || pack.license}${who?.url || pack.url ? `, ${who?.url || pack.url}` : ""}  (${names.join(", ")})`);
  }
}

function artOf(i) {
  const svg = fs.readFileSync(path.join(ROOT, i.file), "utf8").replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, "");
  const box = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!box || box[1] !== box[2]) throw new Error(`${i.id}: нужен квадратный viewBox`);
  const odd = svg.match(/<(g|circle|rect|ellipse|polygon|polyline|line|use|image|text)\b/);
  if (odd) throw new Error(`${i.id}: в файле есть <${odd[1]}>, берём только <path>`);
  const d = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m => m[1].trim()).filter(x => !/^M0 0h\d+v\d+H0z$/.test(x));
  if (!d.length) throw new Error(`${i.id}: нет путей`);
  const vb = Number(box[1]);
  const k = vb <= 100 ? 2 : 1;
  const short = d.join(" ").replace(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi, n => " " + String(+(+n).toFixed(k)).replace(/^(-?)0\./, "$1."))
    .replace(/\s*,\s*/g, " ").replace(/\s+/g, " ").replace(/\s*([a-df-z])\s*/gi, "$1").replace(/ -/g, "-").trim();
  return [vb, short];
}

function codeIcons() {
  const dir = path.join(ROOT, "js");
  const ids = new Set();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".js") && f !== "icon-art.js")) {
    for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/"((?:gi|tw|np)\/[a-z0-9-]+\/[a-z0-9-]+)"/g)) ids.add(m[1]);
  }
  return [...ids].sort();
}

function site(c) {
  const reg = read(path.join(ICONS, "site.json"));
  const own = new Set(ownIcons().map(o => o.key));
  const lines = [];
  const used = [];
  for (const [theme, items] of Object.entries(reg)) {
    for (const [key, id] of Object.entries(items)) {
      if (own.has(key)) throw new Error(`${key}: такой ключ уже есть в js/icons.js`);
      const i = c.icons.find(x => x.id === id);
      if (!i || !["tw", "gi", "np"].includes(i.pack)) throw new Error(`${theme}.${key}: нет иконки ${id} в tw, gi или np`);
      const [vb, d] = artOf(i);
      lines.push(`  ${key}: [${vb}, "${d}"]`);
      used.push(id);
    }
  }
  const ids = codeIcons();
  for (const id of ids) {
    const i = c.icons.find(x => x.id === id);
    if (!i || !["tw", "gi", "np"].includes(i.pack)) throw new Error(`в коде нет такой иконки: ${id}`);
    if (i.flags.includes("face")) console.log(`внимание, лицо: ${id}`);
  }
  fs.writeFileSync(path.join(ROOT, "js/icon-art.js"), `export const ART = {\n${lines.join(",\n")}\n};\n\nexport const USED = ${JSON.stringify(ids)};\n`);
  fs.writeFileSync(path.join(ICONS, "used.json"), JSON.stringify(ids.map(id => c.icons.find(x => x.id === id).file)) + "\n");
  console.log(`js/icon-art.js: ${lines.length} встроенных, ${ids.length} файлами, ${Math.round(fs.statSync(path.join(ROOT, "js/icon-art.js")).size / 1024)} КБ`);
  credits(c, [...new Set([...used, ...ids])]);
  iconCredits(c, [...new Set([...used, ...ids])]);
  pickerIndex(c, reg, ids);
}

function pickerIndex(c, reg, ids) {
  const byId = new Map(c.icons.map(i => [i.id, i]));
  const text = i => [i.ru, i.name].filter(Boolean).join(" ").toLowerCase();
  const out = [];
  for (const i of c.icons) if (i.pack === "own" && i.group !== "ui") out.push([i.id.slice(4), text(i)]);
  for (const [theme, items] of Object.entries(reg)) if (theme !== "tab") for (const [key, id] of Object.entries(items)) out.push([key, text(byId.get(id))]);
  for (const id of ids) out.push([id, text(byId.get(id))]);
  fs.writeFileSync(path.join(ICONS, "picker.json"), JSON.stringify(out) + "\n");
}

function iconCredits(c, ids) {
  const src = read(path.join(ICONS, "sources.json")).packs;
  const count = {};
  for (const id of ids) {
    const i = c.icons.find(x => x.id === id);
    const key = i.author ? `${i.pack}/${i.author}` : i.pack;
    count[key] = (count[key] || 0) + 1;
  }
  const order = k => ["tw", "gi", "np"].indexOf(k.split("/")[0]);
  const items = Object.entries(count).sort((a, b) => order(a[0]) - order(b[0]) || b[1] - a[1]).map(([k, n]) => {
    const [p, a] = k.split("/");
    const pack = src[p];
    const who = a ? pack.authors[a] : pack;
    const it = { title: pack.title, url: p === "tw" ? "https://github.com/intrinsical/tw-dnd/tree/main/icons" : pack.url, author: who.name || pack.author, license: who.license || pack.license.split(" (")[0], note: `Иконок на сайте: ${n}.` };
    const authorUrl = a ? who.url : pack.authorUrl;
    if (authorUrl) it.authorUrl = authorUrl;
    return it;
  });
  fs.writeFileSync(path.join(ROOT, "js/icon-credits.js"), `export const ICON_CREDITS = [\n${items.map(x => "  " + JSON.stringify(x).replace(/":/g, "\": ").replace(/","/g, "\", \"").replace(/^\{/, "{ ").replace(/\}$/, " }").replace(/"([a-zA-Z]+)": /g, "$1: ")).join(",\n")}\n];\n`);
}

const [cmd = "help", ...rest] = process.argv.slice(2);
if (cmd === "build") build();
else if (cmd === "find" || cmd === "f") {
  const o = args(rest);
  const res = search(load(), o.q.join(" "), o);
  console.log(`найдено ${res.length}${res.length > o.limit ? `, показаны первые ${o.limit}` : ""}`);
  for (const i of res.slice(0, o.limit)) console.log(o.files ? i.file : line(i));
} else if (cmd === "themes") themesCmd(load());
else if (cmd === "stats") stats(load());
else if (cmd === "show") {
  const c = load();
  for (const id of rest) console.log(JSON.stringify(c.icons.find(i => i.id === id), (k, v) => k.startsWith("_") ? undefined : v, 2));
} else if (cmd === "credits") credits(load(), rest);
else if (cmd === "site") site(load());
else {
  console.log(`node tools/icons.mjs build                     пересобрать assets/icons/catalog.json
node tools/icons.mjs find <слова> [опции]       поиск по-русски и по-английски
    -t, --theme <ключ>   только тема (список: themes)
    -p, --pack gi,tw     только наборы: gi, tw, np, own, logo, sr
    -n, --limit <N>      сколько показать (40)
    --all                показать и лица, и не фэнтези
    --dups               показать дубли
    --files              печатать только пути файлов
node tools/icons.mjs themes                    темы и сколько в них иконок
node tools/icons.mjs stats                     сводка по наборам
node tools/icons.mjs show <id> ...             всё про иконку
node tools/icons.mjs credits <id> ...          что вписать в CREDITS
node tools/icons.mjs site                      иконки сайта из assets/icons/site.json в js/icon-art.js
Просмотр глазами: http://localhost:8765/tools/icon-browser.html`);
}
