#!/usr/bin/env bash
#
# tools/clean-check.sh — fails when the repo holds a third-party file with no CREDITS.md entry,
# or any file names or mentions a blocked name.
#   bash tools/clean-check.sh [repo-dir]
# Exit: 0 clean · 1 problems found (one line each) · 2 not a git repo / no CREDITS.md
#
# CREDITS.md format: every `backticked` token is a path; a token ending in "/" covers every file
# below it. Paths listed under "## Name-scan exceptions" skip the name scan (rule 2) only.
# Files are what git would see: tracked plus untracked, minus .gitignore'd (build output, node_modules).
set -uo pipefail

PATTERN='henry|heffernan|henordle|boitte'

cd "${1:-.}" 2>/dev/null && git rev-parse --show-toplevel >/dev/null 2>&1 \
    || { echo "clean-check: not a git repo: ${1:-.}" >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)" || exit 2
[[ -f CREDITS.md ]] || { echo "clean-check: CREDITS.md missing" >&2; exit 2; }

files="$(git ls-files --cached --others --exclude-standard)"
tokens="$(grep -o '`[^`]*`' CREDITS.md | tr -d '`' | sort -u)"
exceptions="$(awk '/^## /{on = ($0 == "## Name-scan exceptions"); next} on' CREDITS.md \
    | grep -o '`[^`]*`' | tr -d '`' | sort -u)"
status=0

# Rule 1: every file under app/public/ and blender/assets/ has an entry.
while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    covered=0
    while IFS= read -r t; do
        [[ -z "$t" ]] && continue
        if [[ "$f" == "$t" ]] || { [[ "$t" == */ ]] && [[ "$f" == "$t"* ]]; }; then covered=1; break; fi
    done <<< "$tokens"
    if (( ! covered )); then echo "no CREDITS.md entry: $f"; status=1; fi
done <<< "$(printf '%s\n' "$files" | grep -E '^(app/public|blender/assets)/' || true)"

# Rule 2: no path or text file names or mentions a blocked name (binary files are skipped).
while IFS= read -r f; do
    [[ -z "$f" || ! -f "$f" ]] && continue
    printf '%s\n' "$exceptions" | grep -qxF -- "$f" && continue
    if printf '%s\n' "$f" | grep -qiE "$PATTERN"; then
        echo "blocked name in path: $f"; status=1; continue
    fi
    if grep -IqiE "$PATTERN" -- "$f"; then
        echo "blocked name in: $f — $(grep -IinE "$PATTERN" -- "$f" | head -1 | cut -c1-100)"; status=1
    fi
done <<< "$files"

exit "$status"
