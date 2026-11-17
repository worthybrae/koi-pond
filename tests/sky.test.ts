import { expect, test } from 'claude-code/testing'

import type { Weather } from '../types'
import { growAt, nextSky } from '../hooks/sky'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 10, 16, 17, 0) // noon in New York
const W: Weather = { code: 0, cloud: 0, rain: 0, snow: 0, wind: 10, temp: 10, sunrise: 404, sunset: 997, offset: -18000, at: T0 }

test('the fish grow, a quarter at most', () => {
  expect(growAt(0, 0)).toBe(1)
  expect(Math.abs(growAt(20 * DAY, 0) - 1.16) <= 0.01).toBe(true)
  expect(growAt(5000 * DAY, 0)).toBe(1.25)
  expect(growAt(0, DAY)).toBe(1)
})

test('the first sky of a session does not fade in; new weather does; same weather keeps the sky', () => {
  const first = nextSky(null, W, T0, T0)
  expect(first.changed).toBe(0)
  expect(first.dark).toBe(false)
  expect(nextSky(first, { ...W, temp: 9.8, at: T0 + 900_000 }, T0 + 900_000, T0)).toBe(first)
  const rain = nextSky(first, { ...W, code: 63 }, T0 + 900_000, T0)
  expect(rain.changed).toBe(T0 + 900_000)
  const dusk = nextSky(rain, { ...W, code: 63 }, T0 + 6 * 3_600_000, T0)
  expect(dusk.dark).toBe(true)
  expect(dusk.changed).toBe(rain.changed)
})

test('readings near an edge do not redraw the pond; real changes do, and only weather fades in', () => {
  const first = nextSky(null, { ...W, wind: 14.9, cloud: 50 }, T0, T0)
  expect(nextSky(first, { ...W, wind: 15.1, cloud: 50 }, T0 + 900_000, T0)).toBe(first)
  expect(nextSky(first, { ...W, wind: 14.9, cloud: 56 }, T0 + 900_000, T0)).toBe(first)
  const windy = nextSky(first, { ...W, wind: 40, cloud: 50 }, T0 + 900_000, T0)
  expect(windy === first).toBe(false)
  expect(windy.changed).toBe(first.changed)
  const wet = nextSky(first, { ...W, code: 63, wind: 14.9, cloud: 50 }, T0 + 900_000, T0)
  expect(wet.changed).toBe(T0 + 900_000)
})

test('rain that keeps falling does not fade out and back in when clouds, wind, strength or frost shift', () => {
  const first = nextSky(null, W, T0, T0)
  const rain = nextSky(first, { ...W, code: 63, cloud: 85, wind: 10 }, T0 + 900_000, T0)
  expect(rain.changed).toBe(T0 + 900_000)
  const gusty = nextSky(rain, { ...W, code: 61, cloud: 100, wind: 25 }, T0 + 1_800_000, T0)
  expect(gusty === rain).toBe(false)
  expect(gusty.changed).toBe(rain.changed)
  const snow = nextSky(first, { ...W, code: 73, temp: 1.5 }, T0 + 900_000, T0)
  const frozen = nextSky(snow, { ...W, code: 75, temp: -1.5 }, T0 + 1_800_000, T0)
  expect(frozen.changed).toBe(snow.changed)
  const stopped = nextSky(frozen, W, T0 + 2_700_000, T0)
  const again = nextSky(stopped, { ...W, code: 73 }, T0 + 3_600_000, T0)
  expect(again.changed).toBe(T0 + 3_600_000)
})
