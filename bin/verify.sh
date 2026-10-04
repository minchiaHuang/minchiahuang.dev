#!/usr/bin/env bash
#
# bin/verify.sh — the one command that decides whether this project is "done".
#
# Usage: bash bin/verify.sh        (run from the repo root)
# Exit:  0 all ran steps passed · 1 a step failed · 2 not at repo root · 3 no steps ran
#
# Steps whose tool does not exist yet print SKIP, so later work adds a tool file and the step
# turns on by itself. Every step was broken on purpose once and confirmed to go red.

set -uo pipefail

ROOT="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"
if [[ "$(pwd -P)" != "$ROOT" ]]; then
    echo "Error: run this from the repo root ($ROOT)."
    exit 2
fi

LOG_DIR="${TMPDIR:-/tmp}/minchiahuang.dev-verify/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"
PASS=0
FAIL=0
FAILED_STEPS=()

# run_step "<label>" "<shell command>"
run_step() {
    local label="$1" cmd="$2"
    local log_file="$LOG_DIR/${label// /_}.log"
    printf "→ %-28s " "$label"
    if bash -c "$cmd" > "$log_file" 2>&1; then
        printf "✅ PASS\n"; PASS=$((PASS + 1))
    else
        printf "❌ FAIL\n   log: %s\n" "$log_file"
        FAIL=$((FAIL + 1)); FAILED_STEPS+=("$label")
    fi
}

# run_step_if "<path>" "<label>" "<shell command>" — runs only when <path> exists
run_step_if() {
    if [[ -e "$1" ]]; then run_step "$2" "$3"; else printf "→ %-28s ⏭  SKIP (no %s)\n" "$2" "$1"; fi
}

echo "minchiahuang.dev — verification"
echo "==============================="

run_step "shell syntax" "git ls-files -z '*.sh' | xargs -0 -n1 bash -n"
run_step "clean-check self-test" "bash tools/test/clean-check.test.sh"
run_step "clean check" "bash tools/clean-check.sh"

TESTS="$(git ls-files --cached --others --exclude-standard -- '*.test.ts' '*.test.mjs' | tr '\n' ' ')"
if [[ -n "${TESTS// /}" ]]; then
    # compress.test.mjs imports the root devDependencies, so install them before the tests run.
    run_step "unit tests" "([ -d node_modules ] || npm ci --silent) && node --test $TESTS"
else
    printf "→ %-28s ⏭  SKIP (no test files)\n" "unit tests"
fi

run_step "os build" "cd os && ([ -d node_modules ] || npm ci --silent) && npm run build"
# tools/compress.mjs (Phase 2) writes app/public/models/ from blender/out/v2/ before the app builds.
run_step "app build" "if [ -f tools/compress.mjs ]; then ([ -d node_modules ] || npm ci --silent) && node tools/compress.mjs || exit 1; fi; cd app && ([ -d node_modules ] || npm ci --silent) && npm run build"
run_step_if tools/size-budget.mjs "size budget" "node tools/size-budget.mjs app/dist"
run_step_if tools/flat-check.sh "flat-OS check" "bash tools/flat-check.sh"
run_step_if tools/pages-check.sh "pages 404 check" "bash tools/pages-check.sh app/dist"

if (( PASS == 0 && FAIL == 0 )); then
    echo "❌ No steps ran — this proves nothing. Exiting 3."
    exit 3
fi

echo "Summary: $PASS passed, $FAIL failed."
if (( FAIL > 0 )); then
    printf "Failed steps:\n"; printf "  - %s\n" "${FAILED_STEPS[@]}"
    exit 1
fi
echo "All steps passed."
