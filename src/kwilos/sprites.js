/* Don't use sloppy JS. */ "use strict";

// Sprites: a scene entity that draws a frame of an animation. Which frame
// follows from the time since the sprite's `start`, so a sprite is plain
// data, like the other shapes, and Kwilos keeps no state for it.

/**
 * @import { Image, Tile } from './shapes.js'
 */

/**
 * One frame of an animation: a tile from the animation's `sheet`, or an
 * image of its own.
 * @typedef {object} Frame
 * @property {number} [tile] Tile index in the animation's `sheet`, counting left to right, then top to bottom, from 0
 * @property {string} [path] An image to show instead of a tile from the sheet
 * @property {number} [source_x] Region of `path` to show; defaults to the whole image
 * @property {number} [source_y]
 * @property {number} [source_w]
 * @property {number} [source_h]
 * @property {number} [duration] How long the frame shows, in milliseconds; see `Animation.duration`
 * @property {number} [dx] Shifts the frame right while it shows, e.g. to sway; it is not added up from frame to frame
 * @property {number} [dy] Shifts the frame down while it shows, e.g. negative for the top of a bounce
 */

/**
 * A sequence of frames, defined once and shown by sprites.
 * @typedef {object} Animation
 * @property {'animation'} [type]
 * @property {Frame[]} frames
 * @property {{ path: string, tile_w?: number, tile_h?: number, tile_rows?: number, tile_cols?: number }} [sheet] The tile sheet that frames with a `tile` come from, sized as for a tile
 * @property {'loop' | 'once' | 'ping-pong'} [play] `loop` repeats, the default; `once` stops on the last frame; `ping-pong` plays forwards then backwards, repeating, with each end frame shown once, as in 1, 2, 3, 2, 1, 2, 3; to hold an end frame, give it a longer `duration`
 * @property {number} [duration] The length of one pass, in milliseconds. Frames' own durations share it in proportion; without it, they add up to it. Frames without a duration of their own get an equal share, or 100 ms when there is no `duration`
 * @property {Easing} [easing] Spaces the frames along a curve within each pass, e.g. "ease-in" shows the first frames longest; defaults to "linear"
 */

/**
 * "linear", the cubic curves "ease-in", "ease-out" and "ease-in-out", or a
 * function from progress through a pass, 0 to 1, to the progress to show.
 * @typedef {'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | ((t: number) => number)} Easing
 */

/**
 * A scene entity that draws the frame of its animation for the time since
 * `start`, in the same time as `env.time`.
 * @typedef {object} Sprite
 * @property {'sprite'} type
 * @property {string | number} [id] Identifies the sprite, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {Animation} animation
 * @property {number} [start] When the animation began, in `env.time` milliseconds; defaults to 0. Set it to `env.time` when changing animation, to start the new one from its first frame
 * @property {number} x Top-left corner
 * @property {number} y Top-left corner
 * @property {number} [w] Defaults to the frame's width
 * @property {number} [h] Defaults to the frame's height
 * @property {boolean} [flip_x] Mirrors the frames left to right, e.g. to face the other way
 * @property {boolean} [flip_y] Mirrors the frames top to bottom
 */

/**
 * Where an animation is at a time.
 * @typedef {object} AnimationStatus
 * @property {number} frame Index in `frames` of the frame showing
 * @property {boolean} done A `once` animation has reached its end; always false for the others
 */

/**
 * @param {Omit<Animation, 'type'>} props
 * @returns {Animation}
 */
export const animation = (props) => ({ ...props, type: 'animation' })

/**
 * @param {Omit<Sprite, 'type'>} props
 * @returns {Sprite}
 */
export const sprite = (props) => ({ ...props, type: 'sprite' })

/** @type {Record<string, (t: number) => number>} */
const EASINGS = {
  'linear': t => t,
  'ease-in': t => t * t * t,
  'ease-out': t => 1 - (1 - t) ** 3,
  'ease-in-out': t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
}

/**
 * Returns which frame an animation shows after `elapsed` milliseconds, and
 * whether a `once` animation has finished. Throws a TypeError for an
 * animation without frames, or with an unknown `play` or `easing`.
 * @param {Animation} anim
 * @param {number} elapsed Milliseconds since it began; negative counts as 0
 * @returns {AnimationStatus}
 */
export function animation_status(anim, elapsed) {
  const durations = _durations(anim)
  const total = durations.reduce((sum, d) => sum + d, 0)
  const ease = _easing(anim.easing)
  const t = Math.max(0, elapsed)
  if (total <= 0)
    return { frame: 0, done: (anim.play ?? 'loop') === 'once' }

  // Where in a forward pass the animation is, from 0 to just under `total`
  let within
  let backward = false
  let done = false
  switch (anim.play ?? 'loop') {
    case 'loop':
      within = t % total
      break
    case 'once':
      done = t >= total
      within = Math.min(t, total)
      break
    case 'ping-pong': {
      // There and back shows the end frames once, so the cycle is shorter
      // than twice a pass by their durations; a single frame never moves
      const last = durations.length - 1
      if (last === 0) {
        within = 0
        break
      }
      const along = t % (2 * total - durations[0] - durations[last])
      backward = along >= total
      within = backward ? 2 * total - durations[last] - along : along
      break
    }
    default:
      throw new TypeError(`Kwilos: an animation's play must be "loop", "once" or "ping-pong", got ${JSON.stringify(anim.play)}`)
  }

  // Ease the position along the pass, then find the frame showing there
  const eased = total * _clamp01(ease(within / total))
  let reached = 0
  for (let i = 0; i < durations.length; i++) {
    reached += durations[i]
    if (backward ? eased <= reached : eased < reached)
      return { frame: i, done }
  }
  return { frame: durations.length - 1, done }
}

/**
 * Returns the tile or image a sprite shows at a time, placed where it is
 * drawn, with the frame's offset applied.
 * @param {Sprite} entity
 * @param {number} time In `env.time` milliseconds
 * @returns {Tile | Image}
 */
export function sprite_frame(entity, time) {
  const anim = entity.animation
  if (anim == null || typeof anim !== 'object')
    throw new TypeError('Kwilos: a sprite needs an animation')
  const frame = anim.frames[animation_status(anim, time - (entity.start ?? 0)).frame]
  const x = entity.x + (frame.dx ?? 0)
  const y = entity.y + (frame.dy ?? 0)

  if (frame.path != null) {
    const { source_x, source_y, source_w, source_h } = frame
    return { type: 'image', path: frame.path, x, y, w: entity.w, h: entity.h, source_x, source_y, source_w, source_h }
  }
  if (frame.tile == null || anim.sheet == null)
    throw new TypeError('Kwilos: an animation frame needs a path, or a tile and the animation a sheet')
  const { path, tile_w, tile_h, tile_rows, tile_cols } = anim.sheet
  return { type: 'tile', path, tile_index: frame.tile, x, y, w: entity.w, h: entity.h, tile_w, tile_h, tile_rows, tile_cols }
}

// Returns each frame's duration, sharing the animation's `duration` among
// frames in proportion to their own durations
/**
 * @param {Animation} anim
 * @returns {number[]}
 */
function _durations(anim) {
  const frames = anim.frames
  if (!Array.isArray(frames) || frames.length === 0)
    throw new TypeError('Kwilos: an animation needs one or more frames')
  const total = anim.duration
  const share = total != null ? total / frames.length : 100
  const own = frames.map(frame => Math.max(0, frame.duration ?? share))
  if (total == null)
    return own
  const sum = own.reduce((a, b) => a + b, 0)
  return sum > 0 ? own.map(d => d * total / sum) : own
}

/**
 * @param {Easing | undefined} easing
 * @returns {(t: number) => number}
 */
function _easing(easing) {
  if (typeof easing === 'function')
    return easing
  const named = EASINGS[easing ?? 'linear']
  if (!named)
    throw new TypeError(`Kwilos: an animation's easing must be "linear", "ease-in", "ease-out", "ease-in-out" or a function, got ${JSON.stringify(easing)}`)
  return named
}

/**
 * Keeps progress within a pass, just short of its end, so that the last
 * frame shows at the end of a `once` animation
 * @param {number} t
 */
function _clamp01(t) {
  return Math.min(Math.max(t, 0), 1 - Number.EPSILON)
}
