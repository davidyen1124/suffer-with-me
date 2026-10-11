// Presses the button that would rather not be pressed, and photographs how that goes.
import { chromium } from 'playwright'
import sharp from 'sharp'
const base = process.env.BASE || 'http://localhost:5190'
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${base}/?page=7`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__suffer?.ready)
await page.waitForTimeout(1500)
const frames = []
const no = page.locator('.button--no')
for (let i = 0; i < 5; i++) {
  const b = await no.boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 })
  await page.waitForTimeout(450)
  console.log(i, JSON.stringify(await no.textContent()), JSON.stringify(await no.boundingBox()), 'hope:', await page.evaluate(() => window.__suffer.stage.theatres.rsvp.state.hope))
  frames.push(await page.screenshot())
}
await no.click()
await page.waitForTimeout(900)
console.log('after click:', await page.locator('.after__title').textContent(), '| accepted:', await page.evaluate(() => window.__suffer.stage.theatres.rsvp.state.accepted))
frames.push(await page.screenshot())
// the share form
await page.locator('.share input').first().fill('Ana')
await page.locator('.share input').nth(1).fill('Jai')
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
await page.locator('.share button[type=submit]').click()
await page.waitForTimeout(300)
console.log('said:', await page.locator('.share__said').textContent(), '| clipboard:', await page.evaluate(() => navigator.clipboard.readText()).catch((e) => 'unreadable: ' + e.message))
const picks = [0, 2, 5]
await sharp({ create: { width: 1440, height: 906 * picks.length, channels: 3, background: '#000' } }).composite(picks.map((k, i) => ({ input: frames[k], left: 0, top: i * 906 }))).jpeg({ quality: 85 }).toFile('qa/dodge.jpg')
if (errors.length) console.log('ERRORS', errors)
await browser.close()
