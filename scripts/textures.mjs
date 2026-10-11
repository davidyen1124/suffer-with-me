// Pixel textures for the model, drawn here pixel by pixel and saved into blender/tex/.
// Three kinds: small repeating tiles (grey detail that the model's vertex colours tint), one sheet of
// faces (every expression the fluffy things have), and one sheet of labels (everything with lettering).
// blender/build_suffer.py reads atlas.json to place them. usage: node scripts/textures.mjs
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'blender/tex')
fs.mkdirSync(OUT, { recursive: true })

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255]

class Canvas {
  constructor(w, h, fill = [0, 0, 0, 0]) {
    this.w = w
    this.h = h
    this.d = new Uint8ClampedArray(w * h * 4)
    this.rect(0, 0, w, h, fill)
  }
  px(x, y, c) {
    x |= 0
    y |= 0
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = (y * this.w + x) * 4
    const a = c[3] === undefined ? 255 : c[3]
    if (a === 255) {
      this.d[i] = c[0]
      this.d[i + 1] = c[1]
      this.d[i + 2] = c[2]
      this.d[i + 3] = 255
    } else {
      const t = a / 255
      this.d[i] = this.d[i] * (1 - t) + c[0] * t
      this.d[i + 1] = this.d[i + 1] * (1 - t) + c[1] * t
      this.d[i + 2] = this.d[i + 2] * (1 - t) + c[2] * t
      this.d[i + 3] = Math.max(this.d[i + 3], a)
    }
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c)
  }
  frame(x, y, w, h, c) {
    this.rect(x, y, w, 1, c)
    this.rect(x, y + h - 1, w, 1, c)
    this.rect(x, y, 1, h, c)
    this.rect(x + w - 1, y, 1, h, c)
  }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) this.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c)
  }
  disc(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.px(x, y, c)
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4
        this.px(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2], src.d[i + 3]])
      }
  }
  // sprinkle: nudge every pixel a little lighter or darker, so flat areas read as printed, not as plastic
  grain(r, amount) {
    for (let i = 0; i < this.d.length; i += 4) {
      if (!this.d[i + 3]) continue
      const k = 1 + (r() - 0.5) * amount
      this.d[i] *= k
      this.d[i + 1] *= k
      this.d[i + 2] *= k
    }
    return this
  }
  save(file) {
    return sharp(Buffer.from(this.d.buffer), { raw: { width: this.w, height: this.h, channels: 4 } }).png().toFile(path.join(OUT, file))
  }
}

// ── two pixel fonts ───────────────────────────────────────────────────────
const F57 = {
  A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.', D: '####.#...##...##...##...##...#####.',
  E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....', G: '.###.#...##....#.####...##...#.###.', H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.', J: '..###...#....#....#....#.#..#..##..', K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##.#.##...##...##...#', N: '#...###..##.#.##..###...##...##...#', O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#', S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.', V: '#...##...##...##...##...#.#.#...#..', W: '#...##...##...##.#.##.#.###.###...#', X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
  0: '.###.#...##..###.#.###..##...#.###.', 1: '..#...##....#....#....#....#...###.', 2: '.###.#...#....#...#...#...#...#####', 3: '####.....#....#.###.....#....#####.',
  4: '...#...##..#.#.#..#.#####...#....#.', 5: '######....####.....#....##...#.###.', 6: '.###.#....#....####.#...##...#.###.', 7: '#####....#...#...#....#....#....#..',
  8: '.###.#...##...#.###.#...##...#.###.', 9: '.###.#...##...#.####....#....#.###.',
  $: '..#...#####.#...###...#.#####...#..', '/': '....#....#...#...#...#...#....#....', '~': '...........#...#.#.#...#...........', '.': '.........................##...##...',
  '+': '.......#....#..#####..#....#.......', '-': '...............#####...............', ':': '......##...##.........##...##......', ' ': '...................................',
  '!': '..#....#....#....#....#.........#..', '?': '.###.#...#....#...#...#.........#..', '¥': '#...#.#.#.#####..#..#####..#....#..', '>': '.#.....#.....#.....#...#...#...#...',
}
const F35 = {
  A: '.#.#.#####.##.#', B: '##.#.###.#.###.', C: '.###..#..#...##', D: '##.#.##.##.###.', E: '####..##.#..###', F: '####..##.#..#..', G: '.###..#.##.#.##', H: '#.##.#####.##.#',
  I: '###.#..#..#.###', J: '..#..#..##.#.#.', K: '#.##.###.#.##.#', L: '#..#..#..#..###', M: '#.########.##.#', N: '##.#.##.##.##.#', O: '.#.#.##.##.#.#.', P: '##.#.###.#..#..',
  Q: '.#.#.##.#.#..##', R: '##.#.###.#.##.#', S: '.###...#...###.', T: '###.#..#..#..#.', U: '#.##.##.##.####', V: '#.##.##.##.#.#.', W: '#.##.#######.##', X: '#.##.#.#.#.##.#',
  Y: '#.##.#.#..#..#.', Z: '###..#.#.#..###',
  0: '####.##.##.####', 1: '.#.##..#..#.###', 2: '##...#.#.#..###', 3: '##...#.#...###.', 4: '#.##.####..#..#', 5: '####..##...###.', 6: '.###..####.####', 7: '###..#.#..#..#.',
  8: '####.#####.####', 9: '####.####..###.', $: '.####..#..####.', '/': '..#..#.#.#..#..', '+': '....#.###.#....', '-': '......###......', '.': '.............#.', ':': '....#.....#....', ' ': '...............', '~': '....#.#.#......',
}
function text(cv, str, x, y, c, { font = F57, scale = 1, spacing = 1 } = {}) {
  const [gw, gh] = font === F57 ? [5, 7] : [3, 5]
  let cx = x
  for (const ch of String(str).toUpperCase()) {
    const g = font[ch] || font[' ']
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (g[j * gw + i] === '#') cv.rect(cx + i * scale, y + j * scale, scale, scale, c)
    cx += (gw + spacing) * scale
  }
  return cx - x - spacing * scale
}
const width = (str, { font = F57, scale = 1, spacing = 1 } = {}) => String(str).length * ((font === F57 ? 5 : 3) + spacing) * scale - spacing * scale
const centred = (cv, str, cx, y, c, o = {}) => text(cv, str, Math.round(cx - width(str, o) / 2), y, c, o)

// ── tiles: grey detail around white, 32px square, repeating ───────────────
const TILE = 32
function tile(name, paint) {
  const cv = new Canvas(TILE, TILE, [255, 255, 255, 255])
  paint(cv, rng(name.length * 7919 + name.charCodeAt(0) * 31))
  return cv.save(`tile_${name}.png`)
}
const grey = (v) => [v, v, v, 255]
const tiles = [
  tile('fur', (cv, r) => {
    // short strokes of pile, all brushed the same way
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(238 + Math.floor(r() * 14)))
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(r() * TILE)
      const y = Math.floor(r() * TILE)
      const v = 198 + Math.floor(r() * 24)
      cv.px(x, y, grey(v))
      cv.px(x, (y + 1) % TILE, grey(v + 14))
      if (r() < 0.5) cv.px((x + 1) % TILE, (y + 2) % TILE, grey(v + 22))
    }
    for (let i = 0; i < 22; i++) cv.px(r() * TILE, r() * TILE, grey(255))
  }),
  tile('fabric', (cv, r) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(((x >> 1) + (y >> 1)) % 2 ? 236 : 212 + Math.floor(r() * 10)))
    for (let y = 0; y < TILE; y += 2) for (let x = y % 4 ? 1 : 0; x < TILE; x += 4) cv.px(x, y, grey(196))
  }),
  tile('metal', (cv, r) => {
    for (let y = 0; y < TILE; y++) {
      const row = 224 + Math.floor(r() * 26)
      for (let x = 0; x < TILE; x++) cv.px(x, y, grey(row + Math.floor(r() * 8)))
    }
    for (let i = 0; i < 7; i++) cv.rect(Math.floor(r() * TILE), Math.floor(r() * TILE), 3 + Math.floor(r() * 5), 1, grey(255))
  }),
  tile('plastic', (cv, r) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(240 + Math.floor(r() * 10)))
    for (let i = 0; i < 10; i++) cv.px(r() * TILE, r() * TILE, grey(224))
  }),
  tile('paper', (cv, r) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(238 + Math.floor(r() * 14)))
    for (let i = 0; i < 12; i++) cv.rect(Math.floor(r() * TILE), Math.floor(r() * TILE), 2, 1, grey(222))
  }),
  tile('wood', (cv, r) => {
    for (let x = 0; x < TILE; x++) {
      const col = 222 + Math.floor(r() * 26)
      for (let y = 0; y < TILE; y++) cv.px(x, y, grey(col + Math.floor(r() * 8)))
    }
    for (let i = 0; i < 4; i++) cv.rect(Math.floor(r() * TILE), 0, 1, TILE, grey(190))
  }),
  tile('rubber', (cv, r) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(228 + Math.floor(r() * 22)))
    for (let y = 3; y < TILE; y += 8) cv.rect(0, y, TILE, 1, grey(204))
  }),
  tile('grass', (cv, r) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(226 + Math.floor(r() * 20)))
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * TILE)
      const y = Math.floor(r() * TILE)
      cv.px(x, y, grey(255))
      cv.px(x, (y + 1) % TILE, grey(196))
    }
  }),
  tile('cake', (cv, r) => {
    // the side of a pancake: a pale band between two browned edges
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) cv.px(x, y, grey(236 + Math.floor(r() * 16)))
    for (let i = 0; i < 30; i++) cv.px(r() * TILE, r() * TILE, grey(204))
  }),
]

// ── faces: one sheet, a cell for every expression ─────────────────────────
// A cell is the whole of the bare face inside the hood: 32 by 24 pixels of skin with eyes, cheeks and a mouth.
const CW = 32
const CH = 24
const A = (c, a) => [...c, a]
const SKIN = hex(0xf8dcc8)
const COLD = hex(0xcfe0f2)
const INK = hex(0x2b1c1c)
const WHITE = hex(0xffffff)
const BLUSH = hex(0xf2a3a0)
const TONGUE = hex(0xe9697a)
const SWEAT = hex(0x8fd0f2)
const FACES = {}
const faceArt = []
function face(name, paint, skin = SKIN) {
  const cv = new Canvas(CW, CH, A(skin, 255))
  // a touch of shade round the rim, where the hood's pile overhangs
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const d = ((x + 0.5 - CW / 2) / (CW / 2)) ** 2 + ((y + 0.5 - CH / 2) / (CH / 2)) ** 2
      if (d > 0.78) cv.px(x, y, A([150, 96, 80], 34))
    }
  paint(cv)
  faceArt.push({ name, cv })
}
const dots = (cv, pts, c) => pts.forEach(([x, y]) => cv.px(x, y, A(c, 255)))
const both = (f) => [9, 22].forEach((x, i) => f(x, i ? -1 : 1)) // the two eyes: centre x, and which way is "outwards"
const blush = (cv, big = false) => {
  for (const x of [3, 25]) {
    cv.rect(x, 13, 4, big ? 3 : 2, A(BLUSH, 255))
    cv.rect(x - 1, 13 + (big ? 1 : 0), 6, 1, A(BLUSH, 255))
  }
}
const eyeDot = (cv, x, y = 9) => {
  cv.rect(x - 1, y - 1, 3, 5, A(INK, 255))
  cv.rect(x - 2, y, 5, 3, A(INK, 255))
  cv.rect(x - 1, y, 1, 1, A(WHITE, 255))
}
const eyeArc = (cv, x, y = 9) => dots(cv, [[x - 2, y + 1], [x - 1, y], [x, y - 1], [x + 1, y], [x + 2, y + 1]], INK) // ^
const eyeLid = (cv, x, y = 10) => dots(cv, [[x - 2, y], [x - 1, y + 1], [x, y + 1], [x + 1, y + 1], [x + 2, y]], INK) // closed, lashes down
const eyeWide = (cv, x, y = 9, pupil = 0) => {
  cv.disc(x + 0.5, y + 0.5, 3.7, 3.7, A(INK, 255))
  cv.disc(x + 0.5, y + 0.5, 2.7, 2.7, A(WHITE, 255))
  cv.rect(x + pupil, y, 1, 2, A(INK, 255))
}
const smile = (cv, y = 15) => dots(cv, [[13, y], [14, y + 1], [15, y + 1], [16, y + 1], [17, y + 1], [18, y]], INK)

face('happy', (cv) => {
  blush(cv)
  both((x) => eyeDot(cv, x))
  smile(cv)
})
face('blink', (cv) => {
  blush(cv)
  both((x) => cv.rect(x - 2, 10, 5, 1, A(INK, 255)))
  smile(cv)
})
face('grin', (cv) => {
  blush(cv, true)
  both((x) => eyeArc(cv, x))
  cv.rect(12, 14, 8, 1, A(INK, 255))
  cv.rect(12, 15, 8, 3, A(INK, 255))
  cv.rect(13, 18, 6, 1, A(INK, 255))
  cv.rect(14, 16, 4, 2, A(TONGUE, 255))
  cv.rect(13, 15, 6, 1, A(WHITE, 255))
})
face('talk', (cv) => {
  blush(cv, true)
  both((x) => eyeArc(cv, x))
  cv.rect(14, 15, 4, 3, A(INK, 255))
  cv.rect(15, 17, 2, 1, A(TONGUE, 255))
})
face('asleep', (cv) => {
  blush(cv)
  both((x) => eyeLid(cv, x))
  cv.rect(15, 15, 2, 2, A(INK, 255))
  // a little dribble
  cv.rect(18, 16, 1, 3, A(SWEAT, 255))
})
face('dread', (cv) => {
  both((x, out) => eyeWide(cv, x, 9, out > 0 ? 0 : 0))
  dots(cv, [[11, 17], [12, 16], [13, 17], [14, 16], [15, 17], [16, 16], [17, 17], [18, 16], [19, 17], [20, 16]], INK)
  // the gloom that comes down over the brow
  for (const x of [22, 24, 26, 28]) cv.rect(x, 1, 1, 4 + ((x >> 1) % 2), A(hex(0x7d8fb5), 255))
})
face('shock', (cv) => {
  both((x) => {
    cv.disc(x + 0.5, 9.5, 3.7, 3.7, A(INK, 255))
    cv.disc(x + 0.5, 9.5, 2.7, 2.7, A(WHITE, 255))
    cv.rect(x, 9, 1, 1, A(INK, 255))
  })
  cv.disc(16, 17.5, 2.6, 3.2, A(INK, 255))
  cv.rect(15, 18, 2, 2, A(TONGUE, 255))
})
face('strain', (cv) => {
  cv.rect(2, 12, 6, 4, A(hex(0xee8f86), 255))
  cv.rect(24, 12, 6, 4, A(hex(0xee8f86), 255))
  // > <
  dots(cv, [[7, 7], [8, 8], [9, 9], [10, 10], [9, 11], [8, 12], [7, 13]], INK)
  dots(cv, [[24, 7], [23, 8], [22, 9], [21, 10], [22, 11], [23, 12], [24, 13]], INK)
  cv.rect(12, 15, 8, 2, A(INK, 255))
  cv.rect(14, 16, 5, 5, A(TONGUE, 255))
  cv.rect(16, 17, 1, 3, A(hex(0xc44f62), 255))
  cv.rect(28, 3, 2, 3, A(SWEAT, 255))
  cv.px(28, 2, A(SWEAT, 255))
  cv.rect(2, 5, 2, 2, A(SWEAT, 255))
})
face('dead', (cv) => {
  both((x) => {
    for (let k = -2; k <= 2; k++) {
      cv.px(x + k, 9 + k, A(INK, 255))
      cv.px(x + k, 9 - k, A(INK, 255))
    }
  })
  cv.rect(12, 16, 8, 1, A(INK, 255))
  cv.rect(17, 17, 4, 3, A(TONGUE, 255))
  cv.rect(18, 20, 2, 1, A(TONGUE, 255))
})
face(
  'frozen',
  (cv) => {
    both((x) => eyeWide(cv, x, 8, 0))
    // teeth, clenched
    cv.rect(10, 14, 12, 6, A(INK, 255))
    cv.rect(11, 15, 10, 4, A(WHITE, 255))
    cv.rect(11, 17, 10, 1, A(INK, 255))
    for (const x of [13, 16, 19]) cv.rect(x, 15, 1, 4, A(INK, 255))
    // an icicle on the brow
    cv.rect(4, 1, 2, 3, A(WHITE, 255))
    cv.px(4, 4, A(WHITE, 255))
    cv.rect(26, 1, 2, 2, A(WHITE, 255))
  },
  COLD,
)
face('bliss', (cv) => {
  blush(cv, true)
  both((x) => eyeArc(cv, x, 10))
  dots(cv, [[12, 15], [13, 16], [14, 16], [15, 15], [16, 15], [17, 16], [18, 16], [19, 15]], INK)
  // sparkle
  for (const [x, y] of [[4, 4], [27, 6]]) {
    cv.rect(x - 1, y, 3, 1, A(WHITE, 255))
    cv.rect(x, y - 1, 1, 3, A(WHITE, 255))
  }
})
face('smug', (cv) => {
  blush(cv)
  both((x) => {
    cv.rect(x - 2, 9, 5, 3, A(INK, 255))
    cv.rect(x - 2, 8, 5, 1, A(hex(0xd9a48f), 255))
    cv.px(x - 1, 10, A(WHITE, 255))
  })
  dots(cv, [[13, 16], [14, 16], [15, 16], [16, 16], [17, 15], [18, 14]], INK)
})

const FCOLS = 4
const faceSheet = new Canvas(128, 128, A(SKIN, 255))
faceArt.forEach(({ name, cv }, i) => {
  const x = (i % FCOLS) * CW
  const y = Math.floor(i / FCOLS) * CH
  faceSheet.blit(cv, x, y)
  FACES[name] = { x, y }
})

// ── label atlas ───────────────────────────────────────────────────────────
const C = {
  ink: hex(0x1a1a22), cream: hex(0xf3ead6), white: hex(0xfbf8f0), gold: hex(0xe0b04a), goldDark: hex(0x8a6418), red: hex(0xc8323a), wax: hex(0x8f1d24),
  wood: hex(0xb98a55), woodDark: hex(0x5b3a1c), steel: hex(0xb9c2cc), green: hex(0x1f4a38),
}
const labels = {}
const art = []
function label(name, w, h, paint) {
  const cv = new Canvas(w, h, [0, 0, 0, 0])
  paint(cv, rng(name.length * 131 + w * 17 + h))
  art.push({ name, cv })
}

// the invitation: an envelope, front and back
label('envelope_front', 56, 38, (cv, r) => {
  cv.rect(0, 0, 56, 38, A(C.cream, 255))
  cv.frame(0, 0, 56, 38, A(hex(0xcbbf9f), 255))
  cv.frame(3, 3, 50, 32, A(C.gold, 255))
  centred(cv, 'TO YOU', 28, 12, A(C.green, 255))
  for (const y of [23, 27]) cv.rect(14, y, 28, 1, A(hex(0xb9ad8d), 255))
  cv.grain(r, 0.05)
})
label('envelope_back', 56, 38, (cv, r) => {
  cv.rect(0, 0, 56, 38, A(C.cream, 255))
  cv.frame(0, 0, 56, 38, A(hex(0xcbbf9f), 255))
  // the flap
  cv.line(0, 0, 28, 21, A(hex(0xb9ad8d), 255))
  cv.line(55, 0, 28, 21, A(hex(0xb9ad8d), 255))
  cv.line(0, 37, 20, 18, A(hex(0xd9cfb2), 255))
  cv.line(55, 37, 35, 18, A(hex(0xd9cfb2), 255))
  cv.grain(r, 0.05)
})
// the alarm clock's dial, at a quarter to five
label('dial', 32, 32, (cv, r) => {
  cv.disc(16, 16, 16, 16, A(C.white, 255))
  cv.disc(16, 16, 15, 15, A(hex(0xf6efdc), 255))
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    cv.rect(Math.round(15.5 + Math.sin(a) * 12.5), Math.round(15.5 - Math.cos(a) * 12.5), k % 3 ? 1 : 2, k % 3 ? 1 : 2, A(C.ink, 255))
  }
  // hour hand a little short of five, minute hand on the nine
  cv.line(16, 16, 20, 23, A(C.ink, 255))
  cv.line(15, 16, 19, 23, A(C.ink, 255))
  cv.line(16, 16, 5, 16, A(C.ink, 255))
  cv.line(16, 15, 5, 15, A(C.red, 255))
  cv.rect(15, 15, 2, 2, A(C.red, 255))
  cv.grain(r, 0.04)
})
// the race number: everyone here is running in the same category
label('bib', 20, 14, (cv, r) => {
  cv.rect(0, 0, 20, 14, A(C.white, 255))
  cv.frame(0, 0, 20, 14, A(hex(0xc9c4b6), 255))
  cv.rect(1, 1, 18, 3, A(C.red, 255))
  centred(cv, '2', 10, 5, A(C.ink, 255))
  cv.grain(r, 0.04)
})
// the sign that goes past, and goes past
label('sign', 64, 26, (cv, r) => {
  cv.rect(0, 0, 64, 26, A(C.wood, 255))
  for (const y of [8, 17]) cv.rect(0, y, 64, 1, A(hex(0xa67a47), 255))
  cv.frame(0, 0, 64, 26, A(C.woodDark, 255))
  centred(cv, 'ALMOST', 32, 4, A(C.white, 255))
  centred(cv, 'THERE >', 32, 15, A(C.white, 255))
  cv.grain(r, 0.07)
})
// the flag at the top of the hill
label('flag', 29, 22, (cv, r) => {
  cv.rect(0, 0, 29, 22, A(C.red, 255))
  cv.frame(0, 0, 29, 22, A(C.wax, 255))
  centred(cv, 'ONE', 15, 3, A(C.white, 255))
  centred(cv, 'MORE', 15, 12, A(C.white, 255))
  cv.grain(r, 0.06)
})
label('kg', 15, 11, (cv) => {
  cv.rect(0, 0, 15, 11, A(hex(0x26262c), 255))
  centred(cv, '32', 8, 2, A(hex(0xe9e4d6), 255))
})
// the thermometer clipped to the tub
label('temp', 30, 16, (cv, r) => {
  cv.rect(0, 0, 30, 16, A(C.white, 255))
  cv.frame(0, 0, 30, 16, A(C.ink, 255))
  text(cv, '3', 5, 5, A(hex(0x1e62b8), 255))
  cv.frame(12, 4, 3, 3, A(hex(0x1e62b8), 255))
  text(cv, 'C', 17, 5, A(hex(0x1e62b8), 255))
  cv.grain(r, 0.03)
})
label('medal', 20, 20, (cv, r) => {
  cv.disc(10, 10, 10, 10, A(C.goldDark, 255))
  cv.disc(10, 10, 9, 9, A(C.gold, 255))
  cv.disc(10, 10, 7, 7, A(hex(0xf2cf74), 255))
  centred(cv, '2', 10, 7, A(C.goldDark, 255))
  cv.grain(r, 0.05)
})
// the top of a pancake, with its butter and what is poured over it
label('pancake', 32, 32, (cv, r) => {
  cv.disc(16, 16, 16, 16, A(hex(0xb9772f), 255))
  cv.disc(16, 16, 14.5, 14.5, A(hex(0xe2a653), 255))
  cv.disc(15, 15, 11, 10, A(hex(0xeab768), 255))
  // syrup, pooled and running to the edge
  cv.disc(17, 17, 8, 7, A(hex(0x8a4a16), 255))
  cv.rect(22, 18, 5, 4, A(hex(0x8a4a16), 255))
  cv.rect(8, 20, 4, 6, A(hex(0x8a4a16), 255))
  cv.disc(16, 16, 5, 4, A(hex(0xa45f1f), 255))
  cv.rect(13, 12, 7, 6, A(hex(0xfbe58a), 255))
  cv.rect(13, 12, 7, 1, A(hex(0xfff6c4), 255))
  cv.grain(r, 0.05)
})

// shelf-pack the labels into one square sheet, with a transparent gutter between them
const SHEET = 256
const sheet = new Canvas(SHEET, SHEET, [0, 0, 0, 0])
// the wax seal on the back of the envelope is the painted one, shrunk (scripts/cook.mjs)
const sealFile = path.join(OUT, 'seal.png')
if (fs.existsSync(sealFile)) {
  const { data, info } = await sharp(sealFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const back = art.find((a) => a.name === 'envelope_back').cv
  const seal = new Canvas(info.width, info.height)
  seal.d.set(data)
  back.blit(seal, Math.round(28 - info.width / 2), Math.round(21 - info.height / 2))
}
let x = 2
let y = 2
let rowH = 0
for (const { name, cv } of art.sort((a, b) => b.cv.h - a.cv.h)) {
  if (x + cv.w + 2 > SHEET) {
    x = 2
    y += rowH + 4
    rowH = 0
  }
  // bleed one pixel of the label's own edge into the gutter, so nearest sampling never picks up a neighbour
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) sheet.blit(cv, x + dx, y + dy)
  sheet.blit(cv, x, y)
  labels[name] = { x, y, w: cv.w, h: cv.h }
  x += cv.w + 4
  rowH = Math.max(rowH, cv.h)
}
if (y + rowH > SHEET) throw new Error('label sheet is full')
// a plain card to stand in for the painted backdrops, which the page puts on itself
const blank = new Canvas(4, 4, [255, 255, 255, 255])
await Promise.all([...tiles, sheet.save('labels.png'), faceSheet.save('faces.png'), blank.save('blank.png')])
fs.writeFileSync(path.join(OUT, 'atlas.json'), JSON.stringify({ size: SHEET, tile: TILE, labels, faces: { size: 128, w: CW, h: CH, cells: FACES } }, null, 1))
// the page needs to know where each face is on the sheet
fs.writeFileSync(path.join(ROOT, 'src/faces.json'), JSON.stringify({ size: 128, w: CW, h: CH, cells: FACES }))
console.log(`tiles: ${tiles.length}, faces: ${faceArt.length}, labels: ${Object.keys(labels).length}, sheet used down to y=${y + rowH} of ${SHEET}`)
