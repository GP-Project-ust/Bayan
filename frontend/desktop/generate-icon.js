const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const svgIcon = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0E2F56"/>
      <stop offset="100%" stop-color="#06162B"/>
    </linearGradient>
    <linearGradient id="turqGrad" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#00D4E5"/>
      <stop offset="100%" stop-color="#008B96"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#F4A261"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect x="8" y="8" width="240" height="240" rx="54" fill="url(#bgGrad)"/>
  <rect x="8" y="8" width="240" height="240" rx="54" stroke="url(#turqGrad)" stroke-width="3" stroke-opacity="0.6"/>

  <!-- Subtle inner background pattern / circular glow -->
  <circle cx="128" cy="110" r="70" fill="#00A6B2" fill-opacity="0.08" filter="url(#glow)"/>

  <!-- Academic Cap (Graduation Cap) -->
  <g filter="url(#shadow)" transform="translate(0, -6)">
    <!-- Cap Rhombus -->
    <polygon points="128,48 200,74 128,100 56,74" fill="url(#turqGrad)"/>
    <polygon points="128,52 192,74 128,96 64,74" fill="#0A2342"/>
    
    <!-- Skull Cap Underneath -->
    <path d="M88,86 C88,110 168,110 168,86 Z" fill="url(#turqGrad)"/>

    <!-- Tassel Button & Cord -->
    <circle cx="128" cy="74" r="4.5" fill="#FFD166"/>
    <path d="M128,74 Q170,82 178,110" stroke="#FFD166" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="174" y="110" width="8" height="14" rx="2" fill="#FFD166"/>
  </g>

  <!-- Open Book Emblem -->
  <g filter="url(#shadow)" transform="translate(0, 16)">
    <!-- Left page -->
    <path d="M128,132 C108,124 74,124 54,136 L54,178 C74,166 108,166 128,174 Z" fill="#FAFCFF" fill-opacity="0.95"/>
    <path d="M128,132 C108,124 74,124 54,136 L54,140 C74,128 108,128 128,136 Z" fill="#00A6B2"/>
    
    <!-- Right page -->
    <path d="M128,132 C148,124 182,124 202,136 L202,178 C182,166 148,166 128,174 Z" fill="#FAFCFF" fill-opacity="0.95"/>
    <path d="M128,132 C148,124 182,124 202,136 L202,140 C182,128 148,128 128,136 Z" fill="#00A6B2"/>

    <!-- Book Spine center line -->
    <line x1="128" y1="130" x2="128" y2="175" stroke="#007681" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- Arabic Typography "بيان" -->
  <g filter="url(#shadow)" transform="translate(0, 18)">
    <text x="128" y="214" font-family="'Cairo', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif" font-size="34" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">بيان</text>
  </g>

  <!-- AI Sparkle in top right -->
  <path d="M208,44 Q208,54 218,54 Q208,54 208,64 Q208,54 198,54 Q208,54 208,44 Z" fill="#00D4E5" filter="url(#glow)"/>
</svg>
`.trim();

async function main() {
  const svgPath = path.join(assetsDir, 'icon.svg');
  const pngPath = path.join(assetsDir, 'icon.png');
  const icoPath = path.join(assetsDir, 'icon.ico');

  fs.writeFileSync(svgPath, svgIcon, 'utf8');
  console.log('Saved SVG icon:', svgPath);

  // Generate 256x256 PNG
  await sharp(Buffer.from(svgIcon))
    .resize(256, 256)
    .png()
    .toFile(pngPath);
  console.log('Saved PNG icon (256x256):', pngPath);

  // Generate multi-size ICO file
  // Windows ICO format specification:
  // Header: 6 bytes (Reserved 2 bytes, Type 2 bytes = 1 for icon, Count 2 bytes)
  // Icon Entry: 16 bytes each
  // Image Data: PNG or BMP
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  for (const s of sizes) {
    const buf = await sharp(Buffer.from(svgIcon))
      .resize(s, s)
      .png()
      .toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  // Construct ICO buffer
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type = 1 (Icon)
  header.writeUInt16LE(count, 4); // Count

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0); // Width
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image size
    entry.writeUInt32LE(offset, 12); // Offset
    entries.push(entry);
    offset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...entries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Saved multi-resolution ICO icon:', icoPath);
}

main().catch(console.error);

