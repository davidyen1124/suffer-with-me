// A short film of the whole page, scrolled from the invitation to the reply: qa/film.mp4
// node scripts/film.mjs [desktop|mobile]   (needs the dev server on :5190, and ffmpeg)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const base = process.env.BASE || 'http://localhost:5190'
const which = process.argv[2] || 'desktop'
const size = which === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 720 }
const dir = path.join(ROOT, 'qa/film')
fs.rmSync(dir, { recursive: true, force: true })
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir, size }, ...(which === 'mobile' ? { isMobile: true, hasTouch: true } : {}) })
const page = await context.newPage()
await page.goto(`${base}/${process.env.QUERY ? '?' + process.env.QUERY : ''}`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__suffer?.ready, null, { timeout: 60000 })
const t0 = Date.now()
await page.waitForTimeout(3800)
const n = await page.evaluate(() => window.__suffer.pages.length)
// how long to stay on each page: long enough to see its loop come round
const stay = [0, 7600, 6200, 9600, 5600, 6800, 7200, 2600]
for (let i = 1; i < n; i++) {
  await page.evaluate((i) => window.__suffer.go(i), i)
  await page.waitForTimeout(900 + stay[i])
}
if (which !== 'mobile') {
  // try to decline
  const no = page.locator('.button--no')
  for (let k = 0; k < 4; k++) {
    const b = await no.boundingBox()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 })
    await page.waitForTimeout(950)
  }
  const b = await no.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 })
  await page.waitForTimeout(500)
  await no.click()
} else {
  await page.locator('.button--gold').first().tap()
}
await page.waitForTimeout(4200)
const secs = (Date.now() - t0) / 1000
await context.close()
await browser.close()
const webm = path.join(dir, fs.readdirSync(dir).find((f) => f.endsWith('.webm')))
const out = path.join(ROOT, `qa/film-${which}.mp4`)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'fps=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out])
console.log(out, `${secs.toFixed(0)}s`, (fs.statSync(out).size / 1e6).toFixed(1) + ' MB')
