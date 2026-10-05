// The phone shell's navigation: one full-screen app at a time, or the desktop grid when none is open.
// Pure, so node --test can run it; MobileShell holds it with useReducer.
import { APPS, appById, DOCK, dockOwner, GAMES } from '../apps.ts';
import type { AppId } from '../apps.ts';
import { parseOpenQuery } from '../remote.ts';

export interface MobileState {
  current: AppId | null; // null: the desktop grid (HomeGrid)
  info: boolean; // Showcase only: true shows the Showcase pages ("More Info…"), false the About card
}

export type MobileAction = { type: 'open'; id: AppId } | { type: 'close' } | { type: 'moreInfo' } | { type: 'home' };

export const INITIAL: MobileState = { current: 'showcase', info: false };

// The desktop grid: the Dock apps, then Tommy HD and About This Site.
export const HOME_ITEMS: AppId[] = [...DOCK, 'harddisk', 'credits'];

export function reduceMobile(s: MobileState, a: MobileAction): MobileState {
  switch (a.type) {
    case 'open':
      return { current: a.id, info: false };
    case 'close':
      // × on the Showcase pages goes back to the card; anywhere else it goes to the desktop.
      return s.current === 'showcase' && s.info ? { current: 'showcase', info: false } : { current: null, info: false };
    case 'moreInfo':
      return { current: 'showcase', info: true };
    case 'home':
      return { current: null, info: false };
  }
}

// Leaving Projects drops the project or filter it was asked for: Projects mounts with its request, so a stale one
// would reopen the old project instead of the folder.
export const leavesProjects = (s: MobileState, a: MobileAction): boolean =>
  s.current === 'projects' && reduceMobile(s, a).current !== 'projects';

export const isGame = (id: AppId | null): boolean => GAMES.some((g) => g.id === id);

// The lit Dock icon: a game belongs to Games; Tommy HD and About This Site light nothing.
export const dockLit = (s: MobileState): AppId | null => (s.current ? dockOwner(s.current) : null);

// The top bar's title.
export const titleOf = (s: MobileState): string => (s.current ? appById(s.current).name : 'Finder');

// The first screen: ?shot=m-<app id> | m-home | m-info (screenshots, tools/mobile-shots.sh), else ?page= / ?open=
// (remote.ts), else the Showcase card.
export function startState(search: string): MobileState {
  const shot = new URLSearchParams(search).get('shot') ?? '';
  if (shot === 'm-home') return { current: null, info: false };
  if (shot === 'm-info') return { current: 'showcase', info: true };
  const app = shot.startsWith('m-') ? APPS.find((x) => x.id === shot.slice(2)) : undefined;
  if (app) return { current: app.id, info: false };
  const t = parseOpenQuery(search);
  if (t?.app === 'showcase') return { current: 'showcase', info: t.page !== 'home' };
  if (t) return { current: t.app, info: false };
  return INITIAL;
}
