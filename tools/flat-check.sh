#!/usr/bin/env bash
#
# tools/flat-check.sh — the flat-OS promise, checked in headless Chrome against app/dist:
#   1. 400 px wide: the OS shows (/os/ is loaded) and no .glb is requested
#   2. 1440 px wide: .glb files ARE requested (proves the check can tell the two apart)
#   3. 1440 px wide, every .glb answers 404: the page still ends up on /os/
# Chrome runs with SwiftShader so WebGL exists and only the width / failure decides.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIST="$ROOT/app/dist"
[[ -f "$DIST/index.html" ]] || { echo "no app/dist: build the app first" >&2; exit 2; }
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "${TMPDIR:-/tmp}/flat-check"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/flat-check/run.XXXXXX")"
PORT="${FLAT_CHECK_PORT:-8197}"
status=0

# visit <name> <width> [FAIL_GLB=1]: serves dist, loads / in Chrome, leaves $WORK/<name>.{log,dom}
visit() {
  local name="$1" width="$2" fail="${3:-}"
  env ${fail:+FAIL_GLB=1} node "$ROOT/tools/serve-log.mjs" "$DIST" "$PORT" "$WORK/$name.log" &
  local server=$!
  for _ in $(seq 50); do curl -fs "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 0.1; done
  "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --mute-audio \
    --no-first-run --no-default-browser-check --user-data-dir="$WORK/profile-$name" \
    --window-size="$width,900" --virtual-time-budget=10000 --dump-dom "http://127.0.0.1:$PORT/" \
    > "$WORK/$name.dom" 2>/dev/null &
  local chrome=$!
  local deadline=$(( SECONDS + 60 ))
  while kill -0 "$chrome" 2>/dev/null && (( SECONDS < deadline )); do sleep 0.5; done
  kill "$chrome" 2>/dev/null || true
  kill "$server" 2>/dev/null || true
  wait "$chrome" "$server" 2>/dev/null || true
}

check() { # check <label> <command...>
  local label="$1"; shift
  if "$@"; then echo "ok   $label"; else echo "FAIL $label"; status=1; fi
}

visit phone 400
check "400px: /os/ was loaded" grep -qx '/os/' "$WORK/phone.log"
check "400px: no .glb requested" bash -c "! grep -q '\.glb$' '$WORK/phone.log'"
check "400px: phone OS in the DOM" grep -q 'class="screen m-shell' "$WORK/phone.dom"

visit desktop 1440
check "1440px: .glb requested (control)" grep -q '\.glb$' "$WORK/desktop.log"
# Phase 1: the old model paths 404, so the page falls back to /os/ after asking for a .glb.
# Phase 2+: the models load and the monitor iframe loads /os/ afterwards. Either way the first
# .glb request comes before any /os/, while on a phone /os/ comes first and no .glb ever does.
check "1440px: .glb requested before any /os/" bash -c "awk '/\\.glb\$/{print \"glb\"; exit} \$0==\"/os/\"{print \"os\"; exit}' '$WORK/desktop.log' | grep -qx glb"

visit broken 1440 fail
check "1440px + .glb 404: fell back to /os/" grep -qx '/os/' "$WORK/broken.log"

echo "logs: $WORK"
exit "$status"
