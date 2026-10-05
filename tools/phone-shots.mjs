// tools/phone-shots.mjs — phone-sized screenshots of the OS, with a check for content cut off at the screen's sides.
//   node tools/phone-shots.mjs <origin> <out-dir> <width>x<height> <shot-state>...
//   e.g. node tools/phone-shots.mjs http://127.0.0.1:8199 /tmp/shots 390x844 m-showcase m-projects
// Loads <origin>/os/?shot=<state> for each state. Plain headless Chrome cannot do this: its window is at least 500 px
// wide and loses ~87 px of height, so this drives Chrome over the DevTools protocol (Node's own WebSocket and fetch,
// no npm packages) with mobile device metrics and touch. Prints one line per state; exits 1 if anything inside
// .m-shell sticks out past the left or right edge of the screen.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [origin, out, size, ...states] = process.argv.slice(2);
const m = /^(\d+)x(\d+)$/.exec(size ?? '');
if (!origin || !out || !m || states.length === 0) {
  console.error('usage: node tools/phone-shots.mjs <origin> <out-dir> <width>x<height> <shot-state>...');
  process.exit(2);
}
const [width, height] = [Number(m[1]), Number(m[2])];
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(out, { recursive: true });
mkdirSync(join(process.env.TMPDIR ?? tmpdir(), 'phone-shots'), { recursive: true });
const profile = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'phone-shots', 'profile-'));
const chrome = spawn(
  CHROME,
  ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--no-first-run', '--no-default-browser-check', 'about:blank'],
  { stdio: 'ignore' },
);

let status = 0;
try {
  // Chrome writes the port it picked into the profile.
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) {
      for (const w of waiters.filter((x) => x.method === msg.method)) w.resolve();
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const next = (method) => new Promise((resolve) => waiters.push({ method, resolve }));

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  for (const state of states) {
    const loaded = next('Page.loadEventFired');
    await send('Page.navigate', { url: `${origin}/os/?shot=${state}` });
    await Promise.race([loaded, sleep(15000)]);
    await sleep(1500); // React renders, fonts and images settle
    // Anything inside the shell whose box crosses the left or right edge of the screen is cut off.
    const { result } = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const shell = document.querySelector('.m-shell');
        if (!shell) return ['no .m-shell on the page'];
        const w = window.innerWidth;
        return [...shell.querySelectorAll('*')]
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1); })
          .slice(0, 5)
          .map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''));
      })()`,
    });
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const file = join(out, `${size}-${state}.png`);
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    const cut = result.value;
    if (cut.length) status = 1;
    console.log(`${cut.length ? 'CUT ' : 'ok  '} ${file}${cut.length ? '  ' + cut.join(' ') : ''}`);
  }
  ws.close();
} finally {
  chrome.kill();
}
process.exit(status);
