#!/usr/bin/env node
/**
 * Gera os ícones PNG e telas de splash do PWA a partir da geometria do
 * public/icon.svg, sem dependências externas (zlib nativo + encoder PNG próprio).
 *
 * Uso: node scripts/generate-icons.mjs
 * Saída (em public/):
 *   - apple-touch-icon.png         180x180  full-bleed (iOS aplica o próprio recorte)
 *   - pwa-192x192.png              192x192  purpose 'any' (cantos arredondados fiéis ao SVG)
 *   - pwa-512x512.png              512x512  purpose 'any'
 *   - pwa-maskable-512x512.png     512x512  purpose 'maskable' (fundo full-bleed, glifo na safe zone)
 *   - splash-*.png                  telas de splash para iOS (apple-touch-startup-image)
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

// ---- Geometria do icon.svg (viewBox 512x512) ----
const SIZE = 512;
const GREEN = [0x10, 0xb9, 0x81]; // #10b981
const WHITE = [255, 255, 255];
const DARK = [0x0f, 0x17, 0x2a]; // #0f172a (theme_color)
const HALF_STROKE = 16; // stroke-width 32 -> raio 16
const RECT_RADIUS = 128; // rx do retângulo arredondado
// path: M256 96v320 M176 176h160 M176 256h160 M176 336h112
const SEGMENTS = [
  [
    [256, 96],
    [256, 416],
  ],
  [
    [176, 176],
    [336, 176],
  ],
  [
    [176, 256],
    [336, 256],
  ],
  [
    [176, 336],
    [288, 336],
  ],
];

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inRoundedRect(px, py, radius = RECT_RADIUS) {
  const half = SIZE / 2;
  const inner = half - radius;
  const qx = Math.abs(px - half) - inner;
  const qy = Math.abs(py - half) - inner;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius <= 0;
}

function strokeAt(px, py) {
  for (const [a, b] of SEGMENTS) {
    if (distToSegment(px, py, a, b) <= HALF_STROKE) return WHITE;
  }
  return null;
}

/** Cor em coordenadas SVG; null = transparente. mode 'bleed' = fundo full-bleed. */
function colorAt(px, py, mode) {
  const stroke = strokeAt(px, py);
  if (stroke) return stroke;
  if (mode === 'bleed') return GREEN;
  if (inRoundedRect(px, py)) return GREEN;
  return null;
}

// ---- Encoder PNG (RGBA, 8-bit) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function writePng(file, width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  writeFileSync(file, Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]));
}

/** Renderiza com supersampling ss×ss por pixel. sampleFn(x, y) -> [r,g,b,a] | null. */
function render(file, width, height, sampleFn, ss) {
  const img = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;
          const c = sampleFn(px, py);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const n = ss * ss;
      const idx = (y * width + x) * 4;
      img[idx] = Math.round(r / n);
      img[idx + 1] = Math.round(g / n);
      img[idx + 2] = Math.round(b / n);
      img[idx + 3] = Math.round(a / n);
    }
  }
  writePng(file, width, height, img);
  console.log(`✓ ${file.replace(ROOT + '/', '')} (${width}x${height})`);
}

/** Ícone quadrado em coordenadas SVG. */
function renderIcon(file, pxSize, mode) {
  const scale = pxSize / SIZE;
  render(file, pxSize, pxSize, (x, y) => colorAt(x / scale, y / scale, mode), 4);
}

/** Splash: fundo escuro + ícone centralizado (aprox. 32% da menor dimensão). */
function renderSplash(file, width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.32);
  const scale = iconSize / SIZE;
  const ox = (width - iconSize) / 2;
  const oy = (height - iconSize) / 2;
  render(
    file,
    width,
    height,
    (x, y) => colorAt((x - ox) / scale, (y - oy) / scale, 'bleed') ?? DARK,
    2
  );
}

// ---- Ícones ----
mkdirSync(PUBLIC, { recursive: true });
renderIcon(join(PUBLIC, 'apple-touch-icon.png'), 180, 'bleed');
renderIcon(join(PUBLIC, 'pwa-192x192.png'), 192, 'any');
renderIcon(join(PUBLIC, 'pwa-512x512.png'), 512, 'any');
renderIcon(join(PUBLIC, 'pwa-maskable-512x512.png'), 512, 'bleed');

// ---- Splash screens iOS (retrato) ----
const SPLASHES = [
  [2048, 2732], // iPad Pro 12.9"
  [1668, 2388], // iPad Pro 11"
  [1620, 2160], // iPad 10.2"
  [1536, 2048], // iPad 9.7"/mini
  [1290, 2796], // iPhone 15 Pro Max / 14 Pro Max
  [1284, 2778], // iPhone 14 Pro Max / 13 Pro Max / 12 Pro Max
  [1179, 2556], // iPhone 15 Pro / 14 Pro
  [1170, 2532], // iPhone 15 / 14 / 13 / 12
  [1125, 2436], // iPhone X / XS / 11 Pro
  [828, 1792], // iPhone XR / 11
  [750, 1334], // iPhone 8 / SE 2ª/3ª geração
];
for (const [w, h] of SPLASHES) {
  renderSplash(join(PUBLIC, `splash-${w}x${h}.png`), w, h);
}
console.log('Ícones e splash screens gerados em public/.');
