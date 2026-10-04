// Screen numbers shared by MonitorScreen (iframe placement) and Camera (monitor keyframe).
// Plain numbers, no three.js, so node --test can check them.

/** The OS iframe in CSS pixels: the Aqua OS is laid out for a 1024x768 (4:3) display. */
export const SCREEN_PX = { w: 1024, h: 768 };

/** App units = glTF units x this. */
export const BAKED_SCALE = 900;

// computer.glb's ScreenAnchor (PR #23), in app units. Only used when the anchor or its extras are
// missing; normally both come from the GLB.
export const DEFAULT_ANCHOR = { x: 0, y: 0.4946 * BAKED_SCALE, z: 0.0953 * BAKED_SCALE };
export const DEFAULT_SIZE = { w: 1.0518 * BAKED_SCALE, h: 0.7888 * BAKED_SCALE };

/** Visible glass size in app units from the anchor extras (glTF units), or undefined if unusable. */
export function screenSizeFromExtras(
  extras: Record<string, unknown> | undefined,
  scale: number,
): { w: number; h: number } | undefined {
  const w = extras?.width, h = extras?.height;
  if (typeof w !== 'number' || typeof h !== 'number' || !(w > 0) || !(h > 0)) return undefined;
  return { w: w * scale, h: h * scale };
}

/** Distance at which `height` fills a vertical field of view, with a margin (1.15 = ~15% around it). */
export function fitDistance(height: number, fovDeg: number, margin = 1.15): number {
  return (height / 2 / Math.tan((fovDeg / 2) * Math.PI / 180)) * margin;
}
