import { useEffect, useRef, useState } from 'react';
import { prompt, run, type Cwd, type ShellEffect } from '../terminal';

interface Props {
  active: boolean;
  onEffect: (e: Exclude<ShellEffect, { clear: true }>) => void;
  initial?: string[]; // ?shot=terminal: commands already typed
}

const BANNER = ['Last login: Sun Oct 4 on ttyp1', 'Welcome to Tommy HD. Type help to see what you can do.'];

// Replays commands without effects: used to build the screenshot state.
const replay = (cmds: string[]) => {
  let cwd: Cwd = '~';
  const lines = [...BANNER];
  for (const c of cmds) {
    lines.push(`${prompt(cwd)} ${c}`);
    const r = run(c, cwd);
    lines.push(...r.out);
    cwd = r.cwd;
  }
  return { lines, cwd };
};

export default function Terminal({ active, onEffect, initial = [] }: Props) {
  const [{ lines, cwd }, setState] = useState(() => replay(initial));
  const [input, setInput] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  // The window being frontmost means typing goes to the shell.
  useEffect(() => {
    if (active) field.current?.focus({ preventScroll: true });
  }, [active]);
  // Braces matter: newer Chrome returns a Promise from scrollIntoView, which React would take for a cleanup.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  const submit = () => {
    const r = run(input, cwd);
    setInput('');
    if (r.effect && 'clear' in r.effect) return setState({ lines: [], cwd: r.cwd });
    setState({ lines: [...lines, `${prompt(cwd)} ${input}`, ...r.out], cwd: r.cwd });
    if (r.effect) onEffect(r.effect);
  };

  return (
    <div className="term" onMouseUp={() => window.getSelection()?.isCollapsed && field.current?.focus()}>
      {lines.map((l, i) => (
        <div key={i} className="term-line">
          {l}
        </div>
      ))}
      <div className="term-line term-input" ref={end}>
        <span>{prompt(cwd)}&nbsp;</span>
        <input
          ref={field}
          value={input}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Terminal input"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
    </div>
  );
}
