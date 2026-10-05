// Is this a phone? The short side decides, so a phone held sideways still counts and a tablet does not.
// Same threshold as app/src/flatMode.ts PHONE_MAX_SHORT_SIDE: the two builds are separate, so each keeps its own copy and test.
export const PHONE_MAX_SHORT_SIDE = 600;
export const isPhone = (w: number, h: number): boolean => Math.min(w, h) <= PHONE_MAX_SHORT_SIDE;

// The on-screen keyboard is up when the visible part of the page is much shorter than the page. iOS keeps innerHeight
// (and 100dvh) when the keyboard opens; only visualViewport.height shrinks. `scale` is visualViewport.scale: a pinch
// zoom also shrinks the visible height, but times the scale it is still the whole page.
export const KEYBOARD_MIN_PX = 150;
export const isKeyboardOpen = (layoutH: number, visualH: number, scale = 1): boolean => layoutH - visualH * scale > KEYBOARD_MIN_PX;
