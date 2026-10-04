import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseOpenMessage, parseOpenQuery, SHOWCASE_PAGES } from './remote.ts';

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

test('anything else is ignored', () => {
  for (const bad of [null, undefined, 'open', 42, {}, { type: 'mousemove' }, { type: 'open', app: 'doom' }, { type: 'open', app: 'about-site' }, { type: 'open', app: '__proto__' }]) {
    assert.equal(parseOpenMessage(bad), null);
  }
});

test('query: ?page= opens showcase on that page', () => {
  assert.deepEqual(parseOpenQuery('?page=resume'), { app: 'showcase', page: 'resume' });
  assert.deepEqual(parseOpenQuery('?page=projects&x=1'), { app: 'showcase', page: 'projects' });
});

test('query: nothing or an unknown page is null', () => {
  assert.equal(parseOpenQuery(''), null);
  assert.equal(parseOpenQuery('?page=art'), null);
  assert.equal(parseOpenQuery('?open=about-site'), null);
});
