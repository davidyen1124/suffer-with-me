// Cuts the paintings from art/raw down to what the page loads.
//   public/art/bg-<scene>.png     the part of a backdrop that shows above the stage, at the 3D's own coarse size
//   public/art/floor-<scene>.png  the painted ground under it, which is laid on the stage floor
//   public/art/crest.png, seal.png  the gold crest and the wax seal, in the same coarse pixels
//   blender/tex/seal.png          the seal again, tiny, for the envelope's label (scripts/textures.mjs)
// usage: node scripts/cook.mjs
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'art/raw')
const OUT = path.join(ROOT, 'public/art')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(ROOT, 'blender/tex'), { recursive: true })

export const FLAT = { w: 2.6, h: 2.1 } // the backdrop card, in metres (blender/build_suffer.py makes it this size)
const BW = 320
const BH = Math.round((BW * FLAT.h) / FLAT.w)

// top: where the window starts, as a fraction of the painting's height; floor: where its ground begins
const SCENES = {
  cover: { top: 0.0, floor: 0.7 },
  alarm: { top: 0.03, floor: 0.74 },
  run: { top: 0.02, floor: 0.68, wide: true },
  hill: { top: 0.0, floor: 0.72 },
  gym: { top: 0.0, floor: 0.66 },
  plunge: { top: 0.02, floor: 0.74 },
  brunch: { top: 0.0, floor: 0.66 },
  rsvp: { top: 0.05, floor: 0.78 },
}

for (const [name, s] of Object.entries(SCENES)) {
  const src = path.join(RAW, `bg-${name}.png`)
  const { width: W, height: H } = await sharp(src).metadata()
  // the square paintings are as wide as the card; the wide one keeps its whole width and slides past
  const h = s.wide ? Math.round(H * 0.8) : Math.round((W * FLAT.h) / FLAT.w)
  const top = Math.min(Math.round(H * s.top), H - h)
  const w = s.wide ? Math.round((BH * W) / h) : BW
  await sharp(src).extract({ left: 0, top, width: W, height: h }).resize(w, BH, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, `bg-${name}.png`))
  const f0 = Math.round(H * s.floor) + 8
  await sharp(src).extract({ left: 0, top: f0, width: W, height: H - f0 }).resize(128, 64, { kernel: 'lanczos3', fit: 'fill' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, `floor-${name}.png`))
  console.log(`bg-${name}`.padEnd(12), `${w}x${BH}`, 'floor from', s.floor)
}

// the ornaments: trimmed, shrunk with hard edges, alpha made all-or-nothing so they have pixel outlines
async function ornament(name, size, file = path.join(OUT, `${name}.png`)) {
  const { data, info } = await sharp(path.join(RAW, `${name}.png`)).trim().resize(size, size, { fit: 'inside', kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0
  await sharp(data, { raw: info }).png({ compressionLevel: 9, palette: true, colours: 48 }).toFile(file)
  console.log(name.padEnd(12), `${info.width}x${info.height}`)
}
await ornament('crest', 132)
await ornament('seal', 72)
await ornament('seal', 18, path.join(ROOT, 'blender/tex/seal.png'))
