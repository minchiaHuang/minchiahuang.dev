// tools/compress.mjs — raw bake output (blender/out/v2, kept in git) -> what the site loads
// (app/public/models, gitignored). Runs before every app build.
//   node tools/compress.mjs [--src blender/out/v2] [--out app/public/models]
// GLB: dedup + weld + meshopt (EXT_meshopt_compression; three.js decodes it). Lightmap JPG -> WebP.
// prune keeps leaves and extras: ScreenAnchor is an empty node whose extras hold the screen size.
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const { values } = parseArgs({ options: { src: { type: 'string', default: 'blender/out/v2' }, out: { type: 'string', default: 'app/public/models' } } });
const GROUPS = ['computer', 'environment', 'decor'];
const WEBP_QUALITY = 85;

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
mkdirSync(values.out, { recursive: true });

for (const g of GROUPS) {
  const doc = await io.read(join(values.src, `${g}.glb`));
  await doc.transform(
    dedup(),
    weld(),
    prune({ keepLeaves: true, keepExtras: true, keepAttributes: true }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const glb = join(values.out, `${g}.glb`);
  await io.write(glb, doc);
  const webp = join(values.out, `${g}.webp`);
  await sharp(join(values.src, `${g}.jpg`)).webp({ quality: WEBP_QUALITY }).toFile(webp);
  console.log(`${g}: glb ${statSync(glb).size} B, webp ${statSync(webp).size} B`);
}
