// What happens in each little theatre. `build` sets the stage once; `update` is called every frame the
// theatre is on screen, with the time it has been running, and poses everything from scratch: the acting is
// all loops, worked out from the clock, so any moment of it can be photographed.
// Coordinates: metres, the middle of the stage floor is the origin, +X is stage left (the viewer's right),
// +Z is towards the audience. The guest is cream. The host is pink and wears a sweatband.
import { PINK } from './stage.js'

const TAU = Math.PI * 2
const HALF = Math.PI / 2
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const loop = (t, period) => (((t % period) + period) % period) // seconds into a loop
const cyc = (t, period) => loop(t, period) / period // 0..1
const pulse = (a, b, x) => (x >= a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0) // one hump between a and b
const within = (a, b, x) => x >= a && x < b

// ── things a fluffy thing can do ────────────────────────────────────────────
const breathe = (c, t, amount = 1, rate = 2.2) => {
  const b = Math.sin(t * rate) * 0.016 * amount
  c.torso.scale.set(1 - b * 0.6, 1 + b, 1 - b * 0.6)
}
// k > 0 squashes it, k < 0 stretches it
const squash = (c, k) => c.torso.scale.set(1 + k * 0.55, 1 - k, 1 + k * 0.55)
// running on the spot: `rate` in radians a second, `lift` how high the feet come, `pump` how hard the arms go
function jog(c, t, rate, lift = 1, pump = 1) {
  const s = Math.sin(t * rate)
  c.footL.rotation.x = -s * 0.85 * lift
  c.footR.rotation.x = s * 0.85 * lift
  c.footL.position.y = c.hipL.y + Math.max(0, s) * 0.08 * lift
  c.footR.position.y = c.hipR.y + Math.max(0, -s) * 0.08 * lift
  c.torso.position.y = Math.abs(Math.cos(t * rate)) * 0.05 * lift
  c.armL.rotation.x = s * 0.95 * pump
  c.armR.rotation.x = -s * 0.95 * pump
}
// both arms out in front, holding something
const hold = (c, reach = 1.2, close = 0.6) => {
  c.armL.rotation.set(-reach, 0, -close)
  c.armR.rotation.set(-reach, 0, close)
}
const armsUp = (c, how = 2.3, wave = 0) => {
  c.armL.rotation.set(0, 0, how + wave)
  c.armR.rotation.set(0, 0, -how + wave)
}
// lying on its side with its head to the viewer's left, face to the audience
const lieDown = (c) => (c.spin.rotation.z = HALF)

export const SCENES = {
  // ── the invitation: it has just been handed over, and one of them is delighted ─────────────
  cover: {
    build(d) {
      d.guest = d.creature({ at: [-0.46, 0, 0.22], yaw: 0.2 })
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [0.66, 0, -0.1], yaw: -0.32 })
      d.envelope = d.instance('envelope')
      d.envelope.position.set(0, 0.33, 0.5)
      d.envelope.rotation.x = -0.18
      d.guest.torso.add(d.envelope)
      d.sparkles = [[-1.02, 0.95, 0.3], [0.08, 1.2, 0.2], [-0.95, 0.35, 0.5], [-0.05, 0.55, 0.62]].map(([x, y, z]) => d.put('sparkle', x, y, z))
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      breathe(g, t)
      hold(g)
      const u = loop(t, 3.4)
      const hop = pulse(0, 0.42, u)
      g.root.position.y = hop * 0.14
      g.lift = hop * 0.14
      squash(g, -hop * 0.08 + pulse(0.42, 0.6, u) * 0.1)
      g.root.rotation.z = Math.sin(t * 1.7) * 0.03
      g.face(hop > 0.05 ? 'bliss' : 'happy')
      d.envelope.rotation.z = Math.sin(t * 1.7) * 0.05
      // the host cannot stand still
      jog(h, t, 9.5, 0.7, 0.7)
      h.face(loop(t, 5) > 4.2 ? 'smug' : 'grin')
      d.sparkles.forEach((s, i) => {
        const k = Math.max(0, Math.sin(t * 2.4 + i * 1.9)) ** 3
        s.scale.setScalar(k * 1.5)
        s.rotation.z = t * 0.8 + i
      })
    },
  },

  // ── 4:45: a wake-up call, delivered in person ─────────────────────────────
  alarm: {
    mood: [0.66, 0.72, 1.0],
    build(d) {
      const bx = 0.34
      const bz = -0.14
      d.put('bed', bx, 0, bz)
      d.guest = d.creature({ wear: ['nightcap'], at: [bx - 0.1, 0.34, bz], shadow: false })
      d.blanket = d.put('blanket', bx - 0.02, 0, bz)
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [-1.0, 0, 0.34], yaw: 0.55 })
      d.clock = d.instance('clock')
      d.host.torso.add(d.clock)
      d.zs = [0, 1, 2].map(() => d.put('z'))
      d.rings = [-1, 1].map(() => d.put('sparkle'))
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      const u = loop(t, 7.2)
      const ringing = within(3.0, 6.3, u)
      const up = smooth(2.5, 3.0, u) * (1 - smooth(6.3, 6.9, u)) // the clock, lifted over the host's head
      lieDown(g)
      // asleep; then not
      const jolt = pulse(3.0, 3.3, u)
      const hide = smooth(3.7, 4.2, u) * (1 - smooth(6.4, 7.0, u))
      g.root.position.x += hide * 0.24 + (ringing ? Math.sin(t * 40) * 0.006 : 0)
      g.root.position.y += jolt * 0.16
      breathe(g, t, ringing ? 0.4 : 2.2, ringing ? 14 : 1.5)
      g.face(!ringing ? 'asleep' : u < 3.6 ? 'shock' : 'dread')
      d.blanket.position.y = jolt * 0.05
      d.blanket.rotation.z = ringing ? Math.sin(t * 38) * 0.008 : 0
      d.zs.forEach((z, i) => {
        const k = cyc(t + i * 0.85, 2.55)
        const on = ringing ? 0 : smooth(0, 0.5, u) * (1 - smooth(2.6, 3.0, u))
        z.position.set(-0.36 - k * 0.3 + Math.sin(k * 7 + i) * 0.05, 1.32 + k * 0.62, -0.1)
        z.scale.setScalar(Math.sin(k * Math.PI) * (0.7 + k * 0.9) * on)
        z.rotation.z = Math.sin(k * 5 + i) * 0.3
      })
      // the host: creeping, then very much not
      if (ringing) {
        jog(h, t, 13, 0.6, 0)
        h.face(loop(t, 0.5) < 0.25 ? 'grin' : 'talk')
      } else {
        breathe(h, t)
        h.face('smug')
      }
      h.armL.rotation.set(lerp(-0.75, 0, up), 0, lerp(-0.6, 2.45, up))
      h.armR.rotation.set(lerp(-0.75, 0, up), 0, lerp(0.6, -2.45, up))
      const shake = ringing ? 1 : 0
      d.clock.position.set(Math.sin(t * 61) * 0.02 * shake, lerp(0.02, 1.08, up) + Math.abs(Math.sin(t * 47)) * 0.03 * shake, lerp(0.5, 0.02, up))
      d.clock.rotation.set(0, 0, Math.sin(t * 55) * 0.22 * shake)
      d.rings.forEach((s, i) => {
        const side = i ? 1 : -1
        s.position.set(h.root.position.x + side * 0.42, 1.52 + Math.sin(t * 20 + i) * 0.04, h.root.position.z + 0.1)
        s.scale.setScalar(shake * (0.6 + 0.6 * Math.abs(Math.sin(t * 16 + i * 2))))
        s.rotation.z = t * 6 * side
      })
    },
  },

  // ── 5:15: conversational pace ─────────────────────────────────────────────
  run: {
    build(d) {
      d.guest = d.creature({ wear: ['bib'], at: [-0.66, 0, 0.14], yaw: 0.75 })
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [0.62, 0, 0.3], yaw: 0.85 })
      d.sign = d.put('sign', 0, 0, -0.36)
      d.dashes = [0, 1, 2, 3].map(() => d.block(0.42, 0.012, 0.07, 0xe9e4d2))
      d.drops = [0, 1, 2, 3, 4].map(() => d.put('drop'))
      for (const m of [d.bg, d.floor]) {
        const map = m.uniforms.map.value
        map.wrapS = 1002 // mirrored repeat: the road has no end, in either direction
        map.needsUpdate = true
      }
      d.bg.uniforms.uUv.value.x = 320 / d.bg.uniforms.map.value.image.width
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      const speed = 1.2 // metres a second
      d.bg.uniforms.uUv.value.z = (t * 0.045) % 2
      d.floor.uniforms.uUv.value.z = ((t * speed) / 2.8) % 2
      // the same sign comes round again, and again
      const sx = 2.1 - loop(t * speed, 6.6)
      d.sign.position.x = sx
      d.sign.scale.setScalar(smooth(1.3, 1.02, Math.abs(sx)))
      d.dashes.forEach((dash, i) => {
        const x = 1.6 - loop(t * speed + i * 0.8, 3.2)
        dash.position.set(x, 0.008, 0.6)
        dash.scale.x = 0.42 * smooth(1.12, 0.8, Math.abs(x))
      })
      // the host floats along, and whenever the sign comes by, turns round and points at it
      jog(h, t, 11.5, 1, 1)
      h.lean.rotation.x = 0.1
      const look = Math.abs(sx + 0.1) < 1.0 ? 1 : 0
      d.look = lerp(d.look ?? 0, look, 0.14)
      h.root.rotation.y = lerp(0.85, -0.5, d.look)
      h.face(look ? (loop(t, 0.4) < 0.2 ? 'talk' : 'grin') : 'grin')
      if (look) h.armR.rotation.set(0, 0, -2.5 + Math.sin(t * 12) * 0.15)
      // the guest is having a different morning
      jog(g, t, 7.6, 0.72, 0.55)
      g.lean.rotation.x = 0.36 + Math.sin(t * 7.6) * 0.05
      g.torso.rotation.z = Math.sin(t * 3.8) * 0.09
      g.root.position.x -= 0.2 * Math.sin(t * 0.45) ** 2
      g.face('strain')
      d.drops.forEach((drop, i) => {
        const k = cyc(t * 1.25 + i * 0.2, 1)
        drop.position.set(g.root.position.x - 0.18 - k * 0.55, 0.98 + k * 0.5 - k * k * 1.5, g.root.position.z + (i % 2 ? 0.14 : -0.1) + k * 0.1)
        drop.scale.setScalar((1 - k) * 1.5)
        drop.rotation.z = -1.1
      })
    },
  },

  // ── 6:20: one more ───────────────────────────────────────────────────────
  hill: {
    build(d) {
      const hx = 0.0
      const hz = -0.16
      d.put('hill', hx, 0, hz)
      d.foot = [hx - 0.7, 0, hz + 0.06]
      d.top = [hx + 0.45, 0.9, hz + 0.06]
      d.guest = d.creature({ wear: ['bib'], at: d.foot, yaw: 0.5, shadow: false })
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [hx + 0.84, 0.9, hz + 0.02], yaw: -0.55 })
      d.host.ground = 0.905
      d.flag = d.instance('flag')
      d.flag.position.set(-0.46, 0.34, 0.14)
      d.host.torso.add(d.flag)
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      const u = loop(t, 9.2)
      const at = (s) => g.root.position.set(lerp(d.foot[0], d.top[0], s), lerp(d.foot[1], d.top[1], s), d.foot[2])
      let face = 'strain'
      if (u < 5.6) {
        // up, a hop at a time
        const k = Math.floor(u / 0.7)
        const f = (u / 0.7) % 1
        at(0.06 + (k + smooth(0.12, 0.72, f)) * 0.085)
        const hop = pulse(0.12, 0.72, f)
        g.root.position.y += hop * 0.07
        squash(g, pulse(0.72, 1, f) * 0.1 - hop * 0.05)
        g.root.rotation.z = 0.2
        g.lean.rotation.x = 0.18
        g.armL.rotation.x = Math.sin(f * TAU) * 0.8
        g.armR.rotation.x = -Math.sin(f * TAU) * 0.8
      } else if (u < 6.4) {
        // nearly
        at(0.74)
        g.root.rotation.z = 0.2 + Math.sin(t * 15) * 0.13 + smooth(6.0, 6.4, u) * 0.5
        armsUp(g, 1.6, Math.sin(t * 22) * 0.7)
        face = 'dread'
      } else if (u < 7.7) {
        // and all the way back down, the way a ball of fluff goes down a hill
        const f = (u - 6.4) / 1.3
        at(lerp(0.74, 0, f * f))
        g.root.position.x -= smooth(0.7, 1, f) * 0.3
        g.spin.rotation.z = f * (2 - f) * (TAU * 2 + HALF)
        g.root.position.y += Math.abs(Math.sin(f * TAU * 2.25)) * 0.08 * (1 - f)
        face = 'shock'
      } else {
        const up = smooth(8.5, 9.15, u)
        at(0)
        g.root.position.x = lerp(d.foot[0] - 0.3, lerp(d.foot[0], d.top[0], 0.06), up)
        g.root.position.y = lerp(0, lerp(d.foot[1], d.top[1], 0.06), up)
        g.spin.rotation.z = HALF * (1 - up)
        g.root.rotation.z = 0.2 * up
        breathe(g, t, 2.5, 9)
        face = up > 0.4 ? 'strain' : 'dead'
      }
      g.face(face)
      // the host got up here some time ago
      jog(h, t, 9, 0.5, 0)
      const nearly = within(5.2, 6.4, u)
      h.armR.rotation.set(-1.2, 0, 0.3)
      h.armL.rotation.set(0, 0, nearly ? 2.4 - Math.sin(t * 9) * 0.35 : 0)
      h.face(nearly ? (loop(t, 0.36) < 0.18 ? 'talk' : 'grin') : within(6.4, 8.4, u) ? 'smug' : 'grin')
      d.flag.rotation.set(0, 0.25, 0.12 + Math.sin(t * (nearly ? 9 : 2.6)) * (nearly ? 0.3 : 0.1))
    },
  },

  // ── 7:05: as many rounds as possible ──────────────────────────────────────
  gym: {
    build(d) {
      d.put('mat', -0.42, 0, 0.3)
      d.guest = d.creature({ wear: ['bib'], at: [-0.42, 0.03, 0.3], shadow: false })
      d.kettlebell = d.put('kettlebell', -0.3, 0.84, 0.3)
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [0.74, 0, -0.02], yaw: -1.0 })
      d.drops = [0, 1, 2].map(() => d.put('drop'))
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      // the guest has stopped, and something has been put on it so that it does not float away
      lieDown(g)
      breathe(g, t, 3.2, 7.5)
      const b = Math.sin(t * 7.5) * 0.016 * 3.2
      d.kettlebell.position.y = 0.845 + b * 0.43
      d.kettlebell.rotation.z = Math.sin(t * 7.5 + 1) * 0.03
      // once in a while an arm asks for help, and thinks better of it
      const w = loop(t, 5.5)
      const reach = pulse(0.4, 2.3, w)
      g.armL.rotation.set(0, 0, reach * 1.5 + (reach > 0.2 ? Math.sin(t * 17) * 0.25 : 0))
      g.face(within(0.4, 2.3, w) ? 'strain' : 'dead')
      d.drops.forEach((drop, i) => {
        const k = cyc(t * 0.9 + i * 0.33, 1)
        drop.position.set(-0.75 - i * 0.12 - k * 0.2, 0.95 + k * 0.35 - k * k * 0.9, 0.5)
        drop.scale.setScalar(Math.sin(k * Math.PI) * 1.3)
      })
      // the host does burpees, perfectly, and keeps count
      const f = loop(t, 2.4)
      const down = smooth(0.25, 0.5, f) * (1 - smooth(0.95, 1.2, f))
      h.spin.rotation.x = down * HALF
      const jump = pulse(1.22, 1.78, f)
      h.root.position.y = pulse(0.55, 0.95, f) * 0.13 + jump * 0.6
      h.lift = jump * 0.6
      squash(h, pulse(0, 0.3, f) * 0.2 + pulse(0.95, 1.22, f) * 0.22 + pulse(1.78, 2.05, f) * 0.2 - jump * 0.14)
      if (jump > 0) armsUp(h, 2.5)
      else if (down > 0.5) h.armL.rotation.x = h.armR.rotation.x = -0.6
      h.face(jump > 0.5 ? 'bliss' : f > 1.9 ? 'talk' : 'grin')
    },
  },

  // ── 7:50: three minutes at three degrees ──────────────────────────────────
  plunge: {
    mood: [0.95, 1.0, 1.08],
    build(d) {
      d.put('tub', 0, 0, 0.04)
      d.water = d.put('water', 0, 0.5, 0.04)
      d.guest = d.creature({ at: [-0.47, 0, 0.04], yaw: 0.12, shadow: false })
      d.host = d.creature({ tint: PINK, wear: ['headband', 'towel'], at: [0.47, 0, 0.04], yaw: -0.2, shadow: false })
      d.ice = [[-0.86, 0.12], [-0.02, 0.4], [0.03, -0.3], [0.88, 0.14], [0.36, 0.44], [-0.5, 0.42], [-0.3, -0.38]].map(([x, z], i) => {
        const o = d.put('ice', x, 0.52, z + 0.04, i * 1.3)
        o.userData = { x, z: z + 0.04 }
        return o
      })
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      d.water.position.y = 0.5 + Math.sin(t * 1.3) * 0.006
      // the guest: blue, and vibrating
      const w = loop(t, 6.4)
      const out = pulse(4.3, 5.5, w) // a bid for freedom
      g.tint.set(lerp(0.72, 0.9, out), lerp(0.86, 0.94, out), 1)
      g.root.position.x += Math.sin(t * 53) * 0.011
      g.root.position.y += out * 0.3 + Math.sin(t * 61) * 0.004
      g.root.rotation.z = Math.sin(t * 47) * 0.028
      squash(g, Math.sin(t * 44) * 0.012)
      g.armL.rotation.set(-0.9, 0, -1.0)
      g.armR.rotation.set(-0.9, 0, 1.0)
      g.face(out > 0.25 ? 'shock' : 'frozen')
      // the host: never better
      h.root.position.y += Math.sin(t * 1.3) * 0.02
      h.root.rotation.z = Math.sin(t * 0.9) * 0.045
      breathe(h, t, 1.2, 1.4)
      h.face(within(1.2, 2.6, w) ? (loop(t, 0.5) < 0.25 ? 'talk' : 'bliss') : 'bliss')
      d.ice.forEach((o, i) => {
        const near = o.userData.x < 0.1 ? 1 : 0.15
        o.position.set(o.userData.x + Math.sin(t * 50 + i) * 0.006 * near, 0.515 + Math.sin(t * 1.7 + i * 1.1) * 0.014, o.userData.z + Math.cos(t * 0.6 + i) * 0.012)
        o.rotation.set(Math.sin(t * 0.8 + i) * 0.2, i * 1.3 + t * 0.15, 0.2)
      })
    },
  },

  // ── 8:30: type 1 fun ──────────────────────────────────────────────────────
  brunch: {
    build(d) {
      d.put('table', 0, 0, 0.32)
      d.put('pancakes', 0, 0.46, 0.3)
      d.put('mug', -0.31, 0.46, 0.5, 2.6)
      d.put('mug', 0.31, 0.46, 0.5, 0.5)
      d.guest = d.creature({ wear: ['medal'], at: [-0.8, 0, -0.12], yaw: 0.5 })
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [0.8, 0, -0.12], yaw: -0.5 })
      d.zs = [0, 1].map(() => d.put('z'))
    },
    update(d, t) {
      const g = d.guest.rest()
      const h = d.host.rest()
      // the guest is listening. the guest is listening. the guest is
      const u = loop(t, 6.6)
      const nod = smooth(0.4, 3.6, u) ** 1.6 * (1 - smooth(3.6, 3.74, u))
      const catches = pulse(1.5, 1.75, u) * 0.12 + pulse(2.6, 2.85, u) * 0.16
      g.lean.rotation.x = nod * 0.62 - catches + pulse(3.74, 4.0, u) * -0.12
      g.root.position.y = pulse(3.6, 3.9, u) * 0.08
      breathe(g, t, 1.6, 1.6)
      g.face(u < 0.4 ? 'happy' : u < 3.6 ? 'asleep' : u < 4.3 ? 'shock' : u < 5.6 ? 'happy' : 'blink')
      d.zs.forEach((z, i) => {
        const k = cyc(t + i * 1.1, 2.2)
        const on = smooth(1.2, 2.0, u) * (1 - smooth(3.4, 3.6, u))
        z.position.set(-0.95 - k * 0.2 + Math.sin(k * 6 + i) * 0.04, 1.12 + k * 0.5, 0.1)
        z.scale.setScalar(Math.sin(k * Math.PI) * (0.6 + k * 0.7) * on)
      })
      // the host is describing tomorrow
      const talking = loop(t, 0.42) < 0.21
      h.face(within(3.6, 4.4, u) ? 'smug' : talking ? 'talk' : 'grin')
      h.torso.position.y = Math.abs(Math.sin(t * 4.2)) * 0.025
      h.root.rotation.y = h.yaw + Math.sin(t * 1.1) * 0.12
      h.armL.rotation.set(-0.5, 0, 0.9 + Math.sin(t * 3.1) * 0.7)
      h.armR.rotation.set(-0.5, 0, -0.9 - Math.sin(t * 2.3 + 1) * 0.7)
    },
  },

  // ── tomorrow ─────────────────────────────────────────────────────────────
  rsvp: {
    build(d) {
      d.host = d.creature({ tint: PINK, wear: ['headband'], at: [0.34, 0, 0.26], yaw: -0.12 })
      d.guest = d.creature({ wear: ['medal'], at: [-0.78, 0, -0.18], yaw: 0.34 })
      d.envelope = d.instance('envelope')
      d.envelope.position.set(0, 0.36, 0.56)
      d.host.torso.add(d.envelope)
      const colours = [0xd8b25a, 0xf2a7b5, 0xf6efe2, 0xc8323a, 0x8fd3e8]
      d.confetti = Array.from({ length: 40 }, (_, i) => {
        const o = d.block(0.06, 0.06, 0.012, colours[i % colours.length])
        o.userData = { x: -1.25 + ((i * 0.618) % 1) * 2.5, z: -0.4 + ((i * 0.377) % 1) * 1.0, p: (i * 0.271) % 1, s: 0.6 + ((i * 0.53) % 1) * 0.7 }
        return o
      })
    },
    update(d, t, dt) {
      const g = d.guest.rest()
      const h = d.host.rest()
      const { accepted, hope } = d.state
      d.yes = lerp(d.yes ?? 0, accepted ? 1 : 0, Math.min(1, dt * 5))
      d.maybe = lerp(d.maybe ?? 0, hope && !accepted ? 1 : 0, Math.min(1, dt * 8))
      hold(h, 1.25, 0.55)
      if (accepted) {
        const j = Math.abs(Math.sin(t * 5.2))
        h.root.position.y = j * 0.34
        h.lift = j * 0.34
        squash(h, -j * 0.1 + (1 - j) * 0.1)
        h.face(loop(t, 0.5) < 0.25 ? 'bliss' : 'grin')
        d.envelope.rotation.z = Math.sin(t * 10) * 0.2
      } else {
        // it has another one, and it is holding it out
        const f = loop(t, 1.1)
        const hop = pulse(0, 0.4, f)
        h.root.position.y = hop * 0.08
        h.lift = hop * 0.08
        squash(h, pulse(0.4, 0.6, f) * 0.07)
        h.root.rotation.z = Math.sin(t * 2.8) * 0.04
        h.face(d.maybe > 0.5 ? 'shock' : loop(t, 4) > 3.2 ? 'talk' : 'grin')
        d.envelope.rotation.z = Math.sin(t * 2.8) * 0.06
        d.envelope.position.z = 0.56 + Math.sin(t * 2.8) * 0.03
      }
      // the guest is leaving, slowly, in the hope that nobody notices
      g.root.position.x -= 0.14 * Math.abs(Math.sin(t * 0.5)) * (1 - d.yes)
      g.root.position.x += Math.sin(t * 38) * 0.006 * (1 - d.maybe)
      g.root.position.y = Math.abs(Math.sin(t * 6)) * 0.1 * d.maybe
      g.spin.rotation.z = HALF * d.yes // and falls over, in the end
      g.root.position.y += -0.02 * d.yes
      g.face(accepted ? 'dead' : d.maybe > 0.5 ? 'bliss' : 'dread')
      breathe(g, t, 1.5, accepted ? 2 : 9)
      d.confetti.forEach((o) => {
        const k = cyc(t * 0.42 * o.userData.s + o.userData.p, 1)
        o.position.set(o.userData.x + Math.sin(k * 9 + o.userData.p * 20) * 0.12, 2.3 - k * 2.3, o.userData.z)
        o.rotation.set(k * 14 * o.userData.s, k * 9, o.userData.p * 6)
        o.visible = d.yes > 0.02
        o.scale.set(0.07 * d.yes, 0.07 * d.yes, 0.012)
      })
    },
  },
}
