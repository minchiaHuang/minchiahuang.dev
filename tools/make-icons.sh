#!/usr/bin/env bash
# tools/make-icons.sh — renders app/public/images/favicon.svg to the PNG sizes browsers ask for.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
IMG="$ROOT/app/public/images"
WORK="${TMPDIR:-/tmp}/minchiahuang.dev-icons"
mkdir -p "$WORK"
# The 180 px icon gets an opaque background: iOS fills transparent corners with black. 32 px stays
# transparent for browser tabs. #0c1210 is the favicon's screen colour and the page's theme-color.
for size in 32 180; do
  bg=transparent; [ "$size" = 180 ] && bg='#0c1210'
  printf '<!doctype html><style>html,body{margin:0;background:%s}img{width:%dpx;height:%dpx;image-rendering:pixelated;display:block}</style><img src="file://%s">' \
    "$bg" "$size" "$size" "$IMG/favicon.svg" > "$WORK/icon-$size.html"
  bash "$ROOT/tools/shoot.sh" "file://$WORK/icon-$size.html" "$WORK/icon-$size.png" 1000 "$size" "$size" >/dev/null
done
mv "$WORK/icon-32.png" "$IMG/favicon-32.png"
mv "$WORK/icon-180.png" "$IMG/apple-touch-icon.png"
ls -l "$IMG"
