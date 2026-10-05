import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHIPS, prompt, run } from './terminal.ts';
import { ABOUT, EMAIL, PROJECTS } from './data/profile.ts';

test('prompt shows the folder', () => {
  assert.equal(prompt('~'), 'tommy@imac ~ %');
  assert.equal(prompt('~/projects'), 'tommy@imac projects %');
});

test('help lists every command', () => {
  const text = run('help', '~').out.join('\n');
  for (const c of ['help', 'ls', 'cd projects', 'cat about', 'open <project>', 'resume', 'contact', 'clear']) assert.match(text, new RegExp(c.replace(/[<>]/g, '.')));
});

test('ls at home and in projects', () => {
  assert.deepEqual(run('ls', '~').out, ['about  projects/  resume.pdf']);
  assert.deepEqual(run('ls', '~/projects').out, [PROJECTS.map((p) => `${p.slug}/`).join('  ')]);
});

test('cd moves between home and projects, and rejects anything else', () => {
  assert.equal(run('cd projects', '~').cwd, '~/projects');
  assert.equal(run('cd projects/', '~').cwd, '~/projects');
  assert.equal(run('cd ~/projects', '~/projects').cwd, '~/projects');
  assert.equal(run('cd ..', '~/projects').cwd, '~');
  assert.equal(run('cd', '~/projects').cwd, '~');
  const bad = run('cd secrets', '~');
  assert.equal(bad.cwd, '~');
  assert.deepEqual(bad.out, ['cd: no such file or directory: secrets']);
  // "projects" is relative: there is no projects folder inside projects
  assert.equal(run('cd projects', '~/projects').out.length, 1);
});

test('cat about prints the bio; cat a project inside projects', () => {
  assert.equal(run('cat about', '~').out.length, 1);
  assert.match(run('cat about', '~').out[0], /UTS/);
  assert.equal(run('cat cookpilot', '~/projects').out[0], 'CookPilot');
  assert.match(run('cat nope', '~').out[0], /No such file/);
});

test('open <project> asks the OS to show it, by slug or name, from anywhere', () => {
  assert.deepEqual(run('open cookpilot', '~').effect, { open: 'projects', project: 'cookpilot' });
  assert.deepEqual(run('open Visual Eyes', '~/projects').effect, { open: 'projects', project: 'visual-eyes' });
  assert.deepEqual(run('open projects/learnguard/', '~').effect, { open: 'projects', project: 'learnguard' });
  const miss = run('open nothing', '~');
  assert.equal(miss.effect, undefined);
  assert.match(miss.out[0], /no such project/);
});

test('resume, contact and clear have effects', () => {
  assert.deepEqual(run('resume', '~').effect, { open: 'resume' });
  assert.deepEqual(run('open resume.pdf', '~').effect, { open: 'resume' });
  const c = run('contact', '~');
  assert.deepEqual(c.effect, { open: 'contact' });
  assert.match(c.out[0], new RegExp(EMAIL));
  assert.deepEqual(run('clear', '~/projects'), { out: [], cwd: '~/projects', effect: { clear: true } });
});

test('blank input does nothing; unknown commands say so', () => {
  assert.deepEqual(run('   ', '~'), { out: [], cwd: '~' });
  assert.deepEqual(run('sudo rm -rf /', '~').out, ['zsh: command not found: sudo']);
});

test('the phone chips, in the order the spec lists them', () => {
  assert.deepEqual(
    CHIPS.map((c) => c.label),
    ['help', 'cat about', 'ls', 'cd projects', 'open …', 'resume', 'contact', 'clear'],
  );
});

test('every chip that runs works from home and from projects', () => {
  for (const c of CHIPS.filter((x) => !x.fill)) {
    for (const cwd of ['~', '~/projects'] as const) {
      const out = run(c.line, cwd).out.join('\n');
      assert.doesNotMatch(out, /no such|not found/i, `${c.label} from ${cwd}: ${out}`);
    }
  }
  assert.equal(run('cd ~/projects', '~/projects').cwd, '~/projects');
});

test('open … only fills the input', () => {
  const fills = CHIPS.filter((c) => c.fill);
  assert.deepEqual(fills.map((c) => c.line), ['open ']);
});

test('cat ~/about works from projects too; cat about still needs home', () => {
  assert.deepEqual(run('cat ~/about', '~/projects').out, [ABOUT]);
  assert.deepEqual(run('cat ~/about', '~').out, [ABOUT]);
  assert.match(run('cat about', '~/projects').out[0], /No such file/);
});
