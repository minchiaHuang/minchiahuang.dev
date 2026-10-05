// The on-screen keys for each DOS game (VirtualKeys.tsx). Pure data plus the text-to-key mapping, so node --test can
// check it. Codes are js-dos KBD_* codes (DOSBox's own, not DOM keyCodes); keyLayouts.test.ts reads js-dos's table
// from os/node_modules/js-dos/dist/js-dos.js and checks every code used here against it.

// What DosGame hands over once the emulator runs: press (true) or release (false) one KBD code.
export type SendKey = (code: number, pressed: boolean) => void;

export const KBD = {
  space: 32,
  esc: 256,
  enter: 257,
  backspace: 259,
  right: 262,
  left: 263,
  down: 264,
  up: 265,
  leftctrl: 341,
  // Doom's gameplay keys (its DEFAULT.CFG binds W/A/S/D to move and strafe)
  a: 65,
  d: 68,
  s: 83,
  w: 87,
} as const;
// a–z are 65–90 and 0–9 are 48–57 in js-dos, the same as their ASCII upper case letters and digits.
const LETTER_A = 65;
const DIGIT_0 = 48;

export interface VKey {
  label: string;
  code: number;
  wide?: boolean; // takes two columns (Space)
  act?: boolean; // sits with the aim stick (FIRE, USE) when the layout has two sticks
}

// The keys one on-screen stick presses, by direction. A missing direction does nothing: Doom's aim stick turns but
// cannot look up or down.
export interface StickKeys {
  up?: number;
  down?: number;
  left?: number;
  right?: number;
}

export interface GameLayout {
  dpad: boolean; // arrow keys on the left, held down to repeat
  sticks: { move: StickKeys; aim: StickKeys } | null; // twin sticks (Doom), in place of the D-pad
  keys: VKey[]; // the action keys on the right
  abc: boolean; // an ABC key that brings up the phone keyboard for typing names
}

export type GameId = 'doom' | 'oregon' | 'scrabble';

const digit = (n: number): VKey => ({ label: String(n), code: DIGIT_0 + n });

export const LAYOUTS: Record<GameId, GameLayout> = {
  doom: {
    // Doom's gameplay keys are not the arrows (DEFAULT.CFG: W/S walk, A/D strafe, the arrows turn), so an arrow D-pad
    // only turns. The menu is hard-wired to the arrows, hence the two Menu keys.
    dpad: false,
    sticks: {
      move: { up: KBD.w, down: KBD.s, left: KBD.a, right: KBD.d },
      aim: { left: KBD.left, right: KBD.right },
    },
    keys: [
      { label: 'FIRE', code: KBD.leftctrl, act: true },
      { label: 'USE', code: KBD.space, act: true },
      { label: 'Enter', code: KBD.enter },
      { label: 'Esc', code: KBD.esc },
      { label: 'Menu ▲', code: KBD.up },
      { label: 'Menu ▼', code: KBD.down },
    ],
    abc: false,
  },
  oregon: {
    dpad: false,
    sticks: null,
    keys: [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digit),
      { label: 'Enter', code: KBD.enter },
      { label: 'Space', code: KBD.space, wide: true },
      { label: 'Esc', code: KBD.esc },
    ],
    abc: true,
  },
  scrabble: {
    dpad: true,
    sticks: null,
    keys: [
      { label: 'Enter', code: KBD.enter },
      { label: 'Esc', code: KBD.esc },
    ],
    abc: true,
  },
};

export const DPAD: VKey[] = [
  { label: 'Up', code: KBD.up },
  { label: 'Left', code: KBD.left },
  { label: 'Right', code: KBD.right },
  { label: 'Down', code: KBD.down },
];

// Inside this fraction of the stick's radius nothing is pressed, so a resting thumb does not walk.
const DEAD_ZONE = 0.2;
const SECTOR_DIRS: (keyof StickKeys)[][] = [
  ['right'],
  ['down', 'right'],
  ['down'],
  ['down', 'left'],
  ['left'],
  ['up', 'left'],
  ['up'],
  ['up', 'right'],
];

// The keys a drag of (dx, dy) from the stick's centre presses (screen coordinates, y grows down), in 8 directions:
// each is a 45-degree sector, and a diagonal presses two keys. A direction the pad has no key for presses nothing.
export function stickKeys(pad: StickKeys, dx: number, dy: number, radius: number): number[] {
  if (Math.hypot(dx, dy) < DEAD_ZONE * radius) return [];
  const sector = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
  return SECTOR_DIRS[sector].map((d) => pad[d]).filter((c): c is number => c !== undefined);
}

// Going from the keys held now to the keys wanted: press only what is new and release only what stopped, so a held
// direction is not restarted when the thumb slides to a diagonal.
export function keyChanges(prev: number[], next: number[]): { press: number[]; release: number[] } {
  return { press: next.filter((c) => !prev.includes(c)), release: prev.filter((c) => !next.includes(c)) };
}

// One typed character as a KBD code, or null for one the games cannot take. Upper and lower case are the same key:
// DOS games of this age read the key, not the case.
export function charToKbd(ch: string): number | null {
  if (/^[a-z]$/i.test(ch)) return LETTER_A + ch.toUpperCase().charCodeAt(0) - 65;
  if (/^[0-9]$/.test(ch)) return DIGIT_0 + Number(ch);
  if (ch === ' ') return KBD.space;
  return null;
}

// The keys for one `input` event on the ABC field (InputEvent.inputType and .data). VirtualKeys resets the field after
// every event outside a composition, so each such event carries new text only. Autocorrect's insertReplacementText is
// ignored: it would type a whole word again. Enter does not fire `input` on a one-line field; VirtualKeys handles it on
// keydown.
// Android keyboards (Gboard) send plain letters as insertCompositionText, and each event carries the whole composition
// so far ("t", "to", "tom"), not the new letter. `composed` is what an earlier event of the same composition already
// typed: only the difference is sent, so letters are not doubled. A change inside the composed text (not at its end)
// backspaces over the part that differs, then types the rest.
export function textToKeys(inputType: string, data: string | null, composed = ''): number[] {
  if (inputType === 'deleteContentBackward') return [KBD.backspace];
  if (inputType === 'insertCompositionText') {
    const next = [...(data ?? '')].filter((ch) => charToKbd(ch) !== null).join('');
    let same = 0;
    while (same < composed.length && same < next.length && composed[same] === next[same]) same++;
    return [
      ...Array<number>(composed.length - same).fill(KBD.backspace),
      ...[...next.slice(same)].map((ch) => charToKbd(ch)!),
    ];
  }
  if (inputType !== 'insertText' || !data) return [];
  return [...data].map(charToKbd).filter((c): c is number => c !== null);
}
