import { expect, test } from 'claude-code/testing'

import { darkAt, daylight, gate, gateCss, lightCss, lightLayer } from '../hooks/light'

const SUNRISE = 404
const SUNSET = 997

test('the light runs through the day in order, timed to the sun', () => {
  const css = lightCss(SUNRISE, SUNSET)
  const wash = /@keyframes lw\{(.*?)\}@keyframes/.exec(css)![1]!
  const stops = [...wash.matchAll(/([\d.]+)%\{/g)].map(m => Number(m[1]))
  expect(stops.length).toBeGreaterThan(8)
  stops.slice(1).forEach((v, i) => expect(v >= stops[i]! ? 'ordered' : `${stops[i]} then ${v}`).toBe('ordered'))
  expect(stops[0]).toBe(0)
  expect(stops.at(-1)).toBe(100)
})

test('the light stays in order on a day with no night', () => {
  const css = lightCss(0, 1440)
  const wash = /@keyframes lw\{(.*?)\}@keyframes/.exec(css)![1]!
  const stops = [...wash.matchAll(/([\d.]+)%\{/g)].map(m => Number(m[1]))
  stops.slice(1).forEach((v, i) => expect(v >= stops[i]! ? 'ordered' : `${stops[i]} then ${v}`).toBe('ordered'))
})

test('the light layer starts where the day is', () => {
  expect(lightLayer(17 * 3600, SUNRISE, SUNSET)).toContain('animation-delay:-61200s')
})

test('the light uses no blend modes, which would re-blend under every moving fish each frame', () => {
  expect(lightCss(SUNRISE, SUNSET)).not.toContain('mix-blend-mode')
  expect(lightLayer(23 * 3600, SUNRISE, SUNSET)).not.toContain('mix-blend-mode')
})

test('with motion turned off the light still shows the moment, not black', () => {
  const layer = lightLayer(17 * 3600, SUNRISE, SUNSET)
  const dark = Number(/class="ld"[^>]*opacity="([\d.]+)"/.exec(layer)?.[1])
  const wash = /class="lw"[^>]*fill="(#[0-9a-f]{6})" opacity="([\d.]+)"/.exec(layer)
  expect(dark > 0.15 && dark < 0.4 ? 'dusky' : String(dark)).toBe('dusky')
  expect(wash !== null).toBe(true)
  expect(Number(/class="ld"[^>]*opacity="([\d.]+)"/.exec(lightLayer(12 * 3600, SUNRISE, SUNSET))?.[1])).toBe(0)
})

test('dark after dusk, light by day', () => {
  expect(darkAt(17 * 60 + 30, SUNRISE, SUNSET)).toBe(true)
  expect(darkAt(12 * 60, SUNRISE, SUNSET)).toBe(false)
  expect(darkAt(3 * 60, SUNRISE, SUNSET)).toBe(true)
})

test('daylight is none at night, full at noon, part-way at dawn', () => {
  expect(daylight(2 * 60, SUNRISE, SUNSET)).toBe(0)
  expect(daylight(12 * 60, SUNRISE, SUNSET)).toBe(1)
  const dawn = daylight(SUNRISE, SUNRISE, SUNSET)
  expect(dawn > 0 && dawn < 1 ? 'between' : `${dawn}`).toBe('between')
})

test('day and night gates follow the sun and show the moment without motion', () => {
  const css = gateCss(SUNRISE, SUNSET)
  expect(css).toContain('@keyframes dy')
  expect(css).toContain('@keyframes nt')
  const day = gate('dy', 12 * 3600, SUNRISE, SUNSET, '<i/>')
  expect(day).toContain('class="dy"')
  expect(day).toContain('opacity="1"')
  expect(day).toContain('animation-delay:-43200s')
  expect(gate('nt', 12 * 3600, SUNRISE, SUNSET, '<i/>')).toContain('opacity="0"')
  expect(gate('nt', 23 * 3600, SUNRISE, SUNSET, '<i/>')).toContain('opacity="1"')
})
