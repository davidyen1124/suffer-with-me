// A contact sheet of pictures, for looking at many at once: node scripts/sheet.mjs out.jpg cell cols file...
import sharp from 'sharp'
const [out, cell, cols, ...files] = process.argv.slice(2)
const C = Number(cell)
const N = Number(cols)
const rows = Math.ceil(files.length / N)
const tiles = await Promise.all(files.map((f) => sharp(f).resize(C, C, { fit: 'contain', background: '#3a3a3a' }).flatten({ background: '#3a3a3a' }).toBuffer()))
await sharp({ create: { width: N * C + (N + 1) * 6, height: rows * C + (rows + 1) * 6, channels: 3, background: '#111' } })
  .composite(tiles.map((input, i) => ({ input, left: 6 + (i % N) * (C + 6), top: 6 + Math.floor(i / N) * (C + 6) })))
  .jpeg({ quality: 86 })
  .toFile(out)
console.log(out)
