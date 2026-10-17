/* Don't use sloppy JS. */ "use strict";

// 1. Aseprite exports a sprite sheet and a JSON file that says where each
//    frame is, how long it shows, and which frames each tag covers.
//    `from_aseprite` turns the JSON into animations, one per tag, named as
//    in Aseprite: "Walk East", "Run North".
//
// 2. The app only decides which tag is playing, and since when. A sprite
//    shows the frame for the time since its `start`, as in the Sprites sample.
//
// 3. Standing still shows the first frame of the walk in the direction she
//    faces, made into an animation of one frame.
//
// 4. `image_smoothing: false` keeps the pixels crisp at three times their size.
//
// Arrow keys or WASD walk, and Shift runs. Or hold the mouse or a finger:
// she walks towards it, and runs when it is far.
//

import { Kwilos, animation, animation_status, label, sprite } from "../../src/kwilos.js";
import { from_aseprite } from "../../src/aseprite.js";

/**
 * @import { Env } from "../../src/kwilos.js"
 * @import { AsepriteAnimation } from "../../src/aseprite.js"
 */

const WIDTH = 600
const HEIGHT = 360
const SCALE = 3
const SIZE = 64 * SCALE
const WALK_SPEED = 70
const RUN_SPEED = 150
const DATA = 'assets/Uncle.json'

const uncle = from_aseprite(await (await fetch(DATA)).json(), { base: DATA })
const standing = /** @type {Record<string, AsepriteAnimation>} */ (Object.fromEntries(['North', 'East', 'South', 'West'].map(facing =>
  [facing, animation({ frames: uncle.animations[`Walk ${facing}`].frames.slice(0, 1) })])))

await Kwilos.attach("#canvas-08", tick, {
  background_color: '#e7efdc',
  preload_images: [uncle.image],
  image_smoothing: false,
  claim_keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  touch_scroll: false,
})

/**
 * @typedef {object} Hero
 * @property {number} x
 * @property {number} y
 * @property {'North' | 'East' | 'South' | 'West'} facing
 * @property {string | null} tag The Aseprite tag playing, or null when standing
 * @property {number} since When the tag began, in `env.time` milliseconds
 */

/** @param {Env} env */
function tick(env) {
  const { key, mouse } = env.inputs
  /** @type {Hero} */
  const hero = env.state.hero ??= { x: (WIDTH - SIZE) / 2, y: (HEIGHT - SIZE) / 2 + 20, facing: 'South', tag: null, since: 0 }
  const dt = Math.min(100, env.time - (env.state.last_time ?? env.time)) / 1000
  env.state.last_time = env.time

  // Which way she is told to go, and whether to run
  let go_x = (key.pressed.ArrowRight || key.pressed.KeyD ? 1 : 0) - (key.pressed.ArrowLeft || key.pressed.KeyA ? 1 : 0)
  let go_y = (key.pressed.ArrowDown || key.pressed.KeyS ? 1 : 0) - (key.pressed.ArrowUp || key.pressed.KeyW ? 1 : 0)
  let run = Boolean(key.pressed.ShiftLeft || key.pressed.ShiftRight)
  if (go_x === 0 && go_y === 0 && mouse.button_left) {
    const to_x = mouse.x - (hero.x + SIZE / 2)
    const to_y = mouse.y - (hero.y + SIZE / 2)
    const distance = Math.hypot(to_x, to_y)
    if (distance > 12) {
      go_x = to_x / distance
      go_y = to_y / distance
      run = distance > 160
    }
  }

  // Facing, tag and position follow from it; a new tag starts from its first frame
  const moving = go_x !== 0 || go_y !== 0
  if (moving) {
    hero.facing = Math.abs(go_x) > Math.abs(go_y) ? (go_x < 0 ? 'West' : 'East') : (go_y < 0 ? 'North' : 'South')
    const tag = `${run ? 'Run' : 'Walk'} ${hero.facing}`
    if (tag !== hero.tag)
      Object.assign(hero, { tag, since: env.time })
    const speed = (run ? RUN_SPEED : WALK_SPEED) * dt / Math.hypot(go_x, go_y)
    hero.x = Math.max(0, Math.min(WIDTH - SIZE, hero.x + go_x * speed))
    hero.y = Math.max(40, Math.min(HEIGHT - SIZE, hero.y + go_y * speed))
  }
  else
    hero.tag = null

  const playing = hero.tag ? uncle.animations[hero.tag] : standing[hero.facing]
  const shown = playing.frames[animation_status(playing, env.time - hero.since).frame]

  return [
    sprite({
      id: 'uncle', animation: playing, start: hero.since,
      x: hero.x, y: hero.y, w: SIZE, h: SIZE,
    }),
    label({
      x: 16, y: 30, text: `${hero.tag ?? `Standing ${hero.facing}`} · Aseprite frame ${shown.index}`,
      text_align: 'left', font_size: 16, font_name: 'sans-serif', fill_color: '#3b4a2c',
    }),
    label({
      x: WIDTH - 16, y: HEIGHT - 16, text: 'Arrows or WASD walk, Shift runs; or hold the pointer',
      text_align: 'right', font_size: 13, font_name: 'sans-serif', fill_color: '#3b4a2c',
    }),
  ]
}
