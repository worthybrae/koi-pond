// The lily pads: two clusters and a few strays on both sides of the chat column, big pads down to new leaves. Each
// drifts slowly round its own loop, turns a little, and bobs more in wind; water lilies on the big ones open by day and
// close into buds at night. Drawn in 5 px tiles, the same as the koi.

import { gate, type Gate } from './light'
import type { Season } from './surface'
import { addTile, drawBacking, drawRuns, hashOf, n1, type Point, type Tiles } from './tiles'

/** Tiles drawn over a solid backing in `grout`, so the gaps between them read as dark seams, not water. */
const solid = (tiles: Tiles, size: number, grout: string) => drawBacking(tiles, grout) + drawRuns(tiles, size)

/** A pad: its home (px), its radius (px), how far it drifts round its home (px, across and down), how long a loop
 *  takes (s), where its notch points, whether it shows a curled-up edge and in what colour underneath, and its lily. */
export type Pad = {
  at: Point
  r: number
  drift: Point
  loop: number
  notch: number
  curl?: { at: number; under: string }
  lily?: 'pink' | 'white'
}

// Homes kept clear of the chat column (tests/pads.test.ts checks every drift against it).
export const PADS: readonly Pad[] = [
  { at: [1430, 150], r: 70, drift: [40, 25], loop: 300, notch: 2.3, curl: { at: 5.4, under: '#7a2f38' }, lily: 'pink' },
  { at: [1530, 310], r: 46, drift: [22, 30], loop: 260, notch: 4.1 },
  { at: [1320, 66], r: 22, drift: [30, 12], loop: 210, notch: 0.9 },
  { at: [1460, 830], r: 66, drift: [40, 24], loop: 340, notch: 3.6, lily: 'white' },
  { at: [1320, 930], r: 32, drift: [28, 16], loop: 240, notch: 5.5, curl: { at: 1.2, under: '#4a7a3a' } },
  { at: [150, 560], r: 72, drift: [34, 40], loop: 380, notch: 0.4, curl: { at: 3.4, under: '#7a2f38' }, lily: 'white' },
  { at: [290, 870], r: 46, drift: [40, 18], loop: 280, notch: 2.9, lily: 'pink' },
  { at: [110, 160], r: 30, drift: [28, 24], loop: 230, notch: 4.8 },
]

/** The pads' tile, the koi's. */
const T = 5
/** The pads' shapes were set in 12 px tiles: their rims, veins and curls keep those proportions. */
const K = 12 / T

/** Angle difference folded into -π..π. */
const turn = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** A pad's tiles round its own middle: a lit rim to the upper left and a shaded one to the lower right, veins out
 *  from the middle, a curled-up edge on some, and in autumn a few yellowing spots. */
function padTiles(p: Pad, k: number, season: Season | undefined): Tiles {
  const tiles: Tiles = new Map()
  const R = p.r / T
  const reach = Math.ceil(R)
  const young = p.r < 30
  const veins = 7
  for (let j = -reach; j <= reach; j += 1) {
    for (let i = -reach; i <= reach; i += 1) {
      const d = Math.hypot(i, j)
      if (d > R) continue
      const a = Math.atan2(j, i)
      if (!young && Math.abs(turn(a - p.notch)) < 0.24 && d > 0.6 * K) continue
      const rim = d > R - 1.5
      const lit = (-i - j) / (Math.SQRT2 * Math.max(d, 0.01))
      let colour: string
      if (p.curl !== undefined && d > R - 1.7 * K && Math.abs(turn(a - p.curl.at)) < 0.55) colour = rim ? p.curl.under : '#2a5e3c'
      else if (rim) colour = lit > 0.5 ? (young ? '#5a9460' : '#357452') : lit < -0.35 ? '#112e20' : '#18402c'
      else {
        const ray = turn((a - p.notch - Math.PI) * veins) // distance to the nearest vein, as an angle times the count
        const vein = d > 1.2 * K && d < R - 1.4 * K && Math.abs(ray) * d < 2.2 * K
        const spot = season === 'autumn' && hashOf(Math.round(i / K) + 40, Math.round(j / K) + 40, k + 600) < 0.05 && d > R * 0.4
        colour = spot
          ? hashOf(Math.round(i / K), Math.round(j / K), k + 601) < 0.5 ? '#6f6a2c' : '#7a5530'
          : vein
            ? young ? '#4f8c56' : '#2a5f42'
            : young
              ? '#3d7a4a'
              : lit > 0.2 && d > R * 0.5
                  ? '#22543a'
                  : '#1d4a32'
      }
      addTile(tiles, colour, i * T - T / 2, j * T - T / 2, T)
    }
  }
  // A bead of water caught on the bigger pads.
  if (!young) addTile(tiles, '#cfe8dc', Math.round(R * 0.35) * T - T / 2, Math.round(R * 0.2) * T - T / 2, T)
  return tiles
}

/** The lilies' tile, the koi's too. */
const F = 5

/** An open water lily round (0, 0): two rings of pointed petals and a gold middle. */
function lilyOpen(kind: 'pink' | 'white'): Tiles {
  const [base, tip, deep] = kind === 'pink' ? ['#e8a0b8', '#f8d0de', '#c4688a'] : ['#ece8f2', '#ffffff', '#bdb5cc']
  const tiles: Tiles = new Map()
  const R = 5.5
  for (let j = -6; j <= 6; j += 1) {
    for (let i = -6; i <= 6; i += 1) {
      const d = Math.hypot(i, j)
      const a = Math.atan2(j, i)
      const outer = R * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos(4 * a)), 0.7))
      const inner = R * 0.68 * (0.55 + 0.45 * Math.pow(Math.abs(Math.cos(4 * a + Math.PI / 2)), 0.7))
      let colour = ''
      if (d < 1.3) colour = d < 0.7 ? '#d89a2a' : '#f2c53d'
      else if (d <= inner) colour = d > inner - 1 ? tip : base
      else if (d <= outer) colour = d > outer - 1 ? tip : d < R * 0.5 ? deep : base
      if (colour !== '') addTile(tiles, colour, i * F - F / 2, j * F - F / 2, F)
    }
  }
  return tiles
}

/** A closed bud round (0, 0): a pointed tip of petal colour in green sepals. */
function lilyBud(kind: 'pink' | 'white'): Tiles {
  const petal = kind === 'pink' ? '#c86a8c' : '#d8d2e2'
  const tiles: Tiles = new Map()
  for (let j = -4; j <= 3; j += 1) {
    const half = j < -2 ? 0 : j < 0 ? 1 : j < 3 ? 2 : 1
    for (let i = -half; i <= half; i += 1) {
      const colour = j < 1 ? (i === -half && half > 0 ? '#a85a78' : petal) : Math.abs(i) === half ? '#3f7a4a' : '#356a40'
      addTile(tiles, kind === 'white' && j < 1 && i === -half && half > 0 ? '#b0a8c0' : colour, i * F - F / 2, j * F - F / 2, F)
    }
  }
  return tiles
}

/** The night's dark over the pond (the light layer's `ld`), and how dark a pad goes at night, to match the water. */
const NIGHT = '#040b24'
/** The soft light round a lily's bud at night. */
const BUD_LIGHT = { pink: '#ffd6ea', white: '#f4f0ff' } as const

export type PadDraw = {
  /** Seconds since the epoch, for the clock-placed drift. */
  clock: number
  season?: Season
  /** The day's gates; absent when there is no sky to go by, and the lilies show open. */
  light?: { local: number; sunrise: number; sunset: number }
}

/** The pads and their shadows (which use the pads drawn in black, set down and to the right). */
export function padsSvg(o: PadDraw): { pads: string; shadows: string; defs: string } {
  let pads = ''
  let shadows = ''
  const gated = (kind: Gate, inner: string) => (o.light === undefined ? (kind === 'dy' ? inner : '') : gate(kind, o.light.local, o.light.sunrise, o.light.sunset, inner))
  PADS.forEach((p, k) => {
    const tiles = padTiles(p, k, o.season)
    let body = solid(tiles, T, '#0d2418')
    // At night the pad dims with the water under it: its own outline in the night's dark, no filter to redraw.
    let night = drawBacking(tiles, NIGHT).replaceAll('<path ', '<path class="pd-night" ')
    let bud = ''
    if (p.lily !== undefined) {
      const [x, y] = [-Math.round((p.r * 0.3) / T) * T, -Math.round((p.r * 0.25) / T) * T]
      const place = `transform="translate(${x} ${y})"`
      body += gated('dy', `<g class="lo" ${place}><use href="#lo-${p.lily}"/></g>`)
      // The bud glows: a soft light round it over the dimmed pad, and the bud itself left undimmed on top.
      night += `<circle cx="${x}" cy="${y - 3}" r="22" fill="url(#bg-${p.lily})"/>`
      bud = gated('dn', `<g class="lb" ${place}><use href="#lb-${p.lily}"/></g>`)
    }
    if (o.light !== undefined) body += gated('dn', night)
    body += bud
    const [ax, ay] = p.drift
    const loop = `M-${ax} 0a${ax} ${ay} 0 1 0 ${ax * 2} 0a${ax} ${ay} 0 1 0 -${ax * 2} 0`
    const spin = 50 + Math.round(hashOf(k, 21, 4) * 40)
    pads +=
      `<g id="pd${k}" transform="translate(${p.at[0]} ${p.at[1]})"><g class="sway${k % 2 === 1 ? ' b' : ''}" style="animation-duration:${9 + (k % 4) * 2}s">` +
      `<g><animateMotion path="${loop}" dur="${p.loop}s" begin="-${n1(o.clock % p.loop)}s" repeatCount="indefinite"/>` +
      `<g class="spin" style="animation-duration:${spin}s;animation-delay:calc(var(--t0) - ${Math.round(hashOf(k, 22, 4) * spin)}s)">${body}</g></g></g></g>`
    shadows += `<use href="#pd${k}"/>`
  })
  // Each kind of lily drawn once, open and in bud, and used on every pad that has one.
  const kinds = [...new Set(PADS.flatMap(p => (p.lily === undefined ? [] : [p.lily])))]
  const defs = kinds.map(kind => `<radialGradient id="bg-${kind}"><stop offset="0" stop-color="${BUD_LIGHT[kind]}" stop-opacity=".55"/><stop offset="1" stop-color="${BUD_LIGHT[kind]}" stop-opacity="0"/></radialGradient><g id="lo-${kind}">${solid(lilyOpen(kind), F, kind === 'pink' ? '#9c4f6c' : '#8f879e')}</g><g id="lb-${kind}">${solid(lilyBud(kind), F, '#24502e')}</g>`).join('')
  return { pads, shadows, defs }
}

/** The style the pads need beyond the shared `sway`: how dark a pad goes at night, and the slow turn. */
export const PADS_CSS = `.pd-night{opacity:.45}.spin{animation:spin ease-in-out infinite alternate}@keyframes spin{from{transform:rotate(-9deg)}to{transform:rotate(9deg)}}`
