# minchiahuang.dev

Min-Chia (Tommy) Huang's interactive portfolio. A desk with a retro CRT, built and baked by a Blender
script that Claude wrote, with a small operating system running on the monitor.

- Live: https://minchiahuang.dev
- Credits and licences: [CREDITS.md](CREDITS.md)

## Build

    bash tools/fetch-dos-games.sh
    npm ci
    npm run build      # output: app/dist

## Check

    bash bin/verify.sh
