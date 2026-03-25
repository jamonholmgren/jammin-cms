#!/usr/bin/env node
// Generates PNG icon files for the Chrome extension using only built-in modules.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// --- Minimal PNG encoder ---

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // no filter
    pixels.copy(raw, y * rowLen + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Drawing helpers ---

function createBuffer(size) { return Buffer.alloc(size * size * 4); }

function setPixel(buf, size, x, y, r, g, b, a) {
  const i = (y * size + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function blendPixel(buf, size, x, y, r, g, b, a) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  const ba = buf[i + 3] / 255;
  const fa = a / 255;
  const oa = fa + ba * (1 - fa);
  if (oa === 0) return;
  buf[i]     = Math.round((r * fa + buf[i]     * ba * (1 - fa)) / oa);
  buf[i + 1] = Math.round((g * fa + buf[i + 1] * ba * (1 - fa)) / oa);
  buf[i + 2] = Math.round((b * fa + buf[i + 2] * ba * (1 - fa)) / oa);
  buf[i + 3] = Math.round(oa * 255);
}

// Supersampled signed-distance drawing for smooth edges
function drawIcon(size) {
  const buf = createBuffer(size);
  const S = size;
  const ss = 4; // supersample grid

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let bgHits = 0;
      let jHits = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = (x + (sx + 0.5) / ss) / S;
          const py = (y + (sy + 0.5) / ss) / S;

          if (inRoundedRect(px, py, 0.04, 0.04, 0.92, 0.92, 0.18)) bgHits++;
          if (inLetterJ(px, py)) jHits++;
        }
      }

      const total = ss * ss;
      const bgAlpha = bgHits / total;
      const jAlpha = jHits / total;

      // Purple background
      if (bgAlpha > 0) {
        blendPixel(buf, S, x, y, 99, 102, 241, Math.round(bgAlpha * 255));
      }
      // White J
      if (jAlpha > 0) {
        blendPixel(buf, S, x, y, 255, 255, 255, Math.round(jAlpha * 255));
      }
    }
  }
  return buf;
}

function inRoundedRect(px, py, rx, ry, rw, rh, radius) {
  if (px < rx || px > rx + rw || py < ry || py > ry + rh) return false;
  // Check corners
  const corners = [
    [rx + radius, ry + radius],
    [rx + rw - radius, ry + radius],
    [rx + radius, ry + rh - radius],
    [rx + rw - radius, ry + rh - radius],
  ];
  for (const [cx, cy] of corners) {
    const inCornerX = (px < rx + radius && cx === corners[0][0]) || (px > rx + rw - radius && cx === corners[1][0]);
    const inCornerY = (py < ry + radius && cy === corners[0][1]) || (py > ry + rh - radius && cy === corners[2][1]);
    if (inCornerX && inCornerY) {
      const dx = px - cx, dy = py - cy;
      if (dx * dx + dy * dy > radius * radius) return false;
    }
  }
  return true;
}

function inLetterJ(px, py) {
  const w = 0.135; // stroke width

  // Top serif bar
  if (py >= 0.18 && py <= 0.18 + w && px >= 0.26 && px <= 0.72) return true;

  // Vertical stem (right-aligned, classic J)
  const stemL = 0.58 - w / 2, stemR = 0.58 + w / 2;
  if (px >= stemL && px <= stemR && py >= 0.18 && py <= 0.58) return true;

  // Curved bottom hooking left
  const arcCx = 0.42, arcCy = 0.58;
  const outerR = stemR - arcCx, innerR = outerR - w;
  const dx = px - arcCx, dy = py - arcCy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= innerR && dist <= outerR && py >= arcCy - 0.02 && px <= stemR) return true;

  // Left tail rising from curve
  const tailX = arcCx - outerR;
  if (px >= tailX && px <= tailX + w && py >= 0.52 && py <= arcCy + outerR) return true;

  return false;
}

// --- Main ---

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const pixels = drawIcon(size);
  const png = encodePNG(size, size, pixels);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${png.length} bytes)`);
}
