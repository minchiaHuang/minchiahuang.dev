// tools/serve-log.mjs — a static file server that logs every request path, one per line.
//   node tools/serve-log.mjs <dir> <port> <log-file>      FAIL_GLB=1 answers 404 for every .glb
// Directories serve their index.html. Missing files are 404 (no SPA fallback), like Pages with a 404.html.
import { createServer } from 'node:http';
import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const [dir, port, log] = process.argv.slice(2);
if (!dir || !port || !log) { console.error('usage: serve-log.mjs <dir> <port> <log-file>'); process.exit(2); }
writeFileSync(log, '');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  appendFileSync(log, path + '\n');
  let file = normalize(join(dir, path));
  if (!file.startsWith(normalize(dir))) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if ((process.env.FAIL_GLB === '1' && file.endsWith('.glb')) || !existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(Number(port), '127.0.0.1');
