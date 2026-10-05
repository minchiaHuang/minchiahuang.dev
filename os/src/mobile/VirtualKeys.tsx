import { useRef, type PointerEvent, type ReactNode } from 'react';
import { DPAD, KBD, LAYOUTS, textToKeys, type GameId, type SendKey, type VKey } from './keyLayouts';

interface Props {
  game: GameId;
  send: SendKey | null; // null until the emulator runs: the keys show, disabled
}

// Text glyphs, not emoji (U+FE0E), so iOS draws plain arrows.
const ARROW: Record<string, string> = { Up: '▲︎', Left: '◀︎', Right: '▶︎', Down: '▼︎' };
const SENTINEL = ' '; // the ABC field is never empty, or iOS sends no input event for backspace
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One on-screen key: pressed while the finger is down, so holding an arrow keeps Doom walking. Pointer capture keeps
// the release on this key even if the finger slides off it.
function Key({ k, send, className = '', children }: { k: VKey; send: SendKey | null; className?: string; children: ReactNode }) {
  const down = useRef(false);
  const press = (e: PointerEvent<HTMLButtonElement>) => {
    if (!send || down.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    down.current = true;
    send(k.code, true);
  };
  const release = () => {
    if (!send || !down.current) return;
    down.current = false;
    send(k.code, false);
  };
  return (
    <button
      type="button"
      className={`m-vk-key${k.wide ? ' is-wide' : ''}${className ? ' ' + className : ''}`}
      aria-label={k.label}
      disabled={!send}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

// ABC: focuses a hidden text field, which brings up the phone keyboard, and turns what is typed into key presses.
// js-dos ignores keys typed into a text field, so the letters reach the game only this way. Presses go one after
// another (40 ms down, 40 ms up), so a fast typist's letters arrive in order.
function Abc({ send }: { send: SendKey | null }) {
  const field = useRef<HTMLInputElement>(null);
  const queue = useRef(Promise.resolve());
  const composed = useRef(''); // what the open composition (Android keyboards) has already typed
  const type = (codes: number[]) => {
    if (!send) return;
    for (const c of codes) {
      queue.current = queue.current
        .then(async () => {
          send(c, true);
          await wait(40);
          send(c, false);
          await wait(40);
        })
        // One failed send (a dead emulator) must not leave the queue rejected, or every later letter is skipped.
        .catch(() => {});
    }
  };
  return (
    <>
      <button type="button" className="m-vk-key m-vk-abc" disabled={!send} onClick={() => field.current?.focus()}>
        ABC
      </button>
      <input
        ref={field}
        className="m-vk-text"
        defaultValue={SENTINEL}
        aria-label="Type into the game"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="enter"
        onInput={(e) => {
          const ev = e.nativeEvent as InputEvent;
          type(textToKeys(ev.inputType, ev.data, composed.current));
          if (ev.inputType === 'insertCompositionText') composed.current = ev.data ?? '';
          else if (ev.inputType === 'deleteContentBackward') composed.current = composed.current.slice(0, -1);
          // Resetting the value while a composition is open would end it (or retype it): wait for compositionend.
          if (!ev.isComposing) e.currentTarget.value = SENTINEL;
        }}
        onCompositionEnd={(e) => {
          composed.current = '';
          e.currentTarget.value = SENTINEL;
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          type([KBD.enter]);
        }}
      />
    </>
  );
}

// The on-screen keys for one DOS game (keyLayouts.ts): the D-pad on the left (games that have one), the action keys
// on the right. MobileGame places the two halves; mobile.css arranges them for upright and sideways.
export default function VirtualKeys({ game, send }: Props) {
  const layout = LAYOUTS[game];
  return (
    <>
      {layout.dpad && (
        <div className="m-vk-left">
          <div className="m-vk-dpad">
            {DPAD.map((k) => (
              <Key key={k.label} k={k} send={send} className={`m-vk-d-${k.label.toLowerCase()}`}>
                {ARROW[k.label]}
              </Key>
            ))}
          </div>
        </div>
      )}
      <div className="m-vk-right">
        {layout.keys.map((k) => (
          <Key key={k.label} k={k} send={send}>
            {k.label}
          </Key>
        ))}
        {layout.abc && <Abc send={send} />}
      </div>
    </>
  );
}
