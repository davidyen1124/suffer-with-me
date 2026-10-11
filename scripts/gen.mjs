// Paints the art with Codex CLI's built-in image_gen tool (the imagegen skill), one `codex exec` per image.
// usage: node scripts/gen.mjs [--force] [-j 4] [name ...]   (default: every entry in art/manifest.mjs)
// Output: art/raw/<name>.png
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ASSETS, CUTOUT, STYLE } from '../art/manifest.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const RAW = path.join(ROOT, 'art/raw')
const LOG = path.join(ROOT, 'art/logs')
const GEN = path.join(os.homedir(), '.codex/generated_images')
fs.mkdirSync(RAW, { recursive: true })
fs.mkdirSync(LOG, { recursive: true })

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const jIdx = argv.indexOf('-j')
const jobs = jIdx >= 0 ? Number(argv[jIdx + 1]) : 4
const names = argv.filter((a, i) => !a.startsWith('-') && argv[i - 1] !== '-j')
const picked = ASSETS.filter((a) => !names.length || names.includes(a.name))
const raw = (name) => path.join(RAW, name + '.png')

const brief = (a) =>
  [
    'Use the imagegen skill with your built-in image_gen tool (NOT the CLI fallback, no API key needed).',
    'Make exactly ONE image_gen call, then reply with just DONE. Do not write code, do not create or edit files, do not run shell commands, do not ask questions.',
    a.transparent
      ? 'This image MUST have a genuinely transparent background (real alpha channel): request a transparent background from image_gen and keep the alpha.'
      : 'This image is OPAQUE and full-bleed: it fills the whole canvas. Do not make it transparent.',
    '',
    `Canvas: ${a.size}.`,
    '',
    'BRIEF:',
    a.prompt,
    '',
    a.transparent ? CUTOUT : STYLE,
  ].join('\n')

function run(a) {
  return new Promise((resolve) => {
    // the agent only has to call image_gen, so it gets a read-only sandbox
    const args = ['exec', '--skip-git-repo-check', '-s', 'read-only', '-c', 'model_reasoning_effort="low"', '-C', RAW, '--json', '-']
    const t0 = Date.now()
    const p = spawn('codex', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = fs.createWriteStream(path.join(LOG, a.name + '.jsonl'))
    let first = ''
    p.stdout.on('data', (d) => {
      if (!first) first = d.toString()
      out.write(d)
    })
    p.stderr.pipe(fs.createWriteStream(path.join(LOG, a.name + '.err')))
    p.stdin.end(brief(a))
    p.on('close', (code) => {
      out.end()
      const tid = (first.match(/"thread_id":"([^"]+)"/) || [])[1]
      const dir = tid && path.join(GEN, tid)
      const pngs = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')) : []
      const secs = Math.round((Date.now() - t0) / 1000)
      if (pngs.length) {
        const newest = pngs.map((f) => path.join(dir, f)).sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0]
        fs.copyFileSync(newest, raw(a.name))
        console.log(`ok   ${a.name.padEnd(12)} ${secs}s`)
        resolve(true)
      } else {
        console.log(`FAIL ${a.name.padEnd(12)} exit=${code} ${secs}s thread=${tid}`)
        resolve(false)
      }
    })
  })
}

const queue = picked.filter((a) => force || !fs.existsSync(raw(a.name)))
console.log(`${queue.length} image(s), ${jobs} at a time`)
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    while (queue.length) {
      const a = queue.shift()
      // one more try if a run comes back without an image
      if (!(await run(a))) await run(a)
    }
  }),
)
console.log('all done')
