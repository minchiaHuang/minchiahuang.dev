import { useEffect, useState } from 'react';

// os-spec §4.3: dark full-screen log with click-time timestamps. Per-line timing is unverified,
// so lines are revealed at a steady pace.
const hms = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

export function shutdownLines(t: string): string[] {
  const server = '(HHOS01/13:200:60099)';
  const reconnect = ['00', '01', '03', '05', '08', '12', '14'].map(
    (n) => `${server} [SOCKET_FAILED_TO_RESPOND] Connection Refused: Reconnecting... [${t}:${n}]`,
  );
  return [
    'Beginning Pre-Shutdown Sequence...',
    'Connecting to HHOS01/13:2000...',
    '',
    'Established connection to HH0S01/13:2000, attempting data transfer.',
    '',
    '',
    'Analyzing data... Done.',
    'Packing Transfer... Done.',
    'Beginning Transfer...',
    `[${t} START] ${'.'.repeat(39)} [Transfer Failed.]`,
    '',
    '',
    `${server} [DEP_ANALYTICS_SERVER_ON_AFTER_SETUP_MIDDLEWARE] InvalidFormatting: 'onAnalyticsConversion' option received invalid parameters. Please contact a server administrator to resolve the issue.`,
    '',
    ...reconnect,
    `FATAL ERROR: ${server} Server became unresponsive and the transfer failed. Unable to shutdown computer.`,
    '',
    'Aborting shutdown sequence and rebooting.',
    '',
    '',
    '',
    '',
    'Rebooting.',
  ];
}

// Timeline, ms since the click on "Shut down...": the desktop stays for a moment, then the screen goes
// blank (no cursor), the log is typed, held, cleared, and the desktop returns on its own.
const T_DARK = 600; // screen turns dark
const T_TYPE = 3600; // typing starts
const T_DOTS = 7500; // the dotted progress line starts filling
const T_FAILED = 12200; // "[Transfer Failed.]" is appended
const T_CLEAR = 18200; // text disappears, blank screen
const T_DONE = 24100; // desktop returns
const CPS = 60; // typing speed
const DOTS_PER_S = 12;

const PROGRESS_AT = 9; // index of the progress line in shutdownLines()

// Time at which each line starts to appear, and how it appears.
function schedule(lines: string[]): { start: number; text: (t: number) => string }[] {
  const out: { start: number; text: (t: number) => string }[] = [];
  const FATAL_AT = lines.findIndex((l) => l.startsWith('FATAL'));
  let at = T_TYPE;
  const typed = (full: string, start: number) => (t: number) => full.slice(0, Math.max(0, Math.floor(((t - start) * CPS) / 1000)));
  lines.forEach((line, i) => {
    if (i === PROGRESS_AT) {
      const m = /^(\[[^\]]*\] )(\.+)( .*)$/.exec(line)!;
      const head = typed(m[1], at);
      const headEnd = at + (m[1].length * 1000) / CPS;
      const dotsAt = Math.max(headEnd, T_DOTS);
      out.push({
        start: at,
        text: (t) => (t < headEnd ? head(t) : m[1] + '.'.repeat(Math.min(m[2].length, Math.floor(((t - dotsAt) * DOTS_PER_S) / 1000)))) + (t >= T_FAILED ? m[3] : ''),
      });
      at = T_FAILED + 400;
    } else if (i >= PROGRESS_AT + 3 && line.includes('Reconnecting')) {
      const start = at;
      out.push({ start, text: (t) => (t >= start ? line : '') });
      at += 110;
    } else if (line === '') {
      out.push({ start: at, text: () => '' });
      at += 100;
    } else {
      const start = at;
      // Lines after the progress line appear whole, except the closing ones after FATAL ERROR, which are typed.
      const whole = i > PROGRESS_AT && i <= FATAL_AT;
      out.push({ start, text: whole ? (t) => (t >= start ? line : '') : typed(line, start) });
      at += whole ? 0 : (line.length * 1000) / CPS;
    }
  });
  return out;
}

function visibleText(plan: ReturnType<typeof schedule>, t: number): string {
  if (t < T_TYPE || t >= T_CLEAR) return '';
  const out: string[] = [];
  for (const item of plan) {
    if (t < item.start) break;
    out.push(item.text(t));
  }
  return out.join('\n');
}

export default function Shutdown({ clickedAt, onDone }: { clickedAt: Date; onDone: () => void }) {
  const [plan] = useState(() => schedule(shutdownLines(hms(clickedAt))));
  const [t, setT] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const now = performance.now() - start;
      if (now >= T_DONE) {
        clearInterval(id);
        onDone();
      } else setT(now);
    }, 40);
    return () => clearInterval(id);
  }, [onDone]);

  // Keep keyboard input from reaching the desktop underneath while the overlay is up.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    const block = (e: KeyboardEvent) => e.preventDefault();
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, []);

  return (
    <div className="shutdown" style={t < T_DARK ? { background: 'transparent' } : undefined}>
      <pre>{visibleText(plan, t)}</pre>
    </div>
  );
}
