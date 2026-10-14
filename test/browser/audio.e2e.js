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
// track `window.music` playing as `music`, and records `env`
function attach(page, config = {}) {
  return page.evaluate(async (config) => {
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
