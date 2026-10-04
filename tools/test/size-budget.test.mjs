import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { checkBudget, sceneFiles, DEFAULT_LIMIT } from '../size-budget.mjs';

const fixture = (files) => {
  const dir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'size-budget-'));
  for (const [path, bytes] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), Buffer.alloc(bytes));
  }
  return dir;
};
const cli = (dist, limit) =>
  spawnSync('node', ['tools/size-budget.mjs', dist, ...(limit ? [String(limit)] : [])], { encoding: 'utf8' });

test('default limit is 5,000,000 bytes', () => {
  assert.equal(DEFAULT_LIMIT, 5_000_000);
});

test('counts models, textures and audio only', () => {
  const dist = fixture({ 'models/a.glb': 10, 'textures/t.png': 20, 'audio/s.mp3': 30, 'os/big.js': 999, 'assets/main.js': 999 });
  const files = sceneFiles(dist);
  assert.deepEqual(files.map((f) => f.path).sort(), ['audio/s.mp3', 'models/a.glb', 'textures/t.png']);
  assert.equal(checkBudget(files, 100).total, 60);
});

test('exactly at the limit passes, one byte over fails', () => {
  const files = [{ path: 'models/a.glb', size: 100 }];
  assert.equal(checkBudget(files, 100).ok, true);
  assert.equal(checkBudget([{ path: 'models/a.glb', size: 101 }], 100).ok, false);
});

test('no .glb at all fails instead of passing on nothing', () => {
  const r = checkBudget([{ path: 'audio/s.mp3', size: 1 }], 100);
  assert.equal(r.ok, false);
  assert.match(r.reason, /no \.glb/);
});

test('CLI: over budget exits 1 and names the largest file', () => {
  const dist = fixture({ 'models/a.glb': 50, 'textures/huge.png': 200 });
  const r = cli(dist, 100);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /textures\/huge\.png/);
});

test('CLI: within budget exits 0', () => {
  const dist = fixture({ 'models/a.glb': 50 });
  assert.equal(cli(dist, 100).status, 0);
});

test('CLI: no models/ directory yet is a SKIP, exit 0', () => {
  const dist = fixture({ 'index.html': 10 });
  const r = cli(dist, 100);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SKIP/);
});

test('CLI: models/ present but no .glb exits 1', () => {
  const dist = fixture({ 'models/readme.txt': 1 });
  assert.equal(cli(dist, 100).status, 1);
});
