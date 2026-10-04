// os/src/remote.ts — how the outer page (or a URL) asks the OS to open a window.
//   postMessage from the parent page: { type: 'open', app: 'showcase', page?: ShowcasePage }
//   URL: /os/?page=<ShowcasePage>
export const SHOWCASE_PAGES = ['home', 'about', 'experience', 'projects', 'resume', 'contact'] as const;
export type ShowcasePage = (typeof SHOWCASE_PAGES)[number];
export type OpenTarget = { app: 'showcase'; page: ShowcasePage };

const isPage = (v: unknown): v is ShowcasePage =>
  typeof v === 'string' && (SHOWCASE_PAGES as readonly string[]).includes(v);

export function parseOpenMessage(data: unknown): OpenTarget | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d.type !== 'open') return null;
  if (d.app === 'showcase') return { app: 'showcase', page: isPage(d.page) ? d.page : 'home' };
  return null;
}

export function parseOpenQuery(search: string): OpenTarget | null {
  const q = new URLSearchParams(search);
  const page = q.get('page');
  return isPage(page) ? { app: 'showcase', page } : null;
}
