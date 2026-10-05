#!/usr/bin/env bash
#
# tools/make-audio.sh — builds app/public/audio/ from two CC0 Kenney packs, one CC0 Freesound
# recording and two sounds synthesised with ffmpeg. Re-running gives the same files. Needs curl, unzip, ffmpeg.
#   bash tools/make-audio.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
OUT="$ROOT/app/public/audio"
WORK="${TMPDIR:-/tmp}/minchiahuang.dev-audio"
mkdir -p "$WORK" "$OUT"/{mouse,keyboard,cc,startup,atmosphere}

# fetch <zip name> <url> <sha256>
fetch() {
  if [[ ! -s "$WORK/$1" ]]; then curl -fsSL --retry 5 -o "$WORK/$1" "$2"; fi
  echo "$3  $WORK/$1" | shasum -a 256 -c - >/dev/null || { echo "checksum mismatch: $1" >&2; exit 1; }
  mkdir -p "$WORK/${1%.zip}" && unzip -oq "$WORK/$1" -d "$WORK/${1%.zip}"
}
fetch ui-audio.zip https://kenney.nl/media/pages/assets/ui-audio/490d233f68-1677590494/kenney_ui-audio.zip \
  946fc23a63d535d693eb31b2eabb80c8c28d6351e2186b344ceb71b2cb1d5eb6
fetch interface-sounds.zip https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip \
  f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232

# mp3 <in> <out>: mono 44.1 kHz, ~96 kbps; -map_metadata -1 keeps the output byte-stable
mp3() { ffmpeg -loglevel error -y -i "$1" -ac 1 -ar 44100 -b:a 96k -map_metadata -1 -fflags +bitexact "$2"; }

UI="$WORK/ui-audio/Audio"
IS="$WORK/interface-sounds/Audio"
mp3 "$UI/mouseclick1.ogg" "$OUT/mouse/mouse_down.mp3"
mp3 "$UI/mouserelease1.ogg" "$OUT/mouse/mouse_up.mp3"
mp3 "$IS/tick_001.ogg" "$OUT/cc/type.mp3"

# Key presses: six isolated taps from a CC0 take of an Apple M0118 keyboard with ALPS orange
# switches (Freesound 680714, robni7). Decoded to WAV first: seeking inside the MP3 is not exact.
TAKE="$WORK/apple-m0118.mp3"
if [[ ! -s "$TAKE" ]]; then curl -fsSL --retry 5 -o "$TAKE" https://cdn.freesound.org/previews/680/680714_3242494-hq.mp3; fi
echo "0cceb08306e373f4dc0a32c793b392f6141358d204620ceb20db1fbdca41342c  $TAKE" | shasum -a 256 -c - >/dev/null \
  || { echo "checksum mismatch: apple-m0118.mp3" >&2; exit 1; }
ffmpeg -loglevel error -y -i "$TAKE" -ac 1 -ar 44100 "$WORK/apple-m0118.wav"
# tap <n> <start s> <gain dB>: 0.28 s of the take, faded at both ends, levelled to about -26 dB mean
tap() {
  ffmpeg -loglevel error -y -ss "$2" -t 0.28 -i "$WORK/apple-m0118.wav" \
    -af "afade=t=in:d=0.003,afade=t=out:st=0.2:d=0.08,volume=$3dB" \
    -ac 1 -ar 44100 -b:a 96k -map_metadata -1 -fflags +bitexact "$OUT/keyboard/key_$1.mp3"
}
tap 1 4.084 12.5
tap 2 4.464 4.2
tap 3 5.433 7.8
tap 4 5.854 6.6
tap 5 12.757 4.5
tap 6 13.773 9.3

# Startup: a 60 Hz hum with its harmonics swelling in over 2.5 s, plus a short high-voltage whine.
ffmpeg -loglevel error -y -f lavfi -i "sine=f=60:d=3.5" -f lavfi -i "sine=f=120:d=3.5" \
  -f lavfi -i "sine=f=15734:d=3.5" -f lavfi -i "anoisesrc=d=3.5:c=brown:a=0.05:seed=7" \
  -filter_complex "[0][1][2][3]amix=inputs=4:weights=1 0.5 0.03 0.6,afade=t=in:d=2.5,afade=t=out:st=2.8:d=0.7,volume=2" \
  -ac 1 -ar 44100 -b:a 96k -map_metadata -1 -fflags +bitexact "$OUT/startup/startup.mp3"

# Room tone: 20 s of low-passed brown noise that loops without a click (fade in/out 0.5 s).
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=20:c=brown:a=0.2:seed=11" \
  -af "lowpass=f=400,afade=t=in:d=0.5,afade=t=out:st=19.5:d=0.5" \
  -ac 1 -ar 44100 -b:a 64k -map_metadata -1 -fflags +bitexact "$OUT/atmosphere/office.mp3"

cp "$WORK/ui-audio/License.txt" "$OUT/LICENSE-kenney-ui-audio.txt"
cp "$WORK/interface-sounds/License.txt" "$OUT/LICENSE-kenney-interface-sounds.txt"
du -ch "$OUT"/*/*.mp3 | tail -1
