# STATUS

**一句話**：v2 已上線（2026-10-04，https://minchiahuang.dev 與 www，Cloudflare Pages 專案 `minchiahuang-dev`）；下一步是改版：3D 造型、OS 外觀、內容。

**最後驗證**：2026-10-04 AEDT，main 4f8f1a3 跑 `bash bin/verify.sh` 綠（9 pass）；minchiahuang.dev 與 www 跑計畫 4B.2 的 curl 檢查全過。

## 已完成（2026-10-04）
- 2B entry-flow（PR #11 → 8eeb1c8）：入口按鈕、新鏡頭關鍵格、BIOS 文字。
- 螢幕斜三角修正（PR #13 → b6d9bfd）：玻璃疊層改沿螢幕法線偏移；CSS3D 遮擋平面往前 1 單位，避開烘焙 Screen mesh 的 z-fighting。
- 4A deploy-prep（PR #14 → 97aa363）：`404.html`、`_redirects`（舊網址 301，G7）、`tools/pages-check.sh`、`.node-version`、og.jpg、apple-touch-icon 補背景色、README 部署說明。
- 移除「How this site was built」視窗（PR #20 → 4f8f1a3）：桌面圖示、Showcase 首頁按鈕、場景入口按鈕、`?open=about-site`。
- 4B go-live：Pages 專案 `minchiahuang-dev`（自動部署 main）、repo 公開、`minchiahuang.dev` 與 `www` 指到 Pages（原 GitHub Pages 的 A/AAAA 與 www CNAME 已換掉）；舊 repo `minchiaHuang.github.io` 的 CNAME 已移除（該 repo PR #2）。
- Phase 2 結尾預覽圖：`~/Desktop/Projects/minchiahuang.dev-previews/phase2-2026-10-04/`（app 截圖為修正後重拍）。

## 已知問題
- og.jpg 左下角帶到頁面上的兩個入口按鈕（小瑕疵；現在只剩一個按鈕，重拍 og.jpg 時一起處理）。
- `/favicon.ico` 回 404（`/os/` 頁瀏覽器會去要）。
- `gh pr merge --squash` 的 commit 作者是個人 Gmail（已公開在歷史中）；要在 GitHub Settings → Emails 勾「Keep my email addresses private」，之後的 merge 才會用 noreply。
- `os/public/showcase/ve-room-night.jpg` 已沒有頁面使用，先保留。
- 沒在真 GPU 瀏覽器確認過斜角看螢幕時遮擋平面邊緣（只看過 headless Chrome）。

## 下一步
1. 改版（Figma 檔 eDceUbam5oYe1EmYsYF8FS「Tommy-Huang」）：參考頁（參考網站截圖）、3D 候選 8 款都已放上。使用者偏好 iMac G3 半透明蛋殼＋同款鍵盤滑鼠，色彩版渲染中；選定後寫實作計畫（半透明殼無法烘焙，three.js 需即時透明材質）。
2. 之後：OS 外觀候選（03 OS Skins）、內容對照與改寫（04 Content，Projects 加 Hackathon 分類）。
3. Phase 3 AI 道具（選做）。
