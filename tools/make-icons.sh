#!/usr/bin/env bash
# tools/make-icons.sh — renders app/public/images/favicon.svg to the PNG sizes browsers ask for.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
IMG="$ROOT/app/public/images"
WORK="${TMPDIR:-/tmp}/minchiahuang.dev-icons"
mkdir -p "$WORK"
# The 180 px icon gets an opaque light background (iOS fills transparent corners with black, which
# would swallow the logo's black outline) and padding so iOS's rounded corners don't clip it.
# 32 px stays transparent and edge to edge for browser tabs.
for size in 32 180; do
  bg=transparent; pad=0; [ "$size" = 180 ] && bg='#f2efe9' && pad=16
  printf '<!doctype html><style>html,body{margin:0;background:%s}img{width:%dpx;height:%dpx;margin:%dpx;display:block}</style><img src="file://%s">' \
    "$bg" "$((size - 2 * pad))" "$((size - 2 * pad))" "$pad" "$IMG/favicon.svg" > "$WORK/icon-$size.html"
  bash "$ROOT/tools/shoot.sh" "file://$WORK/icon-$size.html" "$WORK/icon-$size.png" 1000 "$size" "$size" >/dev/null
done
mv "$WORK/icon-32.png" "$IMG/favicon-32.png"
mv "$WORK/icon-180.png" "$IMG/apple-touch-icon.png"
ls -l "$IMG"
