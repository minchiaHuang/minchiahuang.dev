// tools/size-budget.mjs — fails when the outer scene's first-load assets in a build go over budget.
//   node tools/size-budget.mjs [dist=app/dist] [limit-bytes=5000000]
// Counts dist/models, dist/textures and dist/audio (GLB + textures + sounds). The OS (dist/os),
// the DOS games and the JS bundles are not part of the budget.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCENE_DIRS = ['models', 'textures', 'audio'];
export const DEFAULT_LIMIT = 5_000_000;

export function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listFiles(p) : [{ path: p, size: statSync(p).size }];
  });
}

export function sceneFiles(dist) {
  return SCENE_DIRS.filter((d) => existsSync(join(dist, d)))
    .flatMap((d) => listFiles(join(dist, d)))
    .map((f) => ({ path: relative(dist, f.path), size: f.size }));
}

export function checkBudget(files, limit) {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  const largest = [...files].sort((a, b) => b.size - a.size).slice(0, 5);
  if (!files.some((f) => f.path.endsWith('.glb'))) {
    return { ok: false, total, limit, largest, reason: 'no .glb found: nothing was measured' };
  }
  const ok = total <= limit;
  return { ok, total, limit, largest, reason: ok ? 'within budget' : 'over budget' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? 'app/dist';
  const limit = Number(process.argv[3] ?? DEFAULT_LIMIT);
  if (!existsSync(join(dist, 'models'))) {
    console.log(`SKIP: no models in ${dist} yet`);
    process.exit(0);
  }
  const r = checkBudget(sceneFiles(dist), limit);
  console.log(`${r.reason}: ${r.total} of ${r.limit} bytes`);
  for (const f of r.largest) console.log(`  ${String(f.size).padStart(9)}  ${f.path}`);
  process.exit(r.ok ? 0 : 1);
}
