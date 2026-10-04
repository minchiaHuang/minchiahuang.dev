#!/usr/bin/env bash
#
# tools/shoot.sh — one headless Chrome screenshot with software WebGL (SwiftShader).
#   bash tools/shoot.sh <url> <out.png> [wait-ms=8000] [width=1440] [height=900]
# Each run gets its own profile under $TMPDIR (left in place; rm -rf is blocked), so parallel runs
# don't collide on Chrome's SingletonLock. Headless Chrome sometimes keeps running after writing
# the file, so it is stopped once the file exists or on timeout.
set -euo pipefail
url="${1:?usage: tools/shoot.sh <url> <out.png> [wait-ms] [width] [height]}"
out="${2:?usage: tools/shoot.sh <url> <out.png> [wait-ms] [width] [height]}"
wait_ms="${3:-8000}"
width="${4:-1440}"
height="${5:-900}"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "${TMPDIR:-/tmp}/minchiahuang.dev-chrome" "$(dirname "$out")"
profile="$(mktemp -d "${TMPDIR:-/tmp}/minchiahuang.dev-chrome/profile.XXXXXX")"
tmp="${out%.png}.tmp.png"
: > "$tmp"
"$chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --hide-scrollbars --mute-audio --no-first-run --no-default-browser-check \
  --user-data-dir="$profile" --window-size="$width,$height" \
  --virtual-time-budget="$wait_ms" --screenshot="$tmp" "$url" >/dev/null 2>&1 &
pid=$!
deadline=$(( SECONDS + wait_ms / 1000 + 60 ))
while kill -0 "$pid" 2>/dev/null && (( SECONDS < deadline )); do
  [ -s "$tmp" ] && { sleep 1; break; }
  sleep 1
done
kill "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true
[ -s "$tmp" ] || { echo "screenshot not written: $out" >&2; exit 1; }
mv "$tmp" "$out"
echo "$out"
