import type { AppId } from './apps';

export interface Rect { x: number; y: number; w: number; h: number }

export interface WinState {
  id: AppId;
  rect: Rect;
  minimized: boolean;
  maximized: boolean;
  restore?: Rect; // rectangle to return to when un-maximizing
  z: number;
  custom?: boolean; // the user moved or resized it, so a viewport change must not reset its rectangle
}

export interface Viewport { w: number; h: number }

export interface WinSystem {
  wins: WinState[]; // opening order (taskbar order)
  top: number; // highest z handed out so far
  active: AppId | null; // the window with a blue title; null after a desktop click or a minimize
  pressed: AppId | null; // the taskbar button drawn pressed; survives a desktop click, not a minimize
  vp: Viewport; // the iframe viewport; the desktop area is this minus the taskbar
}

// The OS fills whatever viewport it is given (the outer iframe is 1216x960 in practice,
// 1248x992 in the original contract). The taskbar takes the bottom 32px.
export const TASKBAR_H = 32;
export const desktopOf = (vp: Viewport) => ({ w: vp.w, h: vp.h - TASKBAR_H });
export const MIN_SIZE = { w: 536, h: 277 };
export const TITLE_H = 22;

// Shrink and shift a rectangle until it lies inside the desktop area.
export const fit = (r: Rect, vp: Viewport): Rect => {
  const d = desktopOf(vp);
  const w = Math.min(r.w, d.w);
  const h = Math.min(r.h, d.h);
  return { x: Math.max(0, Math.min(r.x, d.w - w)), y: Math.max(0, Math.min(r.y, d.h - h)), w, h };
};

// My Showcase is the viewport minus 100 on each axis at (56, 24); the others have fixed sizes.
// All are clamped to the viewport.
const BASE_RECTS: Record<AppId, Rect> = {
  showcase: { x: 56, y: 24, w: 0, h: 0 }, // size filled in from the viewport
  fiveletters: { x: 300, y: 20, w: 600, h: 860 },
  'about-site': { x: 260, y: 40, w: 720, h: 760 },
  credits: { x: 49, y: 49, w: 1100, h: 800 },
  scrabble: { x: 10, y: 10, w: 920, h: 750 },
  doom: { x: 10, y: 10, w: 980, h: 670 },
  oregon: { x: 10, y: 10, w: 920, h: 750 },
};

export const defaultRect = (id: AppId, vp: Viewport): Rect => {
  const r = BASE_RECTS[id];
  return fit(id === 'showcase' ? { ...r, w: vp.w - 100, h: vp.h - 100 } : r, vp);
};

export type Action =
  | { type: 'viewport'; w: number; h: number }
  | { type: 'open'; id: AppId }
  | { type: 'focus'; id: AppId }
  | { type: 'minimize'; id: AppId }
  | { type: 'toggleMax'; id: AppId }
  | { type: 'close'; id: AppId }
  | { type: 'move'; id: AppId; x: number; y: number }
  | { type: 'resize'; id: AppId; w: number; h: number }
  | { type: 'taskbar'; id: AppId }
  | { type: 'blur' }
  | { type: 'closeAll' };

export const activeId = (s: WinSystem): AppId | null => s.active;

// The visible window with the highest z, used to pick a new active window after a close.
const topVisible = (s: WinSystem): AppId | null => {
  let best: WinState | null = null;
  for (const w of s.wins) if (!w.minimized && (!best || w.z > best.z)) best = w;
  return best ? best.id : null;
};

export const pressedId = (s: WinSystem): AppId | null => s.pressed;

export const initialSystem = (vp: Viewport, open: AppId[] = ['showcase']): WinSystem =>
  open.reduce<WinSystem>((s, id) => reduce(s, { type: 'open', id }), { wins: [], top: 0, vp, active: null, pressed: null });

const patch = (s: WinSystem, id: AppId, f: (w: WinState) => Partial<WinState>): WinSystem => ({
  ...s,
  wins: s.wins.map((w) => (w.id === id ? { ...w, ...f(w) } : w)),
});

const raise = (s: WinSystem, id: AppId, extra: Partial<WinState> = {}): WinSystem => {
  const top = s.top + 1;
  return { ...patch(s, id, () => ({ ...extra, z: top })), top, active: id, pressed: id };
};

export function reduce(s: WinSystem, a: Action): WinSystem {
  const desk = desktopOf(s.vp);
  switch (a.type) {
    case 'viewport': {
      const vp = { w: a.w, h: a.h };
      const d = desktopOf(vp);
      return {
        ...s,
        vp,
        wins: s.wins.map((w) => ({
          ...w,
          rect: w.maximized ? { x: 0, y: 0, ...d } : w.custom ? fit(w.rect, vp) : defaultRect(w.id, vp),
          restore: w.restore && fit(w.restore, vp),
        })),
      };
    }
    case 'open': {
      const existing = s.wins.find((w) => w.id === a.id);
      if (existing) return raise(s, a.id, { minimized: false });
      // A new window's z is its place in the opening order (1 for the first), while each press on a window
      // raises it above the highest z so far. So after a few presses a newly opened window lands behind the
      // others: it is still active, but the pressed taskbar button stays where it was until it is clicked
      // (seen in the original with Credits, and with Doom opened while Credits was on top).
      const z = s.wins.length + 1;
      const front = s.wins.every((w) => w.z < z);
      const win: WinState = { id: a.id, rect: defaultRect(a.id, s.vp), minimized: false, maximized: false, z: front ? z : z - 0.5 };
      return { ...s, wins: [...s.wins, win], top: Math.max(s.top, z), active: a.id, pressed: front ? a.id : s.pressed };
    }
    case 'focus':
      return raise(s, a.id);
    case 'minimize': {
      // Focus is not handed to another window: nothing is active afterwards.
      const n = patch(s, a.id, () => ({ minimized: true }));
      return { ...n, active: s.active === a.id ? null : s.active, pressed: s.pressed === a.id ? null : s.pressed };
    }
    case 'blur':
      return s.active ? { ...s, active: null } : s;
    case 'toggleMax':
      return raise(
        patch(s, a.id, (w) => {
          if (w.maximized) {
            return { maximized: false, rect: w.restore ?? defaultRect(w.id, s.vp), restore: undefined };
          }
          return { maximized: true, restore: w.rect, rect: { x: 0, y: 0, ...desk } };
        }),
        a.id,
      );
    case 'close': {
      const n = { ...s, wins: s.wins.filter((w) => w.id !== a.id) };
      const next = topVisible(n);
      // The next window is not focused: it stays inactive (grey title) until it is clicked.
      return {
        ...n,
        active: s.active === a.id ? null : s.active,
        pressed: s.pressed === a.id ? next : s.pressed,
      };
    }
    case 'move': {
      // Keep a 40px strip of the window reachable and the title bar above the taskbar.
      const x = Math.min(Math.max(a.x, -1000), desk.w - 40);
      const y = Math.min(Math.max(a.y, -TITLE_H + 6), desk.h - TITLE_H);
      return patch(s, a.id, (w) => (w.maximized ? {} : { custom: true, rect: { ...w.rect, x: Math.max(x, 40 - w.rect.w), y } }));
    }
    case 'resize':
      return patch(s, a.id, (w) =>
        w.maximized ? {} : { custom: true, rect: { ...w.rect, w: Math.max(a.w, MIN_SIZE.w), h: Math.max(a.h, MIN_SIZE.h) } },
      );
    case 'taskbar': {
      const w = s.wins.find((x) => x.id === a.id);
      if (!w) return s;
      if (w.minimized) return raise(s, a.id, { minimized: false });
      // A window opened behind the others is active but not pressed: its button raises it instead.
      if (activeId(s) === a.id && s.pressed === a.id) return reduce(s, { type: 'minimize', id: a.id });
      return raise(s, a.id);
    }
    case 'closeAll':
      return { ...s, wins: [], top: 0, active: null, pressed: null };
  }
}
