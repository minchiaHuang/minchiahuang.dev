import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const out = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'compress-'));
const run = spawnSync('node', ['tools/compress.mjs', '--out', out], { encoding: 'utf8' });

test('compress exits 0', () => {
  assert.equal(run.status, 0, run.stderr);
});

test('writes three GLBs and three WebP lightmaps, each smaller than its source', () => {
  for (const g of ['computer', 'environment', 'decor']) {
    assert.ok(statSync(join(out, `${g}.glb`)).size < statSync(`blender/out/v2/${g}.glb`).size, `${g}.glb`);
    assert.ok(statSync(join(out, `${g}.webp`)).size < statSync(`blender/out/v2/${g}.jpg`).size, `${g}.webp`);
  }
});

async function readComputer() {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  return io.read(join(out, 'computer.glb'));
}

test('ScreenAnchor survives with its position and size', async () => {
  const doc = await readComputer();
  const anchor = doc.getRoot().listNodes().find((n) => n.getName() === 'ScreenAnchor');
  assert.ok(anchor, 'ScreenAnchor node missing');
  const [x, y, z] = anchor.getTranslation();
  assert.ok(Math.abs(x) < 1e-3 && Math.abs(y - 0.4946) < 1e-3 && Math.abs(z - 0.0953) < 1e-3, `at ${x},${y},${z}`);
  const extras = anchor.getExtras();
  assert.ok(Math.abs(extras.width - 1.0518) < 1e-3 && Math.abs(extras.height - 0.7888) < 1e-3);
  // the CRT is 4:3: the OS iframe laid over it is 1024 x 768
  assert.ok(Math.abs(extras.width / extras.height - 4 / 3) < 1e-6, `aspect ${extras.width / extras.height}`);
});

test('the Screen mesh survives', async () => {
  const doc = await readComputer();
  assert.ok(doc.getRoot().listNodes().some((n) => n.getName() === 'Screen'));
});

// The translucent shell is not baked: it ships as its own GLB with a material the app renders live.
test('shell.glb holds one alpha-blended Bondi material', async () => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read('blender/out/v2/shell.glb');
  const materials = doc.getRoot().listMaterials();
  assert.equal(materials.length, 1);
  const m = materials[0];
  assert.equal(m.getAlphaMode(), 'BLEND');
  const [r, g, b, a] = m.getBaseColorFactor();
  assert.ok(a > 0 && a < 1, `alpha ${a}`);
  assert.ok(b > g && g > r, `not Bondi blue: ${r},${g},${b}`);
});
