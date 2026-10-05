// Is this a phone? Narrower than 600 px, or a touch screen shorter than 600 px (held sideways). Height alone is not
// enough: a 1280x720 laptop window (innerHeight ~590) or docked devtools is not a phone. A tablet is not either.
// Same rule and threshold as app/src/flatMode.ts: the two builds are separate, so each keeps its own copy and test.
export const PHONE_MAX_PX = 600;
export const isPhone = (w: number, h: number, coarse: boolean): boolean => w <= PHONE_MAX_PX || (coarse && h <= PHONE_MAX_PX);

// The on-screen keyboard is up when the visible part of the page is much shorter than the page. iOS keeps innerHeight
// (and 100dvh) when the keyboard opens; only visualViewport.height shrinks. `scale` is visualViewport.scale: a pinch
// zoom also shrinks the visible height, but times the scale it is still the whole page.
export const KEYBOARD_MIN_PX = 150;
export const isKeyboardOpen = (layoutH: number, visualH: number, scale = 1): boolean => layoutH - visualH * scale > KEYBOARD_MIN_PX;
