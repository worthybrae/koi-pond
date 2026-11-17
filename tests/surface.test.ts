import { expect, test } from 'claude-code/testing'

import type { Sky, Weather } from '../types'
import { pondSvg } from '../hooks/pond'
import { seasonOf } from '../hooks/surface'

const T0 = 1_800_000_000_000 // 2027-01-15 08:00 UTC, 03:00 in New York
const NOON = Date.UTC(2026, 10, 16, 17)
const CLEAR: Weather = { code: 0, cloud: 0, rain: 0, snow: 0, wind: 10, temp: 10, sunrise: 404, sunset: 997, offset: -18000, at: T0 }
const skyOf = (w: Partial<Weather> = {}, at = NOON): Sky => ({ weather: { ...CLEAR, ...w }, dark: false, grow: 1, since: at, changed: at })
const count = (svg: string, re: RegExp) => [...svg.matchAll(re)].length

test('the water has no net of sunlight lines over it, by day or night', () => {
  const svg = pondSvg(skyOf(), NOON)
  expect(svg).not.toMatch(/<pattern id="cs\d"/)
  expect(svg).not.toContain('class="cs"')
})

test('the open water has no random ripples and no repeating wave pattern over it', () => {
  const svg = pondSvg(skyOf({ wind: 40 }), NOON)
  expect(svg).not.toContain('class="rp"')
  expect(svg).not.toMatch(/<pattern id="sh\d"/)
  expect(svg).not.toMatch(/url\(#sh\d\)/)
})

test('no fish carries a wake: a V that moves with the fish reads as an arrow, not water', () => {
  expect(pondSvg(skyOf(), NOON)).not.toContain('class="wk"')
})

test('no rings anywhere: not for leaves landing or dragonflies', () => {
  const scenes = [
    pondSvg(skyOf(), NOON),
    pondSvg(skyOf({}, at(10, 16, 12)), at(10, 16, 12)),
    pondSvg(skyOf({}, at(6, 16, 15)), at(6, 16, 15)),
  ]
  for (const svg of scenes) {
    expect(svg).not.toContain('href="#rs')
    expect(svg).not.toMatch(/id="rs\d"/)
  }
})

test('the water has no plus-shaped glints on it, in any weather', () => {
  for (const w of [{ wind: 5 }, { wind: 35 }, { wind: 35, code: 3, cloud: 100 }]) {
    const svg = pondSvg(skyOf(w), NOON)
    expect(svg).not.toContain('id="gl"')
    expect(svg).not.toContain('class="gl ')
  }
})

const at = (month: number, day: number, hour: number) => Date.UTC(2026, month, day, hour + 5)

test('the season follows the New York month', () => {
  expect(seasonOf(at(10, 16, 12), -18000)).toBe('autumn')
  expect(seasonOf(at(3, 2, 12), -14400)).toBe('spring')
  expect(seasonOf(at(6, 4, 12), -14400)).toBe('summer')
  expect(seasonOf(at(0, 9, 12), -18000)).toBe('winter')
  // New York's midnight on 1 December is 05:00 UTC: an hour before, it is still autumn there.
  expect(seasonOf(Date.UTC(2026, 11, 1, 4), -18000)).toBe('autumn')
  expect(seasonOf(Date.UTC(2026, 11, 1, 6), -18000)).toBe('winter')
})

test('fish rise and dive on their own cycles, their shadows closing in as they sink', () => {
  const svg = pondSvg(skyOf(), NOON)
  const fish = count(svg, /<g id="f\d+">/g)
  const deep = [...svg.matchAll(/<g id="f(\d+)">.*?<g class="dv" (style="[^"]*")>/gs)]
  expect(deep.length).toBe(fish)
  for (const [, i, style] of deep) {
    expect(style).toMatch(/^style="--c:\d+s;--o:\d+s"$/)
    // A fish that casts a shadow has it on the same cycle.
    if (svg.includes(`<use href="#f${i}"/>`)) expect(svg).toContain(`<g class="sd" ${style}><use href="#f${i}"/></g>`)
  }
  expect(svg).toMatch(/\.dv,\.sd\{[^}]*animation-duration:var\(--c\);animation-delay:calc\(var\(--t0\) - var\(--o\)\)/)
  // Sunk, the shadow sits nearer under the fish (back toward it, up and left, against its usual offset down and right).
  expect(svg).toMatch(/@keyframes sd\{[^@]*50%,62%\{transform:translate\(-\d+px,-\d+px\)\}/)
})

test('a veil behind the chat column dims the water there, fading out softly on both sides', () => {
  const svg = pondSvg(skyOf(), NOON)
  // No hard frame round the pond.
  expect(svg).not.toMatch(/url\(#e[xy]\)/)
  const veil = /<linearGradient id="veil"[^>]*>(.*?)<\/linearGradient>/.exec(svg)
  expect(veil).not.toBeNull()
  const stops = [...veil![1]!.matchAll(/offset="([\d.]+)"[^>]*stop-opacity="([\d.]+)"/g)].map(m => [Number(m[1]), Number(m[2])] as const)
  // Clear at both ends, darkest in the middle, rising and falling gradually.
  expect(stops[0]![1]).toBe(0)
  expect(stops[stops.length - 1]![1]).toBe(0)
  expect(stops.length >= 6 ? 'gradual' : `${stops.length} stops`).toBe('gradual')
  // The veil spans the chat column (490 to 1110) with room to fade either side, and is drawn last, over everything.
  const rect = /<rect x="(\d+)" width="(\d+)" height="1000" fill="url\(#veil\)"[^>]*\/><\/svg>$/.exec(svg)
  expect(rect).not.toBeNull()
  const [x, w] = [Number(rect![1]), Number(rect![2])]
  expect(x < 490 - 120 && x + w > 1110 + 120 ? 'spans' : `${x}..${x + w}`).toBe('spans')
})

test('no opal stones on the pond floor', () => {
  expect(pondSvg(skyOf(), NOON)).not.toMatch(/<g class="opal" style="[^"]*" transform="translate/)
})
