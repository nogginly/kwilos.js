/* Don't use sloppy JS. */ "use strict";

// 1. Preload sound effects with `preload_sounds`, as images are preloaded;
//    a sound that was not preloaded is not played.
//
// 2. Push a `sound` to `env.sounds` on the frame it should play. Here each
//    coin's sound comes from its side of the screen, with `pan`, and at a
//    slightly different pitch, with `rate`.
//
// 3. Music is a `track` in `env.tracks`, under a name of your choice. It
//    plays for as long as it is there, so setting it once is enough;
//    changing `paused` pauses it, keeping its place.
//
// 4. `env.volume` scales everything, so it makes a mute button.
//
// 5. Browsers allow sound only once the user has clicked, tapped or
//    pressed a key, so the sample says so until then.
//

import { Kwilos, circle, label, rect, sound, track } from "../../src/kwilos.js";

/** @import { Env } from "../../src/kwilos.js" */

const COIN = 'assets/coin.wav'
const MUSIC = 'assets/music.wav'
const WIDTH = 600
const HEIGHT = 400

await Kwilos.attach("#canvas-04", tick, {
  preload_sounds: [COIN],
  background_color: '#1f4a3a',
  context_menu: false,
})

/** @typedef {{ id: string, x: number, y: number }} Coin */

// Returns the next of a fixed series of places for a coin, so the sample
// plays the same way every time
/** @param {Record<string, any>} state */
function next_place(state) {
  state.seed = (state.seed * 16807) % 2147483647
  const x = 40 + (state.seed % (WIDTH - 80))
  const y = 70 + (Math.floor(state.seed / WIDTH) % (HEIGHT - 150))
  return { x, y }
}

/** @param {Env} env */
function tick(env) {
  const state = env.state
  state.seed ??= 7
  state.score ??= 0
  state.music_on ??= true
  state.muted ??= false
  /** @type {Coin[]} */
  const coins = state.coins ??= [1, 2, 3, 4, 5].map(n => ({ id: `coin ${n}`, ...next_place(state) }))
  const left_clicks = env.inputs.mouse.clicks.filter(click => click.button === 'left')

  if (left_clicks.length > 0)
    state.started = true

  for (const click of left_clicks) {
    const id = env.hit(click)?.id
    const coin = coins.find(c => c.id === id)
    if (coin) {
      env.sounds.push(sound({ path: COIN, pan: coin.x / (WIDTH / 2) - 1, rate: 0.9 + Math.random() * 0.2 }))
      Object.assign(coin, next_place(state))
      state.score++
    }
    if (id === 'music')
      state.music_on = !state.music_on
    if (id === 'mute')
      state.muted = !state.muted
  }

  env.tracks.music ??= track({ path: MUSIC, looping: true, gain: 0.5 })
  env.tracks.music.paused = !state.music_on
  env.volume = state.muted ? 0 : 1

  const under_mouse = env.hit()?.id

  return [
    label({
      x: 16, y: 36, text: `Coins: ${state.score}`,
      text_align: 'left', font_size: 18, font_name: 'sans-serif', fill_color: '#f4e7b0',
    }),
    label({
      x: WIDTH - 16, y: 36,
      text: state.started ? 'Each coin sounds from its side of the screen' : 'Click or tap a coin to start the sound',
      text_align: 'right', font_size: 14, font_name: 'sans-serif', fill_color: '#cfe3d6',
    }),
    coins.map(coin => [
      circle({ id: coin.id, x: coin.x, y: coin.y, radius: 22, fill_color: under_mouse === coin.id ? '#ffd95a' : '#f2c230', stroke_color: '#a77b0c' }),
      circle({ id: coin.id, x: coin.x, y: coin.y, radius: 14, stroke_color: '#a77b0c' }),
    ]),
    button('music', 16, state.music_on ? 'Music: on' : 'Music: off', under_mouse),
    button('mute', 152, state.muted ? 'Sound: muted' : 'Sound: on', under_mouse),
  ]
}

// A rect and a label with the same `id`, so the text and the box around it
// respond alike
/**
 * @param {string} id
 * @param {number} x
 * @param {string} text
 * @param {string | number | undefined} under_mouse
 */
function button(id, x, text, under_mouse) {
  return [
    rect({ id, x, y: HEIGHT - 52, w: 124, h: 36, fill_color: under_mouse === id ? '#3f7a62' : '#2e5e4b' }),
    label({ id, x: x + 62, y: HEIGHT - 29, text, font_size: 14, font_name: 'sans-serif', fill_color: 'white' }),
  ]
}
