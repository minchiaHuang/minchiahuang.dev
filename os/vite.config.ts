import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// js-dos loads its wasm emulators at runtime: serve them from the installed package under /os/emulators/.
const emulatorDir = 'node_modules/js-dos/dist/emulators';
const emulatorFiles = () => readdirSync(emulatorDir).filter((f) => /^(emulators|wdosbox|wlibzip)\.(js|wasm)$|^wdosbox-x\.(js|wasm)$/.test(f));
const jsDosEmulators = (): Plugin => ({
  name: 'js-dos-emulators',
  configureServer(server) {
    server.middlewares.use('/os/emulators', (req, res, next) => {
      const name = (req.url ?? '').split('?')[0].slice(1);
      if (!emulatorFiles().includes(name)) return next();
      res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
      res.end(readFileSync(`${emulatorDir}/${name}`));
    });
  },
  generateBundle() {
    for (const f of emulatorFiles()) this.emitFile({ type: 'asset', fileName: `emulators/${f}`, source: readFileSync(`${emulatorDir}/${f}`) });
  },
});

// Contract §4: served under /os/ and built into the outer app's public folder.
export default defineConfig({
  base: '/os/',
  plugins: [react(), jsDosEmulators()],
  build: {
    outDir: '../app/public/os',
    emptyOutDir: true,
  },
});
