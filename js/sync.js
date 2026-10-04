export const DELETE = Symbol("delete");

const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const SKIP = new Set(["id", "updatedAt", "createdAt", "updatedBy", "ownerUid", "ownerName", "visibility"]);

const copy = v => JSON.parse(JSON.stringify(v));

const isEntityList = v => Array.isArray(v) && v.every(x => isObj(x) && typeof x.id === "string" && x.id);

function listOps(a, b) {
  const before = new Map(a.map(x => [x.id, x]));
  const after = new Set(b.map(x => x.id));
  return {
    removed: a.filter(x => !after.has(x.id)).map(x => x.id),
    upserts: b.filter(x => !before.has(x.id) || !same(before.get(x.id), x)).map(copy),
    order: b.map(x => x.id)
  };
}

function applyListOps(target, ops) {
  const removed = new Set(ops.removed);
  const out = target.filter(x => !removed.has(x.id));
  for (const u of ops.upserts) {
    const i = out.findIndex(x => x.id === u.id);
    if (i >= 0) out[i] = copy(u);
    else {
      const pos = ops.order.indexOf(u.id);
      const prevId = pos > 0 ? ops.order[pos - 1] : null;
      const j = prevId ? out.findIndex(x => x.id === prevId) : -1;
      if (pos === 0) out.unshift(copy(u));
      else if (j >= 0) out.splice(j + 1, 0, copy(u));
      else out.push(copy(u));
    }
  }
  return out;
}

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
    else if (isEntityList(a) && isEntityList(b)) out.push([[...prefix, k], copy(b), listOps(a, b)]);
    else out.push([[...prefix, k], copy(b)]);
  }
  return out;
}

export function applyPaths(target, changes) {
  for (const [path, value, ops] of changes) {
    let o = target;
    for (let i = 0; i < path.length - 1; i++) {
      if (!isObj(o[path[i]])) o[path[i]] = {};
      o = o[path[i]];
    }
    const last = path[path.length - 1];
    if (value === DELETE) delete o[last];
    else if (ops && isEntityList(o[last])) o[last] = applyListOps(o[last], ops);
    else o[last] = copy(value);
  }
  return target;
}
