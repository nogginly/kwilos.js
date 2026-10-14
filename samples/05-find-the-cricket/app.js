/* Don't use sloppy JS. */ "use strict";

// 1. A sound with `x` and `y` is placed on the canvas, and heard from
//    `env.listener`: here, the lantern. Move it, and the chirp shifts left
//    or right and grows louder or quieter, so you can find the cricket by
//    ear. Headphones or stereo speakers help.
//
// 2. `range` is how far away a sound falls silent. It is set wider than
//    the canvas, so the chirp can be heard from anywhere on it, faintly
//    from afar.
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
  const cricket = state.cricket
  const now = performance.now()

  for (const click of mouse.clicks.filter(click => click.button === 'left')) {
    state.started = true
    const id = env.hit(click)?.id
    if (id === 'show')
      state.show = !state.show
    else if (id === 'cricket') {
      state.caught++
      state.cricket = next_place(state)
    }
  }

  env.listener = { x: mouse.x, y: mouse.y }
  if (state.started && now >= (state.next_chirp ?? 0)) {
    env.sounds.push(sound({ path: CHIRP, x: cricket.x, y: cricket.y, range: 800 }))
    state.next_chirp = now + CHIRP_EVERY
  }

  const lit = Math.hypot(mouse.x - cricket.x, mouse.y - cricket.y) < LIT
  const visible = lit || state.show

  return [
    // The lantern's glow, brightest at its centre
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
    rect({ id: 'show', x: 16, y: HEIGHT - 52, w: 170, h: 36, fill_color: env.hit()?.id === 'show' ? '#2c3e60' : '#1f2d47' }),
    label({
      id: 'show', x: 101, y: HEIGHT - 29, text: state.show ? 'Hide the cricket' : 'Show the cricket',
      font_size: 14, font_name: 'sans-serif', fill_color: 'white',
    }),
  ]
}
