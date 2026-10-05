// Who skips the 3D scene and gets the OS full screen at /os/: phones, held either way up, and browsers without WebGL.
// Same rule and threshold as os/src/phone.ts isPhone: the two builds are separate, so each keeps its own copy and test.
export const PHONE_MAX_PX = 600;

export interface FlatEnv {
  width: number;
  height: number;
  webgl: boolean;
  coarse: boolean; // the main pointer is a finger (pointer: coarse)
  desk: boolean; // ?desk=1: the visitor asked for the 3D desk ("View 3D Desk" in the phone OS)
}

// A phone is narrower than 600 px, or has a touch screen and is shorter than 600 px (held sideways: 844x390). Height alone
// is not enough: a 1280x720 laptop window (innerHeight ~590) or docked devtools must keep the 3D scene. A tablet
// (768x1024) gets the scene too.
// ?desk=1 lifts the size rule only: without WebGL there is no scene to show.
// Reduced motion is not a reason: the visitor still gets the 3D scene.
export function shouldUseFlatOS(env: FlatEnv): boolean {
  return !env.webgl || (!env.desk && (env.width <= PHONE_MAX_PX || (env.coarse && env.height <= PHONE_MAX_PX)));
}

export const deskRequested = (search: string): boolean => new URLSearchParams(search).get('desk') === '1';

export function readFlatEnv(hasWebGL: () => boolean): FlatEnv {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    webgl: hasWebGL(),
    coarse: window.matchMedia('(pointer: coarse)').matches,
    desk: deskRequested(window.location.search),
  };
}

/** Replace (not push) so Back leaves the site instead of bouncing into the redirect again. */
export function goFlat(): void {
  window.location.replace(import.meta.env.BASE_URL + 'os/');
}
