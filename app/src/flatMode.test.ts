import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskRequested, PHONE_MAX_SHORT_SIDE, shouldUseFlatOS } from './flatMode.ts';

const desktop = { width: 1440, height: 900, webgl: true, desk: false };
const size = (width: number, height: number) => ({ ...desktop, width, height });

test('desktop with WebGL gets the 3D scene', () => {
  assert.equal(shouldUseFlatOS(desktop), false);
});

test('a phone is flat whichever way up it is held', () => {
  assert.equal(shouldUseFlatOS(size(390, 844)), true);
  assert.equal(shouldUseFlatOS(size(844, 390)), true);
  assert.equal(shouldUseFlatOS(size(360, 780)), true);
});

test('the short side decides: 600 is a phone, 601 is not', () => {
  assert.equal(PHONE_MAX_SHORT_SIDE, 600); // same value as os/src/phone.ts
  assert.equal(shouldUseFlatOS(size(600, 1000)), true);
  assert.equal(shouldUseFlatOS(size(601, 1000)), false);
  assert.equal(shouldUseFlatOS(size(1000, 600)), true);
  assert.equal(shouldUseFlatOS(size(1000, 601)), false);
});

test('a tablet and a narrowed desktop window get the 3D scene', () => {
  assert.equal(shouldUseFlatOS(size(768, 1024)), false);
  assert.equal(shouldUseFlatOS(size(700, 900)), false);
});

test('?desk=1 keeps a phone on the 3D scene', () => {
  assert.equal(shouldUseFlatOS({ ...size(390, 844), desk: true }), false);
  assert.equal(shouldUseFlatOS({ ...size(844, 390), desk: true }), false);
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
