import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
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
  assert.deepEqual(textToKeys('insertCompositionText', null), []);
});

test('Android composition: each event carries the whole word, only the new letters are typed', () => {
  assert.deepEqual(textToKeys('insertCompositionText', 't'), [84]);
  assert.deepEqual(textToKeys('insertCompositionText', 'to', 't'), [79]);
  assert.deepEqual(textToKeys('insertCompositionText', 'tom', 'to'), [77]);
  assert.deepEqual(textToKeys('insertCompositionText', 'tom', 'tom'), []); // the same text again types nothing
  assert.deepEqual(textToKeys('insertCompositionText', 'tom é', 'tom'), [KBD.space]); // untypable characters are dropped
  assert.deepEqual(textToKeys('insertCompositionText', 'ta', 'to'), [KBD.backspace, 65]); // a change inside the word
  assert.deepEqual(textToKeys('insertCompositionText', 't', 'tom'), [KBD.backspace, KBD.backspace]);
});

// Doom reads its gameplay keys from DEFAULT.CFG in the bundle, as DOS scancodes. If our D-pad sends other keys, the
// buttons do nothing in the game (the menu is hard-wired to the arrows, so a menu check cannot catch this).
const DOOM_BUNDLE = fileURLToPath(new URL('../../public/games/doom.jsdos', import.meta.url));
const skipDoom = existsSync(DOOM_BUNDLE) ? false : 'os/public/games/doom.jsdos is not there (bash tools/fetch-dos-games.sh)';

// The first entry of the zip is DEFAULT.CFG: parse its local file header (sizes are in the header, flag bit 3 is off).
function readDoomCfg(): Map<string, number> {
  const zip = readFileSync(DOOM_BUNDLE);
  assert.equal(zip.readUInt32LE(0), 0x04034b50, 'not a zip');
  const method = zip.readUInt16LE(8);
  const packed = zip.readUInt32LE(18);
  const nameLen = zip.readUInt16LE(26);
  const extraLen = zip.readUInt16LE(28);
  assert.equal(zip.toString('latin1', 30, 30 + nameLen), 'DEFAULT.CFG');
  const start = 30 + nameLen + extraLen;
  const data = zip.subarray(start, start + packed);
  const text = (method === 8 ? inflateRawSync(data) : data).toString('latin1');
  return new Map(text.split(/\r?\n/).flatMap((l) => (/^key_\w+\s+\d+$/.test(l.trim()) ? [l.trim().split(/\s+/) as [string, string]] : [])).map(([k, v]) => [k, Number(v)]));
}

// DOS scancode (what DEFAULT.CFG holds) to js-dos KBD code (what we send).
const SCAN_TO_KBD = new Map([
  [17, 87], // W
  [31, 83], // S
  [30, 65], // A
  [32, 68], // D
  [75, 263], // left arrow
  [77, 262], // right arrow
  [29, 341], // left ctrl
  [57, 32], // space
]);

test("Doom's on-screen keys send the keys DEFAULT.CFG binds", { skip: skipDoom }, () => {
  const cfg = readDoomCfg();
  const bound = (action: string) => {
    const scan = cfg.get(action);
    assert.ok(scan !== undefined, `${action} is not in DEFAULT.CFG`);
    const kbd = SCAN_TO_KBD.get(scan);
    assert.ok(kbd !== undefined, `${action} is bound to scancode ${scan}, which the test has no KBD code for`);
    return kbd;
  };
  const { dpad, keys } = LAYOUTS.doom;
  const pad = Array.isArray(dpad) ? dpad : dpad ? DPAD : [];
  const codeOf = (list: { label: string; code: number }[], label: string) => list.find((k) => k.label === label)?.code;
  assert.equal(codeOf(pad, 'Up'), bound('key_up'), 'D-pad up');
  assert.equal(codeOf(pad, 'Down'), bound('key_down'), 'D-pad down');
  assert.equal(codeOf(pad, 'Left'), bound('key_left'), 'D-pad left');
  assert.equal(codeOf(pad, 'Right'), bound('key_right'), 'D-pad right');
  assert.equal(codeOf(keys, 'FIRE'), bound('key_fire'), 'FIRE');
  assert.equal(codeOf(keys, 'USE'), bound('key_use'), 'USE');
});
