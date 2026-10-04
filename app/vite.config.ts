import { defineConfig } from 'vite';

// The OS app is built separately into public/os/ (see docs/spec/contract.md).
export default defineConfig({
  server: { port: 8101, host: true },
});
