const sharp = require('sharp')
const path = require('path')

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')

const ICONS = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-maskable-512x512.png', size: 512, padding: 0.15 },
  { name: 'apple-touch-icon.png', size: 180 },
]

function buildSvg(size, padding = 0) {
  const padPx = Math.floor(size * padding)
  const s = size - padPx * 2
  const r = Math.floor(size * 0.22)
  const cx = size / 2
  const gx = padPx + s * 0.2
  const gy = padPx + s * 0.25

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#4A90D9"/>
      <g transform="translate(${gx}, ${gy})" fill="white">
        <path d="M${s*0.1},0 L${s*0.3},${s*0.06} L${s*0.3},${s*0.48} L${s*0.1},${s*0.42} Z" opacity="0.9"/>
        <path d="M${s*0.3},${s*0.06} L${s*0.5},0 L${s*0.5},${s*0.42} L${s*0.3},${s*0.48} Z" opacity="0.75"/>
        <line x1="${s*0.3}" y1="${s*0.06}" x2="${s*0.3}" y2="${s*0.48}" stroke="white" stroke-width="${Math.max(1, size*0.008)}" opacity="0.6"/>
        <rect x="${s*0.02}" y="${s*0.58}" width="${s*0.56}" height="${Math.max(2, size*0.03)}" rx="${size*0.015}" fill="rgba(255,255,255,0.7)"/>
        <rect x="${s*0.08}" y="${s*0.68}" width="${s*0.5}" height="${Math.max(2, size*0.025)}" rx="${size*0.012}" fill="rgba(255,255,255,0.5)"/>
        <circle cx="${cx - padPx}" cy="${gy + s*0.6}" r="${s*0.08}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="${Math.max(1, size*0.015)}"/>
      </g>
    </svg>
  `
}

async function main() {
  console.log('🖼️  生成 PWA 图标...\n')

  for (const icon of ICONS) {
    const svg = buildSvg(icon.size, icon.padding || 0)
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(PUBLIC_DIR, icon.name))

    const padInfo = icon.padding ? ` (padding: ${Math.floor(icon.padding * 100)}%)` : ''
    console.log(`  ✅ ${icon.name} (${icon.size}×${icon.size}${padInfo})`)
  }

  console.log('\n🎉 所有图标生成完成！')
  console.log(`   位置: ${PUBLIC_DIR}`)
}

main().catch(console.error)
