import { expect, test } from 'claude-code/testing'

import type { Sky, Weather } from '../types'
import { COLUMN, CYCLE, GALE, PADS, padTracks, padsSvg } from '../hooks/pads'
import { pondSvg } from '../hooks/pond'

const NOON = Date.UTC(2026, 10, 16, 17)
const NIGHT = Date.UTC(2026, 10, 17, 3)
const CLEAR: Weather = { code: 0, cloud: 0, rain: 0, snow: 0, wind: 10, temp: 10, sunrise: 404, sunset: 997, offset: -18000, at: NOON }
const skyOf = (at: number, w: Partial<Weather> = {}): Sky => ({ weather: { ...CLEAR, ...w }, dark: false, grow: 1, since: at, changed: at })
const count = (svg: string, re: RegExp) => [...svg.matchAll(re)].length

test('eight pads, each with its shadow drawn from it', () => {
  const svg = pondSvg(skyOf(NOON), NOON)
  expect(PADS.length).toBe(8)
  expect(count(svg, /<g id="pd\d"/g)).toBe(8)
  expect(count(svg, /<use href="#pd\d"\/>/g)).toBe(8)
})

/** Where a pad is at `t` seconds into the hour: on the line between the stops either side. */
const place = (k: number, t: number): [number, number] => {
  const track = padTracks().tracks[k]!
  const b = Math.max(1, track.findIndex(s => s[0] >= t))
  const [t0, x0, y0] = track[b - 1]!
  const [t1, x1, y1] = track[b]!
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0)
  return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]
}

test('no pad ever floats into the chat column, even bobbing in a gale', () => {
  for (const [k, track] of padTracks().tracks.entries()) {
    const r = PADS[k]!.r
    for (const [, x] of track) {
      const clear = x + r + GALE < COLUMN[0] || x - r - GALE > COLUMN[1]
      expect(clear ? 'clear' : `pad ${k} at ${Math.round(x)} reaches the chat column`).toBe('clear')
    }
  }
})

test('every pad floats off one edge of the pond and back on at the other each cycle', () => {
  for (const [k, track] of padTracks().tracks.entries()) {
    const r = PADS[k]!.r
    expect(track.some(([, , y]) => y - r > 1000) ? 'off the bottom' : `pad ${k} never leaves`).toBe('off the bottom')
    expect(track.some(([, , y]) => y + r < 0) ? 'off the top' : `pad ${k} never leaves`).toBe('off the top')
  }
})

test('pads that meet bounce off each other instead of floating through', () => {
  const { bumps } = padTracks()
  expect(bumps >= 6 ? 'bumps' : `${bumps} bumps`).toBe('bumps')
  let worst = 0
  for (let t = 0; t <= CYCLE; t += 1) {
    const at = PADS.map((_, k) => place(k, t))
    for (let i = 0; i < PADS.length; i += 1)
      for (let j = i + 1; j < PADS.length; j += 1) {
        const dy = at[j]![1] - at[i]![1]
        const d = Math.hypot(at[j]![0] - at[i]![0], dy - Math.round(dy / 1180) * 1180)
        worst = Math.max(worst, PADS[i]!.r + PADS[j]!.r - d)
      }
  }
  // Two pads may touch for the quarter second before they bounce, no more.
  expect(worst < 2 ? 'apart' : `overlap ${worst.toFixed(1)} px`).toBe('apart')
})

test('the drift runs on the clock and each cycle runs on into the next without a jump', () => {
  const svg = pondSvg(skyOf(NOON), NOON)
  expect(svg).toContain(`.pf{animation:${CYCLE}s linear infinite;animation-delay:var(--t0)}`)
  expect(count(svg, /<g class="pf f\d">/g)).toBe(8)
  expect(padsSvg({}).pads).not.toContain('<animateMotion')
  for (const track of padTracks().tracks) {
    expect(track[0]![0]).toBe(0)
    expect(track.at(-1)![0]).toBe(CYCLE)
    expect(Math.hypot(track[0]![1] - track.at(-1)![1], track[0]![2] - track.at(-1)![2]) < 0.5 ? 'joined' : 'jumps').toBe('joined')
    // Only out of sight does a pad move fast: coming round from one edge to the other.
    for (let i = 1; i < track.length; i += 1) {
      const [t0, x0, y0] = track[i - 1]!
      const [t1, x1, y1] = track[i]!
      const speed = Math.hypot(x1 - x0, y1 - y0) / (t1 - t0)
      const hidden = y0 > 1060 || y0 < -60
      expect(speed < 12 || hidden ? 'calm' : `${speed.toFixed(1)} px/s at ${t0}`).toBe('calm')
    }
  }
})

test('lilies open by day and close into buds at night', () => {
  const day = pondSvg(skyOf(NOON), NOON)
  expect(day).toMatch(/<g class="dy" opacity="1"[^>]*><g class="lo"/)
  expect(day).toMatch(/<g class="dn" opacity="0"[^>]*><g class="lb"/)
  const night = pondSvg(skyOf(NIGHT), NIGHT)
  expect(night).toMatch(/<g class="dy" opacity="0"[^>]*><g class="lo"/)
  expect(night).toMatch(/<g class="dn" opacity="1"[^>]*><g class="lb"/)
})

test('pads and lilies are drawn in tiles the size of the koi (5 px), and no frog sits on them', () => {
  const { pads, defs } = padsSvg({ season: 'autumn' })
  const widths = new Set([...(pads + defs).matchAll(/class="(t\d+)/g)].map(m => m[1]))
  expect([...widths].join(' ')).toBe('t43')
  expect(pads).not.toContain('class="fg"')
})

test('pads and lilies are solid: a backing fills the gaps between tiles, so nothing shows through', () => {
  const { pads, defs } = padsSvg({})
  for (let k = 0; k < PADS.length; k += 1) {
    const pad = new RegExp(`<g id="pd${k}"[\\s\\S]*?<g class="spin"[^>]*><path stroke="#[0-9a-f]{6}" stroke-width="[\\d.]+" d="M`).test(pads)
    expect(pad ? 'backed' : `pad ${k} has no backing`).toBe('backed')
  }
  for (const id of ['lo-pink', 'lb-pink', 'lo-white', 'lb-white']) expect(defs).toMatch(new RegExp(`<g id="${id}"><path stroke="#[0-9a-f]{6}" stroke-width="[\\d.]+" d="M`))
})

test('each lily sits on its pad\'s pixel grid', () => {
  const { pads } = padsSvg({})
  const places = [...pads.matchAll(/<g class="lo" transform="translate\((-?\d+) (-?\d+)\)"/g)]
  expect(places.length).toBe(PADS.filter(p => p.lily !== undefined).length)
  for (const [, x, y] of places) expect(Number(x) % 5 === 0 && Number(y) % 5 === 0 ? 'on grid' : `${x},${y}`).toBe('on grid')
})

test('the pads and lilies do not shimmer: a plain bead of water, no twinkling petals', () => {
  const { pads, defs } = padsSvg({})
  expect(pads).not.toContain('class="opal"')
  expect(defs).not.toContain('class="gr"')
})

test('at night each pad dims and each lily\'s bud glows over it', () => {
  const { pads, defs } = padsSvg({ light: { local: 0, sunrise: 404, sunset: 997 } })
  const groups = pads.split('<g id="pd').slice(1)
  expect(groups.length).toBe(PADS.length)
  PADS.forEach((p, k) => {
    const g = groups[k]!
    expect(g).toMatch(/<g class="dn" opacity="1"[^>]*><path class="pd-night" stroke="#040b24"/)
    if (p.lily === undefined) return expect(g).not.toContain('url(#bg-')
    const halo = g.indexOf(`fill="url(#bg-${p.lily})"`)
    const bud = g.indexOf(`<use href="#lb-${p.lily}"/>`)
    expect(halo >= 0 && halo < bud ? 'halo under bud' : `halo ${halo}, bud ${bud}`).toBe('halo under bud')
  })
  expect(defs).toContain('<radialGradient id="bg-pink"')
  expect(defs).toContain('<radialGradient id="bg-white"')
})

test('by day the night dimming and the halos are shut', () => {
  const { pads } = padsSvg({ light: { local: 12 * 3600, sunrise: 404, sunset: 997 } })
  expect(pads).toMatch(/<g class="dn" opacity="0"[^>]*><path class="pd-night"/)
})

test('with no sky the lilies show open and nothing dims or glows', () => {
  const { pads } = padsSvg({})
  expect(pads).not.toContain('url(#bg-')
  expect(pads).not.toContain('pd-night')
})
