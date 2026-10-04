/** Types `text()` one character at a time into `onText`. Stops quietly when `stop()` says so. */
export function typeText(opts: {
  text: () => string;
  onText: (typed: string) => void;
  delay: () => number;
  onChar?: () => void;
  stop?: () => boolean;
  done?: () => void;
}) {
  const step = (i: number, typed: string) => {
    if (opts.stop?.()) return;
    const text = opts.text();
    if (i >= text.length) {
      opts.done?.();
      return;
    }
    setTimeout(() => {
      if (opts.stop?.()) return;
      opts.onChar?.();
      const next = typed + text[i];
      opts.onText(next);
      step(i + 1, next);
    }, opts.delay());
  };
  step(0, '');
}
