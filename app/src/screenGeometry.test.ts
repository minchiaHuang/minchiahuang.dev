import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREEN_PX, DEFAULT_SIZE, BAKED_SCALE, screenSizeFromExtras, fitDistance } from './screenGeometry.ts';

test('the iframe is 1024x768, the 4:3 size the OS is laid out for', () => {
  assert.deepEqual(SCREEN_PX, { w: 1024, h: 768 });
});

test('the fallback glass size is 4:3 like the iframe, so the CSS3D scale is uniform', () => {
  assert.ok(Math.abs(DEFAULT_SIZE.w / DEFAULT_SIZE.h - SCREEN_PX.w / SCREEN_PX.h) < 1e-3);
});

test('anchor extras are glTF units, scaled to app units', () => {
  const size = screenSizeFromExtras({ width: 1.0518, height: 0.7888 }, BAKED_SCALE);
  assert.ok(size);
  assert.ok(Math.abs(size.w - 946.62) < 0.01 && Math.abs(size.h - 709.92) < 0.01);
});

test('missing or broken extras fall back (undefined)', () => {
  assert.equal(screenSizeFromExtras(undefined, BAKED_SCALE), undefined);
  assert.equal(screenSizeFromExtras({}, BAKED_SCALE), undefined);
  assert.equal(screenSizeFromExtras({ width: '1', height: 1 }, BAKED_SCALE), undefined);
  assert.equal(screenSizeFromExtras({ width: 0, height: 1 }, BAKED_SCALE), undefined);
});

test('fitDistance: the old 1024 px CRT gave the old 1870 monitor distance', () => {
  assert.ok(Math.abs(fitDistance(1024, 35) - 1870) < 5); // 1867.4, rounded to 1870 back then
});
