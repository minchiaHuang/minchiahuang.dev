// The Terminal app's shell: a tiny, pure command parser over the portfolio data. No network, no real files.
import { ABOUT, EMAIL, LINKS, PROJECTS } from './data/profile.ts';

export type Cwd = '~' | '~/projects';

// What the shell asks the OS to do besides printing.
export type ShellEffect = { open: 'resume' } | { open: 'contact' } | { open: 'projects'; project: string } | { clear: true };

export interface ShellResult {
  out: string[];
  cwd: Cwd;
  effect?: ShellEffect;
}

export const prompt = (cwd: Cwd) => `tommy@imac ${cwd === '~' ? '~' : 'projects'} %`;

const HELP = [
  'Commands:',
  '  help             this list',
  '  ls               list files here',
  '  cd projects      go into projects (cd .. or cd to come back)',
  '  cat about        who I am',
  '  open <project>   open a project in Projects',
  '  resume           open my résumé',
  '  contact          how to reach me',
  '  clear            clear the screen',
];

const HOME_FILES = ['about', 'projects/', 'resume.pdf'];

// The phone Terminal's command buttons (Terminal.tsx, chips). `line` is what a tap runs; it uses ~/ paths so every
// chip works from either folder. `fill`: only put `line` in the input and bring up the keyboard (open needs a name).
export interface Chip {
  label: string;
  line: string;
  fill?: boolean;
}
export const CHIPS: Chip[] = [
  { label: 'help', line: 'help' },
  { label: 'cat about', line: 'cat ~/about' },
  { label: 'ls', line: 'ls' },
  { label: 'cd projects', line: 'cd ~/projects' },
  { label: 'open …', line: 'open ', fill: true },
  { label: 'resume', line: 'resume' },
  { label: 'contact', line: 'contact' },
  { label: 'clear', line: 'clear' },
];

const findProject = (name: string) => {
  const n = name.toLowerCase().replace(/\/$/, '');
  return PROJECTS.find((p) => p.slug === n || p.name.toLowerCase() === n);
};

export function run(line: string, cwd: Cwd): ShellResult {
  const [cmd = '', ...args] = line.trim().split(/\s+/).filter(Boolean);
  const arg = args.join(' ');
  switch (cmd) {
    case '':
      return { out: [], cwd };
    case 'help':
      return { out: HELP, cwd };
    case 'ls':
      return { out: [(cwd === '~' ? HOME_FILES : PROJECTS.map((p) => `${p.slug}/`)).join('  ')], cwd };
    case 'cd': {
      if (arg === '' || arg === '~' || arg === '..' || arg === '~/') return { out: [], cwd: '~' };
      if ((cwd === '~' && /^projects\/?$/.test(arg)) || /^~\/projects\/?$/.test(arg)) return { out: [], cwd: '~/projects' };
      return { out: [`cd: no such file or directory: ${arg}`], cwd };
    }
    case 'cat': {
      if ((cwd === '~' && arg === 'about') || arg === '~/about') return { out: [ABOUT], cwd };
      const p = cwd === '~/projects' ? findProject(arg) : undefined;
      if (p) return { out: [p.name, p.meta, p.blurb], cwd };
      return { out: [`cat: ${arg || '(nothing)'}: No such file or directory`], cwd };
    }
    case 'open': {
      if (arg === 'resume.pdf' && cwd === '~') return { out: [], cwd, effect: { open: 'resume' } };
      const p = findProject(arg.replace(/^(~\/)?projects\//, ''));
      if (p) return { out: [`Opening ${p.name}...`], cwd, effect: { open: 'projects', project: p.slug } };
      return { out: [`open: ${arg || '(nothing)'}: no such project. Try: ls ~/projects`], cwd };
    }
    case 'resume':
      return { out: ['Opening résumé...'], cwd, effect: { open: 'resume' } };
    case 'contact':
      return { out: [`Email     ${EMAIL}`, ...LINKS.map((l) => `${l.label.padEnd(10)}${l.href}`)], cwd, effect: { open: 'contact' } };
    case 'clear':
      return { out: [], cwd, effect: { clear: true } };
    default:
      return { out: [`zsh: command not found: ${cmd}`], cwd };
  }
}
