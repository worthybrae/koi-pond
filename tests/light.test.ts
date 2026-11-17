import { expect, test } from 'claude-code/testing'

import { darkAt, daylight, gate, gateCss } from '../hooks/light'

const SUNRISE = 404
const SUNSET = 997

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
