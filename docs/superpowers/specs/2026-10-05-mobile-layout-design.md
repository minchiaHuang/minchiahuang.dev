# 手機版排版設計（2026-10-05）

設計稿：Figma `eDceUbam5oYe1EmYsYF8FS` 頁「06 Mobile」（66:2）。首頁定案 V1「About This Mac」（73:491）；V0、V2–V11 只是比稿，不實作。

## 目標
手機訪客現在拿到的是桌機視窗系統硬塞進窄螢幕：視窗疊在一起、半屏高、Résumé PDF 看不到、Contact 按鈕被切、Tommy HD 打不開、紅黃綠鈕 14px。
這次讓手機上的 OS 保留 Aqua 外觀，但用手機的方式操作：一次一個全螢幕 app、底部 Dock 當分頁列、所有點擊目標 ≥ 44pt。

成功標準：
- 390×844、360×780、844×390 三種尺寸下，每個 app 都完整可用，沒有橫向捲動、沒有被切掉的內容。
- 第一屏（不捲動）看得到名字、職稱、Résumé 與 Projects 的入口。
- Terminal 不打字也能用；Doom、Oregon Trail、Scrabble 能用螢幕按鍵玩。
- 桌機版（3D 場景、iframe 裡的 OS、寬螢幕直接開 `/os/`）行為完全不變。

## 已定案的決定
| # | 決定 |
|---|---|
| 1 | 方向 A：保留 Aqua，改成手機操作方式（不做手機 3D、不做一般捲動網頁）。 |
| 2 | Terminal 與 Games 都保留，補觸控輸入（指令按鈕、虛擬按鍵）。 |
| 3 | 導覽：Dock 常駐底部；開站先進 Showcase；關掉 app 回 Aqua 桌布圖示格。 |
| 4 | 手機判斷：螢幕短邊 ≤ 600px（直拿橫拿都算手機），平板走 3D。 |
| 5 | Apple 選單加「View 3D Desk」。 |
| 6 | 架構：另寫 `MobileShell`，共用各 app 內容元件；`windows.ts`、`Window.tsx`、`App.tsx` 不動。 |
| 7 | 頂部只有一條：左 ×、中 app 名稱、右 Apple「T」選單；手機不顯示時鐘。 |
| 8 | Résumé 只做 PDF 全寬＋點開原 PDF（Safari 內建檢視器縮放、下載），不做 HTML 文字版。 |
| 9 | 橫向開遊戲時隱藏 Dock；叫出鍵盤時隱藏 Dock。 |
| 10 | Dock 直向有小字標籤、橫向無；× 一直顯示；無 app 時標題為「Finder」；Projects 用列表、點一下開。 |
| 11 | Showcase 手機首頁 = V1 卡片（內容見下）；「More Info…」開現有 About/Experience 內容，× 回卡片。 |

## 1. 手機判斷與導向（`app/`）
- `app/src/flatMode.ts`：`shouldUseFlatOS` 改為 `!webgl || Math.min(width, height) <= PHONE_MAX_SHORT_SIDE`（600）。`FlatEnv` 加 `height`。
  - 影響：寬 601–768、高 > 600 的視窗（例如桌機把瀏覽器拉窄）從手機版改回 3D；手機橫拿（844×390）從 3D 改成手機版。
- 新增覆寫參數 `?desk=1`：有它就不導向（和 `SHOT` 一起判斷，`main.ts:140`）。「View 3D Desk」連到 `/?desk=1`。
  - 從 `/os/` 點過去是一般導覽（push），按返回會回到 `/os/`。
- `flatMode.test.ts` 更新：短邊規則（390×844、844×390、768×1024、600/601 邊界）、`?desk=1`。

## 2. OS 入口分流（`os/`）
- 新增 `os/src/phone.ts`：`isPhone(w, h) = Math.min(w, h) <= 600`，常數與 app 端同值（兩個 build 分開，各自測試，註解互相指向）。
- `os/src/main.tsx`：standalone（`window.parent === window`）且 `isPhone(innerWidth, innerHeight)` → render `<MobileShell/>`，否則 render 現有 `<App/>`。
  - 只在載入時判斷一次；轉向不換殼（短邊不變），桌機拉窗跨過門檻要重新整理才換——可接受。
  - iframe 裡（3D 場景的螢幕）永遠是 `<App/>`。
- `App.tsx:53` 的「≤768 就放大 Showcase」保留不動：手機不會再走到 `App`，它只剩寬 601–768 的 standalone 桌機視窗會用到。
- `os/index.html` viewport 加 `viewport-fit=cover`，手機殼用 `env(safe-area-inset-*)` 留邊。

## 3. MobileShell 結構
新資料夾 `os/src/mobile/`：

| 檔案 | 職責 |
|---|---|
| `state.ts` | 純 reducer：`{ current: AppId \| null, info: boolean }`。`open(id)`、`close()`（Showcase 在 More Info 時 close 回卡片，否則回桌面）、`moreInfo()`。遊戲 id 屬於 Games。 |
| `MobileShell.tsx` | 根元素 `<div class="screen m-shell">`（保留 `screen`，`tools/flat-check.sh` 檢查它）。持有 state、`showcasePage` / `projectReq` / `projectFilter` 三個 request（和 `App.tsx` 同樣的 `{…, n}` 形狀，自己一份，不和 `App` 共用）。讀 `?open=` / `?page=`（沿用 `remote.ts` 的 `parseOpenQuery`）。 |
| `TopBar.tsx` | 44pt 一條：× / 標題 / T 選單。T 選單項目：About This Site…、View 3D Desk、分隔線、Restart、Shut Down…。Restart 回 Showcase 卡片；Shut Down 沿用 `Shutdown.tsx`。選單用 click（不用 hover）。 |
| `MobileDock.tsx` | 7 個 Dock app（不含 Trash），圖示 ≥ 44pt，直向有標籤、橫向無；目前 app 下有亮點。不放大、不用 `Dock.tsx`。 |
| `HomeGrid.tsx` | 無 app 時的 Aqua 桌布＋圖示格：7 個 Dock app、Tommy HD、About This Site。點一下開。 |
| `AboutCard.tsx` | Showcase 手機首頁（V1）。 |
| `VirtualKeys.tsx` + `keyLayouts.ts` | 遊戲虛擬按鍵（見 §5）。 |
| `mobile.css` | 手機樣式，全部 scope 在 `.m-shell` 底下；由 `MobileShell` import。 |

- 版面：`.m-shell` 高度用 `100dvh`（不用 `100vh`，避免 iOS 網址列切到）；上 TopBar、中 app 區（自己捲動）、下 Dock。
- 鍵盤偵測：`visualViewport` 高度明顯小於 layout viewport 時加 `.kb-open`，隱藏 Dock。iOS 叫出鍵盤時 `100dvh` 不會變小，所以 `.kb-open` 時把 `visualViewport.height` 寫進 CSS 變數 `--m-vh`，`.m-shell` 改用它當高度，貼在鍵盤上方的東西才不會被蓋住。
- 橫向：`(orientation: landscape)` 時 Dock 縮小無標籤；`current` 是遊戲時隱藏 Dock。
- 內容元件沿用，桌機外觀不變；只加「可選」prop，預設值維持現行為：
  - `Projects`、`Games`、`HardDisk`：`tapToOpen?: boolean`（點一下開，取代雙擊）；`Projects` 另加 `layout?: 'grid' | 'list'`。
  - `Terminal`：`chips?: boolean`（見 §4）。
  - `DosGame`：`onReady?(send)`，把送鍵函式交給 `VirtualKeys`（見 §5）。
- 不需改元件、只靠 `mobile.css` 修：Contact（按鈕被切）、Five Letters（鍵盤縮到 360 寬）、Credits（固定 600px 寬改成滿版）、Showcase 的 About/Experience 頁（沿用現有 768 media 規則的直排版面）。

### Showcase 首頁：AboutCard（V1）
藍色 Aqua 桌布上一張「About This Tommy」視窗卡：
- T 圖示、`Min-Chia (Tommy) Huang`、`Software Engineer`、`full-stack, backend, AI & automation`
- 四行資訊（使用者 2026-10-05 確認）：
  - Based in — Sydney, Australia
  - Study — Master of IT, UTS · July 2027
  - Status — Open to part-time, casual or internship work
  - Latest — CookPilot · 1st place, ICON x Lyra Hackathon
- 按鈕：**Résumé**（藍、主要）→ Résumé app；Projects → Projects app；More Info… → `info=true`，顯示現有 `Showcase`（request page `about`，頂部導覽可切 Experience/Projects/Contact），× 回卡片；Contact → Contact app。
- 頁尾：`™ & © 2026 Min-Chia Huang · minchiahuang.dev`
- 四行資訊放在 `AboutCard.tsx` 的常數；不從其他檔案推導。

### Résumé
iOS Safari 不會在 `<object>` 裡顯示 PDF，所以手機版不用 `<object>`，改顯示預先轉好的頁面圖：
- `tools/resume-pages.sh`：用 macOS 內建 `qlmanage`/`sips` 把 `os/public/showcase/MinChia-Tommy-Huang-Resume.pdf`（目前 1 頁）轉成 `os/public/showcase/resume-p1.png`（寬 1240px），並寫 `resume-pages.json`（頁數＋PDF 的 sha256）。不需要新套件。
  - `qlmanage -t -s N` 的 N 是**長邊**：`-s 1240` 實測只得到 876×1240。A4 直式要用 `-s 1755` 才會是寬 1240（`-s 1754` 實測 1239）；腳本轉完用 `sips -g pixelWidth` 確認寬度。
  - `qlmanage` 只轉第 1 頁：腳本用 `mdls -name kMDItemNumberOfPages` 讀頁數，> 1 就報錯停下，不默默漏頁。Spotlight 沒索引過的檔案 `mdls` 會回 `(null)`，這時改用 PDFKit 讀頁數。
- 單元測試：PDF 的 sha256 必須等於 json 裡記的值——換了 PDF 沒重轉就紅。
- 手機 Résumé：圖片寬度貼齊螢幕、可捲動；上方 Open PDF 按鈕，點圖片也一樣，都是直接開原 PDF（一般導覽），由 Safari 內建的 PDF 檢視器縮放、下載。不做 app 內縮放（使用者 2026-10-05 決定）：iOS 的雙指縮放會放大整頁，TopBar 和 Dock 會跟著跑掉。
- `CREDITS.md` 不用改：`os/public/showcase/` 那一列已經涵蓋整個資料夾（自己的作品）。

## 4. Terminal 指令按鈕
`Terminal` 的 `chips` 為 true 時，在輸入列下方加兩排 Aqua 膠囊按鈕：`help`、`cat about`、`ls`、`cd projects`、`open …`、`resume`、`contact`、`clear`。
- 點一下：把指令當作輸入送出（走現有 submit 路徑，畫面上看得到 `% help` 這行）。按鈕上的字不變，但 `cat about` 和 `cd projects` 實際送出的是 `cat ~/about` 和 `cd ~/projects`，在 `~/projects` 裡按也不會失敗；`terminal.ts` 要補上 `~/about` 這種寫法，`open …` 例外：只填入 `open ` 並 focus 輸入框，叫出鍵盤讓人打專案名。
- 輸入框字級 ≥ 16px（避免 iOS 自動放大）。
- 鍵盤彈出時 Dock 隱藏，按鈕列貼在鍵盤上方。

## 5. 遊戲虛擬按鍵
**實作前先做 spike**：確認 js-dos 8.5.1 拿得到 `ci`（`simulateKeyPress` / `sendKeyEvent`）。dist 裡有 `onEvent` 和 `ci-ready` 事件，最可能的路是 `Dos(el, { onEvent: (event, ci) => { if (event === 'ci-ready') … } })`，spike 先試這條。拿不到的備案：對 `window` 送合成 `KeyboardEvent`（js-dos 的鍵盤監聽掛在 window 上）。spike 結果決定 `send` 的實作，介面不變：`send(key, pressed)`。

`keyLayouts.ts` 每款遊戲一份配置（純資料，可測）：

| 遊戲 | 按鍵 |
|---|---|
| Doom | 方向鍵 D-pad（按住連發）、FIRE = Ctrl、USE = Space、Enter、Esc |
| The Oregon Trail | 數字 0–9、Enter、Space、Esc、ABC（叫出鍵盤打名字） |
| Scrabble | 方向鍵、Enter、Esc、ABC |

- ABC：focus 一個隱藏的輸入框，監聽 `input` 事件逐字轉成 `send`（js-dos 會略過文字輸入框裡的按鍵，所以不能直接靠它）。
- 版面：直向時遊戲畫面在上、按鍵面板（深石墨色）在下；橫向時 D-pad 在左、動作鍵在右、遊戲畫面置中、Dock 隱藏。
- 切走遊戲就 unmount（和桌機「最小化就 unmount」一致）。
- Five Letters 已有螢幕鍵盤，不加 VirtualKeys。

## 6. 測試與驗證
單元測試（`node --test`，無新套件）：
- `app/src/flatMode.test.ts`：短邊規則與 `?desk=1`。
- `os/src/phone.test.ts`：`isPhone` 邊界。
- `os/src/mobile/state.test.ts`：open / close / moreInfo、遊戲歸屬、More Info 時 close 回卡片。
- `os/src/mobile/keyLayouts.test.ts`：每款遊戲配置用到的鍵碼，都要出現在 `os/node_modules/js-dos/dist/js-dos.js` 的 `KBD_*` 表裡（測試直接讀那個檔案解析，不和自己的常數比，免得變成套套邏輯）。
- Résumé 頁面圖 hash 測試。

`bin/verify.sh` 不改（AGENTS.md 規定）；`tools/flat-check.sh:44` 用 `grep -q 'class="screen"'` 比對，遇到 `class="screen m-shell"` 會失敗，所以 PR 1 要把這行改成直接檢查手機殼（先故意弄紅一次，確認這個檢查真的會擋）。

人工檢查：
- headless Chrome 在 390×844、360×780、844×390 截圖每個 app，對照 Figma 06 Mobile。
- 桌機 1440px 截圖確認 3D 場景與 iframe OS 不變。
- 使用者用真 iPhone Safari 看：軟鍵盤、safe area、Doom 按住連發、點 Résumé 圖片能開 PDF 並縮放（headless 測不到這些）。

## 7. 交付拆分
三個 PR，依序合併，每個 PR 合併後手機版都是可用狀態：
1. `feat/mobile-layout`（本 spec 也在這支）：§1、§2、§3（含 AboutCard、Résumé 圖、各 app 的 CSS 修正與 `tapToOpen`）。
2. `feat/mobile-terminal-chips`：§4。
3. `feat/mobile-game-keys`：§5（先 spike）。

## 不做
手機 3D 場景優化、平板專用版面、Résumé HTML 文字版、Showcase V0/V2–V11、`App.tsx` 與 `windows.ts` 的重構、刪除現有 768/520 media 規則。
