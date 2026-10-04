import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPENABLE_APPS, parseOpenMessage, parseOpenQuery, SHOWCASE_PAGES } from './remote.ts';

test('showcase pages are the six content pages', () => {
  assert.deepEqual([...SHOWCASE_PAGES], ['home', 'about', 'experience', 'projects', 'resume', 'contact']);
});

test('open showcase on a page', () => {
  assert.deepEqual(parseOpenMessage({ type: 'open', app: 'showcase', page: 'resume' }), { app: 'showcase', page: 'resume' });
});

test('unknown or missing page falls back to home', () => {
  assert.deepEqual(parseOpenMessage({ type: 'open', app: 'showcase', page: 'software' }), { app: 'showcase', page: 'home' });
  assert.deepEqual(parseOpenMessage({ type: 'open', app: 'showcase' }), { app: 'showcase', page: 'home' });
});

test('the Dock apps can be opened by id', () => {
  assert.deepEqual([...OPENABLE_APPS], ['showcase', 'projects', 'resume', 'contact', 'games', 'fiveletters', 'terminal']);
  assert.deepEqual(parseOpenMessage({ type: 'open', app: 'terminal' }), { app: 'terminal' });
  // a page only means something to Showcase
  assert.deepEqual(parseOpenMessage({ type: 'open', app: 'resume', page: 'contact' }), { app: 'resume' });
});

test('anything else is ignored', () => {
  for (const bad of [null, undefined, 'open', 42, {}, { type: 'mousemove' }, { type: 'open', app: 'doom' }, { type: 'open', app: 'about-site' }, { type: 'open', app: 'credits' }, { type: 'open', app: 'harddisk' }, { type: 'open', app: '__proto__' }]) {
    assert.equal(parseOpenMessage(bad), null);
  }
});

test('query: ?page= opens showcase on that page', () => {
  assert.deepEqual(parseOpenQuery('?page=resume'), { app: 'showcase', page: 'resume' });
  assert.deepEqual(parseOpenQuery('?page=projects&x=1'), { app: 'showcase', page: 'projects' });
});

test('query: ?open= opens a Dock app; ?page= wins over it', () => {
  assert.deepEqual(parseOpenQuery('?open=games'), { app: 'games' });
  assert.deepEqual(parseOpenQuery('?open=showcase'), { app: 'showcase', page: 'home' });
  assert.deepEqual(parseOpenQuery('?open=terminal&page=resume'), { app: 'showcase', page: 'resume' });
});

test('query: nothing or an unknown page is null', () => {
  assert.equal(parseOpenQuery(''), null);
  assert.equal(parseOpenQuery('?page=art'), null);
  assert.equal(parseOpenQuery('?open=about-site'), null);
  assert.equal(parseOpenQuery('?open=doom'), null);
});
