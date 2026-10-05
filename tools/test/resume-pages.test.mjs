// The phone Résumé's page image (tools/resume-pages.sh) must be made from the current résumé PDF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../../os/public/showcase/', import.meta.url));
const pages = JSON.parse(readFileSync(dir + 'resume-pages.json', 'utf8'));

test('the page image comes from the current PDF (if not: bash tools/resume-pages.sh)', () => {
  const sha = createHash('sha256').update(readFileSync(dir + 'MinChia-Tommy-Huang-Resume.pdf')).digest('hex');
  assert.equal(pages.sha256, sha);
});

test('one 1240 px wide PNG for the one page', () => {
  assert.equal(pages.pages, 1);
  assert.equal(pages.width, 1240);
  const png = readFileSync(dir + 'resume-p1.png');
  // A PNG starts with an 8-byte signature and the IHDR chunk, whose width is the big-endian uint32 at byte 16.
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
  assert.equal(png.readUInt32BE(16), 1240);
  assert.equal(existsSync(dir + 'resume-p2.png'), false);
});
