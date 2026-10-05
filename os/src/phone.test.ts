import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isKeyboardOpen, isPhone, KEYBOARD_MIN_PX, PHONE_MAX_SHORT_SIDE } from './phone.ts';

test('a phone is a phone whichever way up it is held', () => {
  assert.equal(isPhone(390, 844), true);
  assert.equal(isPhone(844, 390), true);
  assert.equal(isPhone(360, 780), true);
});

test('the short side decides: 600 is a phone, 601 is not', () => {
  assert.equal(PHONE_MAX_SHORT_SIDE, 600); // same value as app/src/flatMode.ts
  assert.equal(isPhone(600, 1000), true);
  assert.equal(isPhone(601, 1000), false);
  assert.equal(isPhone(1000, 600), true);
  assert.equal(isPhone(1000, 601), false);
});

test('tablets and desktops are not phones', () => {
  assert.equal(isPhone(768, 1024), false);
  assert.equal(isPhone(1024, 768), false);
  assert.equal(isPhone(1440, 900), false);
});

test('the keyboard is up when the visible height drops by more than 150 px', () => {
  assert.equal(KEYBOARD_MIN_PX, 150);
  assert.equal(isKeyboardOpen(844, 500), true);
  assert.equal(isKeyboardOpen(844, 693), true);
  assert.equal(isKeyboardOpen(844, 694), false);
});

test('the address bar or a pinch zoom is not the keyboard', () => {
  // Safari's bars change the visible height by about 80 px; that must not hide the Dock.
  assert.equal(isKeyboardOpen(844, 760), false);
  assert.equal(isKeyboardOpen(844, 844), false);
  // Pinch-zoomed to 2x: half the page is visible, but there is no keyboard.
  assert.equal(isKeyboardOpen(844, 422, 2), false);
  // Zoomed and the keyboard up.
  assert.equal(isKeyboardOpen(844, 250, 2), true);
});
