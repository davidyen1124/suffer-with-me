// Favicon, app icons and the social card. The icons are the guest's face, drawn here pixel by pixel; the
// card is a photograph of the cover itself, so it always matches it. Needs the dev server
// (npm run dev -- --port 5190), or set BASE.
import { chromium } from 'playwright'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUB = path.join(ROOT, 'public')
const base = process.env.BASE || 'http://localhost:5190'
const CARD = '#113428'

// ── the icon: the guest's face, drawn pixel by pixel, on a tile of the card ──────────────
const PAL = {
  g: [17, 52, 40], // the card
  c: [246, 239, 226], // fur
  d: [222, 211, 190], // fur, in its own shade
  w: [255, 255, 255], // the trim of the hood
  s: [248, 220, 200], // face
  k: [43, 28, 28], // eyes, mouth
  p: [242, 163, 160], // cheeks
  e: [242, 196, 190], // the inside of an ear
  y: [216, 178, 90], // gold
}
class Icon {
  constructor(n) {
    this.n = n
    this.d = new Uint8ClampedArray(n * n * 4)
  }
  px(x, y, k) {
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return
    this.d.set(k === '.' ? [0, 0, 0, 0] : [...PAL[k], 255], (y * this.n + x) * 4)
  }
  rect(x, y, w, h, k) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, k)
  }
  // every pixel whose middle is inside the ellipse (and for which `where` holds)
  disc(cx, cy, rx, ry, k, where = () => true) {
    for (let y = 0; y < this.n; y++) for (let x = 0; x < this.n; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && where(x, y)) this.px(x, y, k)
  }
  png(scale = 1) {
    return sharp(Buffer.from(this.d.buffer), { raw: { width: this.n, height: this.n, channels: 4 } }).resize(this.n * scale, this.n * scale, { kernel: 'nearest' }).png({ compressionLevel: 9 })
  }
  // the same picture as an SVG: a run of one colour is one rectangle
  svg() {
    let out = ''
    for (let y = 0; y < this.n; y++)
      for (let x = 0; x < this.n; ) {
        const i = (y * this.n + x) * 4
        let run = 1
        while (x + run < this.n && [0, 1, 2, 3].every((c) => this.d[i + c] === this.d[i + run * 4 + c])) run++
        if (this.d[i + 3]) out += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="#${[0, 1, 2].map((c) => this.d[i + c].toString(16).padStart(2, '0')).join('')}"/>`
        x += run
      }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.n} ${this.n}" shape-rendering="crispEdges">${out}</svg>\n`
  }
}

// at sixteen pixels every one of them is placed by hand
const TINY = new Icon(16)
;[
  '.gggggggggggggg.',
  'ggcccggggggcccgg',
  'ggceccccccccecgg',
  'gccccccccccccccg',
  'gccwwwwwwwwwwccg',
  'gcwsssssssssswcg',
  'gcwsskssssksswcg',
  'gcwsskssssksswcg',
  'gcwppsskkssppwcg',
  'gccwsssssssswccg',
  'gcccwwwwwwwwcccg',
  'gccccccccccccccg',
  'gdccccccccccccdg',
  'ggddddddddddddgg',
  'gggggggggggggggg',
  '.gggggggggggggg.',
].forEach((row, y) => [...row].forEach((k, x) => TINY.px(x, y, k)))

// at thirty-two there is room to draw it: `tile` rounds the corners off, for a browser tab; without it the
// card runs to the edges and has a gold rule round it, for a home screen
function face(tile) {
  const cv = new Icon(32)
  cv.rect(0, 0, 32, 32, 'g')
  if (tile) {
    const r = 5.5
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const dx = Math.max(r - (x + 0.5), x + 0.5 - (32 - r), 0)
        const dy = Math.max(r - (y + 0.5), y + 0.5 - (32 - r), 0)
        if (dx * dx + dy * dy > r * r) cv.px(x, y, '.')
      }
  } else {
    for (const [x, y, w, h] of [[1, 1, 30, 1], [1, 30, 30, 1], [1, 1, 1, 30], [30, 1, 1, 30]]) cv.rect(x, y, w, h, 'y')
  }
  const up = tile ? 0 : 1 // inside the gold rule it sits a pixel higher, to stay clear of it
  for (const x of [8, 24]) {
    cv.disc(x, 7.6 - up, 3.7, 3.7, 'c')
    cv.disc(x, 7.9 - up, 1.8, 1.8, 'e')
  }
  const cy = 18 - up
  const head = (x, y) => ((x + 0.5 - 16) / 12.6) ** 2 + ((y + 0.5 - cy) / 11.6) ** 2 <= 1
  cv.disc(16, cy, 12.6, 11.6, 'c')
  cv.disc(16, cy, 12.6, 11.6, 'd', (x, y) => ((x + 0.5 - 16) / 12.6) ** 2 + ((y + 0.5 - cy + 1.8) / 11.6) ** 2 > 1)
  // the tuft that will not lie down
  cv.rect(15, 4 - up, 2, 3, 'w')
  cv.px(13, 5 - up, 'w')
  cv.px(18, 5 - up, 'w')
  // the trim of the hood, tuft by tuft, and the face inside it
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    cv.disc(16 + Math.cos(a) * 9.3, cy + 0.6 + Math.sin(a) * 7.2, 2.2, 2.2, 'w', head)
  }
  cv.disc(16, cy + 0.6, 8.6, 6.5, 's')
  for (const x of [11, 19]) {
    cv.rect(x, 16 - up, 2, 4, 'k')
    cv.px(x, 16 - up, 'w')
  }
  cv.rect(8, 20 - up, 3, 2, 'p')
  cv.rect(21, 20 - up, 3, 2, 'p')
  for (const [x, y] of [[14, 21], [15, 22], [16, 22], [17, 21]]) cv.px(x, y - up, 'k')
  return cv
}
const TAB = face(true)
const HOME = face(false)

// home screens: whole pixels, so 192 and 512 are the drawing six and sixteen times over, and 180 is five
// times over with the card carried on to the edges
await HOME.png(6).toFile(path.join(PUB, 'icon-192.png'))
await HOME.png(16).toFile(path.join(PUB, 'icon-512.png'))
await sharp({ create: { width: 180, height: 180, channels: 4, background: { r: PAL.g[0], g: PAL.g[1], b: PAL.g[2], alpha: 1 } } })
  .composite([{ input: await HOME.png(5).toBuffer(), gravity: 'centre' }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(PUB, 'apple-touch-icon.png'))

// browser tabs: an SVG for browsers that take one, and an .ico of PNGs for the rest
fs.writeFileSync(path.join(PUB, 'favicon.svg'), TAB.svg())
const sizes = [16, 32, 48]
const pngs = { 16: await TINY.png().toBuffer(), 32: await TAB.png().toBuffer(), 48: await TINY.png(3).toBuffer() }
fs.writeFileSync(path.join(PUB, 'favicon-32.png'), pngs[32])
// favicon.ico with PNG-compressed entries
const header = Buffer.alloc(6)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = 6 + 16 * sizes.length
const entries = sizes.map((s) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(s, 0)
  e.writeUInt8(s, 1)
  e.writeUInt16LE(1, 4)
  e.writeUInt16LE(32, 6)
  e.writeUInt32LE(pngs[s].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += pngs[s].length
  return e
})
fs.writeFileSync(path.join(PUB, 'favicon.ico'), Buffer.concat([header, ...entries, ...sizes.map((s) => pngs[s])]))

fs.writeFileSync(
  path.join(PUB, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'You are cordially invited to suffer',
      short_name: 'Suffer',
      description: 'A formal invitation to runs, workouts and type 2 fun. A fan-made page.',
      start_url: '.', // (a manifest's addresses are relative to the manifest, so these work under a sub-path)
      display: 'browser',
      background_color: CARD,
      theme_color: CARD,
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  ) + '\n',
)

// social card, 1200 × 630: the cover in its ?card layout (src/main.js), which is composed to be read small
{
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })).newPage()
  await page.goto(`${base}/?card&t=0.22`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__suffer?.ready, null, { timeout: 60000 })
  await page.waitForTimeout(900)
  const buf = await page.screenshot({ type: 'png' })
  await sharp(buf).resize(1200, 630).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(PUB, 'og.jpg'))
  await browser.close()
}

for (const f of ['favicon.ico', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'og.jpg'])
  console.log(f.padEnd(22), (fs.statSync(path.join(PUB, f)).size / 1024).toFixed(1) + ' KB')
