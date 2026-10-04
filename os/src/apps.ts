export type AppId =
  | 'showcase'
  | 'projects'
  | 'resume'
  | 'contact'
  | 'games'
  | 'fiveletters'
  | 'terminal'
  | 'harddisk'
  | 'oregon'
  | 'doom'
  | 'scrabble'
  | 'credits';

export interface AppInfo {
  id: AppId;
  name: string; // Dock label and menu-bar app name
  icon?: string; // file in public/aqua/; only Dock apps and desktop items need one
  windowTitle: string;
}

export const aqua = (file: string) => `${import.meta.env.BASE_URL}aqua/${file}`;

export const APPS: AppInfo[] = [
  { id: 'showcase', name: 'Showcase', icon: 'finder.png', windowTitle: 'Min-Chia (Tommy) Huang - Showcase' },
  { id: 'projects', name: 'Projects', icon: 'folder.png', windowTitle: 'Projects' },
  { id: 'resume', name: 'Résumé', icon: 'preview.png', windowTitle: 'MinChia-Tommy-Huang-Resume.pdf' },
  { id: 'contact', name: 'Contact', icon: 'mail.png', windowTitle: 'Contact' },
  { id: 'games', name: 'Games', icon: 'chess.png', windowTitle: 'Games' },
  { id: 'fiveletters', name: 'Five Letters', icon: 'textedit.png', windowTitle: 'Five Letters' },
  { id: 'terminal', name: 'Terminal', icon: 'terminal.png', windowTitle: 'Terminal — tommy@imac' },
  { id: 'harddisk', name: 'Tommy HD', icon: 'harddisk.png', windowTitle: 'Tommy HD' },
  { id: 'oregon', name: 'The Oregon Trail', windowTitle: 'The Oregon Trail' },
  { id: 'doom', name: 'Doom', windowTitle: 'Doom' },
  { id: 'scrabble', name: 'Scrabble', windowTitle: 'Scrabble' },
  { id: 'credits', name: 'About This Site', windowTitle: 'About This Site' },
];

// Dock order, left to right; the Trash sits after a divider and is not an app.
export const DOCK: AppId[] = ['showcase', 'projects', 'resume', 'contact', 'games', 'fiveletters', 'terminal'];

// DOS games live in the Games folder, not in the Dock.
export const GAMES: { id: AppId; logo: string }[] = [
  { id: 'oregon', logo: 'logo-oregon-trail-deluxe.png' },
  { id: 'doom', logo: 'logo-doom-1993.png' },
  { id: 'scrabble', logo: 'logo-scrabble-classic.png' },
];

// The Dock entry that lights up for a window: a game window belongs to Games.
export const dockOwner = (id: AppId): AppId | null =>
  DOCK.includes(id) ? id : GAMES.some((g) => g.id === id) ? 'games' : null;

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;
