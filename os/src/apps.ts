import type { IconName } from './icons';

export type AppId = 'showcase' | 'oregon' | 'doom' | 'scrabble' | 'fiveletters' | 'credits';

export interface AppInfo {
  id: AppId;
  label: string; // desktop icon label (\n forces a line break)
  title: string; // taskbar button text
  icon: IconName;
  iconY: number; // icon image top, from the observed centres in os-spec §2
  windowTitle: string;
  status: string;
  titleColor?: string; // overrides the active title bar colour (Scrabble is dark red)
}

// Order and spacing from os-spec §2 (centres ~41/143/250/352/456/560 at 48px images).
export const APPS: AppInfo[] = [
  { id: 'showcase', label: 'My Showcase', title: 'My Showcase', icon: 'showcase', iconY: 17, windowTitle: 'Tommy Huang - Showcase', status: '© Copyright 2026 Tommy Huang' },
  { id: 'oregon', label: 'The Oregon\nTrail', title: 'The Oregon Trail', icon: 'oregon', iconY: 119, windowTitle: 'The Oregon Trail', status: 'Powered by JSDOS & DOSBox' },
  { id: 'doom', label: 'Doom', title: 'Doom', icon: 'doom', iconY: 226, windowTitle: 'Doom', status: 'Powered by JSDOS & DOSBox' },
  { id: 'scrabble', label: 'Scrabble', title: 'Scrabble', icon: 'scrabble', iconY: 328, windowTitle: 'Scrabble', status: 'Powered by JSDOS & DOSBox', titleColor: '#8a0f14' },
  { id: 'fiveletters', label: 'Five Letters', title: 'Five Letters', icon: 'fiveletters', iconY: 432, windowTitle: 'Five Letters', status: '© Copyright 2026 Tommy Huang' },
  { id: 'credits', label: 'Credits', title: 'Credits', icon: 'credits', iconY: 536, windowTitle: 'Credits', status: '© Copyright 2026 Tommy Huang' },
];

export const appById = (id: AppId) => APPS.find((a) => a.id === id)!;
