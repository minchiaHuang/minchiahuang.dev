import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MUTE_KEY, readMuted, writeMuted, isMuteKey, type KeyValueStore } from './muteState.ts';

const memory = (): KeyValueStore & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};
const throwing: KeyValueStore = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceededError'); },
};

test('defaults to not muted', () => {
  assert.equal(readMuted(memory()), false);
  assert.equal(readMuted(null), false);
});

test('round-trips through the store', () => {
  const s = memory();
  writeMuted(s, true);
  assert.equal(s.data[MUTE_KEY], '1');
  assert.equal(readMuted(s), true);
  writeMuted(s, false);
  assert.equal(readMuted(s), false);
});

test('a store that throws reads as not muted and writes silently', () => {
  assert.equal(readMuted(throwing), false);
  assert.doesNotThrow(() => writeMuted(throwing, true));
});

test('garbage in the store reads as not muted', () => {
  const s = memory();
  s.setItem(MUTE_KEY, 'yes');
  assert.equal(readMuted(s), false);
});

test('m and M toggle', () => {
  assert.equal(isMuteKey({ key: 'm' }), true);
  assert.equal(isMuteKey({ key: 'M' }), true);
});

test('typing inside the OS does not toggle', () => {
  assert.equal(isMuteKey({ key: 'm', inComputer: true }), false);
});

test('typing in an input on the outer page does not toggle', () => {
  assert.equal(isMuteKey({ key: 'm', targetIsEditable: true }), false);
});

test('held key, modifiers and other keys do not toggle', () => {
  assert.equal(isMuteKey({ key: 'm', repeat: true }), false);
  assert.equal(isMuteKey({ key: 'm', metaKey: true }), false);
  assert.equal(isMuteKey({ key: 'm', ctrlKey: true }), false);
  assert.equal(isMuteKey({ key: 'm', altKey: true }), false);
  assert.equal(isMuteKey({ key: 'n' }), false);
});
