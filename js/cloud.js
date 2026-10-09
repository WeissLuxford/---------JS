import { DELETE, diffPaths, applyPaths } from "./sync.js";
import { NOTE_KEYS } from "./rules.js";

export const LIST_PATHS = [["attacks"], ["spells"], ["features"], ["items"], ["effects"], ...NOTE_KEYS.map(k => ["notes", k])];

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const copy = v => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function getAt(o, path) {
  let x = o;
  for (const k of path) {
    if (!isObj(x)) return undefined;
    x = x[k];
  }
  return x;
}

function setAt(o, path, v) {
  let x = o;
  for (let i = 0; i < path.length - 1; i++) {
    if (!isObj(x[path[i]])) x[path[i]] = {};
    x = x[path[i]];
  }
  if (v === undefined) delete x[path[path.length - 1]];
  else x[path[path.length - 1]] = v;
}

const validO = v => typeof v === "number" && Number.isFinite(v);

function keptByLis(vals) {
  const tails = [];
  const prev = new Array(vals.length).fill(-1);
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v === null) continue;
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (vals[tails[mid]] < v) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const keep = new Set();
  let k = tails.length ? tails[tails.length - 1] : -1;
  while (k >= 0) {
    keep.add(k);
    k = prev[k];
  }
  return keep;
}

export function orderKeys(list) {
  const vals = list.map(e => (isObj(e) && validO(e._o) ? e._o : null));
  const keep = keptByLis(vals);
  const out = vals.map((v, i) => (keep.has(i) ? v : null));
  let i = 0;
  while (i < out.length) {
    if (out[i] !== null) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && out[j] === null) j++;
    const lo = i > 0 ? out[i - 1] : null;
    const hi = j < out.length ? out[j] : null;
    const k = j - i;
    for (let n = 0; n < k; n++) {
      out[i + n] = lo === null && hi === null ? n + 1 : lo === null ? hi - (k - n) : hi === null ? lo + n + 1 : lo + ((hi - lo) * (n + 1)) / (k + 1);
    }
    i = j;
  }
  for (let n = 1; n < out.length; n++) {
    if (!(out[n] > out[n - 1])) return out.map((_, m) => m + 1);
  }
  return out;
}

export function toCloud(c) {
  const out = copy(c || {});
  for (const path of LIST_PATHS) {
    const list = getAt(out, path);
    if (list === undefined || isObj(list)) continue;
    const arr = Array.isArray(list) ? list.filter(isObj) : [];
    const keys = orderKeys(arr);
    const map = {};
    arr.forEach((e, i) => {
      if (typeof e.id !== "string" || !e.id || map[e.id]) return;
      map[e.id] = { ...e, _o: keys[i] };
    });
    setAt(out, path, map);
  }
  return out;
}

export function fromCloud(d) {
  const out = copy(d || {});
  for (const path of LIST_PATHS) {
    const v = getAt(out, path);
    if (!isObj(v)) continue;
    const list = Object.entries(v)
      .filter(([id, e]) => isObj(e) && e.id === id)
      .sort(([a, x], [b, y]) => (validO(x._o) ? x._o : 0) - (validO(y._o) ? y._o : 0) || (a < b ? -1 : a > b ? 1 : 0))
      .map(([, e]) => e);
    setAt(out, path, list);
  }
  return out;
}

export function legacyLists(d) {
  return LIST_PATHS.filter(p => Array.isArray(getAt(d, p)));
}

function withoutLists(o) {
  const out = copy(o || {});
  for (const p of LIST_PATHS) setAt(out, p, undefined);
  return out;
}

export function cloudDiff(base, cur, legacy = []) {
  const a = toCloud(base);
  const b = toCloud(cur);
  const out = diffPaths(withoutLists(a), withoutLists(b));
  const whole = new Set(legacy.map(p => p.join(".")));
  for (const path of LIST_PATHS) {
    const ma = getAt(a, path);
    const mb = getAt(b, path);
    if (mb === undefined) continue;
    if (whole.has(path.join("."))) {
      out.push([path, copy(mb)]);
      continue;
    }
    const pa = isObj(ma) ? ma : {};
    if (!isObj(ma) && Object.keys(mb).length) {
      out.push([path, copy(mb)]);
      continue;
    }
    for (const id of Object.keys(pa)) if (!(id in mb)) out.push([[...path, id], DELETE]);
    for (const [id, e] of Object.entries(mb)) {
      const old = pa[id];
      if (!isObj(old)) {
        out.push([[...path, id], copy(e)]);
        continue;
      }
      for (const f of new Set([...Object.keys(old), ...Object.keys(e)])) {
        if (e[f] === undefined) out.push([[...path, id, f], DELETE]);
        else if (!same(old[f], e[f])) out.push([[...path, id, f], copy(e[f])]);
      }
    }
  }
  return out;
}

export function applyToCloudDoc(target, changes) {
  const live = changes.filter(([path]) => {
    const list = LIST_PATHS.find(p => p.length < path.length - 1 && p.every((k, i) => path[i] === k));
    return !list || isObj(getAt(target, path.slice(0, list.length + 1)));
  });
  return applyPaths(target, live);
}

export function applyCloud(doc, changes) {
  return fromCloud(applyToCloudDoc(toCloud(doc), changes));
}

export function rebase(base, cur, incoming) {
  return applyCloud(incoming, cloudDiff(base, cur));
}
