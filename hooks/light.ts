// Day and night over the pond: the gates that open the lilies by day and close them at night, on one 24-hour animation
// whose keyframes follow New York's sunrise and sunset, so the pond changes on its own with no redraw.

const DAY = 1440

const pct = (m: number) => `${Math.round((m / DAY) * 100000) / 1000}%`

/** Whether it is dark enough for the glowing fish to shine brighter: before first light or after the blue hour. */
export function darkAt(minute: number, sunrise: number, sunset: number): boolean {
  return minute < sunrise - 30 || minute > sunset + 40
}

/** The day's gates: `dy` is open in daylight (open lilies), `dn` is its
 *  opposite (lily buds), `nt` only once it is properly dark (fireflies). Minutes and how open, in order. */
export type Gate = 'dy' | 'dn' | 'nt'

function gateStops(kind: Gate, r: number, s: number): Array<[number, number]> {
  const day: Array<[number, number]> = [[0, 0], [r - 20, 0], [r + 40, 1], [s - 40, 1], [s + 20, 0], [DAY, 0]]
  const raw: Array<[number, number]> =
    kind === 'dy' ? day : kind === 'dn' ? day.map(([m, v]) => [m, 1 - v]) : [[0, 1], [r - 60, 1], [r - 10, 0], [s + 30, 0], [s + 80, 1], [DAY, 1]]
  let last = 0
  return raw.map(([m, v]) => {
    last = Math.min(DAY, Math.max(last, m))
    return [last, v]
  })
}

function gateAt(kind: Gate, minute: number, r: number, s: number): number {
  const stops = gateStops(kind, r, s)
  let i = 0
  while (i + 1 < stops.length && stops[i + 1]![0] <= minute) i += 1
  const [m0, v0] = stops[i]!
  const [m1, v1] = stops[Math.min(stops.length - 1, i + 1)]!
  const t = m1 > m0 ? (minute - m0) / (m1 - m0) : 0
  return Math.round((v0 + (v1 - v0) * t) * 100) / 100
}

/** How much daylight there is at a minute of the day, 0 to 1. */
export function daylight(minute: number, sunrise: number, sunset: number): number {
  return gateAt('dy', minute, sunrise, sunset)
}

/** The style for the gates: each a 24-hour opacity animation. */
export function gateCss(sunrise: number, sunset: number): string {
  const kinds: Gate[] = ['dy', 'dn', 'nt']
  return (
    `.dy,.dn,.nt{animation:86400s steps(24) infinite}` +
    kinds.map(k => `.${k}{animation-name:${k}}@keyframes ${k}{${gateStops(k, sunrise, sunset).map(([m, v]) => `${pct(m)}{opacity:${v}}`).join('')}}`).join('')
  )
}

/** `inner` behind a gate, started `local` seconds into the day; its own opacity is the moment's, so with motion turned
 *  off it still shows right. */
export function gate(kind: Gate, local: number, sunrise: number, sunset: number, inner: string): string {
  if (inner === '') return ''
  return `<g class="${kind}" opacity="${gateAt(kind, local / 60, sunrise, sunset)}" style="animation-delay:-${Math.round(local)}s">${inner}</g>`
}
