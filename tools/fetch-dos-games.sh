#!/usr/bin/env bash
#
# Downloads the three DOS game bundles used by the OS desktop apps into os/public/games/
# (gitignored; game files never go into git). Idempotent: files already present are skipped.
#   doom.jsdos     shareware Doom        cdn.dos.zone (js-dos project archive)
#   oregon.jsdos   Oregon Trail Deluxe   cdn.dos.zone (js-dos project archive)
#   scrabble.jsdos Scrabble (U.S. Gold)  archive.org zip, wrapped into a .jsdos bundle here

set -euo pipefail

DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)/os/public/games"
mkdir -p "$DEST"

fetch() { # fetch <name> <url>
    if [[ -s "$DEST/$1" ]]; then echo "skip  $1 (present)"; return; fi
    curl -fsSL --retry 8 --retry-delay 10 --retry-all-errors -o "$DEST/$1.part" "$2"
    mv "$DEST/$1.part" "$DEST/$1"
    echo "fetch $1"
}

fetch doom.jsdos https://cdn.dos.zone/custom/dos/doom.jsdos
fetch oregon.jsdos https://cdn.dos.zone/original/2X/5/53e616496b4da1d95136e235ad90c9cc3f3f760d.jsdos

# A .jsdos bundle is a zip with .jsdos/dosbox.conf; wrap the plain DOS zip from archive.org.
if [[ -s "$DEST/scrabble.jsdos" ]]; then
    echo "skip  scrabble.jsdos (present)"
else
    WORK="$(mktemp -d)"
    # archive.org/download redirects to one storage server; if that one is down, try the
    # item's other servers, looked up from the metadata API rather than hard-coded.
    if ! curl -fsSL --retry 3 --retry-delay 10 --retry-all-errors -o "$WORK/scrabble.zip" https://archive.org/download/SCRABBLE_VGA/SCRABBLE.zip; then
        META="$(curl -fsSL --retry 3 --retry-delay 10 --retry-all-errors https://archive.org/metadata/SCRABBLE_VGA)"
        ITEM_DIR="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["dir"])' <<<"$META")"
        for SERVER in $(python3 -c 'import json,sys; print(*json.load(sys.stdin)["workable_servers"])' <<<"$META"); do
            if curl -fsSL --retry 2 --retry-delay 5 --retry-all-errors -o "$WORK/scrabble.zip" "https://$SERVER$ITEM_DIR/SCRABBLE.zip"; then
                echo "fetch scrabble.zip from $SERVER"
                break
            fi
        done
        unzip -tq "$WORK/scrabble.zip" >/dev/null  # fails the build if no server delivered a good zip
    fi
    mkdir "$WORK/game"
    unzip -q "$WORK/scrabble.zip" -d "$WORK/game"
    mkdir "$WORK/game/.jsdos"
    printf '[autoexec]\nmount c .\nc:\nTSP.EXE\n' > "$WORK/game/.jsdos/dosbox.conf"
    # The Pages build image has no zip; python3's zipfile CLI writes the same archive.
    find "$WORK/game" -name .DS_Store -delete
    (cd "$WORK/game" && python3 -m zipfile -c "$DEST/scrabble.jsdos.part" .jsdos *)
    mv "$DEST/scrabble.jsdos.part" "$DEST/scrabble.jsdos"
    echo "build scrabble.jsdos"
fi
