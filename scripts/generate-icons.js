import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons from SVG...');

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('✓ Created public/pwa-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('✓ Created public/pwa-512x512.png');

  // apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✓ Created public/apple-touch-icon.png');

  // pwa-maskable-512x512.png (padded to 80% safe zone with background color #4F46E5)
  const innerSize = Math.round(512 * 0.8);
  const padding = Math.round((512 - innerSize) / 2);

  const innerIcon = await sharp(svgBuffer)
    .resize(innerSize, innerSize)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 79, g: 70, b: 229, alpha: 1 },
    },
  })
    .composite([{ input: innerIcon, top: padding, left: padding }])
    .png()
    .toFile('public/pwa-maskable-512x512.png');
  console.log('✓ Created public/pwa-maskable-512x512.png');

  console.log('All icons generated successfully!');
}

generate().catch(console.error);
