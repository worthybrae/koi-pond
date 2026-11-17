import { expect, test } from 'claude-code/testing'

import type { Sky, Weather } from '../types'
import { pondSvg } from '../hooks/pond'
import { DASHES, WIDTHS } from '../hooks/tiles'

const T0 = 1_800_000_000_000
const SEE_THROUGH = ['ghost', 'glass', 'phantom']
const dayOf = (ms: number) => Math.floor((ms / 1000 - 18000) / 86400)
const CLEAR: Weather = { code: 0, cloud: 0, rain: 0, snow: 0, wind: 10, temp: 10, sunrise: 404, sunset: 997, offset: -18000, at: T0 }
const skyOf = (w: Partial<Weather> = {}, more: Partial<Sky> = {}): Sky => ({ weather: { ...CLEAR, ...w }, dark: false, grow: 1, since: T0, changed: T0, ...more })
const near = (a: number, b: number) => expect(Math.abs(a - b) < 0.06 ? 'near' : `${a} vs ${b}`).toBe('near')

const swims = (svg: string) => [...svg.matchAll(/<animateMotion dur="([\d.]+)s" begin="-([\d.]+)s"/g)].map(m => [Number(m[1]), Number(m[2])] as const)
const t0 = (svg: string) => Number(/--t0:(-?[\d.]+)s/.exec(svg)?.[1])

test('redrawn later, every motion carries on', () => {
  const a = pondSvg(undefined, T0)
  const b = pondSvg(undefined, T0 + 5000)
  const ra = swims(a)
  const rb = swims(b)
  expect(ra.length).toBeGreaterThan(0)
  expect(rb.length).toBe(ra.length)
  rb.forEach(([dur, v], i) => near((v - ra[i]![1] + dur) % dur, 5))
  near(t0(b), t0(a) - 5)
})

test('there is no food: no heap, no bubble, no glow', () => {
  const svg = pondSvg(skyOf(), T0 + 1000)
  for (const cls of ['pop', 'eat', 'heap', 'bob', 'bub', 'burst', 'spray']) expect(svg).not.toContain(`class="${cls}`)
  expect(svg).not.toContain('glowFood')
})

test('the busiest scene fits the backdrop limit', () => {
  const sky = skyOf({ code: 95, temp: -1, cloud: 100, wind: 60 }, { dark: true, grow: 1.25 })
  const n = pondSvg(sky, T0 + 2000).length
  expect(n < 131072 ? 'fits' : `${n}`).toBe('fits')
})

test('tiles are drawn compactly', () => {
  const n = pondSvg().length
  expect(n < 114_000 ? 'compact' : `${n}`).toBe('compact')
})

for (const month of [0, 3, 6, 10]) test(`the busiest scene of month ${month + 1} fits`, () => {
  const at = Date.UTC(2026, month, 16, 3)
  const sky = { ...skyOf({ code: 95, temp: -1, cloud: 100, wind: 60, sunrise: 325, sunset: 1231 }, { dark: true, grow: 1.25 }), since: at, changed: at }
  const svg = pondSvg(sky, at + 2000)
  expect(svg.length <= 131072 ? 'fits' : `${month}: ${svg.length}`).toBe('fits')
})

test('the pond is only water, fish and lily pads: no floor, weather, light, gusts, glints or critters', () => {
  for (const w of [{}, { code: 95, cloud: 100, wind: 60, temp: -3 }, { code: 75 }, { code: 45 }]) {
    for (const month of [0, 3, 6, 10]) {
      const at = Date.UTC(2026, month, 16, 15)
      const svg = pondSvg({ ...skyOf(w), since: at, changed: at }, at)
      for (const cls of ['wd', 'gu', 'gl', 'rd', 'sn', 'cl', 'fog', 'fl', 'wx', 'lw', 'ld', 'ff', 'dfl', 'fa']) expect(svg).not.toMatch(new RegExp(`class="${cls}[ "]`))
      for (const id of ['deep', 'sky', 'bank', 'frost', 'cloud', 'gust']) expect(svg).not.toContain(`url(#${id})`)
      expect(svg).toContain('class="deep"')
    }
  }
})

test('the first scene drawn has a rule for every stroke width and dash it uses', () => {
  WIDTHS.clear()
  DASHES.clear()
  const at = Date.UTC(2026, 6, 16, 15)
  const svg = pondSvg({ ...skyOf(), since: at, changed: at }, at)
  const used = new Set([...svg.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1]!.split(' ')).filter(c => /^[td]\d+$/.test(c)))
  const missing = [...used].filter(c => !svg.includes(`.${c}{`))
  expect(missing.join(' ')).toBe('')
})

test('fish are solid: a dark backing fills the gaps between their tiles, except the see-through ghost', () => {
  const svg = pondSvg(skyOf(), T0)
  const sprites = [...svg.matchAll(/<g id="k-(\w+)">([\s\S]*?)<\/g><(?:g id="k-|\/defs|path id)/g)]
  expect(sprites.length).toBeGreaterThan(5)
  for (const [, name, inner] of sprites) {
    const backed = /<path stroke="#[0-9a-f]{6}" stroke-width="[\d.]+" d="M/.test(inner!)
    expect(SEE_THROUGH.includes(name!) || backed ? 'ok' : `${name} has gaps`).toBe('ok')
  }
})

import { COMMONS, FANCY, KINDS, POOLS, TAILS, fancyOn, lineup, traitsOn, visitorsOn } from '../hooks/pond'

test('each day two everyday breeds and two fancy koi, a different four from one day to the next, every one in time', () => {
  expect(COMMONS.length).toBe(24)
  expect(FANCY.length).toBe(12)
  for (const gone of ['heart', 'panda', 'bee']) expect(FANCY.includes(gone) ? gone : 'gone').toBe('gone')
  const seen = new Set<string>()
  for (let day = 20_000; day < 20_120; day += 1) {
    const today = lineup(day)
    expect(new Set(today).size).toBe(4)
    expect(today.filter(n => COMMONS.includes(n)).length).toBe(2)
    expect(today.filter(n => FANCY.includes(n)).length).toBe(2)
    expect(today.join() === lineup(day + 1).join() ? 'same' : 'changed').toBe('changed')
    today.forEach(n => seen.add(n))
  }
  expect(seen.size).toBe(36)
})

test('the pond looks different from one day to the next: other breeds, other patterns', () => {
  const day = 86_400_000
  const fishOf = (svg: string) => svg.slice(svg.indexOf('<g id="f'), svg.indexOf('<g class="shade"', svg.indexOf('<g id="f')))
  const a = fishOf(pondSvg(skyOf(), T0))
  const b = fishOf(pondSvg(skyOf(), T0 + day))
  expect(a === b ? 'same' : 'different').toBe('different')
})

test('platinum and other ginrin koi have scales that twinkle on the clock', () => {
  let at = T0
  while (!lineup(dayOf(at)).includes('platinum')) at += 86_400_000
  const svg = pondSvg(skyOf(), at)
  expect(svg).toContain('class="gr"')
  expect(svg).toMatch(/\.gr\{[^}]*animation:gr [^}]*var\(--t0\)/)
})

const scalesOf = (svg: string) => [...svg.matchAll(/<use href="#k-(\w+)" transform="scale\(([\d.]+)\)"\/>/g)].map(m => [m[1]!, Number(m[2])] as const)

test('each fish is drawn once and used by every fish of its kind', () => {
  const svg = pondSvg(skyOf(), T0)
  for (const name of new Set(scalesOf(svg).map(([n]) => n))) expect(svg.split(`<g id="k-${name}">`).length - 1).toBe(1)
  expect(scalesOf(svg).filter(([n]) => n === visitorsOn(dayOf(T0)).school).length).toBe(1)
})

test('koi come in sizes: every day one big parent and three koi between, and no fry', () => {
  for (let k = 0; k < 10; k += 1) {
    const at = T0 + k * 86_400_000
    const day = Math.floor((at / 1000 - 18000) / 86400)
    const today = new Set(lineup(day))
    const koi = scalesOf(pondSvg(skyOf(), at)).filter(([n]) => today.has(n))
    const sizes = koi.map(([, s]) => s).sort((a, b) => a - b)
    expect(koi.length).toBe(4)
    expect(sizes[0]! >= 0.5 ? 'no fry' : `${sizes}`).toBe('no fry')
    expect(sizes[3]! / sizes[0]! >= 1.25 ? 'spread' : `${sizes}`).toBe('spread')
  }
})

test('the day\'s visitors are drawn: a glowing school, a glowing fish, a see-through one, two rares, a very rare, a legend', () => {
  const v = visitorsOn(dayOf(T0))
  const svg = pondSvg(skyOf(), T0)
  for (const name of Object.values(v)) expect(svg).toContain(`<g id="k-${name}">`)
})

test('fifty-eight kinds of fish, each one an everyday breed, a fancy koi or in a visitor pool', () => {
  expect(KINDS.length).toBeGreaterThanOrEqual(58)
  const pooled = new Set([...COMMONS, ...FANCY, ...Object.values(POOLS).flat()])
  for (const k of KINDS) expect(pooled.has(k) ? 'pooled' : k).toBe('pooled')
})

test('the visitors change from day to day, the two rares always differ, and every kind turns up', () => {
  const seen = new Set<string>()
  let last = ''
  for (let day = 20_000; day < 20_120; day += 1) {
    const v = visitorsOn(day)
    expect(v.rare === v.rare2 ? 'same' : 'differ').toBe('differ')
    Object.values(v).forEach(n => seen.add(n))
    const now = JSON.stringify(v)
    expect(now === last ? 'same' : 'changed').toBe('changed')
    last = now
  }
  for (const n of Object.values(POOLS).flat()) expect(seen.has(n) ? 'seen' : n).toBe('seen')
})

test('some days a koi has long butterfly fins or ginrin scales, most days not', () => {
  let butterfly = 0
  let ginrin = 0
  const n = 400
  for (let day = 20_000; day < 20_100; day += 1) for (let k = 0; k < 4; k += 1) {
    const t = traitsOn(day, k)
    if (t.butterfly) butterfly += 1
    if (t.ginrin) ginrin += 1
  }
  expect(butterfly > n * 0.12 && butterfly < n * 0.4 ? 'some' : `${butterfly}`).toBe('some')
  expect(ginrin > n * 0.1 && ginrin < n * 0.35 ? 'some' : `${ginrin}`).toBe('some')
})

test('tails stay joined as they swing: each tail carries a hidden root under the body, drawn solid', () => {
  const svg = pondSvg(skyOf(), T0)
  const sprites = [...svg.matchAll(/<g id="k-(\w+)">[\s\S]*?(?=<g id="k-|<\/defs>)/g)].filter(m => !SEE_THROUGH.includes(m[1]!))
  expect(sprites.length).toBeGreaterThan(5)
  for (const [sprite, name] of sprites) expect(/--a:14\.0deg[^"]*"><path stroke="#[0-9a-f]{6}" stroke-width/.test(sprite) ? 'joined' : name).toBe('joined')
})

test('fish swim by turning each piece round its joint, the tail most', () => {
  const svg = pondSvg(skyOf(), T0)
  expect(svg).toContain('@keyframes sw{from{transform:rotate(calc(var(--a) * -1))}to{transform:rotate(var(--a))}}')
  expect(svg).toContain('--a:14.0deg')
})

test('glowing fish give off a soft light that hugs their own shape, not a round orb', () => {
  const svg = pondSvg(skyOf(), T0)
  expect(svg).not.toContain('<ellipse class="pulse"')
  expect(svg).not.toMatch(/<radialGradient id="glow/)
  const school = visitorsOn(dayOf(T0)).school
  const cls = new RegExp(`<g class="(h\\w)"><use href="#k-${school}"`).exec(svg)![1]
  expect(svg).toMatch(new RegExp(`\\.${cls}\\{filter:drop-shadow\\(0 0 \\dpx #[0-9a-f]{6}\\)\\}`))
})

test('fish swim at two depths: some deep under a haze of water, the rest near the surface', () => {
  const svg = pondSvg(skyOf(), T0)
  const haze = svg.indexOf('<rect class="haze"')
  expect(haze).toBeGreaterThan(0)
  const v = visitorsOn(dayOf(T0))
  const firstUse = (name: string) => svg.indexOf(`<use href="#k-${name}"`)
  expect(firstUse(v.school) < haze ? 'deep' : 'shallow').toBe('deep')
  expect(firstUse(v.rare) > haze ? 'shallow' : 'deep').toBe('shallow')
  expect(firstUse(v.legend) > haze ? 'shallow' : 'deep').toBe('shallow')
  // No filter over the deep ones, and no shadows for them: both cost a repaint every frame.
  expect(svg).not.toMatch(/\.deep\{filter/)
  expect(svg).not.toContain('<g class="shade" transform="translate(5 7)"')
  expect(svg).toContain('<g class="shade" transform="translate(16 22)"')
})


test('a fancy koi wears different colours from day to day, and some days glows or shimmers', () => {
  const looks = new Map<string, Set<string>>()
  let glowed = 0
  let shimmered = 0
  for (let k = 0; k < 40; k += 1) {
    const at = T0 + k * 86_400_000
    const svg = pondSvg(skyOf(), at)
    for (const name of lineup(dayOf(at)).filter(n => FANCY.includes(n))) {
      const def = svg.slice(svg.indexOf(`<g id="k-${name}">`), svg.indexOf('<g id="k-', svg.indexOf(`<g id="k-${name}">`) + 5))
      looks.set(name, (looks.get(name) ?? new Set()).add(def.replace(/<g class="opal".*$/, '')))
      if (new RegExp(`<g class="h\\w"><use href="#k-${name}"`).test(svg)) glowed += 1
      if (def.includes('<g class="opal"')) shimmered += 1
    }
  }
  expect([...looks.values()].some(v => v.size > 1) ? 'varies' : 'fixed').toBe('varies')
  expect(glowed).toBeGreaterThan(0)
  expect(shimmered).toBeGreaterThan(0)
  const palettes = new Set(Array.from({ length: 60 }, (_, d) => fancyOn(20_000 + d, 0).palette))
  expect(palettes.size).toBeGreaterThan(8)
})

test('the fancy koi always swim near the surface, at full size', () => {
  for (let k = 0; k < 30; k += 1) {
    const at = T0 + k * 86_400_000
    const svg = pondSvg(skyOf(), at)
    const haze = svg.indexOf('<rect class="haze"')
    for (const name of lineup(dayOf(at)).filter(n => FANCY.includes(n))) {
      const uses = [...svg.matchAll(new RegExp(`<use href="#k-${name}" transform="scale\\(([\\d.]+)\\)"/>`, 'g'))].filter(m => Number(m[1]) > 0.5)
      expect(uses.length).toBeGreaterThan(0)
      for (const m of uses) {
        expect(m.index! > haze ? 'shallow' : `${name} deep`).toBe('shallow')
        expect(Number(m[1]) >= 1 ? 'full' : `${name} ${m[1]}`).toBe('full')
      }
    }
  }
})

test('the koi\'s tails come in many shapes, different from day to day', () => {
  expect(TAILS.length).toBeGreaterThanOrEqual(8)
  const seen = new Set<string>()
  for (let day = 20_000; day < 20_060; day += 1) for (let k = 0; k < 4; k += 1) seen.add(traitsOn(day, k).tail)
  expect(seen.size).toBe(TAILS.length)
  // Different tails draw differently.
  const tails = new Set<string>()
  for (let k = 0; k < 12; k += 1) {
    const svg = pondSvg(skyOf(), T0 + k * 86_400_000)
    for (const m of svg.matchAll(/<g class="sw" style="[^"]*--a:14\.0deg[^"]*">([\s\S]*?)<\/g>/g)) tails.add(m[1]!.replace(/#[0-9a-f]{6}/g, ''))
  }
  expect(tails.size).toBeGreaterThan(6)
})

test('side fins are solid paddles, one each side, paddling from their own roots', () => {
  const svg = pondSvg(skyOf(), T0)
  const fins = [...svg.matchAll(/<g class="fin( b)?" style="transform-origin:(-?[\d.]+)px (-?[\d.]+)px;[^"]*">(<g opacity|<path|<g class)/g)]
  expect(fins.length).toBeGreaterThan(10)
  // Rooted at the body's edge, not its middle, and never see-through on a solid fish.
  for (const f of fins) expect(f[3] === '0' ? 'centre' : 'edge').toBe('edge')
  expect(svg).toMatch(/\.fin\.b\{animation-name:fn\}/)
})

test('nothing but the shimmer\'s hue animates a filter, nor a whole fish\'s opacity, which would repaint at great cost every frame', () => {
  const svg = pondSvg(skyOf(), T0)
  const css = svg.slice(svg.indexOf('<style>'), svg.indexOf('</style>'))
  for (const [, name, body] of css.matchAll(/@keyframes (\w+)\{(.*?\})\}/g)) if (name !== 'opal') expect(body).not.toMatch(/filter:/)
  expect(/@keyframes dv\{[^@]*opacity/.test(css) ? 'fades' : 'steady').toBe('steady')
  // Fades that would change every frame step instead: the sparkles and the day's gates.
  expect(css).toMatch(/\.gr\{animation:gr [\d.]+s steps\(\d\)/)
  expect(css).toMatch(/\.dy,\.dn,\.nt\{animation:86400s steps\(\d+\)/)
})

test('with motion turned off the swimming fish hide and the day\'s fish hold still on the pond, apart, rares away', () => {
  const svg = pondSvg(skyOf(), T0)
  expect(svg).toMatch(/@media \(prefers-reduced-motion: reduce\)\{[^}]*\}\.mv\{display:none\}\.still\{display:inline\}\}/)
  expect(svg).toContain('.still{display:none}')
  // The deep fish, the shadows and the near fish each sit in a group that motion-off hides.
  const swimming = [...svg.matchAll(/<g id="f(\d+)">/g)].length
  expect(svg.split('<g class="mv">').length - 1).toBe(3)
  const poses = [...svg.matchAll(/<g id="q(\d+)" class="still" transform="translate\((\d+) (\d+)\) rotate\(-?\d+\)">/g)].map(m => [Number(m[2]), Number(m[3])])
  const waiting = [...svg.matchAll(/keyPoints="0;0;1"/g)].length
  expect(poses.length).toBe(swimming - waiting)
  for (const [x, y] of poses) expect(x! >= 120 && x! <= 1480 && y! >= 100 && y! <= 900 ? 'on the pond' : `${x},${y}`).toBe('on the pond')
  const nearest = Math.min(...poses.flatMap((a, i) => poses.slice(i + 1).map(b => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!))))
  expect(nearest >= 150 ? 'apart' : `${nearest}`).toBe('apart')
})
