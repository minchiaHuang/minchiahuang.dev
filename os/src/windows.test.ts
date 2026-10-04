import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_VP, defaultRect, desktopOf, initialSystem, reduce } from './windows.ts';
import type { AppId } from './apps.ts';

const ALL: AppId[] = ['showcase', 'projects', 'resume', 'contact', 'games', 'fiveletters', 'terminal', 'harddisk', 'credits', 'doom', 'oregon', 'scrabble'];

test('the OS is laid out for a 1024x768 screen with a menu bar and a Dock', () => {
  assert.deepEqual(DESIGN_VP, { w: 1024, h: 768 });
  assert.deepEqual(desktopOf(DESIGN_VP), { w: 1024, h: 686 });
});

test('every window opens unclamped on the 1024x768 screen', () => {
  const d = desktopOf(DESIGN_VP);
  for (const id of ALL) {
    const r = defaultRect(id, DESIGN_VP);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= d.w && r.y + r.h <= d.h, `${id} fits`);
  }
  // Showcase sits where the Figma desktop frame puts it
  assert.deepEqual(defaultRect('showcase', DESIGN_VP), { x: 44, y: 28, w: 740, h: 540 });
});

test('a small viewport (phone, standalone page) clamps windows to it', () => {
  const vp = { w: 400, h: 700 };
  const r = defaultRect('showcase', vp);
  assert.equal(r.w, 400);
  assert.ok(r.h <= desktopOf(vp).h);
});

test('opening a new window puts it in front and makes it active', () => {
  let s = initialSystem(DESIGN_VP, ['showcase']);
  for (let i = 0; i < 3; i++) s = reduce(s, { type: 'focus', id: 'showcase' });
  s = reduce(s, { type: 'open', id: 'games' });
  const z = (id: AppId) => s.wins.find((w) => w.id === id)!.z;
  assert.equal(s.active, 'games');
  assert.ok(z('games') > z('showcase'));
});

test('opening a minimised app (Dock click) restores it and brings it forward', () => {
  let s = initialSystem(DESIGN_VP, ['showcase', 'terminal']);
  s = reduce(s, { type: 'minimize', id: 'showcase' });
  assert.equal(s.active, 'terminal');
  s = reduce(s, { type: 'minimize', id: 'terminal' });
  assert.equal(s.active, null);
  s = reduce(s, { type: 'open', id: 'showcase' });
  const w = s.wins.find((x) => x.id === 'showcase')!;
  assert.equal(w.minimized, false);
  assert.equal(s.active, 'showcase');
  assert.equal(s.wins.length, 2);
});

test('zoom fills the desktop between the menu bar and the Dock, and zooms back', () => {
  let s = initialSystem(DESIGN_VP, ['showcase']);
  s = reduce(s, { type: 'toggleMax', id: 'showcase' });
  assert.deepEqual(s.wins[0].rect, { x: 0, y: 0, w: 1024, h: 686 });
  s = reduce(s, { type: 'toggleMax', id: 'showcase' });
  assert.deepEqual(s.wins[0].rect, defaultRect('showcase', DESIGN_VP));
});

test('a dragged title bar stays under the menu bar', () => {
  let s = initialSystem(DESIGN_VP, ['showcase']);
  s = reduce(s, { type: 'move', id: 'showcase', x: 10, y: -50 });
  assert.equal(s.wins[0].rect.y, 0);
});
