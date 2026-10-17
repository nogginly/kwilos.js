/* Don't use sloppy JS. */ "use strict";

// Imports a sprite sheet exported from Aseprite (or LibreSprite) with its
// JSON data, as animations that `sprite` shows. It makes plain objects only,
// so it needs nothing from the rest of Kwilos at run time.

/**
 * @import { Animation, Frame } from './kwilos/sprites.js'
 */

/**
 * A frame of an Aseprite sheet: a region of the sheet's image, for as long as
 * Aseprite says, and where it sits within the untrimmed sprite. Its `index`
 * is the frame's number in Aseprite, counting from 0, which tags use.
 * @typedef {Frame & { path: string, index: number }} AsepriteFrame
 */

/**
 * An animation of Aseprite frames, as a sprite shows.
 * @typedef {Omit<Animation, 'frames'> & { frames: AsepriteFrame[] }} AsepriteAnimation
 */

/**
 * What `from_aseprite` makes of an export.
 * @typedef {object} AsepriteImport
 * @property {string} image Path of the sheet's image, to preload with `preload_images`
 * @property {AsepriteFrame[]} frames Every frame of the sheet, in Aseprite's order
 * @property {Record<string, AsepriteAnimation>} animations One animation per tag, by the tag's name; a sheet without tags has one, named "default", of every frame
 */

/**
 * Where an export's image is found, and what to call it.
 * @typedef {object} AsepriteOptions
 * @property {string} [base] Where the JSON was loaded from, so `meta.image` is looked up beside it; without it, `meta.image` is used as it is
 * @property {string} [image] The image's path, if the export's `meta.image` is not one that works from the page
 */

/** @type {Record<string, { reverse: boolean, play: Animation['play'] }>} */
const DIRECTIONS = {
  forward: { reverse: false, play: 'loop' },
  reverse: { reverse: true, play: 'loop' },
  pingpong: { reverse: false, play: 'ping-pong' },
  pingpong_reverse: { reverse: true, play: 'ping-pong' },
}

/**
 * Returns the frames and animations in the JSON that Aseprite exports along
 * with a sprite sheet. Tags become animations, played in their direction, and
 * a tag's `repeat` is not used. Throws a TypeError for JSON that is not an
 * export, a rotated frame, or a tag that is out of range or in an unknown
 * direction.
 * @param {any} json The parsed JSON, with its frames as an array or an object
 * @param {AsepriteOptions} [options]
 * @returns {AsepriteImport}
 */
export function from_aseprite(json, { base, image } = {}) {
  const entries = json?.frames && typeof json.frames === 'object' ? Object.entries(json.frames) : null
  if (!entries || !json.meta || typeof json.meta !== 'object')
    throw new TypeError('Kwilos: from_aseprite needs the parsed JSON of an Aseprite sheet export, with frames and meta')

  const path = image ?? _beside(base, json.meta.image)
  if (typeof path !== 'string')
    throw new TypeError('Kwilos: from_aseprite needs the export\'s meta.image, or the image option')

  const frames = entries.map(([key, data], index) => _frame(path, data?.filename ?? key, data, index))
  /** @type {Record<string, AsepriteAnimation>} */
  const animations = {}
  const tags = Array.isArray(json.meta.frameTags) ? json.meta.frameTags : []
  for (const tag of tags)
    animations[tag.name] = _tagged(tag, frames)
  if (tags.length === 0 && frames.length > 0)
    animations.default = { type: 'animation', frames, play: 'loop' }
  return { image: path, frames, animations }
}

// Returns an export's frame as a Kwilos frame of the image, shifted by its
// trimming so the sprite's own `x` and `y` stay where the untrimmed sprite is
/**
 * @param {string} path
 * @param {string} name
 * @param {any} data
 * @param {number} index
 * @returns {AsepriteFrame}
 */
function _frame(path, name, data, index) {
  if (data?.rotated)
    throw new TypeError(`Kwilos: from_aseprite does not support rotated frames, as in ${JSON.stringify(name)}`)
  const { x, y, w, h } = data?.frame ?? {}
  if (![x, y, w, h].every(Number.isFinite))
    throw new TypeError(`Kwilos: from_aseprite found no frame rectangle in ${JSON.stringify(name)}`)
  return {
    path, source_x: x, source_y: y, source_w: w, source_h: h,
    duration: data.duration, dx: data.spriteSourceSize?.x ?? 0, dy: data.spriteSourceSize?.y ?? 0, index,
  }
}

// Returns a tag's frames as an animation, in the order its direction plays
/**
 * @param {any} tag
 * @param {AsepriteFrame[]} frames
 * @returns {AsepriteAnimation}
 */
function _tagged(tag, frames) {
  const name = JSON.stringify(tag?.name)
  const named = tag?.direction ?? 'forward'
  const direction = Object.hasOwn(DIRECTIONS, named) ? DIRECTIONS[named] : null
  if (!direction)
    throw new TypeError(`Kwilos: from_aseprite does not know the direction ${JSON.stringify(tag.direction)} of the tag ${name}`)
  const { from, to } = tag
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to >= frames.length)
    throw new TypeError(`Kwilos: the tag ${name} runs from frame ${from} to ${to}, outside the ${frames.length} frames`)

  const tagged = frames.slice(from, to + 1)
  return { type: 'animation', frames: direction.reverse ? tagged.reverse() : tagged, play: direction.play }
}

// Returns an image's path as found beside the file `base`, unless it is
// absolute or there is no `base`
/**
 * @param {string | undefined} base
 * @param {unknown} image
 */
function _beside(base, image) {
  if (typeof image !== 'string' || base == null || /^([a-z][a-z0-9+.-]*:|\/)/i.test(image))
    return image
  return base.slice(0, base.lastIndexOf('/') + 1) + image
}
