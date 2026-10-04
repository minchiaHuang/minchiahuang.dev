# STATUS

**一句話**：Phase 1 完成；Phase 2 的 2A 已合（350bdab），2B（PR #11）正在 merge main 後重驗。

**最後驗證**：2026-10-04 AEDT，merge 後在全新 clone 跑 `bash bin/verify.sh` 綠（8 pass，pages 404 check SKIP），unit tests 32/32。

## 進行中
- PR #11 entry-flow（2B）：worker 正在把 origin/main merge 進分支（不 rebase、不 force-push），用壓縮後的真模型重做 `?shot=idle` 與「點 Résumé」檢查。

## 已知問題
- 部署 build 必須在根目錄跑 `npm run build`（會先跑 `tools/compress.mjs`），只跑 app build 時 `app/public/models/` 是空的，網站會退回平面 OS。Phase 4 處理。
- `apple-touch-icon.png` 四角透明，iOS 會顯示黑角；4A 補背景色。
- `make-icons.sh` 還沒用正式的 `tools/shoot.sh` 重跑過。
- 螢幕雜訊 shader 只確認能 build，畫面還沒人看過；Phase 2 結尾預覽圖會看到。
- `os/public/showcase/ve-room-night.jpg` 已沒有頁面使用，先保留。

## 下一步
1. PR #11 回到 in-review 後審查，乾淨 worktree 跑 `bash bin/verify.sh`，綠了用 `gh pr merge --squash` 合（已改為無 queue 模式）。
2. Phase 2 結尾預覽圖（Task R），不等使用者，存好後直接開 Phase 4A。
3. Phase 4A deploy-prep：一個 worker。
4. Phase 4B：Cloudflare、repo 公開、DNS，每項都要使用者明確同意。
5. Phase 3 AI 道具：上線後再說。
