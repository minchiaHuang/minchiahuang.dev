# STATUS

**一句話**：iMac G3 改版（邦迪藍 iMac＋黑客松長桌、Mac OS X Aqua 風格 OS）已上線（2026-10-04，PR #25 → main d04463e），上線後的畫面問題已修（PR #27–#33，main b8e5a76）；內容改寫 B（黑客松標籤、Hackathons 資料夾、Showcase 專案目錄）已上線（2026-10-05，PR #36 → main 5c34c06），剩卡片縮圖；鍵盤聲換成 Apple M0118 真鍵盤錄音、音量減半（2026-10-05，PR #39 → main b68c3f9）。

**最後驗證**：2026-10-05 AEDT，`feat/mobile-shell`（手機版 Part A）：Part A 單元測試 24 pass（flatMode 8、phone 5、state 9、resume-pages 2）、`npm --prefix os run build`、`npm --prefix app run build`、`FLAT_CHECK_PORT=8297 bash tools/flat-check.sh` 全綠（未跑整套 verify.sh，由 merge queue 跑）；手機截圖 15 state × 3 尺寸共 45 張全 `ok`；桌機 1440×900 七張與基準圖比對，差異只在選單列時鐘（x1363–1411、y4–15）。2026-10-05 AEDT，PR #39 合併前 `bash bin/verify.sh` 綠（9 pass）；正式站 `/audio/keyboard/key_3.mp3` 與 PR 版相同，bundle 內鍵盤 `volume:.4`。再之前：2026-10-05 AEDT，main 5c34c06（PR #36）`bash bin/verify.sh` 綠（9 pass）；合併前 Playwright／Orca 瀏覽器實點 7 項全過（Hackathons 篩選、名次小字、選取反白、Games logo、卡片跳轉與返回、Terminal open、console 無錯）；正式站 /os/ bundle 已含新文字。再之前 `fix/camera-ignore-reduced-motion` `bash bin/verify.sh` 綠（9 pass）；headless Chrome 模擬 `prefers-reduced-motion: reduce`，idle 鏡頭 4 秒內有移動。再之前 `feat/imac-favicon` `FLAT_CHECK_PORT=8297 bash bin/verify.sh` 綠（9 pass；預設 8197 被 hackathon-tag worktree 的 vite preview 占用）。再之前 `fix/og-image` `bash bin/verify.sh` 綠（9 pass）。再之前 main b8e5a76（PR #33）合併前 `bash bin/verify.sh` 綠（9 pass）；正式站用真 GPU（headless Chrome `--use-angle=metal`）截 idle / desk / monitor / freecam 正常，罐子與螢幕不再閃。再之前 2026-10-04 AEDT，上線後 minchiahuang.dev 與 www、/os/、/models/shell.glb、/os/aqua/finder.png、履歷 PDF 皆 200，未知路徑 404，正式站 desk 截圖正常；合併前 `feat/imac-redesign` `bash bin/verify.sh` 綠（9 pass）。上一次 main：4f8f1a3 跑 `bash bin/verify.sh` 綠（9 pass）；minchiahuang.dev 與 www 跑計畫 4B.2 的 curl 檢查全過。

## 已完成（2026-10-04）
- 手機版 Part A（`feat/mobile-shell`，PR #42）：手機（寬 ≤ 600px，或觸控且高 ≤ 600px；使用者 2026-10-05 審查改掉原本的短邊規則，免得 1280×720 筆電視窗或開著 devtools 被當手機）進 `/os/` 拿到 `MobileShell`（一次一個全螢幕 app、Dock 分頁列、T 選單含 View 3D Desk → `/?desk=1`）；Showcase 首頁是 About This Tommy 卡片；Résumé 顯示 `resume-p1.png`（`tools/resume-pages.sh`），點圖或 Open PDF 開原 PDF；Projects 列表點一下開；Contact／Five Letters／Credits／Showcase 用 `mobile.css` 修。規格 `docs/superpowers/specs/2026-10-05-mobile-layout-design.md`，計畫 `docs/superpowers/plans/2026-10-05-mobile-layout.md`。下一步 Part B（Terminal 指令按鈕）。
- 鍵盤聲（2026-10-05，PR #39 → b68c3f9）：原本是 Kenney UI 的開關聲 `switch1`–`6`，換成 Freesound 680714（robni7，Apple M0118 ALPS 橘軸，CC0）切出的 6 下；`tools/make-audio.sh` 下載時核對 sha256、先解碼成 WAV 再切（MP3 內 seek 不準），重跑位元組相同。`AudioManager.ts` 鍵盤音量 0.8 → 0.4（使用者要求減半）。試過 676417（2002 Apple 鍵盤）後由使用者改選。
- 內容改寫 B：黑客松標籤（2026-10-05，PR #36 → 5c34c06）：黑客松是標籤不是分類（使用者選定）。`profile.ts` 加 `tag`、`hackathon`、`award`；LearnGuard、VaxAgent meta 補 2026（VaxAgent 為 HSIL Hackathon, Harvard (Sydney)）。Projects 資料夾名稱下有灰色名次字；Tommy HD › Hackathons 打開篩選後的 Projects（「◀ All projects」）；Showcase › Projects 頁頂 5 張文字目錄卡片，點了捲到該段，每段結尾「↑ Back to projects」；◀／↑ 加 U+FE0E 避免變 emoji。設計稿 Figma 頁「04 Content」區塊 50:519（B1b、B2、B3、B4a–d）。
- 鏡頭不再理會系統的「減少動態」（2026-10-05，`fix/camera-ignore-reduced-motion`）：PR #18 讓開了減少動態的電腦（Windows 動畫效果關閉、macOS 減少動態）鏡頭完全不動；使用者選擇跟參考網站一樣，所有訪客都有飄移、滑鼠視差與轉場動畫。
- favicon 換成 iMac G3 側面（2026-10-05，`feat/imac-favicon`）：Figma 頁「05 Logo」選定 A2（J 鼻子臉，使用者同意的 Apple 臉例外，記在 CREDITS.md）；`tools/make-icons.sh` 的 180px 改淺底 `#f2efe9`、留 16px 邊。
- og.jpg 重拍（2026-10-05，`fix/og-image`）：desk 鏡頭的 iMac G3＋Aqua OS，1200×630；`?shot=` 模式不再掛 Résumé 入口按鈕。順手把 STATUS 裡參考網站的網址改成「參考網站」（clean check 擋）。
- 上線後畫面修正（2026-10-04～05）：PR #27 拿掉螢幕玻璃上的 CRT 雜訊與邊緣陰影；PR #28 拿掉污漬層與側板；PR #29 `app/public/_headers` 讓 `/models/*` 每次重新驗證（舊光照圖配新模型造成房間顏色壞掉）；PR #30 拿掉整個視窗的底片顆粒 overlay（`Renderers.ts`）；PR #31 鏡頭變慢（進螢幕 3200 ms、出螢幕 1600 ms、遠景↔桌面 1400 ms；時間與參考網站原本相同，但 iMac 螢幕較小、放大倍數 4.7x 對 2.6x）；PR #32 隱藏烘焙的 `Screen` mesh（遠景與遮擋平面 z-fighting 成黑色條紋）；PR #33 相機 near 10 → 300（罐子標籤 0.5 mm 的貼面在遠景 z-fighting）。
- iMac G3 改版（整合分支 `feat/imac-redesign`，agent flow 三個 worker）：PR #23 Blender 場景重建（四人長桌、iMac G3＋鍵盤冰球滑鼠，半透明殼另出 `shell.glb` 不烘焙）；PR #22 OS 改 Mac OS X 10.0 Aqua（選單列、Dock、Projects/Résumé/Contact/Terminal/Games/Tommy HD，4:3 1024x768，Apple 原廠圖示與遊戲原廠 logo 進 git，使用者 2026-10-04 同意的授權例外，記在 CREDITS.md）；PR #24 app 整合（shell 即時 MeshPhysicalMaterial、iframe 1024x768、鏡頭重調、咖啡蒸氣與音效位置）。設計稿在 Figma eDceUbam5oYe1EmYsYF8FS 頁「03 OS Skins」（42:519 為定稿）。
- 2B entry-flow（PR #11 → 8eeb1c8）：入口按鈕、新鏡頭關鍵格、BIOS 文字。
- 螢幕斜三角修正（PR #13 → b6d9bfd）：玻璃疊層改沿螢幕法線偏移；CSS3D 遮擋平面往前 1 單位，避開烘焙 Screen mesh 的 z-fighting。
- 4A deploy-prep（PR #14 → 97aa363）：`404.html`、`_redirects`（舊網址 301，G7）、`tools/pages-check.sh`、`.node-version`、og.jpg、apple-touch-icon 補背景色、README 部署說明。
- 移除「How this site was built」視窗（PR #20 → 4f8f1a3）：桌面圖示、Showcase 首頁按鈕、場景入口按鈕、`?open=about-site`。
- 4B go-live：Pages 專案 `minchiahuang-dev`（自動部署 main）、repo 公開、`minchiahuang.dev` 與 `www` 指到 Pages（原 GitHub Pages 的 A/AAAA 與 www CNAME 已換掉）；舊 repo `minchiaHuang.github.io` 的 CNAME 已移除（該 repo PR #2）。
- Phase 2 結尾預覽圖：`~/Desktop/Projects/minchiahuang.dev-previews/phase2-2026-10-04/`（app 截圖為修正後重拍）。

## 已知問題
- 改版只在 headless Chrome（SwiftShader）看過：真 GPU 上半透明殼的排序、hover 縮放、滑鼠座標換算、入場動畫都還沒在真瀏覽器確認；Résumé 視窗內嵌 PDF 與 DOS 遊戲啟動也待真瀏覽器確認。
- 正式網域 `/models/*.webp` 仍回 `max-age=14400`：Cloudflare 網域的 Browser Cache TTL（4 小時）蓋過 `_headers`（pages.dev 已是 `max-age=0`）。要在 Cloudflare 後台 Caching → Browser Cache TTL 改成 Respect Existing Headers（使用者操作）。
- OS 的 Credits 視窗還寫「Monitor glass & noise」，雜訊層已拿掉；`app/public/textures/monitor/shadow.png`、`smudges.png` 已無程式使用（是否刪除待使用者決定）。
- iframe 仍有 `jitter` CSS 動畫（`app/src/style.css:150`，每 0.3 秒次像素抖動）；測過不會產生顆粒，是否拿掉待使用者決定。
- `blender/preview/main.js` 的 VIEWS 還是舊鏡頭數字（註解說要和 Camera.ts 一致）。
- 遠端分支 `chore/os-aqua-screenshots` 只放 PR #22 截圖，可由使用者刪除。
- `/favicon.ico` 回 404（`/os/` 頁瀏覽器會去要）。
- `gh pr merge --squash` 的 commit 作者是個人 Gmail（已公開在歷史中）；要在 GitHub Settings → Emails 勾「Keep my email addresses private」，之後的 merge 才會用 noreply。
- `os/public/showcase/ve-room-night.jpg` 已沒有頁面使用，先保留。
- Dock 在已開啟且在最前面的視窗上再點一次，畫面沒有變化（`windows.ts` 只提高 z-index）；實測 512 次點擊都有命中，不是 bug。要不要加 Dock 圖示彈跳回饋待使用者決定。
- 沒在真 GPU 瀏覽器確認過斜角看螢幕時遮擋平面邊緣（只看過 headless Chrome）。

## 下一步
1. 使用者在 https://minchiahuang.dev 用真瀏覽器檢查（入場動畫、螢幕點擊、Résumé PDF、DOS 遊戲、半透明殼），有問題再開修正 PR。
2. 使用者補 LearnGuard、VaxAgent、Datathon 的截圖（自己的作品，橫式、高約 180–240px 為佳），再把 5 張縮圖（56×56）放進 Showcase 目錄卡片（`Showcase.tsx` 卡片內已留註解位置），新圖補 CREDITS.md。
3. Phase 3 AI 道具（選做）。
