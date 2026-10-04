import type { AppId } from './apps';

export interface Rect { x: number; y: number; w: number; h: number }

export interface WinState {
  id: AppId;
  rect: Rect;
  minimized: boolean;
  maximized: boolean;
  restore?: Rect; // rectangle to return to when un-zooming
  z: number;
  custom?: boolean; // the user moved or resized it, so a viewport change must not reset its rectangle
}

export interface Viewport { w: number; h: number }

export interface WinSystem {
  wins: WinState[]; // opening order
  top: number; // highest z handed out so far
  active: AppId | null; // the window with lit gel buttons; null after a desktop click or a minimize
  vp: Viewport; // the iframe viewport; the desktop area is this minus the menu bar and the Dock
}

// The OS is designed for the iMac's 4:3 screen: the monitor iframe is 1024x768. Standalone /os/ pages
// (flat mode, phones) get other sizes, so every rectangle is clamped to whatever viewport there is.
export const DESIGN_VP: Viewport = { w: 1024, h: 768 };
export const MENUBAR_H = 22;
export const DOCK_H = 60; // the Dock strip at rest; windows stay above it so it never hides a title bar
export const desktopOf = (vp: Viewport) => ({ w: vp.w, h: vp.h - MENUBAR_H - DOCK_H });
export const MIN_SIZE = { w: 320, h: 200 };
export const TITLE_H = 22;

// Shrink and shift a rectangle until it lies inside the desktop area.
export const fit = (r: Rect, vp: Viewport): Rect => {
  const d = desktopOf(vp);
  const w = Math.min(r.w, d.w);
  const h = Math.min(r.h, d.h);
  return { x: Math.max(0, Math.min(r.x, d.w - w)), y: Math.max(0, Math.min(r.y, d.h - h)), w, h };
};

// Placement on the 1024x768 screen, in desktop coordinates (y = 0 is just under the menu bar).
// Showcase and Games match the Figma frames (03 OS Skins, nodes 42:611 and 42:832).
const BASE_RECTS: Record<AppId, Rect> = {
  showcase: { x: 44, y: 28, w: 740, h: 540 },
  projects: { x: 120, y: 56, w: 620, h: 430 },
  resume: { x: 212, y: 8, w: 600, h: 660 },
  contact: { x: 282, y: 120, w: 460, h: 300 },
  games: { x: 560, y: 350, w: 420, h: 236 },
  fiveletters: { x: 212, y: 8, w: 600, h: 670 },
  terminal: { x: 162, y: 96, w: 640, h: 400 },
  harddisk: { x: 300, y: 70, w: 520, h: 280 },
  credits: { x: 62, y: 16, w: 900, h: 650 },
  doom: { x: 22, y: 8, w: 980, h: 670 },
  oregon: { x: 52, y: 8, w: 920, h: 670 },
  scrabble: { x: 52, y: 8, w: 920, h: 670 },
};

export const defaultRect = (id: AppId, vp: Viewport): Rect => fit(BASE_RECTS[id], vp);

export type Action =
  | { type: 'viewport'; w: number; h: number }
  | { type: 'open'; id: AppId }
  | { type: 'focus'; id: AppId }
  | { type: 'minimize'; id: AppId }
  | { type: 'toggleMax'; id: AppId }
  | { type: 'close'; id: AppId }
  | { type: 'move'; id: AppId; x: number; y: number }
  | { type: 'resize'; id: AppId; w: number; h: number }
  | { type: 'blur' }
  | { type: 'closeAll' };

export const activeId = (s: WinSystem): AppId | null => s.active;

export const initialSystem = (vp: Viewport, open: AppId[] = ['showcase']): WinSystem =>
  open.reduce<WinSystem>((s, id) => reduce(s, { type: 'open', id }), { wins: [], top: 0, vp, active: null });

const patch = (s: WinSystem, id: AppId, f: (w: WinState) => Partial<WinState>): WinSystem => ({
  ...s,
  wins: s.wins.map((w) => (w.id === id ? { ...w, ...f(w) } : w)),
});

const raise = (s: WinSystem, id: AppId, extra: Partial<WinState> = {}): WinSystem => {
  const top = s.top + 1;
  return { ...patch(s, id, () => ({ ...extra, z: top })), top, active: id };
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
      // Opening from the Dock, a folder or the menu brings an existing window back (un-minimised) and to the front.
      if (s.wins.some((w) => w.id === a.id)) return raise(s, a.id, { minimized: false });
      const top = s.top + 1;
      const win: WinState = { id: a.id, rect: defaultRect(a.id, s.vp), minimized: false, maximized: false, z: top };
      return { ...s, wins: [...s.wins, win], top, active: a.id };
    }
    case 'focus':
      return s.active === a.id ? s : raise(s, a.id);
    case 'minimize': {
      // Focus is not handed to another window: nothing is active afterwards.
      const n = patch(s, a.id, () => ({ minimized: true }));
      return { ...n, active: s.active === a.id ? null : s.active };
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
      // The next window is not focused: it stays inactive until it is clicked.
      const n = { ...s, wins: s.wins.filter((w) => w.id !== a.id) };
      return { ...n, active: s.active === a.id ? null : s.active };
    }
    case 'move': {
      // Keep a 40px strip of the window reachable and the title bar between the menu bar and the Dock.
      const x = Math.min(Math.max(a.x, -1000), desk.w - 40);
      const y = Math.min(Math.max(a.y, 0), desk.h - TITLE_H);
      return patch(s, a.id, (w) => (w.maximized ? {} : { custom: true, rect: { ...w.rect, x: Math.max(x, 40 - w.rect.w), y } }));
    }
    case 'resize':
      return patch(s, a.id, (w) =>
        w.maximized ? {} : { custom: true, rect: { ...w.rect, w: Math.max(a.w, MIN_SIZE.w), h: Math.max(a.h, MIN_SIZE.h) } },
      );
    case 'closeAll':
      return { ...s, wins: [], top: 0, active: null };
  }
}
