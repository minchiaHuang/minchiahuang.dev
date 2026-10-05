// Who skips the 3D scene and gets the OS full screen at /os/: phones, held either way up, and browsers without WebGL.
// Same threshold as os/src/phone.ts PHONE_MAX_SHORT_SIDE: the two builds are separate, so each keeps its own copy and test.
export const PHONE_MAX_SHORT_SIDE = 600;

export interface FlatEnv {
  width: number;
  height: number;
  webgl: boolean;
  desk: boolean; // ?desk=1: the visitor asked for the 3D desk ("View 3D Desk" in the phone OS)
}

// The short side decides, so a phone held sideways (844x390) is still a phone and a tablet (768x1024) gets the scene.
// ?desk=1 lifts the size rule only: without WebGL there is no scene to show.
// Reduced motion is not a reason: the visitor still gets the 3D scene.
export function shouldUseFlatOS(env: FlatEnv): boolean {
  return !env.webgl || (!env.desk && Math.min(env.width, env.height) <= PHONE_MAX_SHORT_SIDE);
}

export const deskRequested = (search: string): boolean => new URLSearchParams(search).get('desk') === '1';

export function readFlatEnv(hasWebGL: () => boolean): FlatEnv {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    webgl: hasWebGL(),
    desk: deskRequested(window.location.search),
  };
}

/** Replace (not push) so Back leaves the site instead of bouncing into the redirect again. */
export function goFlat(): void {
  window.location.replace(import.meta.env.BASE_URL + 'os/');
}
