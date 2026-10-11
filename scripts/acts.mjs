// The acting, frame by frame: every theatre photographed at several moments of its loop.
// node scripts/acts.mjs [size] [times, comma separated] [pages, comma separated]
import { chromium } from 'playwright'
import sharp from 'sharp'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const base = process.env.BASE || 'http://localhost:5190'
const size = process.argv[2] || 'desktop'
const times = (process.argv[3] || '0.6,2,3.4,4.8,6.2,7.6,9').split(',').map(Number)
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null
const VIEW = { desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } }[size]
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext(VIEW)).newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${base}/?t=0&${process.env.QUERY || ''}`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__suffer?.ready, null, { timeout: 60000 })
const n = await page.evaluate(() => window.__suffer.pages.length)
const CELL = 300
const rows = []
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i)) continue
  await page.evaluate((i) => window.__suffer.pages[i].scrollIntoView({ block: 'start' }), i)
  await page.waitForTimeout(700)
  const r = await page.evaluate((i) => {
    const b = window.__suffer.pages[i].querySelector('.slot').getBoundingClientRect()
    return { x: b.left, y: b.top, width: b.width, height: b.height }
  }, i)
  const side = Math.min(r.width, r.height) * 1.08
  const clip = { x: Math.max(0, r.x + r.width / 2 - side / 2), y: Math.max(0, r.y + r.height / 2 - side / 2), width: side, height: side }
  const row = []
  for (const t of times) {
    await page.evaluate((t) => window.__suffer.stage.freeze(t), t)
    await page.waitForTimeout(140)
    row.push(await sharp(await page.screenshot({ clip })).resize(CELL, CELL).toBuffer())
  }
  rows.push(row)
}
await browser.close()
const out = path.join(ROOT, `qa/acts-${size}${only ? '-' + only.join('_') : ''}.jpg`)
await sharp({ create: { width: times.length * (CELL + 4), height: rows.length * (CELL + 4), channels: 3, background: '#000' } })
  .composite(rows.flatMap((row, j) => row.map((input, k) => ({ input, left: k * (CELL + 4), top: j * (CELL + 4) }))))
  .jpeg({ quality: 88 })
  .toFile(out)
console.log(out)
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'))
