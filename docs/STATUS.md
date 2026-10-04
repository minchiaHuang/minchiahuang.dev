# STATUS

**一句話**：iMac G3 改版（邦迪藍 iMac＋黑客松長桌、Mac OS X Aqua 風格 OS）已在整合分支 `feat/imac-redesign` 完成，等使用者確認後合進 main 上線；之後是內容改寫。

**最後驗證**：2026-10-04 AEDT，`feat/imac-redesign` 560fe03 跑 `bash bin/verify.sh` 綠（9 pass）。上一次 main：4f8f1a3 跑 `bash bin/verify.sh` 綠（9 pass）；minchiahuang.dev 與 www 跑計畫 4B.2 的 curl 檢查全過。

## 已完成（2026-10-04）
- iMac G3 改版（整合分支 `feat/imac-redesign`，agent flow 三個 worker）：PR #23 Blender 場景重建（四人長桌、iMac G3＋鍵盤冰球滑鼠，半透明殼另出 `shell.glb` 不烘焙）；PR #22 OS 改 Mac OS X 10.0 Aqua（選單列、Dock、Projects/Résumé/Contact/Terminal/Games/Tommy HD，4:3 1024x768，Apple 原廠圖示與遊戲原廠 logo 進 git，使用者 2026-10-04 同意的授權例外，記在 CREDITS.md）；PR #24 app 整合（shell 即時 MeshPhysicalMaterial、iframe 1024x768、鏡頭重調、咖啡蒸氣與音效位置）。設計稿在 Figma eDceUbam5oYe1EmYsYF8FS 頁「03 OS Skins」（42:519 為定稿）。
- 2B entry-flow（PR #11 → 8eeb1c8）：入口按鈕、新鏡頭關鍵格、BIOS 文字。
- 螢幕斜三角修正（PR #13 → b6d9bfd）：玻璃疊層改沿螢幕法線偏移；CSS3D 遮擋平面往前 1 單位，避開烘焙 Screen mesh 的 z-fighting。
- 4A deploy-prep（PR #14 → 97aa363）：`404.html`、`_redirects`（舊網址 301，G7）、`tools/pages-check.sh`、`.node-version`、og.jpg、apple-touch-icon 補背景色、README 部署說明。
- 移除「How this site was built」視窗（PR #20 → 4f8f1a3）：桌面圖示、Showcase 首頁按鈕、場景入口按鈕、`?open=about-site`。
- 4B go-live：Pages 專案 `minchiahuang-dev`（自動部署 main）、repo 公開、`minchiahuang.dev` 與 `www` 指到 Pages（原 GitHub Pages 的 A/AAAA 與 www CNAME 已換掉）；舊 repo `minchiaHuang.github.io` 的 CNAME 已移除（該 repo PR #2）。
- Phase 2 結尾預覽圖：`~/Desktop/Projects/minchiahuang.dev-previews/phase2-2026-10-04/`（app 截圖為修正後重拍）。

## 已知問題
- 改版只在 headless Chrome（SwiftShader）看過：真 GPU 上半透明殼的排序、hover 縮放、滑鼠座標換算、入場動畫都還沒在真瀏覽器確認；Résumé 視窗內嵌 PDF 與 DOS 遊戲啟動也待真瀏覽器確認。
- 螢幕上的雜訊與污漬層強度沿用舊 CRT，近看 OS 文字略糊，可再調淡。
- `blender/preview/main.js` 的 VIEWS 還是舊鏡頭數字（註解說要和 Camera.ts 一致）。
- 遠端分支 `chore/os-aqua-screenshots` 只放 PR #22 截圖，可由使用者刪除。
- og.jpg 左下角帶到頁面上的兩個入口按鈕（小瑕疵；現在只剩一個按鈕，重拍 og.jpg 時一起處理）。
- `/favicon.ico` 回 404（`/os/` 頁瀏覽器會去要）。
- `gh pr merge --squash` 的 commit 作者是個人 Gmail（已公開在歷史中）；要在 GitHub Settings → Emails 勾「Keep my email addresses private」，之後的 merge 才會用 noreply。
- `os/public/showcase/ve-room-night.jpg` 已沒有頁面使用，先保留。
- 沒在真 GPU 瀏覽器確認過斜角看螢幕時遮擋平面邊緣（只看過 headless Chrome）。

## 下一步
1. 使用者在 Cloudflare Pages 的 `feat/imac-redesign` 預覽網址用真瀏覽器檢查（入場動畫、螢幕點擊、Résumé PDF、DOS 遊戲、半透明殼），沒問題就合併「feat/imac-redesign → main」的 PR 上線。
2. 上線後重拍 og.jpg（順便解決左下角入口按鈕的舊瑕疵）。
3. 內容改寫（Figma 04 Content）：Projects 加 Hackathon 分類，補 Tommy HD 裡的 Hackathons 資料夾。
4. Phase 3 AI 道具（選做）。
