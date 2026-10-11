# You are cordially invited to suffer

<p align="center">
  <img src="docs/screenshot.jpg" alt="The invitation: two fluffy things in a little gilt theatre, one holding a sealed envelope and one beaming, beside the words You are cordially invited to SUFFER with me. When: 4:45 a.m. Sharp. Bring: Knees. Both, ideally." />
</p>

A formal invitation, on heavy green card with gold foil, to the thing in this post:

> If I really like you I'll invite you to suffer with me.
> Runs, workouts, type 2 fun.
>
> [@jaixbhatia](https://x.com/jaixbhatia)

Scroll, and the morning happens: six items of a programme, from the alarm at 4:45 to brunch at 8:30, each
acted out in a little toy theatre by two fluffy things. One of them is the host, and is having a lovely
time. Then a reply card, on which it is not really possible to decline.

Live at https://suffer-with-me.vercel.app

Fan-made and unofficial. No knees were consulted.

## What is on the page

- **The invitation.** A crest (running shoe, kettlebell, ice cube, banana, under an alarm clock), the
  wording, and the particulars: when, where, dress, what to bring.
- **Six pages**, one for each line of the programme. On each: the time, what it is, what you will say and
  what I will say, and a gauge.

| No. | Time | Item | In the theatre |
|---|---|---|---|
| I | 4:45 | The Alarm | A wake-up call, delivered in person |
| II | 5:15 | The "Easy" Run | Conversational pace. The same sign keeps coming round |
| III | 6:20 | The Hill | Up, a hop at a time, and down the way a ball of fluff goes down a hill |
| IV | 7:05 | The Workout | One of them does burpees. The other has had a kettlebell put on it |
| V | 7:50 | The Cold Plunge | Three minutes at 3 °C. One is blue |
| VI | 8:30 | Brunch | Type 1 fun, and somebody falling asleep in it |

- **The gauge.** It has two labels, *how much I like you* and *how much this hurts*, and one needle.
- **The reply card.** Accepts with pleasure, accepts with dread, and a third button that moves when you
  go to press it. Once you have accepted, you can write an invitation to somebody else:
  `?to=Their+name&from=Yours` puts their name on the cover and yours under it.
- **The small print.** The fun scale, and Virgil, who described type 2 fun in about 20 BC.
- **Furniture.** A clock, top right, that runs with the scroll, and a dot for each page.

## The look

**An invitation, printed by a games console.** Everything except the type is drawn the way a mid-90s
console would draw it, in the same coarse pixels:

- the **theatres**: few polygons, 32-pixel textures with no filtering, lighting worked out per vertex,
  vertices snapped to whole pixels, textures stretched flat across each triangle (so they swim a little),
  15-bit colour with an ordered dither. A theatre is about 256 pixels across whatever the screen, and is
  scaled up with hard edges. Shadows are a checkerboard, not a grey;
- the **card** (`src/paper.js`, a small shader on its own canvas under everything): big shaded triangles,
  dithered, with rays fanning out from behind whichever theatre is on stage, and a gold border;
- the **backdrops**: paintings, shrunk to the same pixels and stood up behind the actors, the way
  pre-rendered backgrounds stood behind the low-polygon cast of a 1997 adventure game.

**The type is type.** Every word is real text in the page, set in
[Playfair Display](https://fonts.google.com/specimen/Playfair+Display),
[EB Garamond](https://fonts.google.com/specimen/EB+Garamond) and
[Pinyon Script](https://fonts.google.com/specimen/Pinyon+Script) (all open source), and is as sharp as the
screen. The largest words are filled with the console's dithered gold, clipped to the letters.

## How it was made

Three tools, each run from a script, so all of it can be made again.

**Codex CLI's image generation paints.** `art/manifest.mjs` holds a brief for each of the eight backdrops
(an eighteenth-century portrait with nobody sitting for it, a bedroom at a quarter to five, a road before
sunrise, far too many hills, a garage gym, a frozen lake, a cafe, one very large mountain), for the crest
and for the wax seal. `scripts/gen.mjs` runs one `codex exec` per picture, in a read-only sandbox, and
collects what its built-in `image_gen` tool made. `scripts/cook.mjs` cuts each backdrop into the part that
shows above the stage and the ground under it (which is laid on the stage floor), and shrinks everything.

```sh
npm run art          # paint whatever is missing from art/raw (add --force and names to repaint)
npm run art:cook     # cut and shrink into public/art
```

**Blender, with no window, models.** `scripts/textures.mjs` draws the pixel textures, including a sheet of
twelve faces (happy, asleep, dread, strain, dead, frozen, bliss...). `blender/build_suffer.py` then makes
every object out of lathes, lofts and boxes (`blender/kit.py`), bakes ambient occlusion into the vertex
colours by casting rays, and exports `public/models/suffer.glb`: 33 parts, about 4,000 triangles. It is a
box of parts, not a scene. A fluffy thing is a body, a face, two arms and two feet, each with its pivot
where it turns. Needs Blender 4 or later at `/Applications/Blender.app`.

```sh
npm run model        # draws the textures, then runs Blender
```

**The page puts on the show.** `src/stage.js` builds a theatre for each page out of the parts and pins it to
an empty box in that page, so the layout is ordinary CSS and the 3D follows it. `src/scenes.js` is the
acting: every scene is a loop worked out from the clock, with no keyframes, so any moment of it can be
photographed (`?t=3.5` holds every loop at 3.5 seconds). One fur material is tinted cream or pink; an
expression is a move to another cell of the sheet of faces.

## Code map

```
index.html            static shell; the first paint is the card, its border and a counter
src/main.js           boot, the type, the frame loop, the clock, the reply card
src/copy.js           every word
src/styles.css        type and layout
src/stage.js          renderer, shader, the theatres, the fluffy things
src/scenes.js         what happens in each theatre
src/paper.js          the dithered card, its rays and its border; the dithered gold for the largest type
src/faces.json        where each face is on the sheet (written by scripts/textures.mjs)
art/                  the briefs, and what was painted from them
blender/              the model's source
scripts/              painting, cutting, textures, icons, photographs
```

## Develop

```sh
npm install
npm run dev          # http://localhost:5173
npm run build
npm run meta         # favicon, app icons, social card (needs the dev server on :5190)
vercel --prod        # publish (the build fills in the social card's full address there)
```

## The favicon and the social card

`npm run meta` makes both, and writes them into `public/`.

- **The icon** is the guest's face, drawn pixel by pixel in `scripts/meta.mjs`: sixteen pixels placed by
  hand for the smallest size, thirty-two drawn from a few ellipses for the rest. A browser tab gets it on a
  rounded tile of the card (`favicon.svg`, and a `favicon.ico` of PNGs for browsers that want one); a home
  screen gets it inside a gold rule, scaled by whole pixels (`apple-touch-icon.png`, `icon-192.png`,
  `icon-512.png`).
- **The card** (`og.jpg`, 1200 × 630) is a photograph of the page itself. `?card` lays the cover out to be
  read at the size of a thumbnail, the theatre close up and the wording large, and `scripts/meta.mjs`
  photographs that. `node scripts/card-try.mjs "zoom=1.3&x=-0.03&y=0.1"` tries another framing.

## Looking at it

All with Playwright, all needing `npm run dev -- --port 5190`.

```sh
node scripts/shots.mjs mobile 3.5      # every page at one window size (desktop, laptop, wide, tablet, mobile, small)
node scripts/strip.mjs mobile 3.5      # ...side by side in one picture, in qa/
node scripts/acts.mjs desktop          # every theatre at seven moments of its loop
node scripts/try-dodge.mjs             # presses the button that would rather not be pressed
```
