#!/usr/bin/env bash
#
# tools/pages-check.sh — the Cloudflare Pages rules this site depends on, checked on a build.
#   bash tools/pages-check.sh [dist=app/dist]
# Pages treats a build with no top-level 404.html as a single-page app and answers every missing
# path with index.html (200). js-dos would then cache that HTML as a game file in OPFS. So:
#   1. dist/404.html exists (missing paths, including /os/games/*, become real 404s)
#   2. no _redirects rule rewrites everything (/* or /os/*) with status 200
#   3. the old site's public URLs still resolve (301 to their new homes)
set -uo pipefail
DIST="${1:-app/dist}"
status=0
fail() { echo "FAIL $1"; status=1; }

[[ -f "$DIST/404.html" ]] && echo "ok   404.html present" || fail "no $DIST/404.html: Pages would fall back to index.html"

if [[ -f "$DIST/_redirects" ]]; then
  if grep -Eq '^[[:space:]]*/(os/)?\*[[:space:]]+[^[:space:]]+[[:space:]]+200' "$DIST/_redirects"; then
    fail "_redirects has a catch-all 200 rewrite"
  else
    echo "ok   no catch-all rewrite"
  fi
  for old in /TommyHuang_Resume.pdf /cookpilot.html /visual-eyes.html; do
    grep -Eq "^$old[[:space:]]+[^[:space:]]+[[:space:]]+301" "$DIST/_redirects" \
      && echo "ok   $old redirects" || fail "$old has no 301 in _redirects"
  done
else
  fail "no $DIST/_redirects"
fi
exit "$status"
