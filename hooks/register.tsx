import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Sky, Weather } from '../types'
import { pondSvg } from './pond'
import { fallbackWeather, nextSky } from './sky'
import { parseWeather, WEATHER_URL } from './weather'

const ID = 'worthy-koi'
const COMMAND = 'koi'
/** Kept across sessions when the person turns the backdrop off. */
const OFF_KEY = 'off'

// The app's panels stay clear over the pond: the pond draws its own veil behind the chat, fading out at the sides.
const GLASS = { blur: 0, tint: '#0e1513', opacity: 0 }

// The pond's light, rain and age, refreshed every few minutes; null until the session's first look at the clock.
const sky = atom({ plugin: 'koi', key: 'sky' } as const, null as Sky | null, { shape: 'sky-2' })
/** Kept across sessions: New York's last weather reading, for a pond that cannot reach the weather service. */
const WEATHER_KEY = 'weather'
/** How often New York's weather is read: the service updates every quarter hour. */
const WEATHER_EVERY = 15 * 60_000
let lastTry = 0
/** Kept across sessions: when this pond was first seen, which sets how big the fish have grown. */
const BORN_KEY = 'born'
const SKY_EVERY = 5 * 60_000
let ticking: Timer | undefined

let built: { key: string; source: string } | undefined

/** The scene for this sky, rebuilt only when the sky changes, so a redraw for any other reason shows the very same
 *  scene and the window has nothing to reload. */
function sceneFor(now: Sky | null): string {
  const key = `${now?.since}:${now?.changed}`
  if (built?.key !== key) built = { key, source: pondSvg(now ?? undefined) }

  return built.source
}

/** New York's weather: read from the weather service at most every quarter hour, else the last reading kept, else
 *  clear. A failed read is not retried until the next quarter hour. */
async function weatherNow($: EngineInterface, now: number, mayFetch: boolean): Promise<Weather> {
  const kept = await $.store.get(WEATHER_KEY)
  const last = typeof kept === 'string' ? parseStored(kept) : null
  if (mayFetch && (last === null || now - last.at >= WEATHER_EVERY) && now - lastTry >= WEATHER_EVERY) {
    lastTry = now
    try {
      const answer = await $.http.fetch(WEATHER_URL)
      const read = answer.ok ? parseWeather(answer.text, now) : null
      if (read !== null) {
        await $.store.set(WEATHER_KEY, JSON.stringify(read))
        return read
      }
    } catch {
      // Offline or refused: the last reading stands.
    }
  }
  return last ?? fallbackWeather(now)
}

function parseStored(text: string): Weather | null {
  try {
    const w = JSON.parse(text) as Weather
    return typeof w.code === 'number' && typeof w.offset === 'number' ? w : null
  } catch {
    return null
  }
}

/** Looks at the clock and the weather: a new weather, dusk or dawn, or the fish a size bigger redraws the pond. */
async function refreshSky($: EngineInterface, mayFetch = true): Promise<void> {
  const now = await $.clock.now()
  const stored = await $.store.get(BORN_KEY)
  const born = typeof stored === 'number' ? stored : now
  if (typeof stored !== 'number') await $.store.set(BORN_KEY, now)
  const weather = await weatherNow($, now, mayFetch)
  await update($, sky, last => nextSky(last, weather, now, born))
}

type Answer = { isDrawn: boolean; reason?: string }
// The theme call's shape moved between engine versions (the scene's name under `scene` or `id`, the window's kind
// beside the backdrop or inside it), so each shape is passed untyped and tried in turn.

function isShapeRefused(error: unknown, member?: string): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      (error.message.includes('does not know the attribute') || (member !== undefined && error.message.includes(member))))
  )
}

/** Sets the koi pond as the session's backdrop, in whichever shape this engine takes. */
async function showKoi($: EngineInterface): Promise<Answer> {
  try {
    return (await $.theme.set({
      backdrop: { scene: ID, id: ID, glass: GLASS },
      overrideColorScheme: 'dark',
    } as never)) as Answer
  } catch (error) {
    if (!isShapeRefused(error, 'overrideColorScheme')) throw error
  }

  return (await $.theme.set({ backdrop: { id: ID, glass: GLASS, colorScheme: 'dark' } } as never)) as Answer
}

/** The backdrop's name as the engine hands it to the Backdrop hook: `scene` on newer engines, `id` before. */
function sceneNameOf(props: { scene?: unknown; id?: unknown }): string | undefined {
  if (typeof props.scene === 'string') return props.scene

  return typeof props.id === 'string' ? props.id : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The sky is a nicety: if the clock or store fails, the pond still comes up, as it was.
    lastTry = 0
    const lookUp = (mayFetch = true) =>
      refreshSky($, mayFetch).catch((error: unknown) => void $.ui.toast(`koi: the sky could not update (${String(error)})`))
    // The pond comes up at once on the weather already kept; the weather service is asked after, not waited on.
    await lookUp(false)
    void lookUp()
    ticking?.cancel()
    ticking = $.clock.every(SKY_EVERY, () => void lookUp())

    try {
      await $.command.register({
        name: COMMAND,
        description: 'The koi pond behind the chat: /koi turns it on, /koi off turns it off',
      })
    } catch (error) {
      void $.ui.toast(`koi: /${COMMAND} is not available (${String(error)})`)
    }

    if ((await $.store.get(OFF_KEY)) !== true) {
      try {
        await showKoi($)
      } catch (error) {
        void $.ui.toast(`koi: the backdrop could not be set (${String(error)})`)
      }
    }

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const word = e.args.trim().toLowerCase()

    if (word === 'off') {
      await $.store.set(OFF_KEY, true)
      await $.theme.clear()

      return { text: 'Koi off. /koi turns it back on; new sessions stay off until then.' }
    }

    if (word !== '' && word !== 'on') {
      return { text: 'Usage: /koi to turn it on, /koi off to turn it off' }
    }

    await $.store.delete(OFF_KEY)
    const set = await showKoi($)

    return {
      text: set.isDrawn
        ? 'Koi on.'
        : `Koi on for this session; this window does not draw backdrops yet${set.reason ? ` (${set.reason})` : ''}.`,
    }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (sceneNameOf(e.props) !== ID || e.surface !== 'desktop') {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        isInteractive
        alt="A dark pond seen from above: fish built from small tiles swim under lily pads; some glow, and rare ones pass now and then"
        source={sceneFor(await read($, sky))}
      />
    )
  })
}
