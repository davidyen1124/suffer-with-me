// Every page of one window size side by side: node scripts/strip.mjs <size> [suffix] [cols]
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve(import.meta.dirname, '..')
const [size = 'mobile', suffix = '', cols = '8'] = process.argv.slice(2)
const dir = path.join(ROOT, 'qa/shots')
const files = fs.readdirSync(dir).filter((f) => f.startsWith(size + '-') && (suffix ? f.endsWith(`-t${suffix}.png`) : !/-t[\d.]+\.png$/.test(f))).sort()
const meta = await sharp(path.join(dir, files[0])).metadata()
const N = Number(cols)
const scale = Math.min(1, (N > 4 ? 2000 : 2400) / (meta.width * Math.min(N, files.length)))
const W = Math.round(meta.width * scale)
const H = Math.round(meta.height * scale)
const tiles = await Promise.all(files.map((f) => sharp(path.join(dir, f)).resize(W, H).toBuffer()))
const rows = Math.ceil(files.length / N)
const out = path.join(ROOT, `qa/${size}${suffix ? '-t' + suffix : ''}.jpg`)
await sharp({ create: { width: Math.min(N, files.length) * (W + 4), height: rows * (H + 4), channels: 3, background: '#000' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % N) * (W + 4), top: Math.floor(i / N) * (H + 4) })))
  .jpeg({ quality: 88 })
  .toFile(out)
console.log(out, files.length)
