/* Don't use sloppy JS. */ "use strict";

// 1. Use `env.hit()` to find the shape under the mouse in the scene last
//    drawn, which is what the user sees. It returns the shape itself, so
//    give shapes an `id` to tell them apart.
//
// 2. Press on a character to pick it up and drag it; it moves to the end
//    of the list, so it is drawn last, on top of the others.
//
// 3. Containers act as layers: desert, glow, characters, then controls.
//    `env.hit` checks the layers from the top down, as they are seen.
//
// 4. The glow sits in a layer below the characters, inside their bounds.
//    Drawn on top, it would be the shape under the mouse instead of the
//    character.
//
// 5. The Reset button is a rect and a label with the same `id`, so the
//    text and the box around it respond alike.
//
// 6. Return `null` when the mouse has not moved and no button has
//    changed, so nothing is redrawn.
//

import { Kwilos, container, circle, image, label, rect, tile } from "../../src/kwilos.js";

/** @import { Env } from "../../src/kwilos.js" */

const DESERT = '../01-different-types/assets/backgroundColorDesert.png'
const SHEET = '../01-different-types/assets/female_tilesheet.png'
const POSES = [0, 4, 9, 13, 20]

await Kwilos.attach("#canvas-03", tick, {
  preload_images: [DESERT, SHEET],
  context_menu: false,
})

/** @typedef {{ id: string, pose: number, x: number, y: number }} Character */

// Places the characters in a row
/** @returns {Character[]} */
function starting_positions() {
  return POSES.map((pose, i) => ({ id: `character ${i + 1}`, pose, x: 40 + i * 110, y: 190 }))
}

/** @param {Env} env */
function tick(env) {
  const { mouse } = env.inputs
  const state = env.state
  /** @type {Character[]} */
  let characters = state.characters ??= starting_positions()

  const pressed = mouse.button_left && !state.was_pressed
  const released = !mouse.button_left && state.was_pressed
  const first_frame = state.was_pressed === undefined
  state.was_pressed = !!mouse.button_left

  if (!first_frame && !mouse.moved && !pressed && !released)
    return null

  const under_mouse = env.hit()

  if (pressed && under_mouse?.id === 'reset') {
    characters = state.characters = starting_positions()
  }
  else if (pressed && under_mouse?.id?.toString().startsWith('character')) {
    // Pick it up where it was grabbed, and bring it to the front
    const picked = characters.find(c => c.id === under_mouse.id)
    if (picked) {
      characters = state.characters = [...characters.filter(c => c !== picked), picked]
      state.dragging = { id: picked.id, grab_x: mouse.x - picked.x, grab_y: mouse.y - picked.y }
    }
  }

  if (state.dragging && mouse.button_left) {
    const held = characters.find(c => c.id === state.dragging.id)
    if (held) {
      held.x = mouse.x - state.dragging.grab_x
      held.y = mouse.y - state.dragging.grab_y
    }
  }
  else {
    state.dragging = null
  }

  const glowing = state.dragging?.id ?? under_mouse?.id
  const lit = characters.find(c => c.id === glowing)

  return [
    container({ scene: [
      image({ id: 'desert', path: DESERT, x: 0, y: 0, w: 600, h: 400 }),
    ]}),
    container({ scene: [
      lit && circle({ id: lit.id, x: lit.x + 40, y: lit.y + 55, radius: 38, fill_color: 'rgba(255, 255, 160, 0.6)' }),
    ]}),
    container({ scene: characters.map(c =>
      tile({ id: c.id, path: SHEET, x: c.x, y: c.y, tile_w: 80, tile_h: 110, tile_index: c.pose })
    )}),
    container({ scene: [
      label({
        x: 12, y: 28, text: `Under the mouse: ${under_mouse?.id ?? 'nothing'}`,
        text_align: 'left', font_size: 14, font_name: 'sans-serif', fill_color: '#333',
      }),
      rect({ id: 'reset', x: 480, y: 348, w: 100, h: 36, fill_color: under_mouse?.id === 'reset' ? '#555' : '#333' }),
      label({
        id: 'reset', x: 530, y: 372, text: 'Reset',
        font_size: 14, font_name: 'sans-serif', fill_color: 'white',
      }),
    ]}),
  ]
}
