// who skips the 3D scene and gets the OS full screen at /os/.
export const FLAT_MAX_WIDTH = 768;

export interface FlatEnv {
  width: number;
  webgl: boolean;
  reducedMotion: boolean;
}

export function shouldUseFlatOS(env: FlatEnv): boolean {
  return env.width <= FLAT_MAX_WIDTH || !env.webgl || env.reducedMotion;
}

export function readFlatEnv(hasWebGL: () => boolean): FlatEnv {
  return {
    width: window.innerWidth,
    webgl: hasWebGL(),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/** Replace (not push) so Back leaves the site instead of bouncing into the redirect again. */
export function goFlat(): void {
  window.location.replace(import.meta.env.BASE_URL + 'os/');
}
