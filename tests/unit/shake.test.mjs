import { test } from "node:test";
import assert from "node:assert/strict";
const S = await import(new URL("../../js/shake.js", import.meta.url).href);

const ev = (x, y, z) => ({ acceleration: { x, y, z } });

test("force uses acceleration, or gravity minus 9.81", () => {
  assert.equal(S.shakeForce(ev(3, 4, 0)), 5);
  assert.ok(Math.abs(S.shakeForce({ acceleration: null, accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 } })) < 1e-9);
  assert.equal(S.shakeForce({}), 0);
});

test("two strong jolts in a short window roll once, then a cooldown", () => {
  let t = 0;
  let rolls = 0;
  const h = S.shakeDetector(() => rolls++, { now: () => t });
  h(ev(20, 0, 0));
  t = 300;
  h(ev(0, 20, 0));
  assert.equal(rolls, 1);
  t = 600;
  h(ev(20, 0, 0));
  t = 800;
  h(ev(20, 0, 0));
  assert.equal(rolls, 1);
  t = 2500;
  h(ev(20, 0, 0));
  t = 2700;
  h(ev(20, 0, 0));
  assert.equal(rolls, 2);
});

test("walking, single bumps and jitter do not roll", () => {
  let t = 0;
  let rolls = 0;
  const h = S.shakeDetector(() => rolls++, { now: () => t });
  for (let i = 0; i < 50; i++) {
    t += 100;
    h(ev(4, 3, 2));
  }
  h(ev(25, 0, 0));
  t += 40;
  h(ev(25, 0, 0));
  t += 2000;
  h(ev(25, 0, 0));
  assert.equal(rolls, 0);
});
