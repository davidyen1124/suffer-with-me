// Every painted thing on the invitation, made with Codex CLI's built-in image_gen (scripts/gen.mjs).
// The backdrops are the painted flats of a toy theatre: each one stands behind the two fluffy things
// while they act out one line of the programme. scripts/cook.mjs then shrinks them to the coarse
// pixels the 3D is drawn in.

export const STYLE = `STYLE: a hand-painted backdrop for a toy theatre, in the manner of the pre-rendered backgrounds of a late-1990s console adventure game: simple chunky shapes, soft gouache shading, a limited palette, a little naive, strong clear silhouettes. It must still read when it is shrunk to 256 pixels across, so no fine detail and no thin lines.
It is an EMPTY set: no characters, no people, no animals, no creatures.
No text, no letters, no numbers, no signs with writing, no logos, no watermark, no frame, no border, no vignette.
Seen straight on, at eye level, like a stage flat. The bottom fifth of the picture is the plain floor or ground of the place with nothing on it, because actors will stand in front of it. Keep anything important out of the two top corners, which will be cut off by an arch.`

export const CUTOUT = `Isolated on a genuinely TRANSPARENT background (real alpha channel): no backdrop, no ground, no cast shadow, no drop shadow, no glow. Everything is fully inside the canvas with a small margin, nothing cropped. No text, no letters, no numbers, no watermark.`

const SQUARE = 'square (1024x1024)'

export const ASSETS = [
  {
    name: 'bg-cover', size: SQUARE,
    prompt: `The background of a grand eighteenth-century aristocratic oil portrait, with nobody sitting for it. On the left, a heavy burgundy velvet curtain swept aside and tied back with a gold tasselled cord. On the right, a pale fluted marble column on a square plinth. Between them, far away, soft green hills under a golden late-afternoon sky with big painterly clouds. At the bottom, a dark polished floor. Rich, pompous, old-master light.`,
  },
  {
    name: 'bg-alarm', size: SQUARE,
    prompt: `A small bedroom at a quarter to five in the morning. A wall in deep night blue. In the upper middle, a window with pale curtains drawn open, and in it a black-blue sky with a thin crescent moon and a few stars. A small empty picture frame hangs to one side. A pale blue patch of moonlight lies across the wall. Everything is dark, cold and completely still. At the bottom, a dark wooden floor.`,
  },
  {
    name: 'bg-run', size: 'landscape 3:2 (1536x1024)',
    prompt: `A long, empty suburban road before sunrise, seen exactly side-on so that it could slide past sideways for ever. A low horizon. The sky is deep indigo at the top and fades to a thin band of pink and orange at the horizon. Along the horizon, a row of dark silhouettes: round trees and small houses of different heights. Three old-fashioned street lamps, still lit, evenly spaced. A low dark hedge. The left edge and the right edge of the picture look alike, so that the picture can repeat. At the bottom, plain grey asphalt.`,
  },
  {
    name: 'bg-hill', size: SQUARE,
    prompt: `Hills at sunrise, and far too many of them: a row of ridiculously steep, smooth green hills, each one taller than the one in front of it, going back into the distance and getting paler and bluer as they go, like the teeth of a saw. A thin pale footpath zigzags up the nearest of the far hills. A rising sun low on the left, long warm light, three small pink clouds. The middle of the picture, low down, is a plain open stretch of sky and grass. At the bottom, plain mown grass.`,
  },
  {
    name: 'bg-gym', size: SQUARE,
    prompt: `The back wall of a small garage gym. A bare wall of grey concrete blocks. On the left, a black steel squat rack with a barbell resting on it. On the right, round weight plates leaning against the wall and a short rack of dumbbells. High in the middle, a round wall clock with no numerals. One harsh fluorescent strip light along the top. A big red industrial fan in a corner. At the bottom, black rubber mat flooring. Bright, hard and unforgiving.`,
  },
  {
    name: 'bg-plunge', size: SQUARE,
    prompt: `A frozen lake at dawn in the middle of winter. Flat white snow and pale blue ice. A line of dark pine trees heavy with snow along the far shore. Pale, jagged mountains behind them. A sky of icy blue and very pale pink. Thin cold mist over the ice. Everything looks very, very cold. At the bottom, plain trampled snow.`,
  },
  {
    name: 'bg-brunch', size: SQUARE,
    prompt: `The inside of a sunny, cosy cafe late in the morning. A big arched window with warm sunshine pouring in and, through it, a leafy street. Hanging green plants. On the right, a wooden counter with a brass espresso machine and a shelf of cups above it. Warm honey-coloured light; cream, terracotta and sage green. At the bottom, a warm wooden floor.`,
  },
  {
    name: 'bg-rsvp', size: SQUARE,
    prompt: `One enormous, impossibly tall mountain, alone, filling the picture, with snow on its upper half. Its summit glows pink in the very first light of dawn, against a deep blue sky in which the last stars are fading. A tiny dark pine forest at its foot shows how big it is. A thin pale path leads straight towards it. Majestic, and slightly ominous. At the bottom, a plain dark meadow.`,
  },
  {
    name: 'crest', size: SQUARE, transparent: true,
    prompt: `A heraldic coat of arms, drawn as an embossed GOLD FOIL emblem, like the crest printed at the top of a very expensive wedding invitation. A shield divided into four quarters; in the quarters: a running shoe, a kettlebell, an ice cube, a banana. On top of the shield, where a crown would be, a little twin-bell alarm clock. On either side, holding the shield up, two small round fluffy hooded creatures with dot eyes, mirror images of each other, standing on crossed laurel branches. Below, an empty curling ribbon with nothing written on it. Perfectly symmetrical. Bold, simple engraved shapes that still read when very small. Metallic gold with darker gold shading and bright highlights; no other colours.`,
  },
  {
    name: 'seal', size: SQUARE, transparent: true,
    prompt: `A round blob of dark red sealing wax, as on the flap of a formal envelope, pressed with the emblem of a kettlebell inside a laurel wreath. The melted edge is a little irregular. Glossy highlights on the raised parts. Seen from directly above, filling most of the canvas.`,
  },
]
