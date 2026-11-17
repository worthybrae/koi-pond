import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { SAMPLE } from './weather.test'

const T0 = 1_800_000_000_000
const BACKDROP = { plugin: 'koi', component: 'Backdrop', requestId: 'backdrop', props: { scene: 'worthy-koi', id: 'worthy-koi' }, surface: 'desktop' } as const
const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

function world(on: On) {
  mock.store(on)
  const clock = mock.clock(on, { now: T0 })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('theme.set', () => ({ value: { isDrawn: true as const, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  return clock
}

async function pond($: Engine): Promise<string> {
  const ui = await $.ui.mount(BACKDROP as never)
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()
  return String(svg?.props.source ?? '')
}

const answer = (text: string) => ({ value: { status: 200, ok: true, headers: {}, text } }) as never

test('the pond asks the weather service for New York\'s sunrise and sunset', async ($, on) => {
  world(on)
  const asked: string[] = []
  on('http.fetch', (_, e) => {
    asked.push(e.url)
    return answer(SAMPLE.replace('"weather_code":0', '"weather_code":63').replace('"cloud_cover":0', '"cloud_cover":90'))
  })
  await $.session.start(START)
  // The weather is asked for after the start, not waited on: look until it has landed.
  let svg = await pond($)
  for (let k = 0; k < 20 && asked.length === 0; k += 1) svg = await pond($)
  expect(asked.length).toBe(1)
  expect(asked[0]).toContain('api.open-meteo.com')
  expect(svg).toContain('class="deep"')
})

test('with no weather service the pond still draws, and /koi still works', async ($, on) => {
  world(on)
  on('http.fetch', () => {
    throw new Error('offline')
  })
  await $.session.start(START)
  const svg = await pond($)
  expect(svg).toContain('class="deep"')
})

test('the weather is read again a quarter hour on, not before', async ($, on) => {
  const clock = world(on)
  let asks = 0
  on('http.fetch', () => {
    asks += 1
    return answer(SAMPLE)
  })
  await $.session.start(START)
  await clock.set(T0 + 5 * 60_000)
  await clock.set(T0 + 10 * 60_000)
  expect(asks).toBe(1)
  await clock.set(T0 + 15 * 60_000)
  expect(asks).toBe(2)
})

test('the fish are bigger a month on', async ($, on) => {
  const clock = world(on)
  await $.session.start(START)
  // The school's lead fish, size 1 but deep and so drawn at .72, grown by the month.
  expect(await pond($)).toMatch(/<use href="#k-\w+" transform="scale\(\.72\)"\/>/)
  await clock.set(T0 + 30 * 86_400_000)
  expect(await pond($)).toMatch(/<use href="#k-\w+" transform="scale\(\.86\)"\/>/)
})

test('a store that fails leaves the pond and /koi working', async ($, on) => {
  mock.clock(on, { now: T0 })
  on('store.get', () => {
    throw new Error('store down')
  })
  on('store.set', () => ({ value: undefined }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('theme.set', () => ({ value: { isDrawn: true as const, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const registered: string[] = []
  on('command.register', (_, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  await $.session.start(START).catch(() => undefined)
  expect(registered).toContain('koi')
})

test('a weather service that never answers does not hold up the session', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: T0 })
  on('theme.set', () => ({ value: { isDrawn: true as const, requestId: 'backdrop' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('http.fetch', () => new Promise(() => undefined) as never)
  const registered: string[] = []
  on('command.register', (_, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  // Were the start to wait on the answer, this would never return and the test would time out.
  await $.session.start(START)
  expect(registered).toContain('koi')
})

test('the app leaves its chat panels clear: the pond draws its own soft-edged veil behind the chat', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: T0 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('http.fetch', () => new Promise(() => undefined) as never)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  const glass: unknown[] = []
  on('theme.set', (_, e) => {
    glass.push((e as { backdrop?: { glass?: unknown } }).backdrop?.glass)
    return { value: { isDrawn: true as const, requestId: 'backdrop' } }
  })
  await $.session.start(START)
  expect(glass.length).toBeGreaterThan(0)
  for (const g of glass) expect(g).toEqual({ blur: 0, tint: '#0e1513', opacity: 0 })
})
