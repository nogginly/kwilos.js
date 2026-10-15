/* Don't use sloppy JS. */ "use strict";

// 1. A sound with `x` and `y` is placed on the canvas, and heard from
//    `env.listener`: here, the lantern. Move it, and the chirp shifts left
//    or right and grows louder or quieter, so you can find the cricket by
//    ear. Headphones or stereo speakers help.
//
// 2. `range` is how far away a sound falls silent. It starts wider than
//    the canvas, so the chirp can be heard from anywhere on it, faintly
//    from afar. Change it with the - and + buttons: the ring around the
//    lantern shows it, and the cricket is heard only while it is inside.
//
// 3. The lantern lights the cricket once it is close. Click or tap it to
//    catch it, and it hops somewhere new.
//
// 4. "Show the cricket" reveals it for anyone listening on one speaker,
//    where left and right sound the same.
//

import { Kwilos, circle, label, rect, sound } from "../../src/kwilos.js";

/** @import { Env } from "../../src/kwilos.js" */

const CHIRP = 'assets/chirp.wav'
const WIDTH = 600
const HEIGHT = 400
const CHIRP_EVERY = 1200
const LIT = 50
const RANGES = { least: 100, most: 1000, step: 100 }

await Kwilos.attach("#canvas-05", tick, {
  preload_sounds: [CHIRP],
  background_color: '#0b1424',
  touch_scroll: false,
})

// Returns the next of a fixed series of places for the cricket, so the
// sample plays the same way every time
/** @param {Record<string, any>} state */
function next_place(state) {
  state.seed = (state.seed * 16807) % 2147483647
  return {
    x: 40 + (state.seed % (WIDTH - 80)),
    y: 70 + (Math.floor(state.seed / WIDTH) % (HEIGHT - 150)),
  }
}

/** @param {Env} env */
function tick(env) {
  const state = env.state
  const { mouse } = env.inputs
  state.seed ??= 11
  state.caught ??= 0
  state.cricket ??= next_place(state)
  state.range ??= 800
  const cricket = state.cricket
  const now = performance.now()

  for (const click of mouse.clicks.filter(click => click.button === 'left')) {
    state.started = true
    const id = env.hit(click)?.id
    if (id === 'show')
      state.show = !state.show
    else if (id === 'nearer')
      state.range = Math.max(RANGES.least, state.range - RANGES.step)
    else if (id === 'further')
      state.range = Math.min(RANGES.most, state.range + RANGES.step)
    else if (id === 'cricket') {
      state.caught++
      state.cricket = next_place(state)
    }
  }

  env.listener = { x: mouse.x, y: mouse.y }
  if (state.started && now >= (state.next_chirp ?? 0)) {
    env.sounds.push(sound({ path: CHIRP, x: cricket.x, y: cricket.y, range: state.range }))
    state.next_chirp = now + CHIRP_EVERY
  }

  const lit = Math.hypot(mouse.x - cricket.x, mouse.y - cricket.y) < LIT
  const visible = lit || state.show
  const under_mouse = env.hit()?.id

  return [
    // How far the lantern can hear, then its glow, brightest at its centre
    circle({ x: mouse.x, y: mouse.y, radius: state.range, stroke_color: 'rgba(160, 190, 255, 0.35)' }),
    [120, 80, 50, 25].map((radius, i) =>
      circle({ x: mouse.x, y: mouse.y, radius, fill_color: `rgba(255, 214, 120, ${0.05 + i * 0.05})` })),

    visible && [
      circle({ id: 'cricket', x: cricket.x - 14, y: cricket.y + 2, radius: 10, fill_color: '#4f8a2e', stroke_color: '#2f5a1a' }),
      circle({ id: 'cricket', x: cricket.x, y: cricket.y, radius: 12, fill_color: '#5f9e3a', stroke_color: '#2f5a1a' }),
      circle({ id: 'cricket', x: cricket.x + 13, y: cricket.y - 4, radius: 6, fill_color: '#4c8a2c' }),
      rect({ x: cricket.x + 16, y: cricket.y - 22, w: 2, h: 16, fill_color: '#2f5a1a' }),
      rect({ x: cricket.x + 21, y: cricket.y - 20, w: 2, h: 14, fill_color: '#2f5a1a' }),
    ],

    label({
      x: 16, y: 32, text: `Caught: ${state.caught}`,
      text_align: 'left', font_size: 18, font_name: 'sans-serif', fill_color: '#f4e7b0',
    }),
    label({
      x: WIDTH - 16, y: 32,
      text: !state.started ? 'Click to start listening; headphones help'
        : lit ? 'Found it! Click to catch it'
        : 'Follow the chirp with the lantern',
      text_align: 'right', font_size: 14, font_name: 'sans-serif', fill_color: '#c9d4e8',
    }),
    button('show', 16, 170, state.show ? 'Hide the cricket' : 'Show the cricket', under_mouse),
    button('nearer', WIDTH - 216, 36, '-', under_mouse),
    label({
      x: WIDTH - 114, y: HEIGHT - 29, text: `Range: ${state.range}`,
      font_size: 14, font_name: 'sans-serif', fill_color: '#c9d4e8',
    }),
    button('further', WIDTH - 52, 36, '+', under_mouse),
  ]
}

// A rect and a label with the same `id`, so the text and the box around it
// respond alike
/**
 * @param {string} id
 * @param {number} x
 * @param {number} w
 * @param {string} text
 * @param {string | number | undefined} under_mouse
 */
function button(id, x, w, text, under_mouse) {
  return [
    rect({ id, x, y: HEIGHT - 52, w, h: 36, fill_color: under_mouse === id ? '#2c3e60' : '#1f2d47' }),
    label({ id, x: x + w / 2, y: HEIGHT - 29, text, font_size: 14, font_name: 'sans-serif', fill_color: 'white' }),
  ]
}
