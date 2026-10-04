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
  assert.ok(Math.abs(x) < 1e-3 && Math.abs(y - 1.056) < 1e-3 && Math.abs(z - 0.283) < 1e-3, `at ${x},${y},${z}`);
  const extras = anchor.getExtras();
  assert.ok(Math.abs(extras.width - 1.42) < 1e-3 && Math.abs(extras.height - 1.14) < 1e-3);
});

test('the Screen mesh survives', async () => {
  const doc = await readComputer();
  assert.ok(doc.getRoot().listNodes().some((n) => n.getName() === 'Screen'));
});
