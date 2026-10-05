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
} as const;
// a–z are 65–90 and 0–9 are 48–57 in js-dos, the same as their ASCII upper case letters and digits.
const LETTER_A = 65;
const DIGIT_0 = 48;

export interface VKey {
  label: string;
  code: number;
  wide?: boolean; // takes two columns (Space, FIRE)
}

export interface GameLayout {
  dpad: boolean; // arrow keys on the left, held down to repeat
  keys: VKey[]; // the action keys on the right
  abc: boolean; // an ABC key that brings up the phone keyboard for typing names
}

export type GameId = 'doom' | 'oregon' | 'scrabble';

const digit = (n: number): VKey => ({ label: String(n), code: DIGIT_0 + n });

export const LAYOUTS: Record<GameId, GameLayout> = {
  doom: {
    dpad: true,
    keys: [
      { label: 'FIRE', code: KBD.leftctrl, wide: true },
      { label: 'USE', code: KBD.space },
      { label: 'Enter', code: KBD.enter },
      { label: 'Esc', code: KBD.esc },
    ],
    abc: false,
  },
  oregon: {
    dpad: false,
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
