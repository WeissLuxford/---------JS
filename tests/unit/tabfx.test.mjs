import test from "node:test";
import assert from "node:assert/strict";
import { VARIANTS, WEIGHT_WORD, variantById } from "../../js/tab-fx.js";

const style = () => ({ style: {}, querySelector: () => ({}) });

function fakeCtx(from, to) {
  const c = {
    o: style(),
    n: style(),
    d: to > from ? 1 : -1,
    from,
    to,
    x: 50,
    w: 375,
    h: 640,
    piece: () => ({ ...style(), querySelector: () => style() }),
    shadeOn: () => style(),
    sheet: () => style(),
    items: () => [style(), style(), style()],
    sfx: () => {}
  };
  return c;
}

test("variants have unique ids, weights, names and notes", () => {
  const ids = VARIANTS.map(v => v.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 18);
  for (const v of VARIANTS) {
    assert.ok([0, 1, 2].includes(v.w), v.id);
    assert.ok(WEIGHT_WORD[v.w], v.id);
    assert.ok(v.name && v.note && v.grp, v.id);
    assert.equal(typeof v.run, "function", v.id);
    assert.ok(!/—/.test(v.name + v.note + v.grp), v.id);
  }
  assert.equal(variantById("seal").w, 0);
  assert.equal(variantById("nope"), null);
});

test("every variant builds well-formed tracks forward, back and for long jumps", () => {
  for (const v of VARIANTS) {
    for (const [from, to] of [[0, 1], [1, 0], [0, 5], [5, 0], [2, 3]]) {
      const tracks = v.run(fakeCtx(from, to));
      assert.ok(Array.isArray(tracks), v.id);
      if (v.id === "none") {
        assert.equal(tracks.length, 0);
        continue;
      }
      assert.ok(tracks.length > 0, v.id);
      for (const t of tracks) {
        assert.ok(t.el, `${v.id} el`);
        assert.ok(Array.isArray(t.frames) && t.frames.length >= 2, `${v.id} frames`);
        assert.ok(t.dur > 0 && t.delay >= 0, `${v.id} timing ${t.dur} ${t.delay}`);
        for (const f of t.frames) {
          assert.ok(!Object.values(f).some(x => typeof x === "string" && /NaN|undefined/.test(x)), `${v.id} frame ${JSON.stringify(f)}`);
        }
      }
    }
  }
});

test("book flips more sheets for longer jumps and keeps the spine on the left", () => {
  const book = variantById("book");
  const count = (from, to) => book.run(fakeCtx(from, to)).filter(t => t.origin === "0% 50%").length;
  assert.equal(count(0, 1), 1);
  assert.equal(count(1, 0), 1);
  assert.ok(count(0, 5) > count(0, 2));
  assert.ok(count(0, 5) >= 5);
  assert.ok(count(5, 0) >= 5);
});
