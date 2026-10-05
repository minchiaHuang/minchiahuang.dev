import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskRequested, PHONE_MAX_PX, shouldUseFlatOS } from './flatMode.ts';

const desktop = { width: 1440, height: 900, webgl: true, coarse: false, desk: false };
const screen = (width: number, height: number, coarse: boolean) => ({ ...desktop, width, height, coarse });

test('desktop with WebGL gets the 3D scene', () => {
  assert.equal(shouldUseFlatOS(desktop), false);
});

test('a touch phone is flat whichever way up it is held', () => {
  assert.equal(shouldUseFlatOS(screen(390, 844, true)), true);
  assert.equal(shouldUseFlatOS(screen(844, 390, true)), true);
  assert.equal(shouldUseFlatOS(screen(360, 780, true)), true);
});

test('a short window with a mouse is not a phone: laptop window, docked devtools', () => {
  assert.equal(shouldUseFlatOS(screen(844, 390, false)), false);
  assert.equal(shouldUseFlatOS(screen(1280, 590, false)), false);
});

test('a narrow window is a phone even with a mouse', () => {
  assert.equal(shouldUseFlatOS(screen(500, 900, false)), true);
});

test('the boundaries: width 600 is a phone, 601 is not; touch height 600 is a phone, 601 is not', () => {
  assert.equal(PHONE_MAX_PX, 600); // same value as os/src/phone.ts
  assert.equal(shouldUseFlatOS(screen(600, 1000, false)), true);
  assert.equal(shouldUseFlatOS(screen(601, 1000, false)), false);
  assert.equal(shouldUseFlatOS(screen(1000, 600, true)), true);
  assert.equal(shouldUseFlatOS(screen(1000, 601, true)), false);
});

test('a tablet and a narrowed desktop window get the 3D scene', () => {
  assert.equal(shouldUseFlatOS(screen(768, 1024, true)), false);
  assert.equal(shouldUseFlatOS(screen(700, 900, false)), false);
});

test('?desk=1 keeps a phone on the 3D scene', () => {
  assert.equal(shouldUseFlatOS({ ...screen(390, 844, true), desk: true }), false);
  assert.equal(shouldUseFlatOS({ ...screen(844, 390, true), desk: true }), false);
});

test('no WebGL is flat, even with ?desk=1', () => {
  assert.equal(shouldUseFlatOS({ ...desktop, webgl: false }), true);
  assert.equal(shouldUseFlatOS({ ...desktop, webgl: false, desk: true }), true);
});

test('?desk=1 is read from the query string', () => {
  assert.equal(deskRequested('?desk=1'), true);
  assert.equal(deskRequested('?shot=idle&desk=1'), true);
  assert.equal(deskRequested(''), false);
  assert.equal(deskRequested('?desk=0'), false);
  assert.equal(deskRequested('?desk'), false);
});

test('reduced motion is not a reason to go flat', () => {
  // The visitor still gets the 3D scene.
  assert.equal(shouldUseFlatOS({ ...desktop, reducedMotion: true } as typeof desktop), false);
});
