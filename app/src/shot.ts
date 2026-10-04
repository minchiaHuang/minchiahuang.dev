// ?shot=<state> makes the page deterministic for screenshots (see docs/spec/shots.md).
export type ShotState = 'loading' | 'popup' | 'idle' | 'desk' | 'monitor' | 'freecam';

const STATES: ShotState[] = ['loading', 'popup', 'idle', 'desk', 'monitor', 'freecam'];

function read(): ShotState | null {
  const value = new URLSearchParams(window.location.search).get('shot');
  return STATES.includes(value as ShotState) ? (value as ShotState) : null;
}

export const SHOT = read();

if (SHOT) {
  document.documentElement.classList.add('shot');
  // Nothing in shot mode may depend on chance.
  Math.random = () => 0.5;
}
