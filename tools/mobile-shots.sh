#!/usr/bin/env bash
#
# tools/mobile-shots.sh — review screenshots for the phone layout, from the built app/dist (bash bin/verify.sh builds it).
#   bash tools/mobile-shots.sh <out-dir>
# Phone: each state in MOBILE_SHOTS_STATES at 390x844, 360x780 and 844x390 (tools/phone-shots.mjs, which also fails
# when content is cut off at the sides). Desktop: the 3D scene (desk, monitor) and five OS windows at 1440x900
# (tools/shoot.sh), to compare with cmp against the same shots taken before the change.
# MOBILE_SHOTS_STATES= (set but empty) takes the desktop shots only.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIST="$ROOT/app/dist"
OUT="${1:?usage: bash tools/mobile-shots.sh <out-dir>}"
[[ -f "$DIST/os/index.html" ]] || { echo "no app/dist/os: run bash bin/verify.sh first" >&2; exit 2; }
PORT="${MOBILE_SHOTS_PORT:-8199}"
STATES="${MOBILE_SHOTS_STATES-m-showcase m-info m-home m-menu m-projects m-resume m-contact m-games m-fiveletters m-terminal m-harddisk m-credits m-doom m-oregon m-scrabble}"
mkdir -p "$OUT" "${TMPDIR:-/tmp}/mobile-shots"

node "$ROOT/tools/serve-log.mjs" "$DIST" "$PORT" "${TMPDIR:-/tmp}/mobile-shots/serve.log" &
server=$!
trap 'kill "$server" 2>/dev/null' EXIT
for _ in $(seq 50); do curl -fs "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 0.1; done
URL="http://127.0.0.1:$PORT"
status=0

if [[ -n "$STATES" ]]; then
  for size in 390x844 360x780 844x390; do
    # shellcheck disable=SC2086 # one argument per state
    node "$ROOT/tools/phone-shots.mjs" "$URL" "$OUT" "$size" $STATES || status=1
  done
fi

for s in desk monitor; do
  bash "$ROOT/tools/shoot.sh" "$URL/?shot=$s" "$OUT/1440x900-$s.png" 15000 1440 900 || status=1
done
for s in projects games terminal resume contact; do
  bash "$ROOT/tools/shoot.sh" "$URL/os/?shot=$s" "$OUT/1440x900-os-$s.png" 4000 1440 900 || status=1
done
exit "$status"
