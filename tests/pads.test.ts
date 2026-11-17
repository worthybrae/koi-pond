import { expect, test } from 'claude-code/testing'

import type { Sky, Weather } from '../types'
import { PADS, padsSvg } from '../hooks/pads'
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

test('no pad drifts into the chat column, even in a gale', () => {
  const sway = 6 * (1 + 1.4)
  for (const p of PADS) {
    const reachX = p.r + p.drift[0] + sway
    const clear = p.at[0] + reachX < 490 || p.at[0] - reachX > 1110
    expect(clear ? 'clear' : `pad at ${p.at} reaches the chat column`).toBe('clear')
  }
})

test('pads drift on the clock: drawn 5 s later, every drift is 5 s further on', () => {
  const begins = (at: number) =>
    [...pondSvg(skyOf(at), at).matchAll(/<animateMotion path="[^"]*" dur="(\d+)s" begin="-([\d.]+)s"/g)].map(m => [Number(m[1]), Number(m[2])])
  const a = begins(NOON)
  const b = begins(NOON + 5000)
  expect(a.length).toBe(8)
  b.forEach(([dur, v], i) => {
    const moved = (v! - a[i]![1]! + dur!) % dur!
    expect(Math.abs(moved - 5) < 0.06 ? 'on' : `${moved}`).toBe('on')
  })
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
  const { pads, defs } = padsSvg({ clock: 0, season: 'autumn' })
  const widths = new Set([...(pads + defs).matchAll(/class="(t\d+)/g)].map(m => m[1]))
  expect([...widths].join(' ')).toBe('t43')
  expect(pads).not.toContain('class="fg"')
})

test('pads and lilies are solid: a backing fills the gaps between tiles, so nothing shows through', () => {
  const { pads, defs } = padsSvg({ clock: 0 })
  for (let k = 0; k < PADS.length; k += 1) {
    const pad = new RegExp(`<g id="pd${k}"[\\s\\S]*?<g class="spin"[^>]*><path stroke="#[0-9a-f]{6}" stroke-width="[\\d.]+" d="M`).test(pads)
    expect(pad ? 'backed' : `pad ${k} has no backing`).toBe('backed')
  }
  for (const id of ['lo-pink', 'lb-pink', 'lo-white', 'lb-white']) expect(defs).toMatch(new RegExp(`<g id="${id}"><path stroke="#[0-9a-f]{6}" stroke-width="[\\d.]+" d="M`))
})

test('each lily sits on its pad\'s pixel grid', () => {
  const { pads } = padsSvg({ clock: 0 })
  const places = [...pads.matchAll(/<g class="lo" transform="translate\((-?\d+) (-?\d+)\)"/g)]
  expect(places.length).toBe(PADS.filter(p => p.lily !== undefined).length)
  for (const [, x, y] of places) expect(Number(x) % 5 === 0 && Number(y) % 5 === 0 ? 'on grid' : `${x},${y}`).toBe('on grid')
})

test('the pads and lilies do not shimmer: a plain bead of water, no twinkling petals', () => {
  const { pads, defs } = padsSvg({ clock: 0 })
  expect(pads).not.toContain('class="opal"')
  expect(defs).not.toContain('class="gr"')
})
