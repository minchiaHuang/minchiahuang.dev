// tools/gen-screen-textures.mjs — writes the two monitor glass textures. Deterministic (fixed seed).
//   node tools/gen-screen-textures.mjs
// smudges.png: soft fingerprint-like blotches (grey, added on top of the screen at low opacity)
// shadow.png:  a vignette, transparent in the middle and dark toward the bezel (normal blending)
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'app/public/textures/monitor';
const N = 512;

function png(width, height, channels, pixel) {
  const colorType = channels === 4 ? 6 : 2;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * channels + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = pixel(x, y);
      for (let c = 0; c < channels; c++) raw[y * (width * channels + 1) + 1 + x * channels + c] = px[c];
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// mulberry32: small seeded PRNG so the output never changes between runs
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20261004);
const blobs = Array.from({ length: 40 }, () => ({
  x: rand() * N, y: rand() * N, r: 12 + rand() * 60, a: 0.15 + rand() * 0.5, ring: rand() < 0.5,
}));
const smudge = (x, y) => {
  let v = 0;
  for (const b of blobs) {
    const d = Math.hypot(x - b.x, y - b.y) / b.r;
    if (d >= 1) continue;
    // a ring-shaped blob reads as a fingerprint edge, a filled one as a wipe
    v += b.a * (b.ring ? Math.exp(-((d - 0.7) ** 2) / 0.02) : (1 - d) ** 2);
  }
  const g = Math.round(Math.min(1, v) * 255);
  return [g, g, g];
};

const shadow = (x, y) => {
  const u = (x + 0.5) / N * 2 - 1, v = (y + 0.5) / N * 2 - 1;
  const edge = Math.max(Math.abs(u) ** 6, Math.abs(v) ** 6); // squarish, like a CRT bezel
  const a = Math.round(Math.min(1, edge * 1.4) * 230);
  return [0, 0, 0, a];
};

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/smudges.png`, png(N, N, 3, smudge));
writeFileSync(`${OUT}/shadow.png`, png(N, N, 4, shadow));
console.log('wrote', `${OUT}/smudges.png`, `${OUT}/shadow.png`);
