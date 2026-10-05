import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../apps.ts';
import { charToKbd, DPAD, KBD, LAYOUTS, textToKeys } from './keyLayouts.ts';

// js-dos's own key table, read from the installed package (not from keyLayouts.ts, which would only test itself).
// The minified bundle holds it as {KBD_NONE:0,KBD_0:48,...}; a few values are variables defined elsewhere in the
// file (KBD_leftctrl:Gs ... ,Gs=341,), so those are looked up by name.
const DIST = fileURLToPath(new URL('../../node_modules/js-dos/dist/js-dos.js', import.meta.url));
const skip = existsSync(DIST) ? false : 'os/node_modules is not installed (cd os && npm ci)';

function readKbdTable(): Map<string, number> {
  const src = readFileSync(DIST, 'utf8');
  const body = /\{(KBD_NONE:0,[^}]*)\}/.exec(src)?.[1];
  assert.ok(body, 'no KBD_NONE table in js-dos.js');
  const table = new Map<string, number>();
  for (const entry of body.split(',')) {
    const [name, value] = entry.split(':');
    let code = Number(value);
    if (Number.isNaN(code)) {
      const esc = value.replace(/\$/g, '\\$');
      const def = new RegExp(`[,;\\s]${esc}=(\\d+)[,;]`).exec(src);
      assert.ok(def, `js-dos.js does not define ${value} (${name})`);
      code = Number(def[1]);
    }
    table.set(name.replace(/^KBD_/, ''), code);
  }
  return table;
}

test('our KBD names have js-dos codes', { skip }, () => {
  const table = readKbdTable();
  for (const [name, code] of Object.entries(KBD)) assert.equal(table.get(name), code, name);
  for (const ch of 'abcdefghijklmnopqrstuvwxyz0123456789') assert.equal(table.get(ch), charToKbd(ch), ch);
});

test('every on-screen key sends a code that is in the js-dos table', { skip }, () => {
  const codes = new Set(readKbdTable().values());
  for (const [game, layout] of Object.entries(LAYOUTS)) {
    for (const k of [...layout.keys, ...(layout.dpad ? DPAD : [])]) assert.ok(codes.has(k.code), `${game} ${k.label}: ${k.code}`);
  }
});

test('one layout per DOS game in the Games folder', () => {
  assert.deepEqual(Object.keys(LAYOUTS).sort(), GAMES.map((g) => g.id).sort());
});

test('the layouts are the ones in the spec', () => {
  const labels = (id: keyof typeof LAYOUTS) => LAYOUTS[id].keys.map((k) => k.label);
  assert.deepEqual([LAYOUTS.doom.dpad, LAYOUTS.doom.abc], [true, false]);
  assert.deepEqual(labels('doom'), ['FIRE', 'USE', 'Enter', 'Esc']);
  assert.equal(LAYOUTS.doom.keys[0].code, KBD.leftctrl);
  assert.equal(LAYOUTS.doom.keys[1].code, KBD.space);
  assert.deepEqual([LAYOUTS.oregon.dpad, LAYOUTS.oregon.abc], [false, true]);
  assert.deepEqual(labels('oregon'), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Enter', 'Space', 'Esc']);
  assert.deepEqual([LAYOUTS.scrabble.dpad, LAYOUTS.scrabble.abc], [true, true]);
  assert.deepEqual(labels('scrabble'), ['Enter', 'Esc']);
});

test('typed characters become keys; others are dropped', () => {
  assert.equal(charToKbd('a'), 65);
  assert.equal(charToKbd('Z'), 90);
  assert.equal(charToKbd('0'), 48);
  assert.equal(charToKbd(' '), KBD.space);
  assert.equal(charToKbd('é'), null);
  assert.equal(charToKbd('.'), null);
});

test('the ABC field: each letter once, backspace deletes, autocorrect types nothing', () => {
  assert.deepEqual(textToKeys('insertText', 'T'), [84]);
  assert.deepEqual(textToKeys('insertText', 'ab'), [65, 66]);
  assert.deepEqual(textToKeys('insertText', 'é'), []);
  assert.deepEqual(textToKeys('insertText', null), []);
  assert.deepEqual(textToKeys('deleteContentBackward', null), [KBD.backspace]);
  assert.deepEqual(textToKeys('insertReplacementText', 'Tommy'), []);
  assert.deepEqual(textToKeys('insertCompositionText', 'a'), []);
});
