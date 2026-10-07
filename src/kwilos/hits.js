/* Don't use sloppy JS. */ "use strict";

import { load_image } from './initialize.js'
import { label_font } from './renderers.js'

/**
 * @import { System, Point } from './types.js'
 * @import { Scene, Entity, Label, Image, Tile } from './shapes.js'
 */

/**
 * Tells whether a point lies within a shape: anywhere in its area, whether
 * or not it is filled. For a container, tells whether the point lies within
 * any shape in its scene, allowing for its origin and clip.
 *
 * Shapes are measured from their own properties, so a label, and an image
 * or tile without `w` and `h`, throw a TypeError; `env.hit` measures those.
 * @param {Entity} shape
 * @param {Point} point In the coordinates the shape is drawn in
 * @returns {boolean}
 */
export function contains(shape, { x, y }) {
  return _topmost([shape], x, y, null) !== null
}

/**
 * Returns the shape drawn topmost at a point in the last scene drawn, or
 * null if there is none. Containers are not themselves returned.
 * @param {System} sys
 * @param {Point} point In canvas coordinates
 * @returns {Entity | null}
 */
export function hit(sys, { x, y }) {
  const scene = sys.app.last_scene
  return scene ? _topmost(scene, x, y, sys) : null
}

// Walks the scene from the last entity drawn to the first, so the first
// shape found is the one on top. A container moves the point into its own
// coordinates, and is skipped when the point falls outside its clip.
/**
 * @param {Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {System | null} sys Measures labels and images; null when unavailable
 * @returns {Entity | null}
 */
function _topmost(scene, x, y, sys) {
  for (let i = scene.length - 1; i >= 0; i--) {
    const entity = scene[i]
    if (entity == null || entity === false)
      continue
    if (Array.isArray(entity)) {
      const found = _topmost(entity, x, y, sys)
      if (found)
        return found
    }
    else if (entity.type === 'container') {
      const local_x = x - (entity.x ?? 0)
      const local_y = y - (entity.y ?? 0)
      if (entity.clip && !_in_box(local_x, local_y, 0, 0, entity.w ?? 0, entity.h ?? 0))
        continue
      const found = _topmost(entity.scene, local_x, local_y, sys)
      if (found)
        return found
    }
    else if (_within(entity, x, y, sys))
      return entity
  }
  return null
}

/**
 * @param {Entity} entity Any shape but a container
 * @param {number} x
 * @param {number} y
 * @param {System | null} sys
 * @returns {boolean}
 */
function _within(entity, x, y, sys) {
  switch (entity.type) {
    case 'circle':
      return Math.hypot(x - entity.x, y - entity.y) <= entity.radius
    case 'rect':
      return _in_box(x, y, entity.x, entity.y, entity.w, entity.h)
    case 'image':
    case 'tile': {
      const size = _drawn_size(entity, sys)
      return size !== null && _in_box(x, y, entity.x, entity.y, size.w, size.h)
    }
    case 'label': {
      const box = _label_box(entity, sys)
      return _in_box(x, y, box.x, box.y, box.w, box.h)
    }
    default:
      throw new TypeError(`Kwilos: cannot hit-test an entity of type ${JSON.stringify(/** @type {any} */ (entity).type)}`)
  }
}

/**
 * True when (x, y) lies in the box, which may have a negative width or height.
 * @param {number} x
 * @param {number} y
 * @param {number} left
 * @param {number} top
 * @param {number} w
 * @param {number} h
 */
function _in_box(x, y, left, top, w, h) {
  return x >= Math.min(left, left + w) && x <= Math.max(left, left + w)
    && y >= Math.min(top, top + h) && y <= Math.max(top, top + h)
}

// Returns the size an image or tile is drawn at, as the renderer works it
// out, or null when it is not drawn because its image has not loaded yet.
/**
 * @param {Image | Tile} entity
 * @param {System | null} sys
 * @returns {{ w: number, h: number } | null}
 */
function _drawn_size(entity, sys) {
  const own = entity.type === 'image'
    ? { w: entity.w || entity.source_w, h: entity.h || entity.source_h }
    : { w: entity.w || entity.tile_w, h: entity.h || entity.tile_h }
  if (own.w && own.h && !sys)
    return { w: own.w, h: own.h }
  if (!sys)
    throw new TypeError(`Kwilos: contains needs w and h for ${entity.type === 'image' ? 'an image' : 'a tile'}; env.hit can measure it`)

  const img = load_image(sys, entity.path)
  if (!img)
    return null
  if (entity.type === 'image')
    return { w: own.w || img.width, h: own.h || img.height }
  return {
    w: own.w || Math.trunc(img.width / (entity.tile_cols ?? 1)),
    h: own.h || Math.trunc(img.height / (entity.tile_rows ?? 1)),
  }
}

// Measures a label's ink with the font, alignment and baseline it is drawn
// with, leaving the drawing context as it was.
/**
 * @param {Label} label
 * @param {System | null} sys
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
function _label_box(label, sys) {
  if (!sys)
    throw new TypeError('Kwilos: contains cannot measure a label; env.hit can')

  const draw = sys.app.draw_context
  draw.save()
  try {
    draw.font = label_font(sys, label)
    draw.textAlign = label.text_align || 'center'
    draw.textBaseline = label.text_baseline || 'alphabetic'
    const m = draw.measureText(label.text)
    return {
      x: label.x - m.actualBoundingBoxLeft,
      y: label.y - m.actualBoundingBoxAscent,
      w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    }
  }
  finally {
    draw.restore()
  }
}
