import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseFlatOS, FLAT_MAX_WIDTH } from './flatMode.ts';

const desktop = { width: 1440, webgl: true };

test('desktop with WebGL gets the 3D scene', () => {
  assert.equal(shouldUseFlatOS(desktop), false);
});

test('768 px and below is flat, 769 is 3D', () => {
  assert.equal(FLAT_MAX_WIDTH, 768);
  assert.equal(shouldUseFlatOS({ ...desktop, width: 768 }), true);
  assert.equal(shouldUseFlatOS({ ...desktop, width: 769 }), false);
  assert.equal(shouldUseFlatOS({ ...desktop, width: 375 }), true);
});

test('no WebGL is flat', () => {
  assert.equal(shouldUseFlatOS({ ...desktop, webgl: false }), true);
});

test('reduced motion is not a reason to go flat', () => {
  // The camera moves instantly instead (Camera.ts); the visitor still gets the 3D scene.
  assert.equal(shouldUseFlatOS({ ...desktop, reducedMotion: true } as typeof desktop), false);
});
