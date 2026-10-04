# STATUS

**一句話**：Phase 1、2、4A 完成（main 97aa363）；下一步是 Phase 4B 上線，每一項都要使用者同意。

**最後驗證**：2026-10-04 AEDT，main 97aa363 跑 `bash bin/verify.sh` 綠（9 pass，pages 404 check 已啟用）。

## 已完成（2026-10-04）
- 2B entry-flow（PR #11 → 8eeb1c8）：入口按鈕、新鏡頭關鍵格、BIOS 文字。
- 螢幕斜三角修正（PR #13 → b6d9bfd）：玻璃疊層改沿螢幕法線偏移；CSS3D 遮擋平面往前 1 單位，避開烘焙 Screen mesh 的 z-fighting。
- 4A deploy-prep（PR #14 → 97aa363）：`404.html`、`_redirects`（舊網址 301，G7）、`tools/pages-check.sh`、`.node-version`、og.jpg、apple-touch-icon 補背景色、README 部署說明。
- Phase 2 結尾預覽圖：`~/Desktop/Projects/minchiahuang.dev-previews/phase2-2026-10-04/`（app 截圖為修正後重拍）。

## 已知問題
- og.jpg 左下角帶到頁面上的兩個入口按鈕（小瑕疵，不擋上線）。
- `os/public/showcase/ve-room-night.jpg` 已沒有頁面使用，先保留。
- 沒在真 GPU 瀏覽器確認過斜角看螢幕時遮擋平面邊緣（只看過 headless Chrome）。

## 下一步
1. Phase 4B（計畫 2611 行起）：Cloudflare Pages 建專案、repo 公開、DNS 切換。每項先給使用者看步驟，同意後才做。
   Pages 設定：build `bash tools/fetch-dos-games.sh && npm run build`，output `app/dist`。
2. 上線後：Phase 3 AI 道具（選做）。
