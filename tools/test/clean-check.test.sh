#!/usr/bin/env bash
#
# Self-test for tools/clean-check.sh. Each case builds a throwaway git repo under $TMPDIR
# (left in place: rm -rf is blocked in this setup) and checks the exit code and message.
#   bash tools/test/clean-check.test.sh
set -uo pipefail

CHECK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)/clean-check.sh"
mkdir -p "${TMPDIR:-/tmp}/clean-check-test"
pass=0
fail=0

# fixture "<CREDITS.md text>": prints the path of a new git repo holding that CREDITS.md
fixture() {
    local d
    d="$(mktemp -d "${TMPDIR:-/tmp}/clean-check-test/case.XXXXXX")"
    git -C "$d" init -q
    printf '%s\n' "$1" > "$d/CREDITS.md"
    echo "$d"
}

# expect <name> <exit code> <repo> [<substring the output must contain>]
expect() {
    local out code
    out="$(bash "$CHECK" "$3" 2>&1)"
    code=$?
    if [[ "$code" == "$2" && ( -z "${4:-}" || "$out" == *"$4"* ) ]]; then
        pass=$((pass + 1)); echo "ok   $1"
    else
        fail=$((fail + 1)); echo "FAIL $1 (exit $code, want $2${4:+, output containing \"$4\"})"
        printf '%s\n' "$out" | sed 's/^/     /'
    fi
}

d="$(fixture '| `app/public/a.txt` | own work | — |')"
mkdir -p "$d/app/public" && echo hi > "$d/app/public/a.txt"
expect "credited file passes" 0 "$d"

d="$(fixture '# Credits')"
mkdir -p "$d/app/public" && echo hi > "$d/app/public/stray.txt"
expect "uncredited app/public file fails" 1 "$d" "no CREDITS.md entry: app/public/stray.txt"

d="$(fixture '# Credits')"
mkdir -p "$d/blender/assets/x" && echo hi > "$d/blender/assets/x/m.glb"
expect "uncredited blender/assets file fails" 1 "$d" "no CREDITS.md entry: blender/assets/x/m.glb"

d="$(fixture '| `blender/assets/kenney/` | Kenney | CC0 |')"
mkdir -p "$d/blender/assets/kenney" && echo hi > "$d/blender/assets/kenney/books.glb"
expect "directory entry covers files below it" 0 "$d"

d="$(fixture '| `app/public/a` | prefix without slash | — |')"
mkdir -p "$d/app/public" && echo hi > "$d/app/public/ab.txt"
expect "a token without a trailing slash is not a prefix" 1 "$d" "app/public/ab.txt"

d="$(fixture '# Credits')"
echo "Thanks to Henry for the idea" > "$d/README.md"
git -C "$d" add README.md
expect "tracked file mentioning the name fails" 1 "$d" "blocked name in: README.md"

d="$(fixture '# Credits')"
echo "inspired by HEFFERNAN" > "$d/notes.txt"
expect "untracked file mentioning the name fails (case-insensitive)" 1 "$d" "blocked name in: notes.txt"

d="$(fixture '# Credits')"
mkdir -p "$d/docs" && echo ok > "$d/docs/henry-notes.md"
expect "blocked name in a path fails" 1 "$d" "blocked name in path: docs/henry-notes.md"

d="$(fixture '# Credits')"
echo "<h1>Henordle</h1>" > "$d/game.tsx"
expect "old game name fails" 1 "$d" "blocked name in: game.tsx"

d="$(fixture $'# Credits\n\n## Name-scan exceptions\n\n- `tools/pattern.sh` holds the pattern')"
mkdir -p "$d/tools" && echo "PATTERN=henry" > "$d/tools/pattern.sh"
expect "listed exception is skipped" 0 "$d"

d="$(fixture $'# Credits\n\n## Name-scan exceptions\n\n- `tools/pattern.sh`\n\n## Other\n\n`other.txt`')"
echo "henry" > "$d/other.txt"
expect "paths outside the exceptions section are still scanned" 1 "$d" "blocked name in: other.txt"

d="$(fixture '# Credits')"
printf 'node_modules/\n' > "$d/.gitignore"
mkdir -p "$d/node_modules/x" && echo henry > "$d/node_modules/x/i.js"
expect "gitignored files are not scanned" 0 "$d"

d="$(mktemp -d "${TMPDIR:-/tmp}/clean-check-test/case.XXXXXX")"
git -C "$d" init -q
expect "missing CREDITS.md exits 2" 2 "$d" "CREDITS.md missing"

echo "clean-check self-test: $pass passed, $fail failed"
(( fail == 0 ))
