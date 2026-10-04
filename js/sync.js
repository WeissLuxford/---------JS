export const DELETE = Symbol("delete");

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const SKIP = new Set(["id", "updatedAt", "createdAt", "updatedBy"]);

export function diffPaths(base, cur, depth = 2, prefix = []) {
  const out = [];
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(cur || {})]);
  for (const k of keys) {
    if (!prefix.length && SKIP.has(k)) continue;
    const a = base ? base[k] : undefined;
    const b = cur ? cur[k] : undefined;
    if (b === undefined) {
      if (a !== undefined) out.push([[...prefix, k], DELETE]);
      continue;
    }
    if (same(a, b)) continue;
    if (depth > 1 && isObj(a) && isObj(b)) out.push(...diffPaths(a, b, depth - 1, [...prefix, k]));
    else out.push([[...prefix, k], JSON.parse(JSON.stringify(b))]);
  }
  return out;
}

export function applyPaths(target, changes) {
  for (const [path, value] of changes) {
    let o = target;
    for (let i = 0; i < path.length - 1; i++) {
      if (!isObj(o[path[i]])) o[path[i]] = {};
      o = o[path[i]];
    }
    const last = path[path.length - 1];
    if (value === DELETE) delete o[last];
    else o[last] = JSON.parse(JSON.stringify(value));
  }
  return target;
}
