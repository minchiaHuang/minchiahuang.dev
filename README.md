# minchiahuang.dev

Min-Chia (Tommy) Huang's interactive portfolio. A desk with a retro CRT, built and baked by a Blender
script that Claude wrote, with a small operating system running on the monitor.

- Live: https://minchiahuang.dev
- Credits and licences: [CREDITS.md](CREDITS.md)

## Build

    bash tools/fetch-dos-games.sh
    npm ci
    npm run build      # output: app/dist

The deploy build is the **root** `npm run build`: it runs `tools/compress.mjs`, which writes
`app/public/models/`. Building only `app/` leaves that folder empty and the site falls back to the
flat OS.

## Deploy (Cloudflare Pages)

- Build command: `bash tools/fetch-dos-games.sh && npm run build`
- Build output directory: `app/dist`
- Node version: read from `.node-version`

## How it was built

The desk and the CRT are modelled, lit and baked by one Blender script (`blender/scene_v2.py`), which
Claude wrote and Min-Chia directed. `tools/compress.mjs` shrinks the bake into the models the page
loads, and a three.js scene in `app/` puts a small React OS on the monitor. Details:
[docs/notes/blender-pipeline.md](docs/notes/blender-pipeline.md).

## Check

    bash bin/verify.sh
