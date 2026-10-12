// The 3D half of the page. It loads the box of parts Blender built, puts a little toy theatre together for
// every line of the programme (a floor, a painted flat, a gold frame, two fluffy things and their props),
// and draws whichever theatres are on screen the way a mid-90s console would: coarse pixels, vertex
// lighting, snapped vertices, 15-bit colour. Each theatre is pinned to an empty box in the page (its
// "slot") and follows it as the page scrolls.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { asset } from './asset.js'
import FACES from './faces.json'
import { SCENES } from './scenes.js'

const VFOV = 24
const DEPTH = 14 // how far from the camera the theatres stand, in metres
const ACROSS = 256 // one theatre is drawn about this many pixels wide, whatever the screen
const FIT = { w: 3.1, h: 2.95, cy: 1.02 } // the room one theatre needs, and the height of its middle
const CENTRE = 0.45 // a fluffy thing's middle: what it rolls about
export const PINK = [1.0, 0.7, 0.76]
export const CREAM = [1, 1, 1]

const vertexShader = /* glsl */ `
  uniform vec2 uGrid;
  uniform vec3 uLight;
  uniform float uAmbient;
  uniform float uDiffuse;
  uniform float uAffine;
  uniform vec4 uUv;
  uniform vec3 uTint;
  uniform vec3 uMood;
  varying vec2 vUv;
  varying vec3 vShade;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // old hardware had no sub-pixel precision: every vertex lands on a whole pixel
    clip.xy = floor(clip.xy / clip.w * uGrid + 0.5) / uGrid * clip.w;
    // nor any sense of depth when it filled a triangle: textures were stretched flat across the screen,
    // which is why they swim. (Paintings, faces and lettering are spared.)
    gl_Position = uAffine > 0.5 ? vec4(clip.xyz / clip.w, 1.0) : clip;
    vec3 n = normalize(mat3(modelMatrix) * normal);
    float d = max(dot(n, uLight), 0.0);
    // vertex colours come out of Blender linear; everything here is done in display space
    vShade = pow(color.rgb, vec3(1.0 / 2.2)) * uTint * uMood * (uAmbient + uDiffuse * d);
    vUv = uv * uUv.xy + uUv.zw;
  }`
const BAYER = /* glsl */ `
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    float m = 0.0;
    if (i == 0) m = 0.0; else if (i == 1) m = 8.0; else if (i == 2) m = 2.0; else if (i == 3) m = 10.0;
    else if (i == 4) m = 12.0; else if (i == 5) m = 4.0; else if (i == 6) m = 14.0; else if (i == 7) m = 6.0;
    else if (i == 8) m = 3.0; else if (i == 9) m = 11.0; else if (i == 10) m = 1.0; else if (i == 11) m = 9.0;
    else if (i == 12) m = 15.0; else if (i == 13) m = 7.0; else if (i == 14) m = 13.0; else m = 5.0;
    return m / 16.0;
  }`
const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  varying vec3 vShade;
  ${BAYER}
  void main() {
    vec4 t = texture2D(map, vUv);
    if (t.a < 0.5) discard;
    vec3 c = t.rgb * vShade;
    // five bits a channel, ordered dither in between
    c = floor(c * 31.0 + bayer(gl_FragCoord.xy)) / 31.0;
    gl_FragColor = vec4(c, 1.0);
  }`
// shadows are a checkerboard of darker pixels, not a see-through grey
const shadowShader = /* glsl */ `
  uniform float uDark;
  ${BAYER}
  void main() {
    if (uDark <= bayer(gl_FragCoord.xy)) discard;
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }`

const PLAIN = new Set(['labels', 'faces', 'backdrop', 'floor']) // textures that are pictures, not cloth
const pixelArt = (map) => {
  map.magFilter = map.minFilter = THREE.NearestFilter
  map.generateMipmaps = false
  map.colorSpace = THREE.NoColorSpace
  map.flipY = false
  map.needsUpdate = true
  return map
}

export async function createStage(canvas, slots, { onProgress = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', stencil: false })
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(VFOV, 1, 1, 60)
  const shared = {
    uGrid: { value: new THREE.Vector2(320, 240) },
    uLight: { value: new THREE.Vector3(-0.38, 0.66, 0.65).normalize() },
    uAmbient: { value: 0.72 },
    uDiffuse: { value: 0.42 },
  }

  // ── the box of parts, and the paintings ──────────────────────────────────
  const names = Object.keys(SCENES)
  const loader = new THREE.TextureLoader()
  let done = 0
  const total = names.length * 2 + 1
  const tick = () => onProgress(++done / total)
  const [gltf, ...painted] = await Promise.all([
    new GLTFLoader().loadAsync(asset('models/suffer.glb')).then((g) => (tick(), g)), // the address index.html preloads
    ...names.flatMap((n) => [asset(`art/bg-${n}.png`), asset(`art/floor-${n}.png`)]).map((url) => loader.loadAsync(url).then((t) => (tick(), pixelArt(t)))),
  ])
  const art = {}
  names.forEach((n, i) => (art[n] = { bg: painted[i * 2], floor: painted[i * 2 + 1] }))
  const parts = {}
  const tex = {}
  for (const o of gltf.scene.children.slice()) parts[o.name] = o
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.material.map) tex[o.material.name] = pixelArt(o.material.map)
  })

  const shadowGeo = new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2)
  const blockGeo = new THREE.BoxGeometry(1, 1, 1)
  blockGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(blockGeo.attributes.position.count * 3).fill(1), 3))

  // ── one theatre ──────────────────────────────────────────────────────────
  function theatre(name, slot) {
    const def = SCENES[name]
    const group = new THREE.Group()
    const mood = { value: new THREE.Vector3(...(def.mood || [1, 1, 1])) }
    const mats = new Map()
    // a material of its own for anything that needs its own tint or its own place on a sheet
    function material(kind, key = '', map = tex[kind]) {
      const id = kind + '|' + key
      if (!mats.has(id)) {
        const m = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          vertexColors: true,
          uniforms: { ...shared, uMood: mood, map: { value: map }, uAffine: { value: PLAIN.has(kind) ? 0 : 1 }, uUv: { value: new THREE.Vector4(1, 1, 0, 0) }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
        })
        m.name = kind
        mats.set(id, m)
      }
      return mats.get(id)
    }
    function instance(part, key = '') {
      if (!parts[part]) throw new Error(`the model has no part called ${part}`)
      const o = parts[part].clone(true)
      o.traverse((m) => {
        if (!m.isMesh) return
        const kind = m.material.name
        m.material = material(kind, kind === 'fur' || kind === 'faces' ? key : '')
        m.frustumCulled = false
      })
      return o
    }
    const d = {
      name,
      slot,
      group,
      time: 0,
      state: {},
      creatures: [],
      material,
      instance,
      // a prop, standing on the stage
      put(part, x = 0, y = 0, z = 0, ry = 0, s = 1) {
        const o = instance(part)
        o.position.set(x, y, z)
        o.rotation.y = ry
        o.scale.setScalar(s)
        group.add(o)
        return o
      },
      // a plain coloured block, for the few things too small to be worth modelling
      block(w, h, dp, hex) {
        const m = new THREE.Mesh(blockGeo, material('plastic', 'block' + hex))
        m.material.uniforms.uTint.value.set(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255)
        m.scale.set(w, h, dp)
        m.frustumCulled = false
        group.add(m)
        return m
      },
      creature(opts) {
        const c = creature(d, opts)
        d.creatures.push(c)
        return c
      },
    }

    const top = instance('stage_top')
    const floor = material('floor')
    floor.uniforms.map.value = art[name].floor
    const flat = instance('flat')
    const bg = material('backdrop')
    bg.uniforms.map.value = art[name].bg
    flat.position.z = -0.6
    const frame = instance('frame')
    frame.position.z = -0.6
    group.add(top, instance('stage_rim'), flat, frame)
    d.bg = bg
    d.floor = floor
    def.build(d)
    group.visible = false
    scene.add(group)
    return d
  }

  // ── one fluffy thing ─────────────────────────────────────────────────────
  // root: where it stands and which way it faces. spin: turns it about its middle (rolling, lying down).
  // lean: tips it about its feet. torso: squashes and stretches, and carries the face, the arms and whatever
  // it is wearing. The feet stay out of the squash.
  function creature(d, { tint = CREAM, wear = [], at = [0, 0, 0], yaw = 0, shadow = true } = {}) {
    const key = 'c' + d.creatures.length
    const root = new THREE.Group()
    const spin = new THREE.Group()
    const lean = new THREE.Group()
    spin.position.y = CENTRE
    lean.position.y = -CENTRE
    const torso = d.instance('body', key)
    const footL = d.instance('foot_l', key)
    const footR = d.instance('foot_r', key)
    root.add(spin)
    spin.add(lean)
    lean.add(torso, footL, footR)
    d.group.add(root)
    const fur = d.material('fur', key)
    fur.uniforms.uTint.value.set(...tint)
    const faces = d.material('faces', key)
    const c = {
      root,
      spin,
      lean,
      torso,
      footL,
      footR,
      armL: torso.getObjectByName('arm_l'),
      armR: torso.getObjectByName('arm_r'),
      home: new THREE.Vector3(...at),
      yaw,
      hipL: footL.position.clone(),
      hipR: footR.position.clone(),
      tint: fur.uniforms.uTint.value,
      baseTint: new THREE.Vector3(...tint),
      expression: 'happy',
      blinkAt: 1 + Math.random() * 3,
      face(name) {
        c.expression = name
      },
      wear(name, on = true) {
        const o = torso.getObjectByName(name)
        if (o) o.visible = on
      },
      // everything back to standing at ease, where it was put
      rest() {
        root.position.copy(c.home)
        root.rotation.set(0, c.yaw, 0)
        root.scale.setScalar(1)
        spin.rotation.set(0, 0, 0)
        lean.rotation.set(0, 0, 0)
        torso.position.set(0, 0, 0)
        torso.rotation.set(0, 0, 0)
        torso.scale.set(1, 1, 1)
        c.armL.rotation.set(0, 0, 0)
        c.armR.rotation.set(0, 0, 0)
        footL.rotation.set(0, 0, 0)
        footR.rotation.set(0, 0, 0)
        footL.position.copy(c.hipL)
        footR.position.copy(c.hipR)
        c.tint.copy(c.baseTint)
        c.lift = 0
        return c
      },
      lift: 0, // how far off the ground it is, for the shadow
    }
    for (const name of ['headband', 'bib', 'medal', 'nightcap', 'towel']) c.wear(name, wear.includes(name))
    if (shadow) {
      c.shadow = new THREE.Mesh(shadowGeo, new THREE.ShaderMaterial({ fragmentShader: shadowShader, vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', uniforms: { uDark: { value: 0.26 } }, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
      c.shadow.frustumCulled = false
      d.group.add(c.shadow)
    }
    c.finish = (time) => {
      // it blinks, if its eyes are open
      let cell = c.expression
      if (time > c.blinkAt + 0.13 || time < c.blinkAt - 6) c.blinkAt = time + 1.8 + Math.random() * 3.4
      if (cell === 'happy' && time >= c.blinkAt) cell = 'blink'
      const f = FACES.cells[cell] || FACES.cells.happy
      faces.uniforms.uUv.value.set(1, 1, f.x / FACES.size, f.y / FACES.size)
      if (c.shadow) {
        const k = Math.max(0.25, 1 - c.lift * 0.9)
        c.shadow.position.set(root.position.x, c.ground ?? 0.004, root.position.z)
        c.shadow.scale.set(0.46 * k, 1, 0.4 * k)
        c.shadow.visible = root.visible && root.scale.x > 0.05
      }
    }
    return c.rest()
  }

  const theatres = names.map((n) => theatre(n, slots[n])).filter((d) => d.slot)
  const byName = Object.fromEntries(theatres.map((d) => [d.name, d]))

  // ── sizing: a fixed number of picture lines, scaled up with hard pixel edges ─────────────
  let W = 2
  let H = 2
  let pixel = 2
  let inset = 0
  function resize(frame = inset) {
    inset = frame
    W = window.innerWidth
    H = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    // how wide a theatre comes out on this page, in CSS pixels: its slot, or as much of it as its height allows
    const box = theatres[0].slot.getBoundingClientRect()
    const across = Math.max(120, Math.min(box.width, (box.height * FIT.w) / FIT.h))
    const device = Math.max(1, Math.round((across * dpr) / ACROSS)) // device pixels per picture pixel
    pixel = device / dpr
    const bw = Math.ceil(W / pixel)
    const bh = Math.ceil(H / pixel)
    renderer.setPixelRatio(1)
    renderer.setSize(bw, bh, false)
    canvas.style.width = bw * pixel + 'px'
    canvas.style.height = bh * pixel + 'px'
    shared.uGrid.value.set(bw / 2, bh / 2)
    camera.aspect = bw / bh
    camera.updateProjectionMatrix()
    // nothing is drawn over the page's gold border
    const m = Math.ceil(frame / pixel)
    renderer.setScissorTest(true)
    renderer.setScissor(m, m, Math.max(1, Math.floor(W / pixel) - 2 * m), Math.max(1, Math.floor(H / pixel) - 2 * m))
  }
  const hover = { x: 0, y: 0, tx: 0, ty: 0 }
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      hover.tx = (e.clientX / W) * 2 - 1
      hover.ty = (e.clientY / H) * 2 - 1
    },
    { passive: true },
  )

  let frozen = null // for photographs: every theatre held at one moment of its loop
  const view = { zoom: 1, x: 0, y: 0 } // and, for the social card, closer in than its slot would have it
  function render(dt) {
    hover.x += (hover.tx - hover.x) * 0.06
    hover.y += (hover.ty - hover.y) * 0.06
    const metre = H / (2 * DEPTH * Math.tan(THREE.MathUtils.degToRad(VFOV) / 2)) // CSS pixels to a metre, where the theatres stand
    let any = false
    for (const d of theatres) {
      const r = d.slot.getBoundingClientRect()
      const on = r.width > 0 && r.bottom > -H * 0.15 && r.top < H * 1.15
      d.group.visible = on
      if (!on) continue
      any = true
      d.time = frozen ?? d.time + dt
      const s = Math.min(r.width / (FIT.w * metre), r.height / (FIT.h * metre)) * view.zoom
      const cx = r.left + r.width * (0.5 + view.x)
      const cy = r.top + r.height * (0.5 + view.y)
      // seen a little from above, and a little more so the lower down the screen it is; it turns to follow the pointer
      const off = (cy - H / 2) / H
      d.group.rotation.set(0.17 + off * 0.3 + hover.y * 0.03, -hover.x * 0.1 + (d.turn || 0), 0)
      d.group.scale.setScalar(s)
      d.group.position.set((cx - W / 2) / metre, (H / 2 - cy) / metre - FIT.cy * s * Math.cos(d.group.rotation.x), -DEPTH)
      SCENES[d.name].update(d, d.time, dt)
      for (const c of d.creatures) c.finish(d.time)
    }
    renderer.clear()
    if (any) renderer.render(scene, camera)
  }

  return {
    render,
    resize,
    theatres: byName,
    freeze(t) {
      frozen = t
    },
    view,
    get size() {
      return { W, H, pixel }
    },
  }
}
