import { test, expect } from '@playwright/test'
import { open_harness, frames } from './helpers.js'

// Counts AudioContexts created and sounds started, before Kwilos loads
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.audio_contexts = []
    const Original = window.AudioContext
    window.AudioContext = class extends Original {
      constructor(...args) {
        super(...args)
        window.audio_contexts.push(this)
      }
    }
    window.sounds_started = 0
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.sounds_started++
      return start.apply(this, args)
    }
  })
  await open_harness(page)
})

// Attaches Kwilos with a tick that plays a sound on each click, keeps the
// track `window.music` playing as `music`, and records `env`; returns once
// the first frame has run
async function attach(page, config = {}) {
  await page.evaluate(async (config) => {
    const { Kwilos, sound, track } = window.kwilos
    window.music = track({ path: 'tone.wav', looping: true })
    window.kw = await Kwilos.attach('#c', (env) => {
      window.env = env
      env.tracks.music = window.music
      if (env.inputs.mouse.clicks.length > 0)
        env.sounds.push(sound({ path: 'beep.wav' }))
      return []
    }, { preload_sounds: ['beep.wav'], ...config })
  }, config)
  await page.waitForFunction(() => window.env)
}

const track_time = (page) => page.evaluate(() => window.env.tracks.music.time)

test('rejects when a preloaded sound fails to load', async ({ page }) => {
  const message = await page.evaluate(() =>
    window.kwilos.Kwilos.attach('#c', () => [], { preload_sounds: ['missing.wav'] }).catch(error => error.message))
  expect(message).toBe('Kwilos: could not load sound missing.wav')
})

// Playwright's own scripting counts as user interaction, so a page under
// test is never locked; the unit tests cover waiting for the user
test('plays sounds and tracks through one AudioContext', async ({ page }) => {
  await attach(page)
  await page.mouse.click(50, 50)
  await expect.poll(() => page.evaluate(() => window.sounds_started)).toBe(1)
  expect(await page.evaluate(() => window.audio_contexts.length)).toBe(1)
  expect(await page.evaluate(() => window.audio_contexts[0].state)).toBe('running')
  await expect.poll(() => track_time(page)).toBeGreaterThan(0.2)
})

test('pauses a track, keeping its place, and restarts it', async ({ page }) => {
  await attach(page)
  await page.mouse.click(50, 50)
  await expect.poll(() => track_time(page)).toBeGreaterThan(0.3)

  await page.evaluate(() => { window.music.paused = true })
  await frames(page)
  const paused_at = await track_time(page)
  await page.waitForTimeout(300)
  expect(await track_time(page)).toBe(paused_at)

  await page.evaluate(() => { window.music.paused = false; window.music.restart = true })
  await frames(page)
  expect(await page.evaluate(() => window.music.restart)).toBe(false)
  expect(await track_time(page)).toBeLessThan(paused_at)
})

test('stops a track removed from env.tracks', async ({ page }) => {
  await attach(page)
  await page.mouse.click(50, 50)
  await expect.poll(() => track_time(page)).toBeGreaterThan(0.2)

  await page.evaluate(() => { window.music = null })
  await frames(page)
  const playing = await page.evaluate(() =>
    [...document.querySelectorAll('audio')].length + (window.env.tracks.music ? 1 : 0))
  expect(playing).toBe(0)
})

test('pauses tracks while the page is hidden, unless background_audio is set', async ({ page }) => {
  const hide = (hidden) => page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)

  await attach(page)
  await page.mouse.click(50, 50)
  await expect.poll(() => track_time(page)).toBeGreaterThan(0.2)

  await hide(true)
  await expect.poll(() => page.evaluate(() => window.audio_contexts[0].state)).toBe('suspended')

  await hide(false)
  await expect.poll(() => page.evaluate(() => window.audio_contexts[0].state)).toBe('running')
})

test('stops the audio on detach', async ({ page }) => {
  await attach(page)
  await page.mouse.click(50, 50)
  await expect.poll(() => track_time(page)).toBeGreaterThan(0.2)

  await page.evaluate(() => window.kw.detach())
  await expect.poll(() => page.evaluate(() => window.audio_contexts[0].state)).toBe('closed')
})

test.describe('positions', () => {
  // Taps what reaches the speakers into a meter per channel, so tests can
  // compare how loud each ear hears it
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      const connect = AudioNode.prototype.connect
      AudioNode.prototype.connect = function (to, ...rest) {
        if (to instanceof AudioDestinationNode && !window.meters) {
          const splitter = this.context.createChannelSplitter(2)
          window.meters = [0, 1].map(channel => {
            const meter = this.context.createAnalyser()
            splitter.connect(meter, channel)
            return meter
          })
          connect.call(this, splitter)
        }
        return connect.call(this, to, ...rest)
      }
      window.levels = () => window.meters.map(meter => {
        const samples = new Float32Array(meter.fftSize)
        meter.getFloatTimeDomainData(samples)
        return Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length)
      })
    })
  })

  // Plays the looping tone at a position on the 200 by 200 canvas
  async function place(page, x, y, listener) {
    await page.evaluate(async ([x, y, listener]) => {
      const { Kwilos, track } = window.kwilos
      window.where = { x, y, listener }
      window.kw = await Kwilos.attach('#c', (env) => {
        window.env = env
        env.listener = window.where.listener
        env.tracks.tone = track({ path: 'tone.wav', looping: true, x: window.where.x, y: window.where.y })
        return []
      })
    }, [x, y, listener])
    await page.waitForFunction(() => window.env)
    await page.mouse.click(100, 100)
    await expect.poll(() => page.evaluate(() => window.env.tracks.tone.time)).toBeGreaterThan(0.2)
  }

  const levels = (page) => page.evaluate(() => window.levels())

  test('pans a track towards its side of the listener', async ({ page }) => {
    await place(page, 0, 100)
    await expect.poll(async () => { const [left, right] = await levels(page); return left > right * 2 }).toBe(true)

    await page.evaluate(() => { window.where.x = 200 })
    await expect.poll(async () => { const [left, right] = await levels(page); return right > left * 2 }).toBe(true)
  })

  test('hears a track straight ahead in both ears alike', async ({ page }) => {
    await place(page, 100, 20)
    await expect.poll(async () => {
      const [left, right] = await levels(page)
      return left > 0.01 && Math.abs(left - right) < left * 0.05
    }).toBe(true)
  })

  test('silences a track beyond its range, and follows the listener', async ({ page }) => {
    await place(page, 100, 100, { x: 100, y: 100 })
    await expect.poll(async () => (await levels(page))[0]).toBeGreaterThan(0.01)

    await page.evaluate(() => { window.where.listener = { x: 100, y: 400 } })
    await expect.poll(async () => Math.max(...await levels(page))).toBeLessThan(0.001)
  })
})

test.describe('playlists', () => {
  test('moves on to the next song by itself, even with no frames running', async ({ page }) => {
    await page.evaluate(async () => {
      const { Kwilos, track } = window.kwilos
      window.frames_run = 0
      window.kw = await Kwilos.attach('#c', (env) => {
        window.frames_run++
        window.music = env.tracks.music ??= track({ paths: ['beep.wav', 'tone.wav'] })
        return []
      }, { background_audio: true })
    })
    await page.waitForFunction(() => window.music)
    await page.mouse.click(100, 100)
    await expect.poll(() => page.evaluate(() => window.audio_contexts.length)).toBe(1)

    // Stop the frames, as a hidden page would, then wait for the short
    // first song to end
    await page.evaluate(() => { window.requestAnimationFrame = () => 0 })
    await page.waitForTimeout(50)
    const frames_before = await page.evaluate(() => window.frames_run)
    await expect.poll(() => page.evaluate(() => window.music.index)).toBe(1)
    expect(await page.evaluate(() => window.frames_run)).toBe(frames_before)
  })

  test('jumps to the song its index is set to, and reports its length', async ({ page }) => {
    await page.evaluate(async () => {
      const { Kwilos, track } = window.kwilos
      window.kw = await Kwilos.attach('#c', (env) => {
        window.music = env.tracks.music ??= track({ paths: ['tone.wav', 'beep.wav', 'tone.wav'], looping: true })
        return []
      })
    })
    await page.waitForFunction(() => window.music)
    await page.mouse.click(100, 100)
    await expect.poll(() => page.evaluate(() => window.music.duration)).toBeCloseTo(3, 1)

    await page.evaluate(() => { window.music.index = 1 })
    await expect.poll(() => page.evaluate(() => window.music.duration)).toBeCloseTo(0.15, 1)
    await expect.poll(() => page.evaluate(() => window.music.index)).toBe(2)
  })
})
