import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { DPAD, KBD, keyChanges, LAYOUTS, stickKeys, textToKeys, type GameId, type SendKey, type StickKeys, type VKey } from './keyLayouts';

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

// A round stick (Doom has two: move and aim). The knob follows the finger; the direction of the drag from the centre
// (keyLayouts.ts stickKeys) decides which keys are held. Each stick tracks its own pointer, so both work at once with
// two fingers. Everything it holds is released on lift, cancel, lost capture and unmount, so no key sticks.
function Stick({ pad, send, label, className }: { pad: StickKeys; send: SendKey | null; label: string; className: string }) {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const held = useRef<number[]>([]);
  const sendRef = useRef(send);
  sendRef.current = send;
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const apply = (next: number[]) => {
    const { press, release } = keyChanges(held.current, next);
    for (const c of release) sendRef.current?.(c, false);
    for (const c of press) sendRef.current?.(c, true);
    held.current = next;
  };
  const let_go = () => {
    pointer.current = null;
    apply([]);
    setKnob({ x: 0, y: 0 });
  };
  useEffect(() => () => apply([]), []); // eslint-disable-line react-hooks/exhaustive-deps -- apply only touches refs
  const drag = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    const radius = r.width / 2;
    const dx = e.clientX - (r.left + radius);
    const dy = e.clientY - (r.top + radius);
    const len = Math.hypot(dx, dy) || 1;
    const reach = Math.min(len, radius * 0.6); // the knob stays inside the ring
    setKnob({ x: (dx / len) * reach, y: (dy / len) * reach });
    apply(stickKeys(pad, dx, dy, radius));
  };
  return (
    <div
      ref={base}
      role="group"
      aria-label={label}
      className={`m-vk-stick ${className}${send ? '' : ' is-disabled'}`}
      onPointerDown={(e) => {
        if (!send || pointer.current !== null) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = e.pointerId;
        drag(e);
      }}
      onPointerMove={drag}
      onPointerUp={(e) => pointer.current === e.pointerId && let_go()}
      onPointerCancel={(e) => pointer.current === e.pointerId && let_go()}
      onLostPointerCapture={(e) => pointer.current === e.pointerId && let_go()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="m-vk-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
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

// The on-screen keys for one DOS game (keyLayouts.ts): the D-pad on the left (games that have one) or Doom's two sticks,
// and the action keys. MobileGame places the parts; mobile.css arranges them for upright and sideways.
export default function VirtualKeys({ game, send }: Props) {
  const layout = LAYOUTS[game];
  const key = (k: VKey) => (
    <Key key={k.label} k={k} send={send}>
      {k.label}
    </Key>
  );
  if (layout.sticks) {
    return (
      <>
        <Stick pad={layout.sticks.move} send={send} label="Move stick" className="m-vk-move" />
        <Stick pad={layout.sticks.aim} send={send} label="Aim stick" className="m-vk-aim" />
        <div className="m-vk-keys">
          <div className="m-vk-act">{layout.keys.filter((k) => k.act).map(key)}</div>
          <div className="m-vk-sys">{layout.keys.filter((k) => !k.act).map(key)}</div>
        </div>
      </>
    );
  }
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
        {layout.keys.map(key)}
        {layout.abc && <Abc send={send} />}
      </div>
    </>
  );
}
