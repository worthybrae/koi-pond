import { expect, test } from 'claude-code/testing'

import { conditionOf, localSeconds, parseWeather, WEATHER_URL } from '../hooks/weather'

export const SAMPLE =
  '{"latitude":40.710335,"longitude":-73.99308,"utc_offset_seconds":-18000,"timezone":"America/New_York","current":{"time":"2026-11-16T16:45","interval":900,"weather_code":0,"precipitation":0.00,"rain":0.00,"snowfall":0.00,"cloud_cover":0,"wind_speed_10m":11.4,"temperature_2m":10.4,"is_day":0},"daily":{"time":["2026-11-16"],"sunrise":["2026-11-16T06:44"],"sunset":["2026-11-16T16:37"]}}'
// 2026-11-16 17:00 EST is 22:00 UTC.
const FIVE_PM = Date.UTC(2026, 10, 16, 22, 0)

test('the weather service answer reads as New York weather', () => {
  const w = parseWeather(SAMPLE, FIVE_PM)!
  expect(w).toEqual({ code: 0, cloud: 0, rain: 0, snow: 0, wind: 11.4, temp: 10.4, sunrise: 404, sunset: 997, offset: -18000, at: FIVE_PM })
  expect(WEATHER_URL).toContain('latitude=40.71')
  expect(WEATHER_URL).toContain('America%2FNew_York')
})

test('a broken answer reads as nothing', () => {
  expect(parseWeather('not json', FIVE_PM)).toBeNull()
  expect(parseWeather('{"current":{}}', FIVE_PM)).toBeNull()
})

test('5pm in New York in November is after sunset', () => {
  const w = parseWeather(SAMPLE, FIVE_PM)!
  expect(localSeconds(FIVE_PM, w.offset)).toBe(17 * 3600)
  expect(localSeconds(FIVE_PM, w.offset) / 60 > w.sunset).toBe(true)
})

test('weather codes become conditions', () => {
  const base = parseWeather(SAMPLE, FIVE_PM)!
  const c = (code: number, extra: Partial<typeof base> = {}) => conditionOf({ ...base, code, ...extra })
  expect(c(0).clouds).toBe(0)
  expect(c(3).clouds >= 0.9).toBe(true)
  expect(c(45).fog).toBe(true)
  expect(c(53).rain).toBe(1)
  expect(c(63).rain).toBe(2)
  expect(c(65).rain).toBe(3)
  expect(c(82).rain).toBe(3)
  expect(c(75).snow).toBe(2)
  expect(c(71).snow).toBe(1)
  expect(c(95).storm && c(95).rain === 3).toBe(true)
  expect(c(0, { temp: -2 }).frost).toBe(true)
  expect(c(0, { temp: 4 }).frost).toBe(false)
  expect(c(0, { wind: 80 }).wind).toBe(1)
  expect(c(61).clouds >= 0.7).toBe(true)
})
