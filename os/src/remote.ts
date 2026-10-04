// os/src/remote.ts — how the outer page (or a URL) asks the OS to open a window.
//   postMessage from the parent page: { type: 'open', app: 'showcase', page?: ShowcasePage }
//                                     { type: 'open', app: <OpenableApp> }
//   URL: /os/?page=<ShowcasePage>  or  /os/?open=<OpenableApp>
export const SHOWCASE_PAGES = ['home', 'about', 'experience', 'projects', 'resume', 'contact'] as const;
export type ShowcasePage = (typeof SHOWCASE_PAGES)[number];

// The Dock apps. DOS games, Tommy HD and the credits are reached from inside the OS only.
export const OPENABLE_APPS = ['showcase', 'projects', 'resume', 'contact', 'games', 'fiveletters', 'terminal'] as const;
export type OpenableApp = (typeof OPENABLE_APPS)[number];

export type OpenTarget = { app: 'showcase'; page: ShowcasePage } | { app: Exclude<OpenableApp, 'showcase'> };

const isPage = (v: unknown): v is ShowcasePage =>
  typeof v === 'string' && (SHOWCASE_PAGES as readonly string[]).includes(v);
const isApp = (v: unknown): v is OpenableApp =>
  typeof v === 'string' && (OPENABLE_APPS as readonly string[]).includes(v);

const target = (app: OpenableApp, page: unknown): OpenTarget =>
  app === 'showcase' ? { app, page: isPage(page) ? page : 'home' } : { app };

export function parseOpenMessage(data: unknown): OpenTarget | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.type !== 'open' || !isApp(d.app)) return null;
  return target(d.app, d.page);
}

export function parseOpenQuery(search: string): OpenTarget | null {
  const q = new URLSearchParams(search);
  const page = q.get('page');
  if (isPage(page)) return { app: 'showcase', page };
  const app = q.get('open');
  return isApp(app) ? target(app, null) : null;
}
