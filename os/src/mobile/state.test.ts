import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockLit, HOME_ITEMS, INITIAL, isGame, leavesProjects, reduceMobile, startState, titleOf } from './state.ts';
import type { MobileState } from './state.ts';

const at = (current: MobileState['current'], info = false): MobileState => ({ current, info });

test('the site opens on the Showcase card', () => {
  assert.deepEqual(INITIAL, at('showcase'));
  assert.deepEqual(startState(''), at('showcase'));
});

test('open shows one app full screen and leaves the Showcase pages', () => {
  assert.deepEqual(reduceMobile(INITIAL, { type: 'open', id: 'projects' }), at('projects'));
  assert.deepEqual(reduceMobile(at('showcase', true), { type: 'open', id: 'showcase' }), at('showcase'));
  assert.deepEqual(reduceMobile(at(null), { type: 'open', id: 'doom' }), at('doom'));
});

test('close goes to the desktop, except from the Showcase pages, which go back to the card', () => {
  assert.deepEqual(reduceMobile(at('terminal'), { type: 'close' }), at(null));
  assert.deepEqual(reduceMobile(at('doom'), { type: 'close' }), at(null));
  assert.deepEqual(reduceMobile(at('showcase', true), { type: 'close' }), at('showcase'));
  assert.deepEqual(reduceMobile(at('showcase'), { type: 'close' }), at(null));
  assert.deepEqual(reduceMobile(at(null), { type: 'close' }), at(null));
});

test('More Info shows the Showcase pages; home empties the screen', () => {
  assert.deepEqual(reduceMobile(at('showcase'), { type: 'moreInfo' }), at('showcase', true));
  assert.deepEqual(reduceMobile(at('harddisk'), { type: 'moreInfo' }), at('showcase', true));
  assert.deepEqual(reduceMobile(at('showcase', true), { type: 'home' }), at(null));
});

test('a game belongs to Games in the Dock', () => {
  assert.equal(dockLit(at('doom')), 'games');
  assert.equal(dockLit(at('scrabble')), 'games');
  assert.equal(dockLit(at('games')), 'games');
  assert.equal(dockLit(at('showcase', true)), 'showcase');
  assert.equal(dockLit(at('harddisk')), null);
  assert.equal(dockLit(at('credits')), null);
  assert.equal(dockLit(at(null)), null);
  assert.equal(isGame('oregon'), true);
  assert.equal(isGame('games'), false);
  assert.equal(isGame(null), false);
});

test('the title is the app name, or Finder on the desktop', () => {
  assert.equal(titleOf(at(null)), 'Finder');
  assert.equal(titleOf(at('doom')), 'Doom');
  assert.equal(titleOf(at('showcase', true)), 'Showcase');
  assert.equal(titleOf(at('credits')), 'About This Site');
});

test('the desktop grid holds the Dock apps, Tommy HD and About This Site', () => {
  assert.deepEqual(HOME_ITEMS, ['showcase', 'projects', 'resume', 'contact', 'games', 'fiveletters', 'terminal', 'harddisk', 'credits']);
});

test('leaving Projects, and only that, drops its request', () => {
  assert.equal(leavesProjects(at('projects'), { type: 'open', id: 'terminal' }), true);
  assert.equal(leavesProjects(at('projects'), { type: 'close' }), true);
  assert.equal(leavesProjects(at('projects'), { type: 'moreInfo' }), true);
  assert.equal(leavesProjects(at('projects'), { type: 'open', id: 'projects' }), false);
  assert.equal(leavesProjects(at('terminal'), { type: 'open', id: 'projects' }), false);
  assert.equal(leavesProjects(at('harddisk'), { type: 'open', id: 'projects' }), false);
});

test('the URL can pick the first screen', () => {
  assert.deepEqual(startState('?open=terminal'), at('terminal'));
  assert.deepEqual(startState('?page=about'), at('showcase', true));
  assert.deepEqual(startState('?page=home'), at('showcase'));
  assert.deepEqual(startState('?open=nope'), at('showcase'));
  assert.deepEqual(startState('?shot=m-home'), at(null));
  assert.deepEqual(startState('?shot=m-info'), at('showcase', true));
  assert.deepEqual(startState('?shot=m-doom'), at('doom'));
  assert.deepEqual(startState('?shot=m-menu'), at('showcase'));
  assert.deepEqual(startState('?shot=projects'), at('showcase'));
});
