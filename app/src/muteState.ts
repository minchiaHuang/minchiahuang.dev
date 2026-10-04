// The mute switch's memory (localStorage) and its keyboard shortcut (M).
export const MUTE_KEY = 'mh.muted';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** localStorage, or null where reading it throws (blocked site data, some private modes). */
export function safeStorage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readMuted(store: KeyValueStore | null): boolean {
  try {
    return store?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(store: KeyValueStore | null, muted: boolean): void {
  try {
    store?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage refused: the switch still works for this visit.
  }
}

export interface KeyLike {
  key: string;
  inComputer?: boolean; // the key was typed inside the OS iframe and forwarded out
  targetIsEditable?: boolean;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

export function isMuteKey(e: KeyLike): boolean {
  if (e.inComputer || e.targetIsEditable || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return false;
  return e.key === 'm' || e.key === 'M';
}
