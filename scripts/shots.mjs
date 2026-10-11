// Photographs of every page, for looking at: node scripts/shots.mjs [desktop|mobile|...] [t]
// Needs the dev server (npm run dev -- --port 5190), or set BASE.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'qa/shots')
fs.mkdirSync(OUT, { recursive: true })
const base = process.env.BASE || 'http://localhost:5190'
const SIZES = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 2 },
  laptop: { width: 1280, height: 720, deviceScaleFactor: 2 },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  small: { width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}
const which = process.argv[2] || 'desktop'
const t = process.argv[3]
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null
const query = process.env.QUERY || ''
const { width, height, ...rest } = SIZES[which]
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width, height }, ...rest })).newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${base}/?${t !== undefined && t !== '-' ? `t=${t}&` : ''}${query}`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__suffer?.ready, null, { timeout: 60000 }).catch(() => {})
const n = await page.evaluate(() => window.__suffer?.pages.length || 0)
for (let i = 0; i < n; i++) {
  if (only && !only.includes(i)) continue
  await page.evaluate((i) => window.__suffer.pages[i].scrollIntoView({ block: 'start' }), i)
  await page.waitForTimeout(1900)
  const id = await page.evaluate((i) => window.__suffer.pages[i].id, i)
  const file = path.join(OUT, `${which}-${i}-${id}${t !== undefined && t !== '-' ? `-t${t}` : ''}.png`)
  await page.screenshot({ path: file })
  console.log(file)
}
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'))
await browser.close()
