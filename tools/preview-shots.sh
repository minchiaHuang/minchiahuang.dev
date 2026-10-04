#!/usr/bin/env bash
#
# tools/preview-shots.sh — the end-of-phase review images.
#   bash tools/preview-shots.sh <out-dir>          blender/preview: idle, desk, monitor (baked)
#   bash tools/preview-shots.sh --app <out-dir>    the built app in ?shot= mode: app-idle, app-desk, app-monitor
# Starts the needed server, shoots, and stops the server it started.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
app=0
if [[ "${1:-}" == "--app" ]]; then app=1; shift; fi
out="${1:?usage: tools/preview-shots.sh [--app] <out-dir>}"
mkdir -p "$out"

wait_port() { for _ in $(seq 100); do curl -fs "http://127.0.0.1:$1/" >/dev/null && return 0; sleep 0.2; done; return 1; }

if (( app )); then
  port=8198
  [[ -f "$ROOT/app/dist/index.html" ]] || { echo "build the app first (bash bin/verify.sh)" >&2; exit 2; }
  node "$ROOT/tools/serve-log.mjs" "$ROOT/app/dist" "$port" "${TMPDIR:-/tmp}/preview-shots-requests.log" &
  server=$!
  trap 'kill $server 2>/dev/null || true' EXIT
  wait_port "$port" || { echo "server did not start" >&2; exit 1; }
  for v in idle desk monitor; do
    bash "$ROOT/tools/shoot.sh" "http://127.0.0.1:$port/?shot=$v" "$out/app-$v.png" 15000
  done
else
  port=8093
  (cd "$ROOT/blender/preview" && { [ -d node_modules ] || npm ci --silent; } && npm run dev -- --host 127.0.0.1 >/dev/null 2>&1) &
  server=$!
  trap 'pkill -P $server 2>/dev/null || true; kill $server 2>/dev/null || true' EXIT
  wait_port "$port" || { echo "preview server did not start" >&2; exit 1; }
  for v in idle desk monitor; do
    bash "$ROOT/tools/shoot.sh" "http://127.0.0.1:$port/?mode=baked&view=$v" "$out/$v.png" 10000
  done
fi
