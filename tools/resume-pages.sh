#!/usr/bin/env bash
#
# tools/resume-pages.sh — the phone Résumé shows a picture of the PDF page, because iOS Safari shows no PDF inside
# <object>. Renders page 1 of os/public/showcase/MinChia-Tommy-Huang-Resume.pdf to resume-p1.png, 1240 px wide, and
# writes resume-pages.json with the page count and the PDF's sha256. tools/test/resume-pages.test.mjs goes red when
# the PDF changes and this script was not run again.
#   bash tools/resume-pages.sh
# macOS only (qlmanage, sips and mdls ship with the system); no npm packages.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIR="$ROOT/os/public/showcase"
PDF="$DIR/MinChia-Tommy-Huang-Resume.pdf"
WIDTH=1240
# qlmanage -s sets the LONG side. Measured on this A4 PDF: -s 1240 gives 876x1240, -s 1754 gives 1239x1754,
# -s 1755 gives 1240x1755.
SIZE=1755

# qlmanage renders page 1 only: stop rather than drop pages without a word.
pages="$(mdls -raw -name kMDItemNumberOfPages "$PDF")"
# Spotlight answers (null) for a file it has not indexed (a fresh worktree, anything under /tmp): ask PDFKit instead.
if [[ "$pages" == "(null)" ]]; then
  pages="$(osascript -l JavaScript -e 'ObjC.import("Quartz"); function run(argv) { return $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0])).pageCount }' "$PDF")"
fi
if [[ "$pages" != "1" ]]; then
  echo "resume-pages: the PDF has '$pages' pages; this script renders page 1 only, so it needs a per-page renderer first" >&2
  exit 1
fi

mkdir -p "${TMPDIR:-/tmp}/resume-pages"
work="$(mktemp -d "${TMPDIR:-/tmp}/resume-pages/run.XXXXXX")"
qlmanage -t -s "$SIZE" -o "$work" "$PDF" >/dev/null
png="$work/$(basename "$PDF").png"
[[ -s "$png" ]] || { echo "resume-pages: qlmanage wrote no image" >&2; exit 1; }
width="$(sips -g pixelWidth "$png" | awk '/pixelWidth/ {print $2}')"
if [[ "$width" != "$WIDTH" ]]; then
  echo "resume-pages: the page image is $width px wide, want $WIDTH (not A4 portrait? change SIZE)" >&2
  exit 1
fi

cp "$png" "$DIR/resume-p1.png"
sha="$(shasum -a 256 "$PDF" | awk '{print $1}')"
printf '{\n  "pages": %s,\n  "width": %s,\n  "sha256": "%s"\n}\n' "$pages" "$WIDTH" "$sha" > "$DIR/resume-pages.json"
echo "resume-pages: wrote resume-p1.png ($width px wide) and resume-pages.json"
