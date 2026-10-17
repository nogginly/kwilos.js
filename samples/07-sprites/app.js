/* Don't use sloppy JS. */ "use strict";

// 1. An `animation` is defined once: frames from a tile sheet, how long
//    each shows, and how it plays. The app only decides which animation a
//    character is in, and since when.
//
// 2. A `sprite` in the scene shows the frame of its animation for the time
//    since its `start`. Changing state sets `since` to `env.time`, so the
//    new animation begins at its first frame.
//
// 3. Frames' `dx` and `dy` shift a frame while it shows: idle breathes,
//    and the whole jump arc is offsets, so her `x` and `y` stay on the
//    ground. Walking moves her, as game logic, by speed times time.
//
// 4. `flip_x` mirrors the frames, so one right-facing walk serves for left.
//
// 5. `animation_status` tells when a `once` animation is done, to go back
//    to idle after a jump or a cheer.
//
// 6. `claim_keys` stops Space and the arrow keys scrolling the page while
//    the game has focus; clicking it gives it focus.
//
// Arrow keys or the buttons walk; space, the up arrow or Jump jumps; click
// or tap her to cheer.
//

import { Kwilos, animation, animation_status, label, rect, sprite } from "../../src/kwilos.js";

/** @import { Env } from "../../src/kwilos.js" */

const WIDTH = 600
const HEIGHT = 360
const GROUND = 170
const SPEED = 160
const SHEET = { path: '../01-different-types/assets/female_tilesheet.png', tile_w: 80, tile_h: 110 }

const ANIMATIONS = {
  idle: animation({
    sheet: SHEET, play: 'ping-pong',
    frames: [{ tile: 0, duration: 800 }, { tile: 0, duration: 300, dy: -1 }, { tile: 0, duration: 800, dy: -2 }],
  }),
  walk: animation({
    sheet: SHEET,
    frames: [{ tile: 16, duration: 140 }, { tile: 17, duration: 140, dy: -2 }],
  }),
  jump: animation({
    sheet: SHEET, play: 'once', duration: 700,
    frames: [
      { tile: 3 },
      { tile: 1, dy: -40 }, { tile: 1, dy: -70 }, { tile: 1, dy: -80 },
      { tile: 1, dy: -70 }, { tile: 1, dy: -40 }, { tile: 3 },
    ],
  }),
  cheer: animation({
    sheet: SHEET, play: 'once',
    frames: [7, 8, 7, 8, 7, 8].map(tile => ({ tile, duration: 180 })),
  }),
}

await Kwilos.attach("#canvas-07", tick, {
  background_color: '#dff1f7',
  preload_images: [SHEET.path],
  touch_scroll: false,
  claim_keys: ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
})

/**
 * @typedef {object} Hero
 * @property {keyof typeof ANIMATIONS} state
 * @property {number} since When the state began, in `env.time` milliseconds
 * @property {number} x
 * @property {'left' | 'right'} facing
 */

/** @param {Env} env */
function tick(env) {
  const { key, mouse } = env.inputs
  /** @type {Hero} */
  const hero = env.state.hero ??= { state: 'idle', since: 0, x: WIDTH / 2 - 40, facing: 'right' }
  const dt = Math.min(100, env.time - (env.state.last_time ?? env.time)) / 1000
  env.state.last_time = env.time

  /** @param {keyof typeof ANIMATIONS} state */
  const become = (state) => {
    if (hero.state !== state)
      Object.assign(hero, { state, since: env.time })
  }

  // Which buttons are held, by pointer, and what was clicked
  const held = mouse.button_left ? env.hit()?.id : undefined
  const clicked = mouse.clicks.filter(click => click.button === 'left').map(click => env.hit(click)?.id)
  const left = key.pressed.ArrowLeft || held === 'left'
  const right = key.pressed.ArrowRight || held === 'right'
  const jump = key.typed.some(k => k.code === 'Space' || k.code === 'ArrowUp')
    || key.pressed.ArrowUp || clicked.includes('jump')

  // A jump or a cheer plays to its end; otherwise input picks the state
  const busy = (hero.state === 'jump' || hero.state === 'cheer')
    && !animation_status(ANIMATIONS[hero.state], env.time - hero.since).done
  if (!busy) {
    if (jump)
      become('jump')
    else if (clicked.includes('hero'))
      become('cheer')
    else if (left !== right)
      become('walk')
    else
      become('idle')
  }

  // Walking, and steering in the air, move her by speed times time
  if ((hero.state === 'walk' || hero.state === 'jump') && left !== right) {
    hero.facing = left ? 'left' : 'right'
    hero.x = Math.max(0, Math.min(WIDTH - 80, hero.x + (left ? -SPEED : SPEED) * dt))
  }

  const status = animation_status(ANIMATIONS[hero.state], env.time - hero.since)

  return [
    rect({ x: 0, y: GROUND + 106, w: WIDTH, h: HEIGHT - GROUND - 106, fill_color: '#9bd28e' }),
    sprite({
      id: 'hero', animation: ANIMATIONS[hero.state], start: hero.since,
      x: hero.x, y: GROUND, flip_x: hero.facing === 'left',
    }),
    label({
      x: 16, y: 30, text: `${hero.state} · frame ${status.frame}`,
      text_align: 'left', font_size: 16, font_name: 'sans-serif', fill_color: '#24505f',
    }),
    label({
      x: WIDTH - 16, y: 30, text: 'Arrows walk, space jumps, click her to cheer',
      text_align: 'right', font_size: 13, font_name: 'sans-serif', fill_color: '#24505f',
    }),
    label({
      x: WIDTH - 16, y: 50, text: 'Click the game first to play with the keyboard',
      text_align: 'right', font_size: 11, font_name: 'sans-serif', fill_color: '#4f7c8a',
    }),
    button('left', 16, '◀', held),
    button('jump', WIDTH / 2 - 40, 'Jump', held),
    button('right', WIDTH - 96, '▶', held),
  ]
}

// A rect and a label with the same `id`, so the text and the box around it
// respond alike
/**
 * @param {string} id
 * @param {number} x
 * @param {string} text
 * @param {string | number | undefined} held
 */
function button(id, x, text, held) {
  return [
    rect({ id, x, y: HEIGHT - 52, w: 80, h: 36, fill_color: held === id ? '#245e39' : '#2f7a4a' }),
    label({ id, x: x + 40, y: HEIGHT - 29, text, font_size: 14, font_name: 'sans-serif', fill_color: 'white' }),
  ]
}
