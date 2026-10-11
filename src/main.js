// Boot, the page's type, the frame loop, and the reply card.
import '@fontsource-variable/playfair-display/wght.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/pinyon-script/400.css'
import './styles.css'
import { COVER, GAUGE, PROGRAMME, QUOTE, RSVP, SECTIONS, SMALL_PRINT } from './copy.js'
import { createPaper, foil } from './paper.js'
import { createStage } from './stage.js'

const q = new URLSearchParams(location.search)
const app = document.getElementById('app')
const scroller = document.getElementById('scroll')
const boot = document.querySelector('[data-boot]')
const count = boot.querySelector('[data-boot-count]')
const clock = document.querySelector('[data-clock]')
const dots = document.querySelector('[data-dots]')
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
const card = q.has('card') // the cover, laid out as the picture a link to this page is shown with

// a name from the address bar is only ever set as text, and kept short
const name = (key) => (q.get(key) || '').replace(/\s+/g, ' ').trim().slice(0, 28)
const guest = name('to')
const host = name('from')

// ── the type ────────────────────────────────────────────────────────────────
const el = (tag, cls, text) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}
const page = (id, ...children) => {
  const s = el('section', `page page--${id}`)
  s.id = id
  s.dataset.scene = id
  const slot = el('div', 'slot')
  slot.setAttribute('aria-hidden', 'true')
  const words = el('div', 'words')
  words.append(...children)
  s.append(slot, words)
  return s
}

function cover() {
  const crest = el('img', 'crest')
  crest.src = '/art/crest.png'
  crest.alt = 'A coat of arms: a running shoe, a kettlebell, an ice cube and a banana, under an alarm clock, held up by two fluffy things.'
  crest.width = 132
  crest.height = 126
  const title = el('h1', 'title')
  title.append(el('span', 'script', COVER.script), el('span', 'huge', COVER.title), el('span', 'script script--with', COVER.with))
  const details = el('dl', 'details')
  for (const [k, v] of COVER.details) details.append(el('dt', '', k), el('dd', '', v))
  const because = el('p', 'because', COVER.because)
  if (host) because.append(el('span', 'signed', `— ${host}`))
  const cue = el('button', 'cue')
  cue.type = 'button'
  cue.append(el('span', '', COVER.cue), el('i', 'arrow'))
  cue.addEventListener('click', () => go(1))
  return page(
    'cover',
    crest,
    el('p', 'kicker', guest ? `${guest}, the pleasure of your suffering is requested` : COVER.kicker),
    title,
    el('p', 'line', card ? COVER.line.replace('*', '') : COVER.line), // (the card has no room for the footnote)
    because,
    details,
    el('p', 'foot', `${COVER.foot} ${COVER.regrets}`),
    cue,
  )
}

function gauge(level, amount) {
  const g = el('div', 'gauge')
  const bar = el('div', 'gauge__bar')
  bar.setAttribute('role', 'img')
  bar.setAttribute('aria-label', `${GAUGE.left}, which is also ${GAUGE.right.toLowerCase()}: ${level} out of ${GAUGE.steps}`)
  for (let i = 0; i < GAUGE.steps; i++) bar.append(el('i', i < level ? 'on' : ''))
  g.append(el('span', 'gauge__label', GAUGE.left), el('span', 'gauge__label gauge__label--right', GAUGE.right), bar, el('p', 'gauge__amount', amount))
  return g
}

function item(p) {
  const head = el('p', 'kicker')
  head.append(el('span', 'no', `No. ${p.no}`), el('span', 'rule'), el('span', 'time', p.time))
  const talk = el('dl', 'talk')
  talk.append(el('dt', '', 'You'), el('dd', '', `“${p.you}”`), el('dt', '', 'Me'), el('dd', '', `“${p.me}”`))
  if (p.aside) talk.append(el('dt', ''), el('dd', 'aside', p.aside))
  return page(p.id, head, el('h2', 'name', p.title), el('p', 'body', p.body), talk, gauge(p.level, p.amount))
}

function rsvp() {
  const head = el('p', 'kicker')
  head.append(el('span', 'no', RSVP.kicker), el('span', 'rule'), el('span', 'time', RSVP.by))
  const seal = el('img', 'seal')
  seal.src = '/art/seal.png'
  seal.alt = ''
  seal.width = 72
  seal.height = 71
  const ask = el('h2', 'script script--ask', RSVP.script)
  const buttons = el('div', 'reply')
  const yes = el('button', 'button button--gold', RSVP.pleasure)
  const dread = el('button', 'button', RSVP.dread)
  const no = el('button', 'button button--no', RSVP.decline[0])
  for (const b of [yes, dread, no]) b.type = 'button'
  buttons.append(yes, dread, no)

  const after = el('div', 'after')
  after.hidden = true
  after.setAttribute('aria-live', 'polite')
  const afterTitle = el('p', 'after__title')
  const afterBody = el('p', 'body')
  const share = el('form', 'share')
  const to = el('input')
  const from = el('input')
  for (const [input, label] of [[to, RSVP.share.to], [from, RSVP.share.from]]) {
    input.type = 'text'
    input.maxLength = 28
    input.placeholder = label
    input.setAttribute('aria-label', label)
    input.autocomplete = 'off'
  }
  from.value = guest // whoever was invited is the one doing the inviting now
  const copy = el('button', 'button button--gold', RSVP.share.copy)
  copy.type = 'submit'
  const send = el('button', 'button', RSVP.share.send)
  send.type = 'button'
  send.hidden = !navigator.share
  const said = el('p', 'share__said')
  said.setAttribute('aria-live', 'polite')
  share.append(el('p', 'share__title', RSVP.share.title), to, from, copy, send, said)
  after.append(afterTitle, afterBody, share)

  const link = () => {
    const u = new URL(location.origin + location.pathname)
    if (to.value.trim()) u.searchParams.set('to', to.value.trim())
    if (from.value.trim()) u.searchParams.set('from', from.value.trim())
    return u.toString()
  }
  share.addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(link())
      said.textContent = RSVP.share.copied
    } catch {
      said.textContent = link()
    }
  })
  send.addEventListener('click', () => navigator.share({ title: document.title, text: RSVP.share.text, url: link() }).catch(() => {}))

  function accept(kind) {
    const theatre = stage?.theatres.rsvp
    if (theatre) theatre.state.accepted = true
    buttons.hidden = true
    after.hidden = false
    afterTitle.textContent = RSVP.after[kind][0]
    afterBody.textContent = RSVP.after[kind][1]
    s.classList.add('is-accepted')
  }
  yes.addEventListener('click', () => accept('pleasure'))
  dread.addEventListener('click', () => accept('dread'))

  // the third button would rather not be pressed
  let escapes = 0
  let at = [0, 0]
  let hoping
  const hope = (on) => {
    const theatre = stage?.theatres.rsvp
    if (theatre) theatre.state.hope = on
  }
  function dodge(e) {
    if (escapes >= RSVP.decline.length - 1) return
    e?.preventDefault()
    escapes++
    no.textContent = RSVP.decline[escapes]
    // for a moment, somebody on the stage thinks this might work
    hope(true)
    clearTimeout(hoping)
    hoping = setTimeout(() => hope(false), 1400)
    if (escapes >= RSVP.decline.length - 1) {
      no.style.transform = ''
      no.classList.add('button--gold')
      return
    }
    // Somewhere else inside the row of buttons, clear of the other two, and a good way from where it was
    // going. All of it in the row's own layout coordinates, which do not move while the button is in flight:
    // somebody chasing it will ask again before it has landed.
    const home = [no.offsetLeft, no.offsetTop]
    const size = [no.offsetWidth, no.offsetHeight]
    const span = [Math.max(0, buttons.clientWidth - size[0]), Math.max(0, buttons.clientHeight - size[1])]
    const others = [yes, dread].map((o) => [o.offsetLeft - 6, o.offsetTop - 6, o.offsetLeft + o.offsetWidth + 6, o.offsetTop + o.offsetHeight + 6])
    const clear = ([x, y]) => others.every((o) => x > o[2] || x + size[0] < o[0] || y > o[3] || y + size[1] < o[1])
    const far = ([x, y]) => Math.hypot(x - home[0] - at[0], y - home[1] - at[1])
    const spots = Array.from({ length: 80 }, () => [Math.random() * span[0], Math.random() * span[1]])
    const free = spots.filter(clear)
    const pool = (free.length ? free : spots).sort((p1, p2) => far(p2) - far(p1))
    const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 6))]
    const to = [pick[0] - home[0], pick[1] - home[1]]
    at = to.map(Math.round)
    no.style.transform = `translate(${at[0]}px, ${at[1]}px)`
  }
  no.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && dodge())
  no.addEventListener('pointerdown', (e) => e.pointerType !== 'mouse' && dodge(e))
  no.addEventListener('click', (e) => {
    if (escapes >= RSVP.decline.length - 1) accept('gaveUp')
    else dodge(e) // a keyboard got to it
  })

  const small = el('aside', 'small')
  small.append(el('p', 'small__title', SMALL_PRINT.title))
  const scale = el('dl', 'scale')
  for (const [k, v, eg] of SMALL_PRINT.scale) {
    const dd = el('dd', '', v + ' ')
    dd.append(el('em', '', eg))
    scale.append(el('dt', '', k), dd)
  }
  const virgil = el('blockquote', 'virgil')
  virgil.append(el('p', 'virgil__latin', SMALL_PRINT.latin), el('p', '', `“${SMALL_PRINT.english}”`), el('cite', '', SMALL_PRINT.source))
  const credit = el('p', 'credit')
  const by = el('a', '', QUOTE.by)
  by.href = QUOTE.url
  by.target = '_blank'
  by.rel = 'noopener'
  credit.append(`“${QUOTE.text}” `, by, `. ${SMALL_PRINT.credits}`)
  small.append(scale, virgil, credit)

  const s = page('rsvp', head, seal, ask, buttons, after, small)
  return s
}

const pages = [cover(), ...PROGRAMME.map(item), rsvp()]
scroller.append(...pages)
if (guest) document.title = `${guest}, you are cordially invited to suffer`
SECTIONS.forEach((s, i) => {
  const b = el('button')
  b.type = 'button'
  b.setAttribute('aria-label', s.title && s.no ? `${s.no}. ${s.title}` : s.id === 'cover' ? 'The invitation' : 'R.S.V.P.')
  b.addEventListener('click', () => go(i))
  dots.append(b)
})
function go(i) {
  pages[Math.max(0, Math.min(pages.length - 1, i))].scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
}

// ── the model, the paintings and the faces the type is set in ────────────────
const slots = Object.fromEntries(pages.map((p) => [p.dataset.scene, p.querySelector('.slot')]))
const fonts = Promise.race([
  Promise.all([
    document.fonts.load('900 100px "Playfair Display Variable"', 'SUFFER'),
    document.fonts.load('italic 600 40px "Playfair Display Variable"', 'a.m.'),
    document.fonts.load('400 40px "Pinyon Script"', 'You are cordially invited to'),
    document.fonts.load('400 18px "EB Garamond"', 'because'),
    document.fonts.load('italic 400 18px "EB Garamond"', 'because'),
  ]),
  new Promise((r) => setTimeout(r, 5000)),
]).catch(() => {})
let stage
;[stage] = await Promise.all([createStage(document.getElementById('stage'), slots, { onProgress: (v) => (count.textContent = Math.round(v * 100)) }), fonts])
const paper = createPaper(document.getElementById('paper'))
// ?card lays the cover out as the 1200 x 630 picture a link to this page is shown with (scripts/meta.mjs
// photographs it): the theatre close up, the wording large, and nothing else
if (card) {
  app.classList.add('card')
  Object.assign(stage.view, { zoom: Number(q.get('zoom')) || 1.2, x: Number(q.get('x')) || -0.02, y: Number(q.get('y')) || 0.1 })
}
if (q.has('t')) stage.freeze(Number(q.get('t')) || 0) // for photographs: every loop held at one moment
else if (calm) stage.freeze(3.4) // and for anyone who has asked their computer for less motion

function relayout() {
  const W = window.innerWidth
  const H = window.innerHeight
  const frame = Math.round(Math.max(8, Math.min(16, Math.min(W, H) * 0.018)))
  const band = 2
  // the size of a picture pixel depends on how big the theatres are, which depends a little on the border,
  // which is a few picture pixels thick: so, twice
  let pixel = 2
  let inset = frame
  for (let pass = 0; pass < 2; pass++) {
    stage.resize(inset)
    pixel = stage.size.pixel
    inset = frame + Math.ceil((band + 3) * pixel)
    app.style.setProperty('--inset', inset + 'px')
    app.style.setProperty('--pixel', pixel + 'px')
  }
  stage.resize(inset)
  paper.resize({ W, H, pixel, frame, band })
  // the largest type is filled with the console's gold
  for (const e of document.querySelectorAll('.huge, .script--ask, .after__title')) {
    const rows = Math.max(4, Math.round(e.getBoundingClientRect().height / Math.max(1, e.getClientRects().length || 1) / pixel))
    e.style.backgroundImage = foil(rows)
    e.style.backgroundSize = `${4 * pixel}px ${rows * pixel}px`
  }
}
relayout()
window.addEventListener('resize', relayout)

// which page is up: the one whose middle is nearest the middle of the window
const time = (m) => `${Math.floor(Math.round(m) / 60) % 12 || 12}:${String(Math.round(m) % 60).padStart(2, '0')} a.m.`
let current = -1
function where() {
  const H = window.innerHeight
  let best = 0
  let bestD = Infinity
  const tops = pages.map((p) => p.getBoundingClientRect())
  tops.forEach((r, i) => {
    const dist = Math.abs(r.top + Math.min(r.height, H) / 2 - H / 2)
    if (dist < bestD) {
      bestD = dist
      best = i
    }
  })
  // the clock runs with the scroll: between two pages it is somewhere between their times
  const r = tops[best]
  const top = scroller.getBoundingClientRect().top
  const next = Math.min(pages.length - 1, best + 1)
  const prev = Math.max(0, best - 1)
  const f = (top - r.top) / Math.max(1, r.height)
  const m = f >= 0 ? SECTIONS[best].clock + (SECTIONS[next].clock - SECTIONS[best].clock) * Math.min(1, f) : SECTIONS[best].clock + (SECTIONS[best].clock - SECTIONS[prev].clock) * Math.max(-1, f)
  clock.textContent = time(m)
  if (best !== current) {
    current = best
    ;[...dots.children].forEach((b, i) => b.classList.toggle('on', i === best))
    app.dataset.page = SECTIONS[best].id
  }
  return tops[best]
}
const seen = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { root: scroller, threshold: 0.35 })
pages.forEach((p) => seen.observe(p))

let last = performance.now()
let turn = 0.2
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  where()
  stage.render(dt)
  const r = slots[SECTIONS[current].id].getBoundingClientRect()
  if (!calm && !q.has('t')) turn += dt * 0.02
  paper.render(r.left + r.width / 2, r.top + r.height * 0.52, turn)
  requestAnimationFrame(frame)
}

// a tab left alone is asked back, the only way the host knows how
const title = document.title
document.addEventListener('visibilitychange', () => (document.title = document.hidden ? 'One more?' : title))

app.style.visibility = 'visible'
boot.remove()
scroller.focus({ preventScroll: true })
if (q.has('page')) pages[Number(q.get('page')) || 0].scrollIntoView({ block: 'start' })
if (q.has('accepted')) pages[pages.length - 1].querySelector('.button--gold').click()
pages[0].classList.add('in')
requestAnimationFrame(frame)
window.__suffer = { ready: true, stage, go, pages }
