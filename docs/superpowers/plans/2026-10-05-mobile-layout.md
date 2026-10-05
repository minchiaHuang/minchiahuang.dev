# 手機版排版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 手機（短邊 ≤ 600px）打開網站時，拿到保留 Aqua 外觀、但用手機方式操作的 OS：一次一個全螢幕 app、底部 Dock 當分頁列、點擊目標 ≥ 44px；Terminal 不打字也能用，三款 DOS 遊戲有螢幕按鍵；桌機版完全不變。

**Architecture:** `app/` 用短邊規則把手機導到 `/os/`（`?desk=1` 例外）。`os/src/main.tsx` 在載入時判斷一次：standalone 手機 render 新的 `MobileShell`，其他（桌機、3D 場景的 iframe）照舊 render `App`。`MobileShell` 自己持有一個純 reducer（`os/src/mobile/state.ts`），重用現有內容元件，只給它們加預設值維持原行為的可選 prop；所有手機樣式在 `os/src/mobile/mobile.css`，全部 scope 在 `.m-shell` 底下。

**Tech Stack:** Vite 8、React 19、TypeScript 7（`os/`）；three.js（`app/`）；`node --test`（Node 26 直接跑 `.ts`，無測試框架）；js-dos 8.5.1；macOS 內建 `qlmanage` / `sips` / `mdls`；headless Chrome（DevTools protocol，用 Node 內建 `WebSocket` / `fetch`）。

**Spec:** `docs/superpowers/specs/2026-10-05-mobile-layout-design.md`（規格的 11 個決定是定案；本計畫照它實作，執行者兩份都要讀）。

## Global Constraints

- `os/src/App.tsx`、`os/src/windows.ts`、`os/src/components/Window.tsx` 不改。
- 內容元件只加「可選」prop，預設值維持現行為（桌機呼叫端不傳，行為不變）。
- 不加任何 npm 套件（含 devDependency）。需要的東西用 Node 內建、macOS 內建或 repo 既有套件（例如 `npx vite`）。
- `bin/verify.sh` 不改（AGENTS.md）。新工具靠「檔案存在」或既有步驟被跑到（`.sh` 會被 shell syntax 步驟檢查；`*.test.ts` / `*.test.mjs` 會被 unit tests 步驟找到）。
- 手機殼的根元素保留 class `screen`：`<div class="screen m-shell">`。
- 手機樣式全部 scope 在 `.m-shell` 底下（每條規則都以 `.m-shell` 或 `.screen.m-shell` 開頭）。`os/src/styles.css` 不改。
- 點擊目標 ≥ 44px（唯一例外見 Task A10：Five Letters 十鍵一排在 360px 寬時鍵寬約 31px，高度仍 ≥ 44px）。
- Terminal 輸入框字級 ≥ 16px（低於 16px iOS 會在 focus 時放大整頁）。
- 手機判斷門檻：短邊 ≤ 600px，`app/src/flatMode.ts` 與 `os/src/phone.ts` 各存一份同值常數 `PHONE_MAX_SHORT_SIDE = 600`，各自有測試，註解互相指向。
- `?desk=1`：只解除尺寸規則；沒有 WebGL 仍然導向 `/os/`。
- Résumé：手機版顯示預先轉好的頁面圖，寬度貼齊螢幕、可捲動；「Open PDF」與點圖片都以一般導覽（不加 `target`）開原 PDF；不做 app 內縮放。
- Résumé 圖：`qlmanage -t -s` 的數字是**長邊**；腳本用 `-s 1755`（實測 1755 → 1240×1755，1754 → 1239×1754），用 `sips -g pixelWidth` 確認寬 1240，頁數 > 1 就失敗（`mdls` 回 `(null)` 時改用 PDFKit 讀頁數）。`CREDITS.md` 不改（第 70 行 `os/public/showcase/` 已涵蓋）。
- iOS 鍵盤：鍵盤彈出時（`.kb-open`）把 `visualViewport.height × visualViewport.scale` 寫進 CSS 變數 `--m-vh`，`.m-shell` 用它當高度；Dock 隱藏。
- keyLayouts 測試直接解析 `os/node_modules/js-dos/dist/js-dos.js` 的 `KBD_*` 表，不和自己的常數比。
- 桌機版 pixel 不變：每個 Part 開工前先拍 1440×900 基準圖，收尾時用 `cmp` 比對（唯一允許的差異是選單列時鐘的分鐘數，要開圖確認）。
- 每個 Part 的最後一個 task：跑 `bash bin/verify.sh`、拍 390×844、360×780、844×390 與桌機 1440×900、列出真 iPhone 檢查項。
- 不寫入、不提及 clean-check 擋的名字（`tools/clean-check.sh` 的名單）。`app/public/`、`blender/assets/` 下的新檔要有 `CREDITS.md` 條目（本計畫不在這兩處加檔）。
- 程式碼、註解、commit、分支名用英文；commit 格式 `<type>(<scope>): <description>`，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。PR 內文結尾加 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`。
- `rm -rf`、`git branch -D` 被擋；暫存檔放 `$TMPDIR` 底下。不 force-push、不推 main。
- 8197 埠被占用時，用 `FLAT_CHECK_PORT=8297 bash bin/verify.sh`。

## Review Focus

1. **離開 Projects 後殘留的 request**：從 Terminal `open cookpilot` 進到 CookPilot、按 ×、再從 Dock 點 Projects，應該看到專案列表，不是又跳回 CookPilot。→ Task A4 `leavesProjects` 測試。
2. **網址列收合或雙指縮放被當成鍵盤**：Safari 捲動時網址列伸縮約 80px、或使用者雙指放大頁面，Dock 都不該消失。→ Task A3 `isKeyboardOpen` 測試（`(844, 760)`、`(844, 422, 2)`）。
3. **沒有 WebGL 卻帶 `?desk=1`**：應該仍然進 `/os/`，不是一片空白的 3D 頁。→ Task A2 測試 `no WebGL is flat, even with ?desk=1`。
4. **在 `~/projects` 裡按指令按鈕**：`cat about`、`cd projects` 按鈕在任何資料夾都要成功，不能印出 `No such file`。→ Task B1 測試 `every chip that runs works from home and from projects`。
5. **ABC 鍵盤打字重複或倒退鍵沒反應**：每個字母只送一次；iOS 自動修正（`insertReplacementText`）不送整個字；倒退鍵送 Backspace。→ Task C2 測試 `the ABC field: ...`。

---

## File Structure

| 檔案 | Part | 動作 | 職責 |
|---|---|---|---|
| `tools/phone-shots.mjs` | A | 新增 | 用 DevTools protocol 模擬手機尺寸截 `/os/?shot=<state>`，並檢查 `.m-shell` 內有沒有元素超出左右邊界。 |
| `tools/mobile-shots.sh` | A | 新增 | 一次拍齊：三種手機尺寸 × 各 state、桌機 1440×900 的 3D 場景與 OS 視窗。 |
| `app/src/flatMode.ts` | A | 改 | 短邊規則、`?desk=1`（`deskRequested`）。 |
| `app/src/flatMode.test.ts` | A | 改 | 短邊規則、600/601 邊界、`?desk=1`、無 WebGL。 |
| `app/src/main.ts:138-139` | A | 改（只改註解） | 說明新的導向規則。 |
| `os/src/phone.ts` / `phone.test.ts` | A | 新增 | `isPhone`、`isKeyboardOpen`。 |
| `os/src/mobile/state.ts` / `state.test.ts` | A | 新增 | 手機殼導覽 reducer 與輔助函式。 |
| `tools/resume-pages.sh` | A | 新增 | PDF 第 1 頁轉成 `resume-p1.png`，寫 `resume-pages.json`。 |
| `tools/test/resume-pages.test.mjs` | A | 新增 | PDF 換了沒重轉就紅。 |
| `os/public/showcase/resume-p1.png`、`resume-pages.json` | A | 新增（腳本產生） | 手機 Résumé 圖與其 metadata。 |
| `os/src/components/Projects.tsx`、`Games.tsx`、`HardDisk.tsx` | A | 改 | 可選 `tapToOpen`；Projects 另有 `layout`。 |
| `os/src/mobile/AboutCard.tsx` | A | 新增 | Showcase 手機首頁 V1 卡片。 |
| `os/src/mobile/MobileResume.tsx` | A | 新增 | 手機 Résumé（圖＋Open PDF）。 |
| `os/src/mobile/TopBar.tsx`、`MobileDock.tsx`、`HomeGrid.tsx` | A | 新增 | 頂部列＋T 選單、Dock 分頁列、桌布圖示格。 |
| `os/src/mobile/MobileShell.tsx` | A（B、C 小改） | 新增 | 手機殼本體。 |
| `os/src/mobile/mobile.css` | A（B、C 追加） | 新增 | 所有手機樣式。 |
| `os/src/main.tsx` | A | 改 | 手機 render `MobileShell`，否則 `App`。 |
| `os/index.html` | A | 改 | viewport 加 `viewport-fit=cover`。 |
| `tools/flat-check.sh:44` | A | 改一行 | 400px 檢查改成找手機殼。 |
| `docs/STATUS.md` | A、B、C | 改 | 每個 Part 收尾記一筆。 |
| `os/src/terminal.ts` / `terminal.test.ts` | B | 改 | `CHIPS` 清單；`cat ~/about`。 |
| `os/src/components/Terminal.tsx` | B | 改 | 可選 `chips`。 |
| `os/src/mobile/keyLayouts.ts` / `keyLayouts.test.ts` | C | 新增 | 每款遊戲的按鍵配置、KBD 碼、ABC 文字轉鍵。 |
| `os/src/components/DosGame.tsx` | C | 改 | 可選 `onReady(send)`。 |
| `os/src/mobile/VirtualKeys.tsx`、`MobileGame.tsx` | C | 新增 | 螢幕按鍵、遊戲畫面＋按鍵的組合。 |

---

# Part A — `feat/mobile-layout`（規格 §1、§2、§3）

分支：`feat/mobile-layout`（已存在，規格也在這支）。合併到 main 之後才開 Part B。

**Part A 動到的檔案：**
- 新增：`tools/phone-shots.mjs`、`tools/mobile-shots.sh`、`os/src/phone.ts`、`os/src/phone.test.ts`、`os/src/mobile/state.ts`、`os/src/mobile/state.test.ts`、`tools/resume-pages.sh`、`tools/test/resume-pages.test.mjs`、`os/public/showcase/resume-p1.png`、`os/public/showcase/resume-pages.json`、`os/src/mobile/AboutCard.tsx`、`os/src/mobile/MobileResume.tsx`、`os/src/mobile/TopBar.tsx`、`os/src/mobile/MobileDock.tsx`、`os/src/mobile/HomeGrid.tsx`、`os/src/mobile/MobileShell.tsx`、`os/src/mobile/mobile.css`
- 修改：`app/src/flatMode.ts`、`app/src/flatMode.test.ts`、`app/src/main.ts`（註解）、`os/src/components/Projects.tsx`、`os/src/components/Games.tsx`、`os/src/components/HardDisk.tsx`、`os/src/main.tsx`、`os/index.html`、`tools/flat-check.sh`、`docs/STATUS.md`

開工前（session 開場）：

```bash
cd /path/to/worktree   # feat/mobile-layout
git pull && git status -sb          # 第一行要是 ## feat/mobile-layout...origin/feat/mobile-layout
bash bin/verify.sh                  # 8197 被占用就用 FLAT_CHECK_PORT=8297 bash bin/verify.sh
```

Expected：`9 pass`，全綠。不綠就先停下回報，不要開始改。

### Task A1: 手機截圖工具與桌機基準圖

**Files:**
- Create: `tools/phone-shots.mjs`
- Create: `tools/mobile-shots.sh`

**Interfaces:**
- Consumes: `tools/serve-log.mjs <dir> <port> <log>`（既有，只聽 127.0.0.1）、`tools/shoot.sh <url> <out.png> [wait-ms] [width] [height]`（既有）。
- Produces:
  - `node tools/phone-shots.mjs <origin> <out-dir> <W>x<H> <state>...`：每個 state 存成 `<out-dir>/<W>x<H>-<state>.png`，印一行 `ok` 或 `CUT`；有任何 `CUT` 就 exit 1。頁面上沒有 `.m-shell` 也算 `CUT`。
  - `bash tools/mobile-shots.sh <out-dir>`：環境變數 `MOBILE_SHOTS_PORT`（預設 8199）、`MOBILE_SHOTS_STATES`（設成空字串＝只拍桌機）。桌機圖檔名 `1440x900-desk.png`、`1440x900-monitor.png`、`1440x900-os-{projects,games,terminal,resume,contact}.png`。

為什麼不用 `tools/shoot.sh` 拍手機：headless Chrome 的 `--window-size` 最小寬 500px，還會少約 87px 高（實測 390,844 → 500×757；844,390 → 844×303），所以要用 DevTools protocol 的 `Emulation.setDeviceMetricsOverride`。

- [ ] **Step 1: 寫 `tools/phone-shots.mjs`**

```js
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
```

- [ ] **Step 2: 寫 `tools/mobile-shots.sh`**

```bash
#!/usr/bin/env bash
#
# tools/mobile-shots.sh — review screenshots for the phone layout, from the built app/dist (bash bin/verify.sh builds it).
#   bash tools/mobile-shots.sh <out-dir>
# Phone: each state in MOBILE_SHOTS_STATES at 390x844, 360x780 and 844x390 (tools/phone-shots.mjs, which also fails
# when content is cut off at the sides). Desktop: the 3D scene (desk, monitor) and five OS windows at 1440x900
# (tools/shoot.sh), to compare with cmp against the same shots taken before the change.
# MOBILE_SHOTS_STATES= (set but empty) takes the desktop shots only.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIST="$ROOT/app/dist"
OUT="${1:?usage: bash tools/mobile-shots.sh <out-dir>}"
[[ -f "$DIST/os/index.html" ]] || { echo "no app/dist/os: run bash bin/verify.sh first" >&2; exit 2; }
PORT="${MOBILE_SHOTS_PORT:-8199}"
STATES="${MOBILE_SHOTS_STATES-m-showcase m-info m-home m-menu m-projects m-resume m-contact m-games m-fiveletters m-terminal m-harddisk m-credits m-doom m-oregon m-scrabble}"
mkdir -p "$OUT" "${TMPDIR:-/tmp}/mobile-shots"

node "$ROOT/tools/serve-log.mjs" "$DIST" "$PORT" "${TMPDIR:-/tmp}/mobile-shots/serve.log" &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
for _ in $(seq 50); do curl -fs "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 0.1; done
URL="http://127.0.0.1:$PORT"
status=0

if [[ -n "$STATES" ]]; then
  for size in 390x844 360x780 844x390; do
    # shellcheck disable=SC2086 # one argument per state
    node "$ROOT/tools/phone-shots.mjs" "$URL" "$OUT" "$size" $STATES || status=1
  done
fi

for s in desk monitor; do
  bash "$ROOT/tools/shoot.sh" "$URL/?shot=$s" "$OUT/1440x900-$s.png" 15000 1440 900 || status=1
done
for s in projects games terminal resume contact; do
  bash "$ROOT/tools/shoot.sh" "$URL/os/?shot=$s" "$OUT/1440x900-os-$s.png" 4000 1440 900 || status=1
done
exit "$status"
```

- [ ] **Step 3: 語法檢查，並確認 phone-shots 會紅**

```bash
bash -n tools/mobile-shots.sh && echo syntax-ok
MOBILE_SHOTS_STATES="m-showcase" bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/A1-red"
```

Expected：`syntax-ok`；第二行印出 `CUT  .../390x844-m-showcase.png  no .m-shell on the page`（三種尺寸各一行），結尾 exit 1。這證明工具在沒有手機殼時會紅。桌機圖照樣寫出。

- [ ] **Step 4: 拍 Part A 的桌機基準圖（還沒改任何 app 程式碼）**

```bash
MOBILE_SHOTS_STATES= bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/A-before"
ls "$TMPDIR/mobile-shots/A-before"
```

Expected：7 張 `1440x900-*.png`（desk、monitor、os-projects、os-games、os-terminal、os-resume、os-contact），exit 0。這組圖在 Task A11 拿來 `cmp`。

- [ ] **Step 5: Commit**

```bash
git add tools/phone-shots.mjs tools/mobile-shots.sh
git commit -m "chore(tools): add phone layout screenshot scripts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A2: 3D 導向改用短邊規則，加 `?desk=1`

**Files:**
- Modify: `app/src/flatMode.ts`（整檔替換）
- Modify: `app/src/main.ts:138-139`（只改註解）
- Test: `app/src/flatMode.test.ts`（整檔替換）

**Interfaces:**
- Consumes: 無。
- Produces:
  - `export const PHONE_MAX_SHORT_SIDE = 600`（取代 `FLAT_MAX_WIDTH`；`FLAT_MAX_WIDTH` 只在 flatMode.ts 與其測試用到，可以直接拿掉）
  - `export interface FlatEnv { width: number; height: number; webgl: boolean; desk: boolean }`
  - `export function shouldUseFlatOS(env: FlatEnv): boolean`
  - `export const deskRequested: (search: string) => boolean`
  - `export function readFlatEnv(hasWebGL: () => boolean): FlatEnv`（簽名不變，`main.ts` 呼叫端不用改）
  - `goFlat()` 不變。TopBar 的「View 3D Desk」連到 `/?desk=1`（Task A8）。

- [ ] **Step 1: 寫失敗的測試（整檔替換 `app/src/flatMode.test.ts`）**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deskRequested, PHONE_MAX_SHORT_SIDE, shouldUseFlatOS } from './flatMode.ts';

const desktop = { width: 1440, height: 900, webgl: true, desk: false };
const size = (width: number, height: number) => ({ ...desktop, width, height });

test('desktop with WebGL gets the 3D scene', () => {
  assert.equal(shouldUseFlatOS(desktop), false);
});

test('a phone is flat whichever way up it is held', () => {
  assert.equal(shouldUseFlatOS(size(390, 844)), true);
  assert.equal(shouldUseFlatOS(size(844, 390)), true);
  assert.equal(shouldUseFlatOS(size(360, 780)), true);
});

test('the short side decides: 600 is a phone, 601 is not', () => {
  assert.equal(PHONE_MAX_SHORT_SIDE, 600); // same value as os/src/phone.ts
  assert.equal(shouldUseFlatOS(size(600, 1000)), true);
  assert.equal(shouldUseFlatOS(size(601, 1000)), false);
  assert.equal(shouldUseFlatOS(size(1000, 600)), true);
  assert.equal(shouldUseFlatOS(size(1000, 601)), false);
});

test('a tablet and a narrowed desktop window get the 3D scene', () => {
  assert.equal(shouldUseFlatOS(size(768, 1024)), false);
  assert.equal(shouldUseFlatOS(size(700, 900)), false);
});

test('?desk=1 keeps a phone on the 3D scene', () => {
  assert.equal(shouldUseFlatOS({ ...size(390, 844), desk: true }), false);
  assert.equal(shouldUseFlatOS({ ...size(844, 390), desk: true }), false);
});

test('no WebGL is flat, even with ?desk=1', () => {
  assert.equal(shouldUseFlatOS({ ...desktop, webgl: false }), true);
  assert.equal(shouldUseFlatOS({ ...desktop, webgl: false, desk: true }), true);
});

test('?desk=1 is read from the query string', () => {
  assert.equal(deskRequested('?desk=1'), true);
  assert.equal(deskRequested('?shot=idle&desk=1'), true);
  assert.equal(deskRequested(''), false);
  assert.equal(deskRequested('?desk=0'), false);
  assert.equal(deskRequested('?desk'), false);
});

test('reduced motion is not a reason to go flat', () => {
  // The visitor still gets the 3D scene.
  assert.equal(shouldUseFlatOS({ ...desktop, reducedMotion: true } as typeof desktop), false);
});
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `node --test app/src/flatMode.test.ts`
Expected: FAIL，`SyntaxError: The requested module './flatMode.ts' does not provide an export named 'deskRequested'`

- [ ] **Step 3: 實作（整檔替換 `app/src/flatMode.ts`）**

```ts
// Who skips the 3D scene and gets the OS full screen at /os/: phones, held either way up, and browsers without WebGL.
// Same threshold as os/src/phone.ts PHONE_MAX_SHORT_SIDE: the two builds are separate, so each keeps its own copy and test.
export const PHONE_MAX_SHORT_SIDE = 600;

export interface FlatEnv {
  width: number;
  height: number;
  webgl: boolean;
  desk: boolean; // ?desk=1: the visitor asked for the 3D desk ("View 3D Desk" in the phone OS)
}

// The short side decides, so a phone held sideways (844x390) is still a phone and a tablet (768x1024) gets the scene.
// ?desk=1 lifts the size rule only: without WebGL there is no scene to show.
// Reduced motion is not a reason: the visitor still gets the 3D scene.
export function shouldUseFlatOS(env: FlatEnv): boolean {
  return !env.webgl || (!env.desk && Math.min(env.width, env.height) <= PHONE_MAX_SHORT_SIDE);
}

export const deskRequested = (search: string): boolean => new URLSearchParams(search).get('desk') === '1';

export function readFlatEnv(hasWebGL: () => boolean): FlatEnv {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    webgl: hasWebGL(),
    desk: deskRequested(window.location.search),
  };
}

/** Replace (not push) so Back leaves the site instead of bouncing into the redirect again. */
export function goFlat(): void {
  window.location.replace(import.meta.env.BASE_URL + 'os/');
}
```

- [ ] **Step 4: 改 `app/src/main.ts` 的註解（第 138–139 行，程式碼不動）**

把：

```ts
// Phones and no WebGL: straight to the OS, before any 3D file is requested.
// Shot mode always renders the scene (screenshots are taken at desktop size).
```

換成：

```ts
// Phones (short side <= 600 px, either way up; ?desk=1 opts out) and no WebGL: straight to the OS, before any 3D
// file is requested (flatMode.ts). Shot mode always renders the scene (screenshots are taken at desktop size).
```

- [ ] **Step 5: 跑測試，確認通過；app 能 build**

Run: `node --test app/src/flatMode.test.ts && (cd app && npm run build)`
Expected: `ℹ pass 8`、`ℹ fail 0`；build 成功（`tsc` 沒有錯）。

- [ ] **Step 6: Commit**

```bash
git add app/src/flatMode.ts app/src/flatMode.test.ts app/src/main.ts
git commit -m "feat(app): send phones by their short side to the OS, with ?desk=1 to stay" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A3: OS 端的手機與鍵盤判斷 `phone.ts`

**Files:**
- Create: `os/src/phone.ts`
- Test: `os/src/phone.test.ts`

**Interfaces:**
- Consumes: 無。
- Produces:
  - `export const PHONE_MAX_SHORT_SIDE = 600`
  - `export const isPhone: (w: number, h: number) => boolean`
  - `export const KEYBOARD_MIN_PX = 150`
  - `export const isKeyboardOpen: (layoutH: number, visualH: number, scale?: number) => boolean`（`scale` 預設 1；是 `visualViewport.scale`）

- [ ] **Step 1: 寫失敗的測試 `os/src/phone.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isKeyboardOpen, isPhone, KEYBOARD_MIN_PX, PHONE_MAX_SHORT_SIDE } from './phone.ts';

test('a phone is a phone whichever way up it is held', () => {
  assert.equal(isPhone(390, 844), true);
  assert.equal(isPhone(844, 390), true);
  assert.equal(isPhone(360, 780), true);
});

test('the short side decides: 600 is a phone, 601 is not', () => {
  assert.equal(PHONE_MAX_SHORT_SIDE, 600); // same value as app/src/flatMode.ts
  assert.equal(isPhone(600, 1000), true);
  assert.equal(isPhone(601, 1000), false);
  assert.equal(isPhone(1000, 600), true);
  assert.equal(isPhone(1000, 601), false);
});

test('tablets and desktops are not phones', () => {
  assert.equal(isPhone(768, 1024), false);
  assert.equal(isPhone(1024, 768), false);
  assert.equal(isPhone(1440, 900), false);
});

test('the keyboard is up when the visible height drops by more than 150 px', () => {
  assert.equal(KEYBOARD_MIN_PX, 150);
  assert.equal(isKeyboardOpen(844, 500), true);
  assert.equal(isKeyboardOpen(844, 693), true);
  assert.equal(isKeyboardOpen(844, 694), false);
});

test('the address bar or a pinch zoom is not the keyboard', () => {
  // Safari's bars change the visible height by about 80 px; that must not hide the Dock.
  assert.equal(isKeyboardOpen(844, 760), false);
  assert.equal(isKeyboardOpen(844, 844), false);
  // Pinch-zoomed to 2x: half the page is visible, but there is no keyboard.
  assert.equal(isKeyboardOpen(844, 422, 2), false);
  // Zoomed and the keyboard up.
  assert.equal(isKeyboardOpen(844, 250, 2), true);
});
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `node --test os/src/phone.test.ts`
Expected: FAIL，`ERR_MODULE_NOT_FOUND`（`Cannot find module '.../os/src/phone.ts'`）

- [ ] **Step 3: 實作 `os/src/phone.ts`**

```ts
// Is this a phone? The short side decides, so a phone held sideways still counts and a tablet does not.
// Same threshold as app/src/flatMode.ts PHONE_MAX_SHORT_SIDE: the two builds are separate, so each keeps its own copy and test.
export const PHONE_MAX_SHORT_SIDE = 600;
export const isPhone = (w: number, h: number): boolean => Math.min(w, h) <= PHONE_MAX_SHORT_SIDE;

// The on-screen keyboard is up when the visible part of the page is much shorter than the page. iOS keeps innerHeight
// (and 100dvh) when the keyboard opens; only visualViewport.height shrinks. `scale` is visualViewport.scale: a pinch
// zoom also shrinks the visible height, but times the scale it is still the whole page.
export const KEYBOARD_MIN_PX = 150;
export const isKeyboardOpen = (layoutH: number, visualH: number, scale = 1): boolean => layoutH - visualH * scale > KEYBOARD_MIN_PX;
```

- [ ] **Step 4: 跑測試，確認通過**

Run: `node --test os/src/phone.test.ts`
Expected: `ℹ pass 5`、`ℹ fail 0`

- [ ] **Step 5: Commit**

```bash
git add os/src/phone.ts os/src/phone.test.ts
git commit -m "feat(os): add the phone check for the OS entry" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A4: 手機殼導覽 reducer `state.ts`

**Files:**
- Create: `os/src/mobile/state.ts`
- Test: `os/src/mobile/state.test.ts`

**Interfaces:**
- Consumes: `os/src/apps.ts` 的 `APPS`、`appById`、`DOCK`、`dockOwner`、`GAMES`、`type AppId`；`os/src/remote.ts` 的 `parseOpenQuery(search: string): OpenTarget | null`（`OpenTarget = { app: 'showcase'; page: ShowcasePage } | { app: Exclude<OpenableApp, 'showcase'> }`）。測試要能被 node 直接跑，所以 import 一律帶 `.ts` 副檔名，型別用另一行 `import type`。
- Produces:
  - `export interface MobileState { current: AppId | null; info: boolean }`
  - `export type MobileAction = { type: 'open'; id: AppId } | { type: 'close' } | { type: 'moreInfo' } | { type: 'home' }`
  - `export const INITIAL: MobileState`（`{ current: 'showcase', info: false }`）
  - `export const HOME_ITEMS: AppId[]`（7 個 Dock app ＋ `harddisk`、`credits`）
  - `export function reduceMobile(s: MobileState, a: MobileAction): MobileState`
  - `export const leavesProjects: (s: MobileState, a: MobileAction) => boolean`
  - `export const isGame: (id: AppId | null) => boolean`
  - `export const dockLit: (s: MobileState) => AppId | null`
  - `export const titleOf: (s: MobileState) => string`
  - `export function startState(search: string): MobileState`（`?shot=m-home`、`?shot=m-info`、`?shot=m-<AppId>`，否則 `?page=` / `?open=`，否則 `INITIAL`）

規格只列了 `open` / `close` / `moreInfo`；這裡多一個 `home`（Shut Down 結束後回到桌布圖示格，見 Task A9）。

- [ ] **Step 1: 寫失敗的測試 `os/src/mobile/state.test.ts`**

```ts
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
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `node --test os/src/mobile/state.test.ts`
Expected: FAIL，`ERR_MODULE_NOT_FOUND`（`Cannot find module '.../os/src/mobile/state.ts'`）

- [ ] **Step 3: 實作 `os/src/mobile/state.ts`**

```ts
// The phone shell's navigation: one full-screen app at a time, or the desktop grid when none is open.
// Pure, so node --test can run it; MobileShell holds it with useReducer.
import { APPS, appById, DOCK, dockOwner, GAMES } from '../apps.ts';
import type { AppId } from '../apps.ts';
import { parseOpenQuery } from '../remote.ts';

export interface MobileState {
  current: AppId | null; // null: the desktop grid (HomeGrid)
  info: boolean; // Showcase only: true shows the Showcase pages ("More Info…"), false the About card
}

export type MobileAction = { type: 'open'; id: AppId } | { type: 'close' } | { type: 'moreInfo' } | { type: 'home' };

export const INITIAL: MobileState = { current: 'showcase', info: false };

// The desktop grid: the Dock apps, then Tommy HD and About This Site.
export const HOME_ITEMS: AppId[] = [...DOCK, 'harddisk', 'credits'];

export function reduceMobile(s: MobileState, a: MobileAction): MobileState {
  switch (a.type) {
    case 'open':
      return { current: a.id, info: false };
    case 'close':
      // × on the Showcase pages goes back to the card; anywhere else it goes to the desktop.
      return s.current === 'showcase' && s.info ? { current: 'showcase', info: false } : { current: null, info: false };
    case 'moreInfo':
      return { current: 'showcase', info: true };
    case 'home':
      return { current: null, info: false };
  }
}

// Leaving Projects drops the project or filter it was asked for: Projects mounts with its request, so a stale one
// would reopen the old project instead of the folder.
export const leavesProjects = (s: MobileState, a: MobileAction): boolean =>
  s.current === 'projects' && reduceMobile(s, a).current !== 'projects';

export const isGame = (id: AppId | null): boolean => GAMES.some((g) => g.id === id);

// The lit Dock icon: a game belongs to Games; Tommy HD and About This Site light nothing.
export const dockLit = (s: MobileState): AppId | null => (s.current ? dockOwner(s.current) : null);

// The top bar's title.
export const titleOf = (s: MobileState): string => (s.current ? appById(s.current).name : 'Finder');

// The first screen: ?shot=m-<app id> | m-home | m-info (screenshots, tools/mobile-shots.sh), else ?page= / ?open=
// (remote.ts), else the Showcase card.
export function startState(search: string): MobileState {
  const shot = new URLSearchParams(search).get('shot') ?? '';
  if (shot === 'm-home') return { current: null, info: false };
  if (shot === 'm-info') return { current: 'showcase', info: true };
  const app = shot.startsWith('m-') ? APPS.find((x) => x.id === shot.slice(2)) : undefined;
  if (app) return { current: app.id, info: false };
  const t = parseOpenQuery(search);
  if (t?.app === 'showcase') return { current: 'showcase', info: t.page !== 'home' };
  if (t) return { current: t.app, info: false };
  return INITIAL;
}
```

- [ ] **Step 4: 跑測試，確認通過；os 能 build**

Run: `node --test os/src/mobile/state.test.ts && (cd os && npm run build)`
Expected: `ℹ pass 9`、`ℹ fail 0`；build 成功。

- [ ] **Step 5: Commit**

```bash
git add os/src/mobile/state.ts os/src/mobile/state.test.ts
git commit -m "feat(os): add the phone shell navigation reducer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A5: Résumé 頁面圖、轉檔腳本與 hash 測試

**Files:**
- Create: `tools/resume-pages.sh`
- Create: `tools/test/resume-pages.test.mjs`
- Create（腳本產生，進 git）: `os/public/showcase/resume-p1.png`、`os/public/showcase/resume-pages.json`

**Interfaces:**
- Consumes: `os/public/showcase/MinChia-Tommy-Huang-Resume.pdf`（目前 1 頁，sha256 `fbf44f8a389fcc51adce9fd85e8d9265893e31d14e7ae7e74b10df13a7d95a37`）。
- Produces:
  - `os/public/showcase/resume-p1.png`：寬 1240px（A4 直式 → 1240×1755），由 `MobileResume`（Task A7）以 `${BASE_URL}showcase/resume-p1.png` 讀取。
  - `os/public/showcase/resume-pages.json`：`{ "pages": 1, "width": 1240, "sha256": "<pdf sha256>" }`
  - `bash tools/resume-pages.sh`：換 PDF 後要重跑。

`CREDITS.md` 不改：第 70 行 `os/public/showcase/` 已涵蓋整個資料夾（自己的作品）。clean-check 的 CREDITS 規則只管 `app/public/` 與 `blender/assets/`。

- [ ] **Step 1: 寫失敗的測試 `tools/test/resume-pages.test.mjs`**

```js
// The phone Résumé's page image (tools/resume-pages.sh) must be made from the current résumé PDF.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../../os/public/showcase/', import.meta.url));
const pages = JSON.parse(readFileSync(dir + 'resume-pages.json', 'utf8'));

test('the page image comes from the current PDF (if not: bash tools/resume-pages.sh)', () => {
  const sha = createHash('sha256').update(readFileSync(dir + 'MinChia-Tommy-Huang-Resume.pdf')).digest('hex');
  assert.equal(pages.sha256, sha);
});

test('one 1240 px wide PNG for the one page', () => {
  assert.equal(pages.pages, 1);
  assert.equal(pages.width, 1240);
  const png = readFileSync(dir + 'resume-p1.png');
  // A PNG starts with an 8-byte signature and the IHDR chunk, whose width is the big-endian uint32 at byte 16.
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
  assert.equal(png.readUInt32BE(16), 1240);
  assert.equal(existsSync(dir + 'resume-p2.png'), false);
});
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `node --test tools/test/resume-pages.test.mjs`
Expected: FAIL，`ENOENT: no such file or directory, open '.../os/public/showcase/resume-pages.json'`

- [ ] **Step 3: 寫 `tools/resume-pages.sh`**

```bash
#!/usr/bin/env bash
#
# tools/resume-pages.sh — the phone Résumé shows a picture of the PDF page, because iOS Safari shows no PDF inside
# <object>. Renders page 1 of os/public/showcase/MinChia-Tommy-Huang-Resume.pdf to resume-p1.png, 1240 px wide, and
# writes resume-pages.json with the page count and the PDF's sha256. tools/test/resume-pages.test.mjs goes red when
# the PDF changes and this script was not run again.
#   bash tools/resume-pages.sh
# macOS only (qlmanage, sips and mdls ship with the system); no npm packages.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIR="$ROOT/os/public/showcase"
PDF="$DIR/MinChia-Tommy-Huang-Resume.pdf"
WIDTH=1240
# qlmanage -s sets the LONG side. Measured on this A4 PDF: -s 1240 gives 876x1240, -s 1754 gives 1239x1754,
# -s 1755 gives 1240x1755.
SIZE=1755

# qlmanage renders page 1 only: stop rather than drop pages without a word.
pages="$(mdls -raw -name kMDItemNumberOfPages "$PDF")"
# Spotlight answers (null) for a file it has not indexed (a fresh worktree, anything under /tmp): ask PDFKit instead.
if [[ "$pages" == "(null)" ]]; then
  pages="$(osascript -l JavaScript -e 'ObjC.import("Quartz"); function run(argv) { return $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0])).pageCount }' "$PDF")"
fi
if [[ "$pages" != "1" ]]; then
  echo "resume-pages: the PDF has '$pages' pages; this script renders page 1 only, so it needs a per-page renderer first" >&2
  exit 1
fi

mkdir -p "${TMPDIR:-/tmp}/resume-pages"
work="$(mktemp -d "${TMPDIR:-/tmp}/resume-pages/run.XXXXXX")"
qlmanage -t -s "$SIZE" -o "$work" "$PDF" >/dev/null
png="$work/$(basename "$PDF").png"
[[ -s "$png" ]] || { echo "resume-pages: qlmanage wrote no image" >&2; exit 1; }
width="$(sips -g pixelWidth "$png" | awk '/pixelWidth/ {print $2}')"
if [[ "$width" != "$WIDTH" ]]; then
  echo "resume-pages: the page image is $width px wide, want $WIDTH (not A4 portrait? change SIZE)" >&2
  exit 1
fi

cp "$png" "$DIR/resume-p1.png"
sha="$(shasum -a 256 "$PDF" | awk '{print $1}')"
printf '{\n  "pages": %s,\n  "width": %s,\n  "sha256": "%s"\n}\n' "$pages" "$WIDTH" "$sha" > "$DIR/resume-pages.json"
echo "resume-pages: wrote resume-p1.png ($width px wide) and resume-pages.json"
```

- [ ] **Step 4: 跑腳本，再跑測試，確認通過**

```bash
bash -n tools/resume-pages.sh && bash tools/resume-pages.sh
cat os/public/showcase/resume-pages.json
node --test tools/test/resume-pages.test.mjs
```

Expected：`resume-pages: wrote resume-p1.png (1240 px wide) and resume-pages.json`；json 的 `sha256` 是 `fbf44f8a…7d95a37`；測試 `ℹ pass 2`。PNG 約 380 KB（不在 `tools/size-budget.mjs` 的計算範圍：它只算 `models`、`textures`、`audio`）。

- [ ] **Step 5: 證明 hash 測試會紅，再還原**

```bash
cp os/public/showcase/resume-pages.json "$TMPDIR/resume-pages.json.bak"
sed -i '' 's/"sha256": "f/"sha256": "0/' os/public/showcase/resume-pages.json
node --test tools/test/resume-pages.test.mjs   # Expected: FAIL in 'the page image comes from the current PDF'
cp "$TMPDIR/resume-pages.json.bak" os/public/showcase/resume-pages.json
node --test tools/test/resume-pages.test.mjs   # Expected: pass 2
```

- [ ] **Step 6: Commit**

```bash
git add tools/resume-pages.sh tools/test/resume-pages.test.mjs os/public/showcase/resume-p1.png os/public/showcase/resume-pages.json
git commit -m "feat(os): render the resume PDF page to an image for phones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A6: Projects、Games、Tommy HD 點一下就開（可選 prop）

**Files:**
- Modify: `os/src/components/Projects.tsx`（Props、函式簽名、`finder-grid` 那個 div、`finder-item` 按鈕）
- Modify: `os/src/components/Games.tsx`（開頭註解、函式簽名、`finder-item` 按鈕）
- Modify: `os/src/components/HardDisk.tsx`（Props、函式簽名、`finder-item` 按鈕）

**Interfaces:**
- Consumes: 無。
- Produces（Task A9 的 `MobileShell` 會用）：
  - `Projects`：`tapToOpen?: boolean`（預設 `false`）、`layout?: 'grid' | 'list'`（預設 `'grid'`；`'list'` 在 grid div 多加 class `finder-list`）
  - `Games`：`tapToOpen?: boolean`（預設 `false`）
  - `HardDisk`：`tapToOpen?: boolean`（預設 `false`）
  - 預設值下 `onClick` 是 `undefined`，DOM 與桌機行為完全不變（桌機仍是雙擊開）。

- [ ] **Step 1: `Projects.tsx`**

Props 介面裡，把：

```tsx
  filter?: { hackathons: true; n: number };
}
```

換成：

```tsx
  filter?: { hackathons: true; n: number };
  // Phone shell: one tap opens a project (touch has no double-click), and `list` shows one project per row.
  tapToOpen?: boolean;
  layout?: 'grid' | 'list';
}
```

把：

```tsx
export default function Projects({ request, filter }: Props) {
```

換成：

```tsx
export default function Projects({ request, filter, tapToOpen = false, layout = 'grid' }: Props) {
```

把：

```tsx
      <div className="finder-grid" onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
```

換成：

```tsx
      <div className={`finder-grid${layout === 'list' ? ' finder-list' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && setSel(null)}>
```

在 `finder-item` 按鈕上，把：

```tsx
            onMouseDown={() => setSel(x.slug)}
            onDoubleClick={() => setOpen(x.slug)}
```

換成：

```tsx
            onMouseDown={() => setSel(x.slug)}
            onClick={tapToOpen ? () => setOpen(x.slug) : undefined}
            onDoubleClick={() => setOpen(x.slug)}
```

- [ ] **Step 2: `Games.tsx`**

把：

```tsx
// The Games folder: the three DOS games under their publishers' logos. Double-click starts one in its own window.
export default function Games({ onOpen }: { onOpen: (id: AppId) => void }) {
```

換成：

```tsx
// The Games folder: the three DOS games under their publishers' logos. Double-click starts one in its own window
// (tapToOpen, the phone shell: one tap).
export default function Games({ onOpen, tapToOpen = false }: { onOpen: (id: AppId) => void; tapToOpen?: boolean }) {
```

把：

```tsx
            onMouseDown={() => setSel(g.id)}
            onDoubleClick={() => onOpen(g.id)}
```

換成：

```tsx
            onMouseDown={() => setSel(g.id)}
            onClick={tapToOpen ? () => onOpen(g.id) : undefined}
            onDoubleClick={() => onOpen(g.id)}
```

- [ ] **Step 3: `HardDisk.tsx`**

把：

```tsx
  onExperience: () => void;
}

export default function HardDisk({ onProjects, onHackathons, onExperience }: Props) {
```

換成：

```tsx
  onExperience: () => void;
  tapToOpen?: boolean; // phone shell: one tap opens a folder (touch has no double-click)
}

export default function HardDisk({ onProjects, onHackathons, onExperience, tapToOpen = false }: Props) {
```

把：

```tsx
            onMouseDown={() => setSel(f.id)}
            onDoubleClick={() => open(f.id)}
```

換成：

```tsx
            onMouseDown={() => setSel(f.id)}
            onClick={tapToOpen ? () => open(f.id) : undefined}
            onDoubleClick={() => open(f.id)}
```

- [ ] **Step 4: Build，確認 `App.tsx` 不用改**

Run: `(cd os && npm run build) && git diff --stat`
Expected：build 成功；`git diff --stat` 只列這三個檔案（`App.tsx` 沒出現：它不傳新 prop，預設值即現行為）。

- [ ] **Step 5: Commit**

```bash
git add os/src/components/Projects.tsx os/src/components/Games.tsx os/src/components/HardDisk.tsx
git commit -m "feat(os): let Projects, Games and Tommy HD open on one tap" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A7: Showcase 卡片 AboutCard 與手機 Résumé

**Files:**
- Create: `os/src/mobile/AboutCard.tsx`
- Create: `os/src/mobile/MobileResume.tsx`
- Create: `os/src/mobile/mobile.css`（開頭註解＋T 圖示＋卡片＋Résumé 四段；之後的 task 會追加）

**Interfaces:**
- Consumes: `os/src/data/profile.ts` 的 `RESUME_FILE`（PDF 檔名）；`os/src/styles.css` 既有的 `.gel`、`.gel-close`、`.gel-min`、`.gel-zoom`、`.aqua-btn`、`.aqua-btn.primary`、`.resume-bar`、`var(--pinstripe)`、`var(--aqua-blue-dark)`；Task A5 的 `showcase/resume-p1.png`。
- Produces（Task A9 用）：
  - `export default function AboutCard(props: { onResume: () => void; onProjects: () => void; onMoreInfo: () => void; onContact: () => void })`
  - `export default function MobileResume()`（無 props）
  - CSS class：`.m-t-badge`（Task A8 的 HomeGrid 也用）、`.m-card*`、`.m-resume*`

規格 §3「Résumé」說手機版不用 `<object>`；這裡另寫 `MobileResume.tsx`，不給 `Resume.tsx` 加 prop（兩者共用的只有 `.resume-bar` 樣式，桌機的 `Resume.tsx` 不動）。

- [ ] **Step 1: 寫 `os/src/mobile/AboutCard.tsx`**

```tsx
// Showcase's first screen on a phone: the "About This Tommy" card (Figma 06 Mobile, V1 73:491). The four facts are
// fixed here on purpose (confirmed by Tommy 2026-10-05), not derived from profile.ts.
const FACTS: [string, string][] = [
  ['Based in', 'Sydney, Australia'],
  ['Study', 'Master of IT, UTS · July 2027'],
  ['Status', 'Open to part-time, casual or internship work'],
  ['Latest', 'CookPilot · 1st place, ICON x Lyra Hackathon'],
];

interface Props {
  onResume: () => void;
  onProjects: () => void;
  onMoreInfo: () => void;
  onContact: () => void;
}

export default function AboutCard({ onResume, onProjects, onMoreInfo, onContact }: Props) {
  return (
    <div className="m-card-wrap">
      <section className="m-card" aria-labelledby="m-card-name">
        <div className="m-card-title">
          <span className="m-card-gels" aria-hidden="true">
            <span className="gel gel-close" />
            <span className="gel gel-min" />
            <span className="gel gel-zoom" />
          </span>
          About This Tommy
        </div>
        <div className="m-card-body">
          <div className="m-card-head">
            <span className="m-t-badge" aria-hidden="true">
              T
            </span>
            <h1 id="m-card-name" className="m-card-name">
              Min-Chia (Tommy) Huang
            </h1>
            <div className="m-card-job">Software Engineer</div>
            <div className="m-card-tag">full-stack, backend, AI &amp; automation</div>
          </div>
          <dl className="m-card-facts">
            {FACTS.map(([k, v]) => (
              <div key={k} className="m-card-fact">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <div className="m-card-buttons">
            <button type="button" className="aqua-btn primary" onClick={onResume}>
              Résumé
            </button>
            <button type="button" className="aqua-btn" onClick={onProjects}>
              Projects
            </button>
            <button type="button" className="aqua-btn" onClick={onMoreInfo}>
              More Info…
            </button>
            <button type="button" className="aqua-btn" onClick={onContact}>
              Contact
            </button>
          </div>
          <div className="m-card-foot">™ &amp; © 2026 Min-Chia Huang · minchiahuang.dev</div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 寫 `os/src/mobile/MobileResume.tsx`**

```tsx
import { RESUME_FILE } from '../data/profile';

const dir = `${import.meta.env.BASE_URL}showcase/`;
const pdf = dir + RESUME_FILE;

// The Résumé on a phone. iOS Safari shows no PDF inside <object>, so this shows the page as a picture
// (tools/resume-pages.sh), as wide as the screen. Open PDF and a tap on the page both go to the PDF itself, where
// Safari's own viewer zooms and downloads; zooming here would zoom the top bar and the Dock with it.
export default function MobileResume() {
  return (
    <div className="m-resume">
      <div className="resume-bar m-resume-bar">
        <span>{RESUME_FILE}</span>
        <a className="aqua-btn primary" href={pdf}>
          Open PDF
        </a>
      </div>
      <a className="m-resume-page" href={pdf} aria-label="Open the résumé PDF">
        <img src={`${dir}resume-p1.png`} alt="Résumé of Min-Chia (Tommy) Huang, page 1" draggable={false} />
      </a>
    </div>
  );
}
```

- [ ] **Step 3: 建立 `os/src/mobile/mobile.css`（四段）**

```css
/* Phone shell (os/src/mobile/MobileShell.tsx). Every rule here starts with .m-shell, so the desktop OS (App.tsx) never
   matches one. Tap targets are at least 44 px. Safe areas come from viewport-fit=cover in os/index.html. */

/* The T badge: the About card's icon and About This Site on the desktop grid */
.m-shell .m-t-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(#8cc0ff, #3d84e0 55%, #1a5bc4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
}

/* Showcase card (AboutCard.tsx, Figma 06 Mobile V1 73:491): an Aqua window on the wallpaper */
.m-shell .m-card-wrap { position: absolute; inset: 0; overflow-y: auto; display: flex; justify-content: center; align-items: flex-start; padding: 16px 12px 24px; }
.m-shell .m-card { width: 100%; max-width: 420px; overflow: hidden; border-radius: 8px; background: var(--pinstripe); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.28); }
.m-shell .m-card-title { position: relative; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.m-shell .m-card-gels { position: absolute; left: 8px; top: 5px; display: flex; gap: 7px; }
.m-shell .m-card-gels .gel { display: block; }
.m-shell .m-card-body { margin: 0 8px 8px; padding: 18px 16px 14px; display: flex; flex-direction: column; align-items: center; text-align: center; background: #fff; border: 1px solid #9b9b9b; }
.m-shell .m-card-head { display: flex; flex-direction: column; align-items: center; }
.m-shell .m-card-head .m-t-badge { width: 64px; height: 64px; }
.m-shell .m-card-name { margin: 10px 0 0; font-size: 22px; line-height: 26px; font-weight: 800; }
.m-shell .m-card-job { margin-top: 2px; font-size: 16px; font-weight: 700; color: var(--aqua-blue-dark); }
.m-shell .m-card-tag { margin-top: 2px; font-size: 13px; color: #444; }
.m-shell .m-card-facts { width: 100%; margin: 14px 0 0; padding-top: 10px; border-top: 1px solid #e2e2e2; font-size: 13px; line-height: 18px; text-align: left; }
.m-shell .m-card-fact { display: flex; gap: 10px; padding: 3px 0; }
.m-shell .m-card-fact dt { flex: none; width: 64px; text-align: right; font-weight: 700; }
.m-shell .m-card-fact dd { margin: 0; min-width: 0; }
.m-shell .m-card-buttons { width: 100%; margin-top: 16px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 8px; }
.m-shell .m-card-buttons .aqua-btn { height: 44px; padding: 0 6px; border-radius: 22px; font-size: 15px; font-weight: 600; }
.m-shell .m-card-buttons .aqua-btn.primary { grid-column: 1 / -1; }
.m-shell .m-card-foot { margin-top: 14px; font-size: 11px; color: #777; }
/* Sideways: two columns, so the name, the title and the Résumé and Projects buttons fit without scrolling. */
@media (orientation: landscape) {
  .m-shell .m-card-wrap { padding-top: 10px; }
  .m-shell .m-card { max-width: 680px; }
  .m-shell .m-card-body { display: grid; grid-template-columns: 1fr 1fr; grid-template-areas: 'head facts' 'buttons facts' 'foot foot'; column-gap: 20px; align-items: start; padding-top: 12px; }
  .m-shell .m-card-head { grid-area: head; }
  .m-shell .m-card-head .m-t-badge { width: 44px; height: 44px; font-size: 28px; border-radius: 10px; }
  .m-shell .m-card-name { margin-top: 6px; }
  .m-shell .m-card-facts { grid-area: facts; margin: 0; padding: 0 0 0 16px; border-top: 0; border-left: 1px solid #e2e2e2; }
  .m-shell .m-card-buttons { grid-area: buttons; margin-top: 12px; }
  .m-shell .m-card-foot { grid-area: foot; margin-top: 10px; }
}

/* Résumé (MobileResume.tsx): the page picture as wide as the screen; it and Open PDF both go to the PDF */
.m-shell .m-resume { height: 100%; display: flex; flex-direction: column; background: #8e8e8e; }
.m-shell .m-resume-bar { height: 56px; gap: 8px; font-size: 13px; }
.m-shell .m-resume-bar span { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.m-shell .m-resume-bar .aqua-btn { flex: none; height: 44px; padding: 0 20px; border-radius: 22px; font-size: 15px; }
.m-shell .m-resume-page { flex: 1; min-height: 0; display: block; overflow-y: auto; padding: 8px; }
.m-shell .m-resume-page img { display: block; width: 100%; height: auto; background: #fff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4); }
```

（PNG 有 alpha channel，所以 `img` 要 `background: #fff`。）

- [ ] **Step 4: Build**

Run: `(cd os && npm run build)`
Expected：成功。元件還沒被 render（Task A9 才接上），這一步只確認型別與 import 正確；畫面在 Task A9 截圖檢查。

- [ ] **Step 5: Commit**

```bash
git add os/src/mobile/AboutCard.tsx os/src/mobile/MobileResume.tsx os/src/mobile/mobile.css
git commit -m "feat(os): add the phone About card and resume viewer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A8: 頂部列、Dock 分頁列、桌布圖示格

**Files:**
- Create: `os/src/mobile/TopBar.tsx`
- Create: `os/src/mobile/MobileDock.tsx`
- Create: `os/src/mobile/HomeGrid.tsx`
- Modify: `os/src/mobile/mobile.css`（檔尾追加三段）

**Interfaces:**
- Consumes: `os/src/apps.ts` 的 `aqua(file)`、`appById(id)`、`DOCK`、`type AppId`；Task A4 的 `HOME_ITEMS`；Task A7 的 `.m-t-badge`；`styles.css` 的 `var(--select)`。
- Produces（Task A9 用）：
  - `TopBar(props: { title: string; onClose: () => void; onAbout: () => void; onRestart: () => void; onShutDown: () => void; initialMenu?: boolean })`
  - `MobileDock(props: { lit: AppId | null; onOpen: (id: AppId) => void })`
  - `HomeGrid(props: { onOpen: (id: AppId) => void })`
  - CSS class：`.m-top*`、`.m-menu*`、`.m-dock*`、`.m-home*`；`.m-shell.kb-open` 與 `.m-shell.m-gaming` 會隱藏 Dock（class 由 Task A9 加上）。

- [ ] **Step 1: 寫 `os/src/mobile/TopBar.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  onAbout: () => void;
  onRestart: () => void;
  onShutDown: () => void;
  initialMenu?: boolean; // ?shot=m-menu: the T menu starts open
}

// The phone's only bar, 44 px tall: × closes the app, the title names it, the T menu holds the system items.
// No clock on a phone. The menu opens on a tap (there is no hover) and a tap anywhere else closes it.
export default function TopBar({ title, onClose, onAbout, onRestart, onShutDown, initialMenu = false }: Props) {
  const [open, setOpen] = useState(initialMenu);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <header className="m-top" ref={bar}>
      <button type="button" className="m-top-btn m-top-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="m-top-title">{title}</div>
      <button type="button" className={`m-top-btn m-top-t${open ? ' is-open' : ''}`} aria-label="T menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        T
      </button>
      {open && (
        <div className="m-menu" role="menu">
          <button type="button" role="menuitem" className="m-menu-item" onClick={run(onAbout)}>
            About This Site…
          </button>
          {/* A plain link (push): Back on the 3D desk returns here. ?desk=1 skips the phone redirect (app/src/flatMode.ts). */}
          <a role="menuitem" className="m-menu-item" href="/?desk=1">
            View 3D Desk
          </a>
          <hr className="m-menu-sep" />
          <button type="button" role="menuitem" className="m-menu-item" onClick={run(onRestart)}>
            Restart
          </button>
          <button type="button" role="menuitem" className="m-menu-item" onClick={run(onShutDown)}>
            Shut Down…
          </button>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: 寫 `os/src/mobile/MobileDock.tsx`**

```tsx
import { aqua, appById, DOCK, type AppId } from '../apps';

interface Props {
  lit: AppId | null; // the app on screen (a game lights Games), see dockLit in state.ts
  onOpen: (id: AppId) => void;
}

// The phone Dock: a tab bar of the seven Dock apps. No Trash and no magnification (that is Dock.tsx, for a mouse).
// mobile.css shows the labels only when the phone is upright.
export default function MobileDock({ lit, onOpen }: Props) {
  return (
    <nav className="m-dock" aria-label="Dock">
      {DOCK.map((id) => {
        const app = appById(id);
        return (
          <button
            key={id}
            type="button"
            className={`m-dock-item${lit === id ? ' is-lit' : ''}`}
            aria-label={app.name}
            aria-current={lit === id ? 'page' : undefined}
            onClick={() => onOpen(id)}
          >
            <img src={aqua(app.icon!)} alt="" draggable={false} />
            <span className="m-dock-label" aria-hidden="true">
              {app.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 寫 `os/src/mobile/HomeGrid.tsx`**

```tsx
import { aqua, appById, type AppId } from '../apps';
import { HOME_ITEMS } from './state';

// The desktop when no app is open: one icon per item on the Aqua wallpaper (MobileShell draws the wallpaper).
// One tap opens. About This Site has no Aqua icon, so it gets the T badge.
export default function HomeGrid({ onOpen }: { onOpen: (id: AppId) => void }) {
  return (
    <div className="m-home">
      {HOME_ITEMS.map((id) => {
        const app = appById(id);
        return (
          <button key={id} type="button" className="m-home-item" onClick={() => onOpen(id)}>
            {app.icon ? (
              <img src={aqua(app.icon)} alt="" draggable={false} />
            ) : (
              <span className="m-t-badge" aria-hidden="true">
                T
              </span>
            )}
            <span className="m-home-label">{app.name}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 在 `os/src/mobile/mobile.css` 檔尾追加**

```css

/* Top bar (TopBar.tsx): × | title | T */
.m-shell .m-top {
  flex: none;
  position: relative;
  z-index: 300;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  height: calc(44px + env(safe-area-inset-top));
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
  background: linear-gradient(#ffffff, #ececec);
  border-bottom: 1px solid #a8a8a8;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.m-shell .m-top-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
.m-shell .m-top-close { font-size: 28px; line-height: 1; color: #444; }
.m-shell .m-top-t { font-size: 20px; font-weight: 900; color: var(--aqua-blue-dark); }
.m-shell .m-top-t.is-open { background: var(--select); color: #fff; }
.m-shell .m-top-title { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; text-align: center; font-size: 16px; font-weight: 800; }
.m-shell .m-menu {
  position: absolute;
  top: 100%;
  right: env(safe-area-inset-right);
  min-width: 220px;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  background: rgba(250, 250, 250, 0.97);
  border-radius: 0 0 8px 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.12);
}
.m-shell .m-menu-item { min-height: 44px; display: flex; align-items: center; padding: 0 20px; font-size: 16px; text-align: left; color: #000; text-decoration: none; }
.m-shell .m-menu-item:active { background: var(--select); color: #fff; }
.m-shell .m-menu-sep { margin: 4px 0; border: 0; border-top: 1px solid #d6d6d6; }

/* Dock (MobileDock.tsx): a tab bar; labels upright only; hidden under the keyboard and beside a game held sideways */
.m-shell .m-dock {
  flex: none;
  z-index: 200;
  display: flex;
  padding: 4px max(4px, env(safe-area-inset-right)) calc(2px + env(safe-area-inset-bottom)) max(4px, env(safe-area-inset-left));
  background: rgba(225, 235, 250, 0.88);
  border-top: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.25);
}
.m-shell .m-dock-item { position: relative; flex: 1 1 0; min-width: 0; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; padding-bottom: 6px; }
.m-shell .m-dock-item img { display: block; width: 44px; height: 44px; }
.m-shell .m-dock-label { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 10px; line-height: 12px; font-weight: 700; color: #1d2b44; }
.m-shell .m-dock-item.is-lit::after { content: ''; position: absolute; left: 50%; bottom: 1px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #111; }
.m-shell.kb-open .m-dock { display: none; }
@media (orientation: landscape) {
  .m-shell .m-dock-label { display: none; }
  .m-shell .m-dock-item { padding-bottom: 4px; }
  .m-shell .m-dock-item img { width: 36px; height: 36px; }
  .m-shell.m-gaming .m-dock { display: none; }
}

/* Desktop grid (HomeGrid.tsx): white labels on the Aqua wallpaper */
.m-shell .m-home {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  align-content: start;
  gap: 16px 4px;
  padding: 20px max(12px, env(safe-area-inset-right)) 20px max(12px, env(safe-area-inset-left));
}
.m-shell .m-home-item { min-height: 44px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.m-shell .m-home-item img, .m-shell .m-home-item .m-t-badge { width: 64px; height: 64px; }
.m-shell .m-home-label { padding: 0 6px; color: #fff; font-size: 13px; line-height: 16px; font-weight: 700; text-align: center; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7); }
```

橫向的 Dock 圖示是 36px，但整個按鈕（`.m-dock-item`）仍是 `min-height: 44px`、寬約 120px，點擊目標 ≥ 44px。

- [ ] **Step 5: Build**

Run: `(cd os && npm run build)`
Expected：成功。

- [ ] **Step 6: Commit**

```bash
git add os/src/mobile/TopBar.tsx os/src/mobile/MobileDock.tsx os/src/mobile/HomeGrid.tsx os/src/mobile/mobile.css
git commit -m "feat(os): add the phone top bar, Dock and desktop grid" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A9: 接上手機殼：MobileShell、入口分流、viewport、flat-check

**Files:**
- Create: `os/src/mobile/MobileShell.tsx`
- Modify: `os/src/main.tsx`（整檔替換）
- Modify: `os/index.html`（viewport meta）
- Modify: `os/src/mobile/mobile.css`（在開頭註解之後插入「Frame」段）
- Modify: `tools/flat-check.sh:44`

**Interfaces:**
- Consumes: Task A3 `isPhone`、`isKeyboardOpen`；Task A4 `reduceMobile`、`startState`、`leavesProjects`、`dockLit`、`isGame`、`titleOf`、`type MobileAction`；Task A6 的 `tapToOpen` / `layout`；Task A7 `AboutCard`、`MobileResume`；Task A8 `TopBar`、`MobileDock`、`HomeGrid`；既有元件 `Showcase`（`request?: { page: ShowcasePage; n: number }`）、`Projects`（`request?`、`filter?`）、`Contact`、`Games`（`onOpen`）、`FiveLetters`（`active`）、`Terminal`（`active`、`onEffect`）、`HardDisk`（`onProjects`、`onHackathons`、`onExperience`）、`Credits`、`DosGame`（`id`）、`Shutdown`（`clickedAt`、`onDone`）；`remote.ts` 的 `type ShowcasePage`。
- Produces:
  - `export default function MobileShell()`：根元素 `<div class="screen m-shell">`，遊戲中多一個 `m-gaming`，鍵盤彈出時多一個 `kb-open` 並設定 `--m-vh`。
  - `?shot=m-menu`：T 選單一開始就打開（截圖用）。
  - Part B 會在 `<Terminal>` 加 `chips`；Part C 會把 `default:` 分支換成 `<MobileGame id={id} />`。

- [ ] **Step 1: 寫 `os/src/mobile/MobileShell.tsx`**

```tsx
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { AppId } from '../apps';
import type { ShowcasePage } from '../remote';
import { isKeyboardOpen } from '../phone';
import Showcase from '../components/Showcase';
import Projects from '../components/Projects';
import Contact from '../components/Contact';
import Games from '../components/Games';
import FiveLetters from '../components/FiveLetters';
import Terminal from '../components/Terminal';
import HardDisk from '../components/HardDisk';
import Credits from '../components/Credits';
import DosGame from '../components/DosGame';
import Shutdown from '../components/Shutdown';
import AboutCard from './AboutCard';
import MobileResume from './MobileResume';
import TopBar from './TopBar';
import MobileDock from './MobileDock';
import HomeGrid from './HomeGrid';
import { dockLit, isGame, leavesProjects, reduceMobile, startState, titleOf } from './state';
import type { MobileAction } from './state';
import './mobile.css';

type Request<T> = (T & { n: number }) | null; // n changes on every request so asking twice still counts (as in App.tsx)

const shot = new URLSearchParams(location.search).get('shot');

// The OS on a phone. main.tsx picks it for a standalone /os/ page whose short side is <= 600 px; the iMac's screen in
// the 3D scene always gets App.tsx. One full-screen app at a time under a 44 px top bar, the Dock as a tab bar, and the
// Aqua desktop grid when no app is open. The content components are App.tsx's own; windows.ts plays no part here.
export default function MobileShell() {
  const [state, dispatch] = useReducer(reduceMobile, location.search, startState);
  const [showcasePage, setShowcasePage] = useState<Request<{ page: ShowcasePage }>>(null);
  const [projectReq, setProjectReq] = useState<Request<{ slug: string }>>(null);
  const [projectFilter, setProjectFilter] = useState<Request<{ hackathons: true }>>(null);
  const [shutdownAt, setShutdownAt] = useState<Date | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const { current, info } = state;

  const send = useCallback(
    (a: MobileAction) => {
      if (leavesProjects(state, a)) {
        setProjectReq(null);
        setProjectFilter(null);
      }
      dispatch(a);
    },
    [state],
  );
  const open = useCallback((id: AppId) => send({ type: 'open', id }), [send]);
  const showPage = useCallback(
    (page: ShowcasePage) => {
      setShowcasePage((prev) => ({ page, n: (prev?.n ?? 0) + 1 }));
      send({ type: 'moreInfo' });
    },
    [send],
  );

  // iOS keeps 100dvh when the keyboard opens and lets the keyboard cover the bottom of the page. While it is up, size
  // the shell to the visible part (--m-vh) and hide the Dock (.kb-open), so what sits at the bottom stays above it.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = shell.current;
    if (!vv || !el) return;
    const sync = () => {
      const up = isKeyboardOpen(window.innerHeight, vv.height, vv.scale);
      el.classList.toggle('kb-open', up);
      if (up) {
        el.style.setProperty('--m-vh', `${vv.height * vv.scale}px`);
        window.scrollTo(0, 0); // iOS scrolls the page to show the field; the shell already fits, so pin it back
      } else {
        el.style.removeProperty('--m-vh');
      }
    };
    sync();
    vv.addEventListener('resize', sync);
    return () => vv.removeEventListener('resize', sync);
  }, []);

  // Restart: straight back to the Showcase card. Shut Down: the shutdown log, then the empty desktop (as on the iMac).
  const restart = () => {
    setShowcasePage(null);
    setProjectReq(null);
    setProjectFilter(null);
    dispatch({ type: 'open', id: 'showcase' });
  };
  const reboot = useCallback(() => {
    setShowcasePage(null);
    setProjectReq(null);
    setProjectFilter(null);
    setShutdownAt(null);
    dispatch({ type: 'home' });
  }, []);

  const content = (id: AppId) => {
    switch (id) {
      case 'showcase':
        return info ? (
          <Showcase request={showcasePage ?? undefined} />
        ) : (
          <AboutCard onResume={() => open('resume')} onProjects={() => open('projects')} onMoreInfo={() => showPage('about')} onContact={() => open('contact')} />
        );
      case 'projects':
        return <Projects request={projectReq ?? undefined} filter={projectFilter ?? undefined} tapToOpen layout="list" />;
      case 'resume':
        return <MobileResume />;
      case 'contact':
        return <Contact />;
      case 'games':
        return <Games onOpen={open} tapToOpen />;
      case 'fiveletters':
        return <FiveLetters active />;
      case 'terminal':
        return (
          <Terminal
            // Not focused on open: on a phone that would throw the keyboard over the screen. A tap on it focuses.
            active={false}
            onEffect={(e) => {
              if (e.open === 'projects') setProjectReq((prev) => ({ slug: e.project, n: (prev?.n ?? 0) + 1 }));
              open(e.open);
            }}
          />
        );
      case 'harddisk':
        return (
          <HardDisk
            tapToOpen
            onProjects={() => open('projects')}
            onHackathons={() => {
              setProjectFilter((prev) => ({ hackathons: true, n: (prev?.n ?? 0) + 1 }));
              open('projects');
            }}
            onExperience={() => showPage('experience')}
          />
        );
      case 'credits':
        return <Credits />;
      default:
        // A DOS game. Opening anything else unmounts it, which stops the emulator and its sound.
        return (
          <div className="m-game">
            <DosGame id={id} />
          </div>
        );
    }
  };

  return (
    <div ref={shell} className={`screen m-shell${isGame(current) ? ' m-gaming' : ''}`}>
      <TopBar
        title={titleOf(state)}
        initialMenu={shot === 'm-menu'}
        onClose={() => send({ type: 'close' })}
        onAbout={() => open('credits')}
        onRestart={restart}
        onShutDown={() => setShutdownAt(new Date())}
      />
      <main className="m-main">
        <div className="desktop" aria-hidden="true" />
        {current === null ? (
          <HomeGrid onOpen={open} />
        ) : (
          <div key={current} className={`m-pane${current === 'showcase' && !info ? '' : ' is-app'}`}>
            {content(current)}
          </div>
        )}
      </main>
      <MobileDock lit={dockLit(state)} onOpen={open} />
      {shutdownAt && <Shutdown clickedAt={shutdownAt} onDone={reboot} />}
    </div>
  );
}
```

說明：`<div className="desktop">` 是 `styles.css` 既有的 Aqua 桌布（漸層），放在 `.m-main` 底層；卡片與 HomeGrid 疊在上面，其他 app 的 `.m-pane.is-app` 是白底蓋住桌布。`key={current}` 讓換 app 一定 unmount 前一個（遊戲因此停止）。

- [ ] **Step 2: 整檔替換 `os/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import MobileShell from './mobile/MobileShell';
import { startForwarding } from './forward';
import { isPhone } from './phone';

startForwarding();

// A phone opening /os/ gets the phone shell; the iMac's screen in the 3D scene (an iframe) and desktop browsers get the
// window OS. Decided once, at load: turning a phone keeps its short side, and a desktop window resized across 600 px
// changes over on the next reload.
const phone = window.parent === window && isPhone(window.innerWidth, window.innerHeight);

createRoot(document.getElementById('root')!).render(<StrictMode>{phone ? <MobileShell /> : <App />}</StrictMode>);
```

- [ ] **Step 3: `os/index.html` 的 viewport**

把：

```html
    <meta name="viewport" content="width=device-width, initial-scale=1" />
```

換成：

```html
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

- [ ] **Step 4: 在 `os/src/mobile/mobile.css` 開頭註解（前兩行）之後、`/* The T badge` 之前插入**

```css

/* Frame: top bar, the app area (each app scrolls inside itself), the Dock. 100dvh, not 100vh, which iOS's address bar
   would cut. While the keyboard is up, MobileShell writes the visible height into --m-vh. */
.screen.m-shell { height: var(--m-vh, 100dvh); display: flex; flex-direction: column; touch-action: manipulation; }
.m-shell .m-main { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.m-shell .m-pane { position: absolute; top: 0; bottom: 0; left: env(safe-area-inset-left); right: env(safe-area-inset-right); overflow: hidden; }
.m-shell .m-pane.is-app { background: #fff; }
.m-shell .m-game { height: 100%; background: #000; }
```

（`.screen` 在 `styles.css` 是 `height: 100vh`；`.screen.m-shell` 的權重較高，所以手機殼用 `--m-vh` / `100dvh`，桌機的 `.screen` 不受影響。）

- [ ] **Step 5: 改 `tools/flat-check.sh:44`**

規格 §6 說「根元素保留 `class="screen"`，400px 檢查仍成立」，但這一行是 `grep -q 'class="screen"'`（含結尾引號），遇到 `class="screen m-shell"` 會失敗。改成直接檢查手機殼（比原本更嚴：證明手機拿到的是手機殼）。把：

```bash
check "400px: OS desktop in the DOM" grep -q 'class="screen"' "$WORK/phone.dom"
```

換成：

```bash
check "400px: phone OS in the DOM" grep -q 'class="screen m-shell' "$WORK/phone.dom"
```

（headless Chrome 的 `--window-size=400,900` 實際給 500 寬；`isPhone(500, …)` 仍是手機。）

- [ ] **Step 6: Build 並跑完整驗證**

Run: `bash bin/verify.sh`（8197 被占用就 `FLAT_CHECK_PORT=8297 bash bin/verify.sh`）
Expected：`9 pass`；flat-check 段印出 `ok   400px: phone OS in the DOM`。

- [ ] **Step 7: 證明新的 flat-check 會紅，再還原**

```bash
# `&& false` rather than `= false`: noUnusedLocals would fail the build on the unused isPhone import.
sed -i '' 's/isPhone(window.innerWidth, window.innerHeight);$/isPhone(window.innerWidth, window.innerHeight) \&\& false;/' os/src/main.tsx
grep -n "^const phone" os/src/main.tsx            # Expected: ... isPhone(window.innerWidth, window.innerHeight) && false;
(cd os && npm run build) && (cd app && npm run build)
FLAT_CHECK_PORT=8297 bash tools/flat-check.sh      # Expected: FAIL 400px: phone OS in the DOM, exit 1
git checkout os/src/main.tsx
(cd os && npm run build) && (cd app && npm run build)
FLAT_CHECK_PORT=8297 bash tools/flat-check.sh      # Expected: all ok, exit 0
```

- [ ] **Step 8: 手機截圖，確認沒有東西被切掉**

```bash
MOBILE_SHOTS_STATES="m-showcase m-info m-home m-menu m-projects m-resume m-terminal m-games m-doom" \
  bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/A9"
```

Expected：每一行都是 `ok`（三種尺寸）。用 Read 工具打開 `390x844-m-showcase.png`、`844x390-m-showcase.png`、`390x844-m-home.png`、`390x844-m-menu.png`、`390x844-m-resume.png` 看：
- 390×844 卡片：不捲動就看得到名字、Software Engineer、Résumé 與 Projects 按鈕；Dock 七個圖示有標籤，Showcase 下有亮點。
- 844×390 卡片：兩欄（左：頭像、名字、按鈕；右：四行資訊），Dock 無標籤。
- m-home：桌布上 9 個圖示，最後是 Tommy HD 與 T 圖示的 About This Site；標題「Finder」。
- m-menu：T 選單打開，四個項目＋分隔線。
- m-resume：頁面圖滿寬、上方 Open PDF。
- Contact、Five Letters、Credits 的 CSS 修正在 Task A10，所以這一步不拍它們。`m-projects`、`m-info` 若出現 `CUT`，記下來：Task A10 之後必須變成 `ok`。任何 state 畫面空白或 console 有錯就停下。

- [ ] **Step 9: Commit**

```bash
git add os/src/mobile/MobileShell.tsx os/src/main.tsx os/index.html os/src/mobile/mobile.css tools/flat-check.sh
git commit -m "feat(os): start the phone shell on phones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A10: Finder、Contact、Five Letters、Credits、Showcase 的手機 CSS

**Files:**
- Modify: `os/src/mobile/mobile.css`（檔尾追加五段）

**Interfaces:**
- Consumes: 既有元件的 class：`.finder-info`（及其中的 `.aqua-btn` 返回鍵）、`.finder-grid`、`.finder-item`、`.finder-icon`、`.finder-name`、`.finder-sub`、`.proj-detail`、`.proj-links`、`.contact`、`.contact-head`、`.contact-row`、`.contact-actions`、`.hn`、`.hn-keys`、`.hn-keyrow`、`.hn-key`、`.hn-wide`、`.hn-restart`、`.cr`、`.cr-head`、`.cr-page`、`.cr-section`、`.cr-row`、`.sc-nav-item`、`.sc-home-links`、`.sc-big-btn`；Task A6 的 `.finder-list`。
- Produces: 只有 CSS；元件程式碼不動（規格 §3「不需改元件、只靠 mobile.css 修」）。

- [ ] **Step 1: 在 `os/src/mobile/mobile.css` 檔尾追加**

```css

/* Finder windows (Projects, Games, Tommy HD): a taller info bar so its back button is a full tap target; the count
   moves right so a long back button never covers it. */
.m-shell .finder-info { height: 48px; justify-content: flex-end; padding: 0 12px; font-size: 13px; }
.m-shell .finder-info .aqua-btn { left: 6px; top: 2px; height: 44px; padding: 0 14px; border-radius: 22px; font-size: 14px; }
/* Projects as a list (layout="list"): one project per row */
.m-shell .finder-grid.finder-list { display: block; padding: 0; }
.m-shell .finder-list .finder-item { width: 100%; min-height: 56px; display: grid; grid-template-columns: 40px minmax(0, 1fr); column-gap: 12px; align-items: center; padding: 6px 16px; border-bottom: 1px solid #e2e2e2; text-align: left; }
.m-shell .finder-list .finder-icon { grid-row: 1 / span 2; width: 40px; height: 40px; padding: 0; }
.m-shell .finder-list .finder-name { grid-column: 2; padding: 0; font-size: 16px; line-height: 21px; text-align: left; }
.m-shell .finder-list .finder-name:last-child { grid-row: 1 / span 2; }
.m-shell .finder-list .finder-sub { grid-column: 2; margin: 0; font-size: 12px; text-align: left; }
.m-shell .finder-list .finder-item.is-selected .finder-name { background: none; color: inherit; }
.m-shell .proj-detail { padding: 16px 16px 24px; }
.m-shell .proj-detail p { font-size: 16px; line-height: 23px; }
.m-shell .proj-links { flex-wrap: wrap; }
.m-shell .proj-links .aqua-btn { height: 44px; padding: 0 20px; border-radius: 22px; font-size: 15px; }

/* Contact: rows stack (label over value) so the long profile links fit; full-size buttons */
.m-shell .contact { padding: 16px; }
.m-shell .contact-head { align-items: flex-start; }
.m-shell .contact-head img { width: 48px; height: 48px; }
.m-shell .contact-row { flex-direction: column; padding: 6px 0; }
.m-shell .contact-row dt { width: auto; padding: 0; text-align: left; font-size: 12px; }
.m-shell .contact-row dd { overflow-wrap: anywhere; font-size: 16px; }
.m-shell .contact-row dd a { display: inline-flex; align-items: center; min-height: 44px; }
.m-shell .contact-actions .aqua-btn { flex: 1; height: 44px; border-radius: 22px; font-size: 16px; }

/* Five Letters: the ten-key row fits 360 px. Keys keep a 46 px height; their width is a tenth of the row, as on the
   phone's own keyboard. The game scrolls when the phone is sideways. */
.m-shell .hn { overflow-y: auto; padding: 8px 4px 16px; }
.m-shell .hn-keys { width: 100%; }
.m-shell .hn-keyrow { width: 100%; justify-content: center; gap: 4px; }
.m-shell .hn-key { flex: 1 1 0; min-width: 0; max-width: 40px; height: 46px; }
.m-shell .hn-key.hn-wide { flex-grow: 1.6; max-width: 60px; font-size: 14px; }
.m-shell .hn-restart { width: 160px; height: 44px; border-radius: 22px; }

/* Credits: the 600 px columns take the screen width, and the page scrolls */
.m-shell .cr { overflow-y: auto; }
.m-shell .cr-head { padding-top: 24px; }
.m-shell .cr-page { padding: 40px 16px 140px; }
.m-shell .cr-section { width: 100%; max-width: 600px; }
.m-shell .cr-row { gap: 12px; font-size: 15px; line-height: 20px; }

/* Showcase pages ("More Info…"): the 768 px rules in styles.css already stack the side column on an upright phone;
   here the page links and buttons become full tap targets. */
.m-shell .sc-nav-item { height: auto; margin-bottom: 0; }
.m-shell .sc-nav-item a, .m-shell .sc-home-links a { display: inline-flex; align-items: center; min-height: 44px; }
.m-shell .sc-big-btn { height: 44px; border-radius: 22px; }
```

- [ ] **Step 2: Build 並截圖**

```bash
(cd os && npm run build) && (cd app && npm run build)
MOBILE_SHOTS_STATES="m-info m-projects m-contact m-games m-fiveletters m-harddisk m-credits" \
  bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/A10"
```

Expected：全部 `ok`。打開圖檢查：
- `390x844-m-projects.png`：一列一個專案，資料夾圖示 40px，名稱下有灰色名次小字，右上「5 items」。
- `360x780-m-fiveletters.png`：三排鍵完整（QWERTYUIOP 一排塞得下），RET 與 DEL 較寬；鍵高 46px。
- `390x844-m-contact.png`：標籤在上、連結在下，長網址換行不超出；按鈕 44px。
- `390x844-m-credits.png`：欄寬等於螢幕寬，可捲動。
- `844x390-m-info.png`：844 寬大於 `styles.css` 的 768 media 規則，所以 Showcase 維持側欄版面；確認沒有被切（工具已檢查）。

- [ ] **Step 3: Commit**

```bash
git add os/src/mobile/mobile.css
git commit -m "fix(os): fit Contact, Five Letters, Credits and Showcase to phones" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A11: Part A 驗證、截圖、桌機比對、真 iPhone 檢查清單、PR

**Files:**
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: Task A1 的 `tools/mobile-shots.sh` 與 `$TMPDIR/mobile-shots/A-before`。
- Produces: 推上去的 `feat/mobile-layout` 與一個 PR（base `main`）。

- [ ] **Step 1: 完整驗證**

Run: `bash bin/verify.sh`（或 `FLAT_CHECK_PORT=8297 bash bin/verify.sh`）
Expected：`9 pass`。把輸出貼進 PR 描述。

- [ ] **Step 2: 全部截圖**

```bash
bash tools/fetch-dos-games.sh            # 遊戲檔不進 git；沒有它 m-doom 等只會顯示 js-dos 的 404 訊息
bash bin/verify.sh                       # 重新 build，把遊戲檔帶進 app/dist
bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/A-after"
```

Expected：15 個 state × 3 種尺寸全部 `ok`，外加 7 張桌機圖。

- [ ] **Step 3: 桌機 pixel 比對**

```bash
for f in "$TMPDIR"/mobile-shots/A-before/1440x900-*.png; do
  n="$(basename "$f")"
  if cmp -s "$f" "$TMPDIR/mobile-shots/A-after/$n"; then echo "same $n"; else echo "DIFF $n"; fi
done
```

Expected：7 行 `same`。有 `DIFF` 時，用 Read 工具並排打開兩張圖：唯一可接受的差異是 OS 選單列右上角的時鐘分鐘數（`Clock.tsx` 用真實時間）。其他任何差異都是 bug，停下回報。

- [ ] **Step 4: 更新 `docs/STATUS.md`**

在 `## 已完成（2026-10-04）` 標題下第一行插入（日期、commit 依實際填）：

```markdown
- 手機版 Part A（`feat/mobile-layout`）：短邊 ≤ 600px 的手機進 `/os/` 拿到 `MobileShell`（一次一個全螢幕 app、Dock 分頁列、T 選單含 View 3D Desk → `/?desk=1`）；Showcase 首頁是 About This Tommy 卡片；Résumé 顯示 `resume-p1.png`（`tools/resume-pages.sh`），點圖或 Open PDF 開原 PDF；Projects 列表點一下開；Contact／Five Letters／Credits／Showcase 用 `mobile.css` 修。規格 `docs/superpowers/specs/2026-10-05-mobile-layout-design.md`，計畫 `docs/superpowers/plans/2026-10-05-mobile-layout.md`。下一步 Part B（Terminal 指令按鈕）。
```

並把「**最後驗證**」那段開頭換成這次的結果（日期、branch、`9 pass`、手機截圖 45 張全 `ok`、桌機 7 張 `cmp` 相同或僅時鐘不同），舊內容以「再之前」接在後面（照該段既有寫法）。

- [ ] **Step 5: Commit、push、開 PR**

```bash
git add docs/STATUS.md
git commit -m "docs(status): record the phone layout part A" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
gh pr create --base main --head feat/mobile-layout --title "feat(os): phone layout, part A (shell, About card, resume image)" --body-file "$TMPDIR/mobile-pr-a.md"
```

`$TMPDIR/mobile-pr-a.md` 內容：做了什麼（規格 §1–§3）、`bin/verify.sh` 輸出、截圖結果、桌機比對結果、下面的真 iPhone 檢查清單（未勾），結尾一行 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`。

- [ ] **Step 6: 真 iPhone 檢查清單（交給使用者，headless 測不到）**

在 iPhone Safari 打開這個 PR 的 Cloudflare Pages 預覽網址；或在同一個 Wi-Fi 下 `cd app && npx vite preview --host --port 8400`，用 `http://<Mac 的區網 IP>:8400/`。

1. 打開 `/`：直接跳到 `/os/`（沒有載入 3D），直向第一屏看得到名字、Software Engineer、Résumé、Projects。
2. 轉橫向：卡片變兩欄；Dock 變小、無標籤；瀏海那一側的內容沒有被瀏海擋住。
3. 直向：頂部列在狀態列下面、Dock 在 Home 指示條上面（safe area）。
4. Résumé：頁面圖滿寬、可上下捲；點圖片 → Safari 的 PDF 檢視器打開，可雙指縮放、可分享下載；按返回回到 OS。Open PDF 按鈕同樣。
5. Projects：點一下就打開專案；返回鍵好按。從 Terminal 打 `open cookpilot` → 按 × → 點 Dock 的 Projects：看到列表，不是 CookPilot。
6. Contact 的連結、Five Letters 的鍵盤（RET、DEL）、Credits 捲動都正常。
7. T 選單 → View 3D Desk：留在 3D 場景（不會又跳回 `/os/`）；按返回回到 `/os/`。
8. Terminal：點一下黑色區域 → 鍵盤彈出、Dock 消失、輸入列在鍵盤正上方；收起鍵盤 → Dock 回來。捲動讓網址列伸縮、或雙指放大頁面時，Dock 不會消失。
9. Games → Doom：遊戲載入（Part A 還沒有螢幕按鍵）；按 × 回桌布圖示格，聲音停止。
10. T 選單 → Shut Down…：關機畫面跑完回到桌布圖示格；T 選單 → Restart：回到卡片。

- [ ] **Step 7: 等使用者回報 iPhone 檢查結果，通過後才合併**

```bash
gh pr merge --squash
```

合併後才開始 Part B。有問題就在 `feat/mobile-layout` 上修、重跑 Step 1–3。

---

# Part B — `feat/mobile-terminal-chips`（規格 §4）

分支：Part A 合併到 main 之後，從最新的 main 開 `feat/mobile-terminal-chips`。

**Part B 動到的檔案：**
- 修改：`os/src/terminal.ts`、`os/src/terminal.test.ts`、`os/src/components/Terminal.tsx`、`os/src/mobile/MobileShell.tsx`（一行）、`os/src/mobile/mobile.css`（追加一段）、`docs/STATUS.md`

開工前：

```bash
git checkout main && git pull && git status -sb
git checkout -b feat/mobile-terminal-chips
bash bin/verify.sh                               # Expected: 9 pass
MOBILE_SHOTS_STATES= bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/B-before"   # 桌機基準圖（7 張）
```

### Task B1: Terminal 指令按鈕清單（純資料，TDD）

**Files:**
- Modify: `os/src/terminal.ts`（`HOME_FILES` 之後加 `Chip`、`CHIPS`；`case 'cat'` 第一行）
- Test: `os/src/terminal.test.ts`（改兩行 import、檔尾加四個 test）

**Interfaces:**
- Consumes: `run(line: string, cwd: Cwd): ShellResult`、`type Cwd = '~' | '~/projects'`（既有）。
- Produces（Task B2 用）：
  - `export interface Chip { label: string; line: string; fill?: boolean }`
  - `export const CHIPS: Chip[]`：依序 `help`、`cat about`、`ls`、`cd projects`、`open …`、`resume`、`contact`、`clear`。
  - `run('cat ~/about', cwd)` 在任何資料夾都印出 `ABOUT`。

為什麼按鈕送的字和標籤不同：現有 `cat about` 只在 `~` 有效（`os/src/terminal.ts:52`），`cd projects` 在 `~/projects` 裡會報錯（`os/src/terminal.ts:48`）。按鈕沒有上下文，在 `~/projects` 裡按也要成功，所以 `cat about` 送 `cat ~/about`、`cd projects` 送 `cd ~/projects`（後者既有規則已支援）；標籤照規格不變。畫面上的 `% ` 那行顯示實際送出的字。

- [ ] **Step 1: 寫失敗的測試**

`os/src/terminal.test.ts` 開頭兩行 import，把：

```ts
import { prompt, run } from './terminal.ts';
import { EMAIL, PROJECTS } from './data/profile.ts';
```

換成：

```ts
import { CHIPS, prompt, run } from './terminal.ts';
import { ABOUT, EMAIL, PROJECTS } from './data/profile.ts';
```

檔尾加上：

```ts

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
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `node --test os/src/terminal.test.ts`
Expected: FAIL，`SyntaxError: The requested module './terminal.ts' does not provide an export named 'CHIPS'`

- [ ] **Step 3: 實作**

`os/src/terminal.ts`，把：

```ts
const HOME_FILES = ['about', 'projects/', 'resume.pdf'];
```

換成：

```ts
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
```

`case 'cat'` 裡，把：

```ts
      if (cwd === '~' && arg === 'about') return { out: [ABOUT], cwd };
```

換成：

```ts
      if ((cwd === '~' && arg === 'about') || arg === '~/about') return { out: [ABOUT], cwd };
```

- [ ] **Step 4: 跑測試，確認通過**

Run: `node --test os/src/terminal.test.ts`
Expected: 全部 pass（原有的測試加新的 4 個），`ℹ fail 0`。

- [ ] **Step 5: Commit**

```bash
git add os/src/terminal.ts os/src/terminal.test.ts
git commit -m "feat(os): add the phone Terminal command list" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B2: Terminal 下方的指令按鈕（可選 `chips`）

**Files:**
- Modify: `os/src/components/Terminal.tsx`
- Modify: `os/src/mobile/MobileShell.tsx`（`<Terminal>` 加 `chips`）
- Modify: `os/src/mobile/mobile.css`（檔尾追加「Terminal」段）

**Interfaces:**
- Consumes: Task B1 的 `CHIPS`、`type Chip`；Part A 的 `.kb-open`（鍵盤彈出時 Dock 隱藏、`--m-vh` 縮高）。
- Produces: `Terminal` 新的可選 prop `chips?: boolean`（預設 `false`，桌機 DOM 與行為不變）。`submit` 改成收一個 `line` 參數（元件內部函式，不對外）。

- [ ] **Step 1: 改 `os/src/components/Terminal.tsx`**

import，把：

```tsx
import { prompt, run, type Cwd, type ShellEffect } from '../terminal';
```

換成：

```tsx
import { CHIPS, prompt, run, type Chip, type Cwd, type ShellEffect } from '../terminal';
```

Props，把：

```tsx
  initial?: string[]; // ?shot=terminal: commands already typed
}
```

換成：

```tsx
  initial?: string[]; // ?shot=terminal: commands already typed
  chips?: boolean; // phone shell: command buttons under the shell, so it works without typing
}
```

函式簽名，把：

```tsx
export default function Terminal({ active, onEffect, initial = [] }: Props) {
```

換成：

```tsx
export default function Terminal({ active, onEffect, initial = [], chips = false }: Props) {
```

`submit` 與 return 開頭，把：

```tsx
  const submit = () => {
    const r = run(input, cwd);
    setInput('');
    if (r.effect && 'clear' in r.effect) return setState({ lines: [], cwd: r.cwd });
    setState({ lines: [...lines, `${prompt(cwd)} ${input}`, ...r.out], cwd: r.cwd });
    if (r.effect) onEffect(r.effect);
  };

  return (
    <div className="term" onMouseUp={() => window.getSelection()?.isCollapsed && field.current?.focus()}>
```

換成：

```tsx
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
```

Enter 的處理，把：

```tsx
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && submit()}
```

換成：

```tsx
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && submit(input)}
```

檔尾，把：

```tsx
      </div>
    </div>
  );
}
```

換成：

```tsx
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
```

（`chips` 為 false 時 return 的就是原本那個 `.term` 元素，桌機 DOM 一模一樣。）

- [ ] **Step 2: `os/src/mobile/MobileShell.tsx` 傳 `chips`**

把：

```tsx
            active={false}
            onEffect={(e) => {
```

換成：

```tsx
            active={false}
            chips
            onEffect={(e) => {
```

- [ ] **Step 3: 在 `os/src/mobile/mobile.css` 檔尾追加**

```css

/* Terminal with command buttons (Terminal.tsx, chips): the shell scrolls above two rows of Aqua pills. While the
   keyboard is up the Dock hides (.kb-open) and the pills sit right above the keyboard. */
.m-shell .term-box { height: 100%; display: flex; flex-direction: column; background: #101010; }
.m-shell .term-box .term { flex: 1; min-height: 0; height: auto; }
.m-shell .term-input input { font-size: max(16px, 1em); } /* below 16 px iOS zooms the page on focus */
.m-shell .term-chips {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 8px max(8px, env(safe-area-inset-right)) 8px max(8px, env(safe-area-inset-left));
  background: #2a2a2a;
  border-top: 1px solid #444;
}
.m-shell .term-chip {
  height: 44px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-radius: 22px;
  border: 1px solid #7d7d7d;
  background: linear-gradient(#ffffff, #f0f0f0 45%, #dcdcdc 50%, #f2f2f2);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  color: #000;
  font-family: var(--mono-font);
  font-size: 18px; /* VT323 runs small: 18 px reads like 14 px of the UI font */
}
.m-shell .term-chip:active { filter: brightness(0.85); }
@media (orientation: landscape) {
  .m-shell .term-chips { grid-template-columns: repeat(8, minmax(0, 1fr)); padding-top: 6px; padding-bottom: 6px; }
}
```

（`.term` 本來就是 19px，輸入框繼承 19px；`max(16px, 1em)` 是保險，日後有人調小 `.term` 字級時手機仍 ≥ 16px。）

- [ ] **Step 4: Build、截圖**

```bash
bash bin/verify.sh
MOBILE_SHOTS_STATES="m-terminal" bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/B2"
```

Expected：`9 pass`；三種尺寸 `ok`。打開圖：
- `390x844-m-terminal.png`：輸入列下方兩排、每排四顆膠囊（help、cat about、ls、cd projects / open …、resume、contact、clear），按鈕上方是黑色終端機。
- `844x390-m-terminal.png`：八顆一排。
- `360x780-m-terminal.png`：`cd projects` 沒有被切掉（最壞情況是省略號，不能超出）。

- [ ] **Step 5: 在瀏覽器實按一次（手機尺寸）**

先在背景起伺服器：`node tools/serve-log.mjs app/dist 8199 "$TMPDIR/b2-serve.log"`（Claude Code 用 `run_in_background`）。再用 Playwright MCP 瀏覽器（`mcp__playwright__browser_resize` 390×844 → `browser_navigate` 到 `http://127.0.0.1:8199/os/?shot=m-terminal`）：
1. 點 `cd projects`、再點 `cat about`：畫面依序出現 `tommy@imac ~ % cd ~/projects`、`tommy@imac projects % cat ~/about` 與自我介紹，沒有 `No such file`。
2. 點 `open …`：輸入框出現 `open `、游標在框內。
3. 點 `resume`：切到 Résumé app。
4. 桌機尺寸（1440×900）打開 `http://127.0.0.1:8199/os/?shot=terminal`：沒有膠囊按鈕；打 `help` Enter 照常運作。

結束後停掉那個背景伺服器。

- [ ] **Step 6: Commit**

```bash
git add os/src/components/Terminal.tsx os/src/mobile/MobileShell.tsx os/src/mobile/mobile.css
git commit -m "feat(os): show command buttons under the phone Terminal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B3: Part B 驗證、截圖、桌機比對、真 iPhone 檢查清單、PR

**Files:**
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: `$TMPDIR/mobile-shots/B-before`。
- Produces: 推上去的 `feat/mobile-terminal-chips` 與 PR。

- [ ] **Step 1: 完整驗證**

Run: `bash bin/verify.sh`
Expected：`9 pass`。

- [ ] **Step 2: 全部截圖並比對桌機**

```bash
bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/B-after"
for f in "$TMPDIR"/mobile-shots/B-before/1440x900-*.png; do
  n="$(basename "$f")"
  if cmp -s "$f" "$TMPDIR/mobile-shots/B-after/$n"; then echo "same $n"; else echo "DIFF $n"; fi
done
```

Expected：手機 45 張全部 `ok`；桌機 7 行 `same`（`DIFF` 只能是選單列時鐘，要開圖確認；`1440x900-os-terminal.png` 尤其要一模一樣）。

- [ ] **Step 3: 更新 `docs/STATUS.md`**

在 `## 已完成（2026-10-04）` 下第一行插入：

```markdown
- 手機版 Part B（`feat/mobile-terminal-chips`）：手機 Terminal 輸入列下方 8 顆指令按鈕（`CHIPS`，`os/src/terminal.ts`）；`cat about`／`cd projects` 按鈕送 `cat ~/about`／`cd ~/projects`，在任何資料夾都能用；`open …` 只填入 `open ` 並叫出鍵盤。下一步 Part C（遊戲虛擬按鍵，先 spike）。
```

並更新「**最後驗證**」開頭（同 Task A11 Step 4 的寫法）。

- [ ] **Step 4: Commit、push、開 PR**

```bash
git add docs/STATUS.md
git commit -m "docs(status): record the phone Terminal chips" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/mobile-terminal-chips
gh pr create --base main --head feat/mobile-terminal-chips --title "feat(os): phone Terminal command buttons, part B" --body-file "$TMPDIR/mobile-pr-b.md"
```

PR 描述：做了什麼（規格 §4）、`verify` 輸出、截圖與比對結果、下面的 iPhone 清單，結尾 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`。

- [ ] **Step 5: 真 iPhone 檢查清單（交給使用者）**

1. Terminal 不打字：依序按 `help`、`ls`、`cd projects`、`ls`、`cat about`、`clear`，每一個都有正確輸出、沒有錯誤訊息。
2. 按 `open …`：鍵盤彈出、輸入框是 `open `、頁面沒有被放大（字級 ≥ 16px）；Dock 消失，按鈕列貼在鍵盤正上方；打 `cookpilot` 按 return → 開到 CookPilot。
3. 鍵盤開著時按 `ls`：指令執行，鍵盤不會先收起來。
4. 收起鍵盤：Dock 回來、按鈕列回到 Dock 上方。
5. 橫向：按鈕變一排八顆，都按得到。

- [ ] **Step 6: 使用者確認後合併**

```bash
gh pr merge --squash
```

合併後才開始 Part C。

---

# Part C — `feat/mobile-game-keys`（規格 §5）

分支：Part B 合併到 main 之後，從最新的 main 開 `feat/mobile-game-keys`。

**Part C 動到的檔案：**
- 新增：`os/src/mobile/keyLayouts.ts`、`os/src/mobile/keyLayouts.test.ts`、`os/src/mobile/VirtualKeys.tsx`、`os/src/mobile/MobileGame.tsx`
- 修改：`os/src/components/DosGame.tsx`、`os/src/mobile/MobileShell.tsx`（import 與 `default:` 分支）、`os/src/mobile/mobile.css`（刪一行、追加一段）、`docs/STATUS.md`
- Spike（Task C1）只暫時改 `os/src/components/DosGame.tsx`，做完還原，不 commit。

開工前：

```bash
git checkout main && git pull && git status -sb
git checkout -b feat/mobile-game-keys
bash bin/verify.sh                               # Expected: 9 pass
bash tools/fetch-dos-games.sh                    # 遊戲檔（gitignored）；spike 和截圖都要
MOBILE_SHOTS_STATES= bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/C-before"
```

### Task C1: Spike——js-dos 給不給得到 `ci`

**Files:**
- 暫時修改: `os/src/components/DosGame.tsx`（做完 `git checkout` 還原）

**Interfaces:**
- Consumes: js-dos 8.5.1（`os/node_modules/js-dos/dist/js-dos.js`）：`Dos(el, options)` 會在模擬器啟動後以 `setTimeout` 呼叫 `options.onEvent('ci-ready', ci)`；`ci` 應有 `sendKeyEvent(code, pressed)` 與 `simulateKeyPress(...codes)`。js-dos 的鍵盤監聽掛在 **window** 上（規格 §5 寫 document，實際是 window），用 `e.keyCode` 換算，會略過 target 是文字輸入框的事件。
- Produces: 一個結論，決定 Task C3 用哪個版本：
  - **Variant A**（`ci` 拿得到且按鍵有效）：`send = (code, pressed) => ci.sendKeyEvent(code, pressed)`
  - **Variant B**（拿不到 `ci` 或 `sendKeyEvent` 無效，但合成事件有效）：對 `window` 送設好 `keyCode` 的合成 `KeyboardEvent`
  - 兩者都無效：停下，回報 blocker，不要繼續 C3 之後的 task。
  - 介面不變：`SendKey = (code: number, pressed: boolean) => void`，只有 `DosGame` 內部實作不同。

- [ ] **Step 1: 暫時加上 spike 用的 `onEvent`**

在 `os/src/components/DosGame.tsx` 的 `window.Dos(host.current!, { ... })` 選項裡，`mouseCapture: false,` 之後加：

```tsx
      // SPIKE (do not commit): does js-dos hand out its command interface?
      onEvent: (event: string, ci?: any) => {
        if (event !== 'ci-ready') return;
        const methods = ci ? Object.getOwnPropertyNames(Object.getPrototypeOf(ci)).join(',') : 'no-ci';
        document.documentElement.dataset.spike = methods;
        (window as any).spikeCi = ci;
      },
```

- [ ] **Step 2: Build 並在背景起伺服器**

```bash
(cd os && npm run build)
node tools/serve-log.mjs app/public 8302 "$TMPDIR/spike-serve.log"     # 背景執行（Claude Code: run_in_background）
```

（`os` 的 build 輸出在 `app/public/os/`，含 `games/` 與 `emulators/`；直接 serve `app/public` 就有 `/os/`。）

- [ ] **Step 3: 在瀏覽器確認 `ci` 與按鍵**

用 Playwright MCP 瀏覽器（桌機尺寸即可；DosGame 在桌機的 `?shot=dos-doom` 也會跑）：

1. `browser_navigate` → `http://127.0.0.1:8302/os/?shot=dos-doom`，等約 15 秒（Doom 標題畫面出現）。
2. `browser_evaluate`：

```js
() => ({
  spike: document.documentElement.dataset.spike,
  sendKeyEvent: typeof window.spikeCi?.sendKeyEvent,
  simulateKeyPress: typeof window.spikeCi?.simulateKeyPress,
})
```

Expected（Variant A 成立的前提）：`spike` 列出含 `sendKeyEvent` 的方法名，兩個 `typeof` 都是 `'function'`。

3. `browser_evaluate`：`() => { window.spikeCi.sendKeyEvent(256, true); setTimeout(() => window.spikeCi.sendKeyEvent(256, false), 80); }`，等 1 秒後 `browser_take_screenshot`。
   Expected：Doom 主選單（NEW GAME / OPTIONS / LOAD GAME …）出現。→ 結論 **Variant A**。
4. 只有 3 不成立時才做：重新整理頁面等 15 秒，`browser_evaluate`：

```js
() => {
  const key = (type) => {
    const e = new KeyboardEvent(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'keyCode', { get: () => 27 });
    window.dispatchEvent(e);
  };
  key('keydown');
  setTimeout(() => key('keyup'), 80);
}
```

   等 1 秒截圖。主選單出現 → 結論 **Variant B**。沒出現 → 停下回報。

- [ ] **Step 4: 還原、記錄結果**

```bash
git checkout os/src/components/DosGame.tsx
git status -sb                                   # Expected: 沒有任何修改
```

停掉 8302 的背景伺服器。把結論（A 或 B）、`spike` 的方法清單、截圖檔名寫進 `$TMPDIR/mobile-pr-c.md`（Task C5 的 PR 描述會用）。這個 task 沒有 commit。

### Task C2: 遊戲按鍵配置 `keyLayouts.ts`（TDD）

**Files:**
- Create: `os/src/mobile/keyLayouts.ts`
- Test: `os/src/mobile/keyLayouts.test.ts`

**Interfaces:**
- Consumes: `os/src/apps.ts` 的 `GAMES`（只在測試裡用，確認配置涵蓋所有遊戲）；`os/node_modules/js-dos/dist/js-dos.js`（測試讀取解析）。
- Produces（C3、C4 用）：
  - `export type SendKey = (code: number, pressed: boolean) => void`
  - `export const KBD: { space: 32; esc: 256; enter: 257; backspace: 259; right: 262; left: 263; down: 264; up: 265; leftctrl: 341 }`
  - `export interface VKey { label: string; code: number; wide?: boolean }`
  - `export interface GameLayout { dpad: boolean; keys: VKey[]; abc: boolean }`
  - `export type GameId = 'doom' | 'oregon' | 'scrabble'`（等於 `AppId` 裡的三個遊戲；`MobileShell` 的 `switch` 在 `default:` 裡 TypeScript 會把 `id` 收窄成這三個）
  - `export const LAYOUTS: Record<GameId, GameLayout>`
  - `export const DPAD: VKey[]`（Up、Left、Right、Down）
  - `export function charToKbd(ch: string): number | null`
  - `export function textToKeys(inputType: string, data: string | null): number[]`

js-dos 的 `KBD_*` 表在 minified bundle 裡長這樣：`{KBD_NONE:0,KBD_0:48,…,KBD_tab:Vs,…,KBD_leftctrl:Gs,…}`，少數值是別處定義的變數（`,Gs=341,`），測試要照名字查回數字。`bin/verify.sh` 的 unit tests 步驟（第 53 行）在 os build（第 58 行，會 `npm ci` 裝 `os/node_modules`）之前跑，所以全新 clone 第一次跑時檔案不存在：讀 js-dos 的兩個測試會 **skip** 並註明原因，不是 fail；之後每次都有 `os/node_modules`，會真的跑。

- [ ] **Step 1: 寫失敗的測試 `os/src/mobile/keyLayouts.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../apps.ts';
import { charToKbd, DPAD, KBD, LAYOUTS, textToKeys } from './keyLayouts.ts';

// js-dos's own key table, read from the installed package (not from keyLayouts.ts, which would only test itself).
// The minified bundle holds it as {KBD_NONE:0,KBD_0:48,...}; a few values are variables defined elsewhere in the
// file (KBD_leftctrl:Gs ... ,Gs=341,), so those are looked up by name.
const DIST = fileURLToPath(new URL('../../node_modules/js-dos/dist/js-dos.js', import.meta.url));
const skip = existsSync(DIST) ? false : 'os/node_modules is not installed (cd os && npm ci)';

function readKbdTable(): Map<string, number> {
  const src = readFileSync(DIST, 'utf8');
  const body = /\{(KBD_NONE:0,[^}]*)\}/.exec(src)?.[1];
  assert.ok(body, 'no KBD_NONE table in js-dos.js');
  const table = new Map<string, number>();
  for (const entry of body.split(',')) {
    const [name, value] = entry.split(':');
    let code = Number(value);
    if (Number.isNaN(code)) {
      const esc = value.replace(/\$/g, '\\$');
      const def = new RegExp(`[,;\\s]${esc}=(\\d+)[,;]`).exec(src);
      assert.ok(def, `js-dos.js does not define ${value} (${name})`);
      code = Number(def[1]);
    }
    table.set(name.replace(/^KBD_/, ''), code);
  }
  return table;
}

test('our KBD names have js-dos codes', { skip }, () => {
  const table = readKbdTable();
  for (const [name, code] of Object.entries(KBD)) assert.equal(table.get(name), code, name);
  for (const ch of 'abcdefghijklmnopqrstuvwxyz0123456789') assert.equal(table.get(ch), charToKbd(ch), ch);
});

test('every on-screen key sends a code that is in the js-dos table', { skip }, () => {
  const codes = new Set(readKbdTable().values());
  for (const [game, layout] of Object.entries(LAYOUTS)) {
    for (const k of [...layout.keys, ...(layout.dpad ? DPAD : [])]) assert.ok(codes.has(k.code), `${game} ${k.label}: ${k.code}`);
  }
});

test('one layout per DOS game in the Games folder', () => {
  assert.deepEqual(Object.keys(LAYOUTS).sort(), GAMES.map((g) => g.id).sort());
});

test('the layouts are the ones in the spec', () => {
  const labels = (id: keyof typeof LAYOUTS) => LAYOUTS[id].keys.map((k) => k.label);
  assert.deepEqual([LAYOUTS.doom.dpad, LAYOUTS.doom.abc], [true, false]);
  assert.deepEqual(labels('doom'), ['FIRE', 'USE', 'Enter', 'Esc']);
  assert.equal(LAYOUTS.doom.keys[0].code, KBD.leftctrl);
  assert.equal(LAYOUTS.doom.keys[1].code, KBD.space);
  assert.deepEqual([LAYOUTS.oregon.dpad, LAYOUTS.oregon.abc], [false, true]);
  assert.deepEqual(labels('oregon'), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Enter', 'Space', 'Esc']);
  assert.deepEqual([LAYOUTS.scrabble.dpad, LAYOUTS.scrabble.abc], [true, true]);
  assert.deepEqual(labels('scrabble'), ['Enter', 'Esc']);
});

test('typed characters become keys; others are dropped', () => {
  assert.equal(charToKbd('a'), 65);
  assert.equal(charToKbd('Z'), 90);
  assert.equal(charToKbd('0'), 48);
  assert.equal(charToKbd(' '), KBD.space);
  assert.equal(charToKbd('é'), null);
  assert.equal(charToKbd('.'), null);
});

test('the ABC field: each letter once, backspace deletes, autocorrect types nothing', () => {
  assert.deepEqual(textToKeys('insertText', 'T'), [84]);
  assert.deepEqual(textToKeys('insertText', 'ab'), [65, 66]);
  assert.deepEqual(textToKeys('insertText', 'é'), []);
  assert.deepEqual(textToKeys('insertText', null), []);
  assert.deepEqual(textToKeys('deleteContentBackward', null), [KBD.backspace]);
  assert.deepEqual(textToKeys('insertReplacementText', 'Tommy'), []);
  assert.deepEqual(textToKeys('insertCompositionText', 'a'), []);
});
```

- [ ] **Step 2: 跑測試，確認失敗**

Run: `node --test os/src/mobile/keyLayouts.test.ts`
Expected: FAIL，`ERR_MODULE_NOT_FOUND`（`Cannot find module '.../os/src/mobile/keyLayouts.ts'`）

- [ ] **Step 3: 實作 `os/src/mobile/keyLayouts.ts`**

```ts
// The on-screen keys for each DOS game (VirtualKeys.tsx). Pure data plus the text-to-key mapping, so node --test can
// check it. Codes are js-dos KBD_* codes (DOSBox's own, not DOM keyCodes); keyLayouts.test.ts reads js-dos's table
// from os/node_modules/js-dos/dist/js-dos.js and checks every code used here against it.

// What DosGame hands over once the emulator runs: press (true) or release (false) one KBD code.
export type SendKey = (code: number, pressed: boolean) => void;

export const KBD = {
  space: 32,
  esc: 256,
  enter: 257,
  backspace: 259,
  right: 262,
  left: 263,
  down: 264,
  up: 265,
  leftctrl: 341,
} as const;
// a–z are 65–90 and 0–9 are 48–57 in js-dos, the same as their ASCII upper case letters and digits.
const LETTER_A = 65;
const DIGIT_0 = 48;

export interface VKey {
  label: string;
  code: number;
  wide?: boolean; // takes two columns (Space, FIRE)
}

export interface GameLayout {
  dpad: boolean; // arrow keys on the left, held down to repeat
  keys: VKey[]; // the action keys on the right
  abc: boolean; // an ABC key that brings up the phone keyboard for typing names
}

export type GameId = 'doom' | 'oregon' | 'scrabble';

const digit = (n: number): VKey => ({ label: String(n), code: DIGIT_0 + n });

export const LAYOUTS: Record<GameId, GameLayout> = {
  doom: {
    dpad: true,
    keys: [
      { label: 'FIRE', code: KBD.leftctrl, wide: true },
      { label: 'USE', code: KBD.space },
      { label: 'Enter', code: KBD.enter },
      { label: 'Esc', code: KBD.esc },
    ],
    abc: false,
  },
  oregon: {
    dpad: false,
    keys: [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(digit),
      { label: 'Enter', code: KBD.enter },
      { label: 'Space', code: KBD.space, wide: true },
      { label: 'Esc', code: KBD.esc },
    ],
    abc: true,
  },
  scrabble: {
    dpad: true,
    keys: [
      { label: 'Enter', code: KBD.enter },
      { label: 'Esc', code: KBD.esc },
    ],
    abc: true,
  },
};

export const DPAD: VKey[] = [
  { label: 'Up', code: KBD.up },
  { label: 'Left', code: KBD.left },
  { label: 'Right', code: KBD.right },
  { label: 'Down', code: KBD.down },
];

// One typed character as a KBD code, or null for one the games cannot take. Upper and lower case are the same key:
// DOS games of this age read the key, not the case.
export function charToKbd(ch: string): number | null {
  if (/^[a-z]$/i.test(ch)) return LETTER_A + ch.toUpperCase().charCodeAt(0) - 65;
  if (/^[0-9]$/.test(ch)) return DIGIT_0 + Number(ch);
  if (ch === ' ') return KBD.space;
  return null;
}

// The keys for one `input` event on the ABC field (InputEvent.inputType and .data). VirtualKeys resets the field after
// every event, so each event carries new text only. Autocorrect's insertReplacementText is ignored: it would type a
// whole word again. Enter does not fire `input` on a one-line field; VirtualKeys handles it on keydown.
export function textToKeys(inputType: string, data: string | null): number[] {
  if (inputType === 'deleteContentBackward') return [KBD.backspace];
  if (inputType !== 'insertText' || !data) return [];
  return [...data].map(charToKbd).filter((c): c is number => c !== null);
}
```

- [ ] **Step 4: 跑測試，確認通過（且沒有 skip）**

Run: `node --test os/src/mobile/keyLayouts.test.ts`
Expected: `ℹ pass 6`、`ℹ skipped 0`、`ℹ fail 0`。

- [ ] **Step 5: 證明 js-dos 對照會紅，再還原**

把 `leftctrl: 341,` 暫時改成 `leftctrl: 17,`（DOM 的 keyCode，常見的錯），跑 `node --test os/src/mobile/keyLayouts.test.ts`。
Expected：`our KBD names have js-dos codes` 與 `every on-screen key ...` 失敗（`leftctrl`、`doom FIRE: 17`）。改回 `341`，再跑一次全過。

- [ ] **Step 6: Commit**

```bash
git add os/src/mobile/keyLayouts.ts os/src/mobile/keyLayouts.test.ts
git commit -m "feat(os): add the phone game key layouts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task C3: DosGame 交出送鍵函式（可選 `onReady`）

**Files:**
- Modify: `os/src/components/DosGame.tsx`

**Interfaces:**
- Consumes: Task C1 的結論；Task C2 的 `type SendKey`。
- Produces: `DosGame` 新的可選 prop `onReady?: (send: SendKey) => void`。桌機不傳，行為不變（Variant A 多一個 `onEvent` 選項，但 `ready.current` 是 `undefined`，什麼都不做；Variant B 也一樣）。`onReady` 用 ref 保存，所以父元件每次 render 傳新函式不會重啟模擬器。

- [ ] **Step 1（兩個版本共用）: import、props、ref**

把：

```tsx
import type { AppId } from '../apps';
```

換成：

```tsx
import type { AppId } from '../apps';
import type { SendKey } from '../mobile/keyLayouts';
```

把：

```tsx
// Unmounting stops the emulator, which also silences its audio (the hooks above close its AudioContext).
export default function DosGame({ id }: { id: AppId }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
```

換成：

```tsx
// Unmounting stops the emulator, which also silences its audio (the hooks above close its AudioContext).
// onReady (phone shell): called once the emulator runs, with a function that presses and releases keys in it.
export default function DosGame({ id, onReady }: { id: AppId; onReady?: (send: SendKey) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });
  useEffect(() => {
```

- [ ] **Step 2A（C1 結論是 Variant A 才做）: 用 `ci.sendKeyEvent`**

在 `declare global { ... }` 區塊之後加：

```tsx

// The part of js-dos's command interface (emulators.js) the phone's on-screen keys use. KBD codes, see keyLayouts.ts.
interface DosCi {
  sendKeyEvent: (code: number, pressed: boolean) => void;
}
```

把 `Dos(...)` 選項的結尾：

```tsx
      mouseCapture: false,
    });
```

換成：

```tsx
      mouseCapture: false,
      // js-dos 8.5.1 calls this with 'ci-ready' and the command interface once the emulator has started.
      onEvent: (event: string, ci?: DosCi) => {
        if (event === 'ci-ready' && ci) ready.current?.((code, pressed) => ci.sendKeyEvent(code, pressed));
      },
    });
```

- [ ] **Step 2B（C1 結論是 Variant B 才做）: 合成鍵盤事件**

在 `declare global { ... }` 區塊之後加：

```tsx

// Spike result: js-dos hands out no usable command interface, so keys are pressed the way a keyboard does. js-dos
// listens for keydown and keyup on window and reads keyCode; a synthetic event's keyCode is 0, so it is set here.
// DOM keyCodes for the KBD codes that differ (letters, digits and space are the same number in both).
const DOM_KEY: Record<number, number> = { 256: 27, 257: 13, 259: 8, 262: 39, 263: 37, 264: 40, 265: 38, 341: 17 };
const sendSynthetic: SendKey = (code, pressed) => {
  const e = new KeyboardEvent(pressed ? 'keydown' : 'keyup', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'keyCode', { get: () => DOM_KEY[code] ?? code });
  window.dispatchEvent(e);
};
```

把 `Dos(...)` 選項的結尾：

```tsx
      mouseCapture: false,
    });
```

換成：

```tsx
      mouseCapture: false,
    });
    // Keys pressed before the emulator has started are lost, which is harmless: the keys only matter in the game.
    ready.current?.(sendSynthetic);
```

- [ ] **Step 3: Build、確認桌機遊戲照常**

```bash
(cd os && npm run build)
node tools/serve-log.mjs app/public 8302 "$TMPDIR/c3-serve.log"     # 背景執行
```

Playwright MCP 瀏覽器（1440×900）開 `http://127.0.0.1:8302/os/?shot=dos-doom`，等 15 秒，截圖：Doom 標題畫面正常；用 `browser_press_key` 按 `Escape`：主選單出現（實體鍵盤路徑沒壞）。停掉伺服器。

- [ ] **Step 4: Commit**

```bash
git add os/src/components/DosGame.tsx
git commit -m "feat(os): let DosGame hand over a key sender when the emulator is ready" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task C4: 螢幕按鍵 VirtualKeys 與 MobileGame

**Files:**
- Create: `os/src/mobile/VirtualKeys.tsx`
- Create: `os/src/mobile/MobileGame.tsx`
- Modify: `os/src/mobile/MobileShell.tsx`（import、`default:` 分支）
- Modify: `os/src/mobile/mobile.css`（刪 Frame 段的 `.m-game` 一行；檔尾追加「DOS games」段）

**Interfaces:**
- Consumes: Task C2 `LAYOUTS`、`DPAD`、`KBD`、`textToKeys`、`type GameId`、`type SendKey`、`type VKey`；Task C3 `DosGame` 的 `onReady`；Part A 的 `.m-gaming`（橫向時隱藏 Dock）與 `.kb-open`。
- Produces:
  - `VirtualKeys(props: { game: GameId; send: SendKey | null })`：render 兩塊 `.m-vk-left`（有 D-pad 的遊戲才有）與 `.m-vk-right`；`send` 為 `null` 時按鍵 disabled。
  - `MobileGame(props: { id: GameId })`：`.m-game`（有 D-pad 時加 `has-dpad`）＝ `.m-game-screen`（DosGame）＋ VirtualKeys。
  - 「按住連發」的做法：pointerdown 送 press、pointerup／cancel／失去 capture 送 release，按住期間鍵一直是按下狀態（Doom 讀按鍵狀態，所以會一直走）。不用計時器重送。

- [ ] **Step 1: 寫 `os/src/mobile/VirtualKeys.tsx`**

```tsx
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { DPAD, KBD, LAYOUTS, textToKeys, type GameId, type SendKey, type VKey } from './keyLayouts';

interface Props {
  game: GameId;
  send: SendKey | null; // null until the emulator runs: the keys show, disabled
}

// Text glyphs, not emoji (U+FE0E), so iOS draws plain arrows.
const ARROW: Record<string, string> = { Up: '▲︎', Left: '◀︎', Right: '▶︎', Down: '▼︎' };
const SENTINEL = ' '; // the ABC field is never empty, or iOS sends no input event for backspace
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One on-screen key: pressed while the finger is down, so holding an arrow keeps Doom walking. Pointer capture keeps
// the release on this key even if the finger slides off it.
function Key({ k, send, className = '', children }: { k: VKey; send: SendKey | null; className?: string; children: ReactNode }) {
  const down = useRef(false);
  const press = (e: PointerEvent<HTMLButtonElement>) => {
    if (!send || down.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    down.current = true;
    send(k.code, true);
  };
  const release = () => {
    if (!send || !down.current) return;
    down.current = false;
    send(k.code, false);
  };
  return (
    <button
      type="button"
      className={`m-vk-key${k.wide ? ' is-wide' : ''}${className ? ' ' + className : ''}`}
      aria-label={k.label}
      disabled={!send}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

// ABC: focuses a hidden text field, which brings up the phone keyboard, and turns what is typed into key presses.
// js-dos ignores keys typed into a text field, so the letters reach the game only this way. Presses go one after
// another (40 ms down, 40 ms up), so a fast typist's letters arrive in order.
function Abc({ send }: { send: SendKey | null }) {
  const field = useRef<HTMLInputElement>(null);
  const queue = useRef(Promise.resolve());
  const type = (codes: number[]) => {
    if (!send) return;
    for (const c of codes) {
      queue.current = queue.current.then(async () => {
        send(c, true);
        await wait(40);
        send(c, false);
        await wait(40);
      });
    }
  };
  return (
    <>
      <button type="button" className="m-vk-key m-vk-abc" disabled={!send} onClick={() => field.current?.focus()}>
        ABC
      </button>
      <input
        ref={field}
        className="m-vk-text"
        defaultValue={SENTINEL}
        aria-label="Type into the game"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="enter"
        onInput={(e) => {
          const ev = e.nativeEvent as InputEvent;
          type(textToKeys(ev.inputType, ev.data));
          e.currentTarget.value = SENTINEL;
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          type([KBD.enter]);
        }}
      />
    </>
  );
}

// The on-screen keys for one DOS game (keyLayouts.ts): the D-pad on the left (games that have one), the action keys
// on the right. MobileGame places the two halves; mobile.css arranges them for upright and sideways.
export default function VirtualKeys({ game, send }: Props) {
  const layout = LAYOUTS[game];
  return (
    <>
      {layout.dpad && (
        <div className="m-vk-left">
          <div className="m-vk-dpad">
            {DPAD.map((k) => (
              <Key key={k.label} k={k} send={send} className={`m-vk-d-${k.label.toLowerCase()}`}>
                {ARROW[k.label]}
              </Key>
            ))}
          </div>
        </div>
      )}
      <div className="m-vk-right">
        {layout.keys.map((k) => (
          <Key key={k.label} k={k} send={send}>
            {k.label}
          </Key>
        ))}
        {layout.abc && <Abc send={send} />}
      </div>
    </>
  );
}
```

- [ ] **Step 2: 寫 `os/src/mobile/MobileGame.tsx`**

```tsx
import { useState } from 'react';
import DosGame from '../components/DosGame';
import VirtualKeys from './VirtualKeys';
import { LAYOUTS, type GameId, type SendKey } from './keyLayouts';

// A DOS game on a phone: the game and its on-screen keys. The keys stay disabled until DosGame reports the emulator
// running. Opening another app unmounts this, which stops the emulator and its sound (as minimising does on the iMac).
export default function MobileGame({ id }: { id: GameId }) {
  const [send, setSend] = useState<SendKey | null>(null);
  return (
    <div className={`m-game${LAYOUTS[id].dpad ? ' has-dpad' : ''}`}>
      <div className="m-game-screen">
        {/* setSend(() => fn): a function passed straight to setSend would be called as an updater. */}
        <DosGame id={id} onReady={(fn) => setSend(() => fn)} />
      </div>
      <VirtualKeys game={id} send={send} />
    </div>
  );
}
```

- [ ] **Step 3: `os/src/mobile/MobileShell.tsx` 改用 MobileGame**

刪掉這行 import：

```tsx
import DosGame from '../components/DosGame';
```

把：

```tsx
import HomeGrid from './HomeGrid';
```

換成：

```tsx
import HomeGrid from './HomeGrid';
import MobileGame from './MobileGame';
```

把：

```tsx
      default:
        // A DOS game. Opening anything else unmounts it, which stops the emulator and its sound.
        return (
          <div className="m-game">
            <DosGame id={id} />
          </div>
        );
```

換成：

```tsx
      default:
        // A DOS game with its on-screen keys. Opening anything else unmounts it, which stops the emulator and its sound.
        return <MobileGame id={id} />;
```

（`default:` 裡 `id` 已被收窄成 `'oregon' | 'doom' | 'scrabble'`，就是 `GameId`；`tsc` 會擋任何新增的 `AppId` 掉進這裡。）

- [ ] **Step 4: `os/src/mobile/mobile.css`**

刪掉 Frame 段的這一行（新的 `.m-game` 規則在檔尾）：

```css
.m-shell .m-game { height: 100%; background: #000; }
```

檔尾追加：

```css

/* DOS games (MobileGame.tsx, VirtualKeys.tsx). Upright: the game on top, a graphite key panel below, D-pad left and
   action keys right. Sideways: D-pad | game | action keys, and the Dock is hidden (.m-gaming, above). */
.m-shell .m-game {
  height: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas: 'screen screen' 'left right';
  background: linear-gradient(#45484c, #2b2d30);
}
.m-shell .m-game:not(.has-dpad) { grid-template-areas: 'screen screen' 'right right'; }
.m-shell .m-game-screen { grid-area: screen; min-height: 0; background: #000; }
.m-shell .m-game-screen .dos { height: 100%; }
.m-shell .m-vk-left { grid-area: left; display: flex; align-items: center; justify-content: center; padding: 10px 4px 10px 12px; }
.m-shell .m-vk-right { grid-area: right; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 8px; padding: 10px 12px; }
.m-shell .m-vk-dpad { display: grid; grid-template-columns: repeat(3, 52px); grid-template-rows: repeat(3, 52px); grid-template-areas: '. up .' 'left . right' '. down .'; gap: 2px; }
.m-shell .m-vk-d-up { grid-area: up; }
.m-shell .m-vk-d-left { grid-area: left; }
.m-shell .m-vk-d-right { grid-area: right; }
.m-shell .m-vk-d-down { grid-area: down; }
.m-shell .m-vk-key {
  min-width: 52px;
  height: 52px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid #151515;
  background: linear-gradient(#6c6f74, #4d5055 50%, #42454a);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 3px rgba(0, 0, 0, 0.5);
  color: #f2f2f2;
  font-size: 15px;
  font-weight: 700;
  touch-action: none; /* a held key must not scroll or zoom */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.m-shell .m-vk-key.is-wide { min-width: 112px; }
.m-shell .m-vk-key:active { background: #2c2e31; }
.m-shell .m-vk-key:disabled { opacity: 0.45; }
.m-shell .m-vk-dpad .m-vk-key { min-width: 0; height: auto; padding: 0; font-size: 20px; } /* fills its 52 px cell */
/* The ABC field: focusable (iOS will not focus display:none) but invisible; 16 px so iOS does not zoom on focus */
.m-shell .m-vk-text { position: absolute; left: 0; bottom: 0; width: 1px; height: 1px; padding: 0; border: 0; opacity: 0; font-size: 16px; }
@media (orientation: landscape) {
  .m-shell .m-game {
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 200px);
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: 'left screen right';
  }
  .m-shell .m-game:not(.has-dpad) { grid-template-columns: minmax(0, 1fr) minmax(0, 200px); grid-template-areas: 'screen right'; }
  /* 346 px of height under the top bar: Oregon's six rows of keys fit at 46 px */
  .m-shell .m-vk-key { height: 46px; }
  .m-shell .m-vk-right { gap: 6px; }
  .m-shell .m-vk-left { padding-left: max(12px, env(safe-area-inset-left)); }
  .m-shell .m-vk-right { padding-right: max(12px, env(safe-area-inset-right)); padding-bottom: max(10px, env(safe-area-inset-bottom)); }
}
```

- [ ] **Step 5: Build、截圖**

```bash
bash bin/verify.sh
MOBILE_SHOTS_STATES="m-doom m-oregon m-scrabble" bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/C4"
```

Expected：`9 pass`；9 張全 `ok`。打開圖：
- `390x844-m-doom.png`：上方遊戲畫面，下方石墨色面板：左 D-pad（▲◀▶▼），右 FIRE（寬）、USE、Enter、Esc；Dock 仍在（直向不隱藏）。
- `844x390-m-doom.png`：D-pad | 遊戲 | 動作鍵，沒有 Dock。
- `844x390-m-oregon.png`：遊戲 | 右欄 1–9、0、Enter、Space、Esc、ABC 六排全部看得到（最下面的 ABC 沒被切）。
- `360x780-m-oregon.png`：按鍵面板兩到三排，數字鍵都看得到。

- [ ] **Step 6: 在瀏覽器實按（手機尺寸）**

背景起 `node tools/serve-log.mjs app/dist 8199 "$TMPDIR/c4-serve.log"`。Playwright MCP 瀏覽器 `browser_resize` 390×844，開 `http://127.0.0.1:8199/os/?shot=m-doom`，等 15 秒：
1. 按鍵從灰（disabled）變亮（`send` 到了）。
2. 點 Esc：Doom 主選單出現；點 ▼ 再點 Enter：選單移動、進入下一層。
3. 開 `?shot=m-oregon`，等開頭畫面，點 ABC：隱藏輸入框取得 focus（`browser_evaluate` `() => document.activeElement?.className` 回 `m-vk-text`）；用 `browser_type` 打 `tom`：遊戲裡出現 TOM（或遊戲當下接受的字），每個字母一次。
停掉伺服器。

- [ ] **Step 7: Commit**

```bash
git add os/src/mobile/VirtualKeys.tsx os/src/mobile/MobileGame.tsx os/src/mobile/MobileShell.tsx os/src/mobile/mobile.css
git commit -m "feat(os): add on-screen keys to the phone DOS games" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task C5: Part C 驗證、截圖、桌機比對、真 iPhone 檢查清單、PR

**Files:**
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: `$TMPDIR/mobile-shots/C-before`；Task C1 寫的 `$TMPDIR/mobile-pr-c.md`。
- Produces: 推上去的 `feat/mobile-game-keys` 與 PR。

- [ ] **Step 1: 完整驗證**

Run: `bash bin/verify.sh`
Expected：`9 pass`（unit tests 內含 keyLayouts 的 6 個，沒有 skip）。

- [ ] **Step 2: 全部截圖並比對桌機**

```bash
bash tools/mobile-shots.sh "$TMPDIR/mobile-shots/C-after"
for f in "$TMPDIR"/mobile-shots/C-before/1440x900-*.png; do
  n="$(basename "$f")"
  if cmp -s "$f" "$TMPDIR/mobile-shots/C-after/$n"; then echo "same $n"; else echo "DIFF $n"; fi
done
```

Expected：手機 45 張全部 `ok`；桌機 7 行 `same`（`DIFF` 只能是時鐘分鐘數，開圖確認）。

- [ ] **Step 3: 更新 `docs/STATUS.md`**

在 `## 已完成（2026-10-04）` 下第一行插入：

```markdown
- 手機版 Part C（`feat/mobile-game-keys`）：Doom／Oregon Trail／Scrabble 在手機上有螢幕按鍵（`os/src/mobile/keyLayouts.ts`，鍵碼對照 js-dos 的 KBD 表測試）；送鍵走 <Variant A：js-dos `ci.sendKeyEvent` ／ Variant B：對 window 送合成 KeyboardEvent>（spike 結果）；ABC 叫出鍵盤打名字；橫向時 D-pad | 遊戲 | 動作鍵、Dock 隱藏。手機版三個 PR 完成。
```

（尖括號那段依 C1 結論二選一寫實際內容。）並更新「**最後驗證**」開頭。

- [ ] **Step 4: Commit、push、開 PR**

```bash
git add docs/STATUS.md
git commit -m "docs(status): record the phone game keys" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/mobile-game-keys
gh pr create --base main --head feat/mobile-game-keys --title "feat(os): on-screen keys for the phone DOS games, part C" --body-file "$TMPDIR/mobile-pr-c.md"
```

PR 描述（接在 C1 的 spike 紀錄後面）：做了什麼（規格 §5）、`verify` 輸出、截圖與比對、下面的 iPhone 清單，結尾 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`。

- [ ] **Step 5: 真 iPhone 檢查清單（交給使用者）**

1. Doom：按住 ▲ 一直往前走，放開就停；手指從按鍵滑出去也會停（不會卡住一直走）。
2. Doom：按住 FIRE 連續開火；USE 開門；同時按住 ▲ 和 FIRE（兩指）都有效。
3. 按住按鍵不會跳出放大鏡、選字或長按選單，頁面不會捲動或縮放。
4. Oregon Trail：數字鍵選選單；ABC → 鍵盤彈出、Dock 消失、按鍵面板在鍵盤上方；打名字每個字母只出現一次；倒退鍵刪字；return 送 Enter；自動修正不會把整個字再打一次。
5. Scrabble：方向鍵移動、Enter 確認、ABC 打字母。
6. 橫向：D-pad 在左、動作鍵在右、遊戲在中間、沒有 Dock；Oregon 右欄的 ABC 按得到；瀏海那側的按鍵沒被擋。
7. 按 × 或點 Dock 其他 app：遊戲聲音停止；再開遊戲會重新載入。

- [ ] **Step 6: 使用者確認後合併**

```bash
gh pr merge --squash
```

---

## 規格對照（自我檢查）

| 規格 | 任務 |
|---|---|
| 決定 1、6（保留 Aqua、另寫 MobileShell、`App.tsx`／`windows.ts`／`Window.tsx` 不動） | A9（只新增 `os/src/mobile/`；A6 只加可選 prop） |
| 決定 2（Terminal 與 Games 保留、補觸控） | Part B、Part C |
| 決定 3（Dock 常駐、開站進 Showcase、關 app 回桌布圖示格） | A4（`INITIAL`、`close`）、A8（MobileDock、HomeGrid）、A9 |
| 決定 4、§1（短邊 ≤ 600、平板走 3D、`?desk=1`） | A2、A3 |
| 決定 5（View 3D Desk） | A8（TopBar 連 `/?desk=1`）、A2 |
| 決定 7（頂部一條、無時鐘） | A8 |
| 決定 8、§3 Résumé（PDF 圖全寬＋開原 PDF、hash 測試、CREDITS 不改） | A5、A7 |
| 決定 9（橫向遊戲與鍵盤時隱藏 Dock） | A8（`.m-gaming`、`.kb-open` CSS）、A9（加 class、`--m-vh`） |
| 決定 10（Dock 標籤直向有橫向無、× 常駐、無 app 標題 Finder、Projects 列表點一下開） | A4（`titleOf`）、A6、A8、A10 |
| 決定 11、§3 AboutCard（V1 卡片、More Info → Showcase、× 回卡片） | A4（`moreInfo`、`close`）、A7、A9（`showPage('about')`） |
| §2（入口分流、iframe 永遠 App、`viewport-fit=cover`、`App.tsx:53` 不動） | A3、A9 |
| §3 不改元件只靠 CSS（Contact、Five Letters、Credits、Showcase） | A10 |
| §4（指令按鈕、送出走 submit、`open …` 只填入、字級 ≥ 16px、鍵盤時貼在鍵盤上） | B1、B2 |
| §5（spike、`send(key, pressed)`、三款配置、ABC、版面、unmount、Five Letters 不加） | C1–C4（Five Letters 不經過 MobileGame） |
| §6 單元測試五項 | A2、A3、A4、C2、A5 |
| §6 人工檢查（三種尺寸截圖、桌機 1440、真 iPhone） | A11、B3、C5 |
| §7 三個 PR 依序合併 | Part A／B／C 開頭與結尾 |
