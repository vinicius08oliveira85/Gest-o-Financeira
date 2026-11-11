#!/usr/bin/env node
/**
 * Gera os ícones PNG e telas de splash do PWA a partir da geometria da marca
 * (a mesma de public/icon.svg: placa azul-marinho com cifrão e seta ascendente
 * em verde sobre barras de gráfico), sem dependências externas (zlib nativo +
 * encoder PNG próprio).
 *
 * Uso: node scripts/generate-icons.mjs
 * Saída (em public/):
 *   - apple-touch-icon.png         180x180  full-bleed (iOS aplica o próprio recorte)
 *   - pwa-192x192.png              192x192  purpose 'any' (cantos arredondados fiéis ao SVG)
 *   - pwa-512x512.png              512x512  purpose 'any'
 *   - pwa-maskable-512x512.png     512x512  purpose 'maskable' (fundo full-bleed, marca na safe zone)
 *   - splash-*.png                  telas de splash para iOS (apple-touch-startup-image)
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');

// ---- Geometria da marca (viewBox 512x512) ----
const SIZE = 512;
const TILE_RADIUS = 118; // rx da placa
const TILE_TOP = [0x22, 0x30, 0x4e]; // #22304e
const TILE_BOTTOM = [0x0a, 0x11, 0x20]; // #0a1120
const MARK_TOP = [0x3e, 0xe0, 0xa6]; // #3ee0a6
const MARK_BOTTOM = [0x0a, 0x9c, 0x6a]; // #0a9c6a
const MARK_Y0 = 100; // faixa do gradiente da marca (topo da haste do cifrão)
const MARK_Y1 = 404; // ...e a base
const BAR_RADIUS = 10;
const BAR_ALPHA = 0.45;
const BAR_COLOR = [0x10, 0xb9, 0x81]; // #10b981

const BARS = [
  [96, 364, 30, 40],
  [132, 342, 30, 62],
  [168, 320, 30, 84],
];

/** Haste vertical do cifrão: M188 100V378 (stroke-width 26) */
const STEM = [
  [188, 100],
  [188, 378],
];
const STEM_HALF = 13;

/**
 * Cifrão: dois arcos de 180° (raio 54) ligados por uma diagonal no meio —
 * M226 150A54 54 0 1 0 150 226L226 262A54 54 0 1 1 150 338
 * O arco superior vai de -45° a -225° (anti-horário) e o inferior de -45° a
 * 135° (horário); a polilinha concatenada cria a diagonal entre eles.
 */
const DOLLAR_ARCS = [
  { cx: 188, cy: 188, r: 54, from: -45, to: -225 },
  { cx: 188, cy: 300, r: 54, from: -45, to: 135 },
];
const DOLLAR_HALF = 17; // stroke-width 34

/** Seta: M196 420C272 424 330 372 366 260 */
const ARROW_CURVE = [196, 420, 272, 424, 330, 372, 366, 260];
const ARROW_HALF = 20; // stroke-width 40

/** Ponta da seta: M385 201 412 268 324 240Z */
const ARROW_HEAD = [
  [385, 201],
  [412, 268],
  [324, 240],
];

const BARS_BOX = [92, 316, 226, 408];
const ARROW_BOX = [170, 234, 392, 446];
const HEAD_BOX = [320, 197, 417, 273];
const STEM_BOX = [171, 83, 205, 395];
const DOLLAR_BOX = [113, 112, 263, 376];
/** União das caixas da marca (barras, seta e cifrão): atalho para não testar a marca inteira. */
const MARK_BOX = [86, 83, 417, 446];

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function inBox(px, py, [x0, y0, x1, y1]) {
  return px >= x0 && px <= x1 && py >= y0 && py <= y1;
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Retângulo de cantos arredondados (x, y, largura, altura, raio). */
function inRoundedRect(px, py, x, y, w, h, radius) {
  const nearestX = Math.min(Math.max(px, x + radius), x + w - radius);
  const nearestY = Math.min(Math.max(py, y + radius), y + h - radius);
  return Math.hypot(px - nearestX, py - nearestY) <= radius;
}

/** Amostra uma curva cúbica numa polilinha (as junções ficam arredondadas no traço). */
function cubicPolyline([x0, y0, c1x, c1y, c2x, c2y, x1, y1], steps = 12) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    pts.push([a * x0 + b * c1x + c * c2x + d * x1, a * y0 + b * c1y + c * c2y + d * y1]);
  }
  return pts;
}

/** Amostra um arco circular (graus, sentido do sinal de `to - from`). */
function arcPolyline(cx, cy, r, fromDeg, toDeg, steps = 60) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / steps;
    const a = (deg * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

const DOLLAR_POLYLINE = DOLLAR_ARCS.flatMap(({ cx, cy, r, from, to }) =>
  arcPolyline(cx, cy, r, from, to)
);
const ARROW_POLYLINE = cubicPolyline(ARROW_CURVE);

function nearPolyline(px, py, pts, half) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(px, py, pts[i], pts[i + 1]) <= half) return true;
  }
  return false;
}

function inTriangle(px, py, [a, b, c]) {
  const sign = (p1, p2, p3) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inBars(px, py) {
  if (!inBox(px, py, BARS_BOX)) return false;
  return BARS.some(([x, y, w, h]) => inRoundedRect(px, py, x, y, w, h, BAR_RADIUS));
}

function inDollar(px, py) {
  if (inBox(px, py, STEM_BOX) && nearPolyline(px, py, STEM, STEM_HALF)) return true;
  return inBox(px, py, DOLLAR_BOX) && nearPolyline(px, py, DOLLAR_POLYLINE, DOLLAR_HALF);
}

function inArrow(px, py) {
  if (inBox(px, py, HEAD_BOX) && inTriangle(px, py, ARROW_HEAD)) return true;
  return inBox(px, py, ARROW_BOX) && nearPolyline(px, py, ARROW_POLYLINE, ARROW_HALF);
}

function tileColorAt(px, py, width, height) {
  const t = clamp01((px / width + py / height) / 2);
  return lerpColor(TILE_TOP, TILE_BOTTOM, t);
}

function markColorAt(py) {
  return lerpColor(MARK_TOP, MARK_BOTTOM, clamp01((py - MARK_Y0) / (MARK_Y1 - MARK_Y0)));
}

/** Composita a marca (barras + seta + cifrão) sobre uma cor de fundo. */
function withMark(base, mx, my, scale = 1) {
  const px = SIZE / 2 + (mx - SIZE / 2) / scale;
  const py = SIZE / 2 + (my - SIZE / 2) / scale;
  let alpha = 0;
  let color = BAR_COLOR;
  if (inBars(px, py)) {
    alpha = BAR_ALPHA;
  }
  if (inArrow(px, py) || inDollar(px, py)) {
    alpha = 1;
    color = markColorAt(py);
  }
  if (alpha === 0) return base;
  const a = alpha;
  return [
    Math.round(base[0] * (1 - a) + color[0] * a),
    Math.round(base[1] * (1 - a) + color[1] * a),
    Math.round(base[2] * (1 - a) + color[2] * a),
  ];
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
  writeFileSync(
    file,
    Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
  );
}

/**
 * Renderiza com supersampling ss×ss por pixel. sampleFn(x, y) -> [r,g,b,a] | null.
 * A média é feita em cores pré-multiplicadas para as bordas não escurecerem.
 */
function render(file, width, height, sampleFn, ss) {
  const img = Buffer.alloc(width * height * 4);
  const n = ss * ss;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = sampleFn(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss);
          if (c) {
            const al = c[3] / 255;
            r += c[0] * al;
            g += c[1] * al;
            b += c[2] * al;
            a += al;
          }
        }
      }
      const idx = (y * width + x) * 4;
      if (a > 0) {
        img[idx] = Math.round(r / a);
        img[idx + 1] = Math.round(g / a);
        img[idx + 2] = Math.round(b / a);
      }
      img[idx + 3] = Math.round((a / n) * 255);
    }
  }
  writePng(file, width, height, img);
  console.log(`✓ ${file.replace(ROOT + '/', '')} (${width}x${height})`);
}

/**
 * Ícone quadrado. mode 'any' = cantos arredondados transparentes;
 * 'bleed' = placa preenchendo todo o quadrado. `scale` reduz a marca
 * (mantém o glifo dentro da safe zone do ícone maskable).
 */
function renderIcon(file, pxSize, mode, scale = 1) {
  const k = pxSize / SIZE;
  render(
    file,
    pxSize,
    pxSize,
    (x, y) => {
      const px = x / k;
      const py = y / k;
      if (mode !== 'bleed' && !inRoundedRect(px, py, 0, 0, SIZE, SIZE, TILE_RADIUS)) return null;
      return [...withMark(tileColorAt(px, py, SIZE, SIZE), px, py, scale), 255];
    },
    4
  );
}

/** Splash: fundo escuro full-bleed + marca centralizada (~34% da menor dimensão). */
function renderSplash(file, width, height) {
  const iconSize = Math.round(Math.min(width, height) * 0.34);
  const k = iconSize / SIZE;
  const ox = (width - iconSize) / 2;
  const oy = (height - iconSize) / 2;
  render(
    file,
    width,
    height,
    (x, y) => {
      const base = tileColorAt(x, y, width, height);
      const mx = (x - ox) / k;
      const my = (y - oy) / k;
      if (!inBox(mx, my, MARK_BOX)) return [...base, 255];
      return [...withMark(base, mx, my), 255];
    },
    2
  );
}

// ---- Ícones ----
mkdirSync(PUBLIC, { recursive: true });
renderIcon(join(PUBLIC, 'apple-touch-icon.png'), 180, 'bleed', 0.92);
renderIcon(join(PUBLIC, 'pwa-192x192.png'), 192, 'any');
renderIcon(join(PUBLIC, 'pwa-512x512.png'), 512, 'any');
renderIcon(join(PUBLIC, 'pwa-maskable-512x512.png'), 512, 'bleed', 0.86);

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
