import { useEffect, useRef, useState } from 'react';
import { CHIPS, prompt, run, type Chip, type Cwd, type ShellEffect } from '../terminal';

interface Props {
  active: boolean;
  onEffect: (e: Exclude<ShellEffect, { clear: true }>) => void;
  initial?: string[]; // ?shot=terminal: commands already typed
  chips?: boolean; // phone shell: command buttons under the shell, so it works without typing
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

export default function Terminal({ active, onEffect, initial = [], chips = false }: Props) {
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

  const submit = (line: string) => {
    const r = run(line, cwd);
    setInput('');
    if (r.effect && 'clear' in r.effect) return setState({ lines: [], cwd: r.cwd });
    setState({ lines: [...lines, `${prompt(cwd)} ${line}`, ...r.out], cwd: r.cwd });
    if (r.effect) onEffect(r.effect);
  };

  // A chip runs its line as if typed, or (open …) fills the input and focuses it, which brings up the phone keyboard.
  const tap = (c: Chip) => {
    if (!c.fill) return submit(c.line);
    setInput(c.line);
    field.current?.focus();
  };

  const term = (
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
          // Enter that confirms an IME composition (e.g. Chinese input) must not run the line.
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && submit(input)}
        />
      </div>
    </div>
  );
  if (!chips) return term;
  return (
    <div className="term-box">
      {term}
      <div className="term-chips">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="term-chip"
            // Keep the focus where it is: a tap must not close the keyboard before the chip runs.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => tap(c)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
