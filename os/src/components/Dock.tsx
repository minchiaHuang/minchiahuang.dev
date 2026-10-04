import { useState } from 'react';
import { aqua, appById, DOCK, type AppId } from '../apps';

const BASE = 48; // icon size at rest
const MAX = 76; // icon size right under the pointer
const GAP = 6;
const REACH = 2.5 * (BASE + GAP); // how far from the pointer an icon still grows
const DIVIDER = 17; // width of the divider slot before the Trash
const NARROW = '(max-width: 520px)'; // must match the .dock zoom media query in styles.css

interface Props {
  running: Set<AppId>; // apps with an open window (a game counts as Games)
  onOpen: (id: AppId) => void;
  hoverSlot?: number; // ?shot=dock: the pointer rests over this slot
}

type Slot = { kind: 'app'; id: AppId } | { kind: 'divider' } | { kind: 'trash' };
const SLOTS: Slot[] = [...DOCK.map((id) => ({ kind: 'app', id }) as Slot), { kind: 'divider' }, { kind: 'trash' }];

// Centre of each slot at rest, as an offset from the Dock's (and the screen's) centre. Magnification is
// worked out against these rest positions so a growing icon does not move the point the pointer is measured from.
const restWidths = SLOTS.map((s) => (s.kind === 'divider' ? DIVIDER : BASE));
const restTotal = restWidths.reduce((a, b) => a + b, 0) + GAP * (SLOTS.length - 1);
const restCentres = restWidths.map((w, i) => -restTotal / 2 + restWidths.slice(0, i).reduce((a, b) => a + b + GAP, 0) + w / 2);

// Icon size for a pointer at offset `x` from the centre (null: pointer not over the Dock).
const sizeAt = (centre: number, x: number | null) => {
  if (x === null) return BASE;
  const d = Math.abs(x - centre);
  if (d >= REACH) return BASE;
  return BASE + (MAX - BASE) * (Math.cos((d / REACH) * Math.PI) + 1) / 2;
};

export default function Dock({ running, onOpen, hoverSlot }: Props) {
  const rest = hoverSlot === undefined ? null : restCentres[hoverSlot];
  const [pointer, setPointer] = useState<number | null>(rest);
  const nearest = pointer === null ? -1 : restCentres.reduce((best, c, i) => (Math.abs(c - pointer) < Math.abs(restCentres[best] - pointer) ? i : best), 0);

  return (
    <div
      className="dock"
      // At phone widths the Dock is CSS-zoomed (styles.css), so the unscaled rest centres no longer match the
      // pointer: skip magnification there.
      onMouseMove={(e) => !matchMedia(NARROW).matches && setPointer(e.clientX - document.documentElement.clientWidth / 2)}
      onMouseLeave={() => setPointer(rest)}
    >
      <div className="dock-shelf" />
      {SLOTS.map((s, i) => {
        if (s.kind === 'divider') return <div key="divider" className="dock-divider" />;
        const size = sizeAt(restCentres[i], pointer);
        const name = s.kind === 'trash' ? 'Trash' : appById(s.id).name;
        return (
          <button
            key={s.kind === 'trash' ? 'trash' : s.id}
            className="dock-item"
            style={{ width: size }}
            aria-label={name}
            onClick={() => s.kind === 'app' && onOpen(s.id)}
          >
            {i === nearest && SLOTS[nearest].kind !== 'divider' && <span className="dock-label">{name}</span>}
            <img src={aqua(s.kind === 'trash' ? 'trash.png' : appById(s.id).icon!)} alt="" draggable={false} style={{ width: size, height: size }} />
            {s.kind === 'app' && running.has(s.id) && <span className="dock-running" />}
          </button>
        );
      })}
    </div>
  );
}
