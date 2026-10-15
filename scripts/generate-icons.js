import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate a basic valid uncompressed/deflated PNG
function createSolidPng(width, height, r, g, b, a = 255) {
  // A minimal valid PNG generator using standard Node.js zlib
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines: for each row, 1 filter byte (0) + width * 4 bytes RGBA
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    // Draw an emerald themed icon with rounded corner feel and card center
    const cx = width / 2;
    const cy = height / 2;
    const radius = width * 0.45;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background
      const gradRatio = (x + y) / (width + height);
      let pr = Math.round(5 + 10 * gradRatio);
      let pg = Math.round(150 + 35 * gradRatio);
      let pb = Math.round(110 + 20 * gradRatio);

      // Card in the center
      const cardW = width * 0.65;
      const cardH = height * 0.55;
      const inCard = Math.abs(dx) < cardW / 2 && Math.abs(dy) < cardH / 2;

      if (inCard) {
        // White receipt card
        pr = 255;
        pg = 255;
        pb = 255;
        // Header band in card
        if (dy < -cardH * 0.25) {
          pr = 16;
          pg = 185;
          pb = 129;
        }
      }

      rawData[pxOffset] = pr;
      rawData[pxOffset + 1] = pg;
      rawData[pxOffset + 2] = pb;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcPayload = Buffer.concat([typeBuffer, data]);

  const crc = crc32(crcPayload);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Standard CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192, 512x512, apple-touch-icon 180x180, and maskable 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createSolidPng(192, 192, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createSolidPng(512, 512, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createSolidPng(512, 512, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSolidPng(180, 180, 16, 185, 129));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createSolidPng(32, 32, 16, 185, 129));

console.log('PWA icon assets generated successfully in public/');
