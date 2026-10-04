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
    curl -fsSL --retry 8 --retry-delay 10 --retry-all-errors -o "$DEST/$1.part" "$2" && mv "$DEST/$1.part" "$DEST/$1"
    echo "fetch $1"
}

fetch doom.jsdos https://cdn.dos.zone/custom/dos/doom.jsdos
fetch oregon.jsdos https://cdn.dos.zone/original/2X/5/53e616496b4da1d95136e235ad90c9cc3f3f760d.jsdos

# A .jsdos bundle is a zip with .jsdos/dosbox.conf; wrap the plain DOS zip from archive.org.
if [[ -s "$DEST/scrabble.jsdos" ]]; then
    echo "skip  scrabble.jsdos (present)"
else
    WORK="$(mktemp -d)"
    curl -fsSL --retry 8 --retry-delay 10 --retry-all-errors -o "$WORK/scrabble.zip" https://archive.org/download/SCRABBLE_VGA/SCRABBLE.zip
    mkdir "$WORK/game"
    unzip -q "$WORK/scrabble.zip" -d "$WORK/game"
    mkdir "$WORK/game/.jsdos"
    printf '[autoexec]\nmount c .\nc:\nTSP.EXE\n' > "$WORK/game/.jsdos/dosbox.conf"
    (cd "$WORK/game" && zip -qr "$DEST/scrabble.jsdos.part" . -x '.DS_Store') && mv "$DEST/scrabble.jsdos.part" "$DEST/scrabble.jsdos"
    echo "build scrabble.jsdos"
fi
