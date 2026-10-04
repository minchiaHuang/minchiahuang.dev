# User flows

<!-- The agent reads this file to know what to test. Keep each flow short and in plain language. -->

## Site
- URL (local): http://localhost:8102 (the built `app/dist`, started by `playwright.config.ts`)
- URL (production): https://minchiahuang.dev (after Phase 4B)
- Start command: `npm run build`, then `npx playwright test`

## Test entry points
- BIOS `START` button (`.bios-start-button`): ends the loading screen.
- Entry buttons (`nav[aria-label="Quick links"]`): `Résumé` and `How this site was built`. They zoom the
  camera to the monitor and ask the OS to open a window, so no click on the WebGL canvas is needed.
- `#computer-screen`: the OS is a real iframe placed in 3D with CSS3D; assert on its DOM.
- `/os/?page=<home|about|experience|projects|resume|contact>` and `/os/?open=about-site`: open the OS
  directly, without the 3D scene.
- `?shot=<state>`: deterministic screenshot mode (`tools/shoot.sh`); skips the BIOS. Not a visitor path.
- Viewport 768 px wide or less, no WebGL, or reduced motion: the site skips 3D and shows the flat OS.

## Flows
<!-- Order from simplest to most complex. -->

### F1 Enter the OS
- Goal: a desktop visitor gets from the landing page into the OS on the monitor.
- Steps: open `/` → wait for loading to finish → click `START` → click `Résumé`
- Success check: the `#computer-screen` iframe shows the résumé window; no console errors.
- Layer: gate

### F2 Open "How this site was built"
- Goal: a curious visitor reads how the site was made.
- Steps: open `/` → `START` → click `How this site was built`
- Success check: the OS shows the about-site window.
- Layer: gate

### F3 Phone visitor
- Goal: a phone visitor reaches the résumé without the 3D scene.
- Steps: open `/` at 390 px wide
- Success check: the flat OS shows; no WebGL scene is loaded.
- Layer: gate

## Personas
<!-- Used only for persona walkthroughs. Never shown to the agent alongside the Flows section. -->

### P1 Recruiter
- Who: a technical recruiter on a laptop, opened the link from a job application.
- Goal: find the résumé and a way to contact Tommy.
- Patience: leaves after about 90 seconds without progress.

### P2 Engineer
- Who: a front-end engineer reviewing the portfolio.
- Goal: understand how the 3D scene and the OS were built.
- Patience: explores for a few minutes; leaves if nothing explains the build.
