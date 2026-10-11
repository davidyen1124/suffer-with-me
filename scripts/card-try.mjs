// Photographs the social card layout with whatever ?card parameters are given: node scripts/card-try.mjs "zoom=1.3&y=0.09" out.png
import { chromium } from 'playwright'
const [query = '', out = 'qa/card.png'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${process.env.BASE || 'http://localhost:5190'}/?card&t=0.22&${query}`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__suffer?.ready, null, { timeout: 60000 })
await page.waitForTimeout(900)
await page.screenshot({ path: out })
if (errors.length) console.log('ERRORS', errors)
await browser.close()
console.log(out)
