import { defineConfig, devices } from '@playwright/test';

// E2E specs run against the built site (app/dist), the same files Cloudflare Pages serves.
// Build first: bash bin/verify.sh (or npm run build).
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8102',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Wider than FLAT_MAX_WIDTH (768), so the 3D scene loads instead of the flat OS.
        viewport: { width: 1440, height: 900 },
        // Software WebGL, so headless Chromium renders the scene (same flags as tools/shoot.sh).
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
  ],
  webServer: {
    command: 'npm run preview --prefix app -- --port 8102 --strictPort',
    url: 'http://localhost:8102',
    reuseExistingServer: true,
  },
});
