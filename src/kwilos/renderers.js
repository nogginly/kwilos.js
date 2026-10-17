/* Don't use sloppy JS. */ "use strict";

import { load_image } from "./initialize.js";
import { sprite_frame } from "./sprites.js";
import { tile_layout } from "./shapes.js";

/**
 * @import { System } from './types.js'
 * @import { Scene, Circle, Rect, Label, Image, Tile, Container } from './shapes.js'
 * @import { Sprite } from './sprites.js'
 */

/** @typedef {(sys: System, entity: any) => void} Renderer */

/** @type {Record<string, Renderer>} */
const RENDERABLES = {
  container: _render_container,
  circle: _render_circle,
  image: _render_image,
  label: _render_label,
  rect: _render_rectangle,
  sprite: _render_sprite,
  tile: _render_tile
}

// Renders a scene in order, descending into nested arrays and skipping
// null, undefined and false entries. Throws a TypeError for an entity
// whose `type` is not one of the shapes.
/**
 * @param {System} sys
 * @param {Scene} scene
 */
export function render(sys, scene) {
  for (const entity of scene) {
    if (entity == null || entity === false)
      continue
    else if (Array.isArray(entity))
      render(sys, entity)
    else
      _renderer_for(entity)(sys, entity)
  }
}

/**
 * @param {any} entity
 * @returns {Renderer}
 */
function _renderer_for(entity) {
  const renderer = Object.hasOwn(RENDERABLES, entity?.type) && RENDERABLES[entity.type]
  if (!renderer)
    throw new TypeError(`Kwilos: cannot draw an entity of type ${JSON.stringify(entity.type)}`)
  return renderer
}

/**
 * @param {System} sys
 * @param {Container} entity
 */
function _render_container(sys, { x = 0, y = 0, w, h, clip, scene }) {
  if (!Array.isArray(scene))
    throw new TypeError(`Kwilos: a container's scene must be an array, got ${typeof scene}`)

  let draw = sys.app.draw_context

  if (clip == true) {
    if (w == null || h == null)
      throw new TypeError('Kwilos: a clipped container needs w and h')

    // save/restoring draw state is expensive, so only use it
    // if clipping is required
    draw.save()
    try {
      draw.translate(x, y)
      draw.beginPath()
      draw.rect(0, 0, w, h)
      draw.clip()
      render(sys, scene)
    }
    finally {
      draw.restore()
    }
  }
  else {
    const save = draw.getTransform()
    try {
      draw.translate(x, y)
      render(sys, scene)
    }
    finally {
      draw.setTransform(save)
    }
  }
}

/**
 * Returns the font a label is drawn in: its own `font_size` and
 * `font_name`, if either is given, otherwise the default font.
 * @param {System} sys
 * @param {Label} label
 * @returns {string}
 */
export function label_font(sys, { font_name, font_size }) {
  if (font_size == null && font_name == null)
    return sys.fonts.default
  return `${font_size || 14}pt ${font_name || "serif"}`
}

/**
 * @param {System} sys
 * @param {Label} entity
 */
function _render_label(sys, entity) {
  const { x, y, text, fill_color, stroke_color, text_align, text_baseline } = entity
  let draw = sys.app.draw_context

  draw.beginPath()
  draw.textAlign = text_align || 'center'
  draw.textBaseline = text_baseline || 'alphabetic'
  draw.font = label_font(sys, entity)

  if (fill_color != null) {
    draw.fillStyle = fill_color
    draw.fillText(text, x, y)
  }
  if (stroke_color != null) {
    draw.strokeStyle = stroke_color
    draw.strokeText(text, x, y)
  }

  draw.font = sys.fonts.default
}

/**
 * @param {System} sys
 * @param {Rect} entity
 */
function _render_rectangle(sys, { x, y, w, h, fill_color, stroke_color }) {
  let draw = sys.app.draw_context

  draw.beginPath()
  draw.rect(x, y, w, h)
  if (fill_color != null) {
    draw.fillStyle = fill_color
    draw.fill()
  }
  if (stroke_color != null) {
    draw.strokeStyle = stroke_color
    draw.stroke()
  }
}

/**
 * @param {System} sys
 * @param {Circle} entity
 */
function _render_circle(sys, { x, y, radius, fill_color, stroke_color }) {
  let draw = sys.app.draw_context

  draw.beginPath()
  draw.arc(x, y, radius, 0, 2 * Math.PI)
  if (fill_color != null) {
    draw.fillStyle = fill_color
    draw.fill()
  }
  if (stroke_color != null) {
    draw.strokeStyle = stroke_color
    draw.stroke()
  }
}

// Render an image as a tile from a tileset image (tile_index), specified using
// - either tile size (tile_w, tile_h),
// - or tileset dimensions (tile_rows, tile_cols)
// and any margin and spacing between the tiles
/**
 * @param {System} sys
 * @param {Tile} entity
 */
function _render_tile(sys, entity) {
  const { x, y, tile_index, flip_x, flip_y } = entity
  let img = load_image(sys, entity.path)

  if (img) {
    const { tile_w, tile_h, cols, margin, spacing } = tile_layout(entity, img.width, img.height)
    const source_x = margin + tile_index % cols * (tile_w + spacing)
    const source_y = margin + Math.trunc(tile_index / cols) * (tile_h + spacing)
    const w = entity.w || tile_w
    const h = entity.h || tile_h

    _draw_region(sys, img, [source_x, source_y, tile_w, tile_h], [x, y, w, h], flip_x, flip_y)
  }
}

// Render a single image, rendered
// - either as a whole sprite,
// - or as a portion of the image (via source_* parameters)
/**
 * @param {System} sys
 * @param {Image} entity
 */
function _render_image(sys,
  { x, y, w, h, path, source_x, source_y, source_w, source_h, flip_x, flip_y }) {

  let img = load_image(sys, path)
  if (img) {
    w ||= source_w || img.width
    h ||= source_h || img.height
    source_x ||= 0
    source_y ||= 0
    source_w ||= img.width
    source_h ||= img.height

    _draw_region(sys, img, [source_x, source_y, source_w, source_h], [x, y, w, h], flip_x, flip_y)
  }
}

// Draws the frame a sprite shows now, as a tile or image, mirrored about
// its own box when the sprite is flipped
/**
 * @param {System} sys
 * @param {Sprite} entity
 */
function _render_sprite(sys, entity) {
  const frame = sprite_frame(entity, sys.args.time)
  const draw_frame = frame.type === 'tile' ? _render_tile : _render_image
  draw_frame(sys, /** @type {any} */ (frame))
}

// Draws a region of an image into a box, mirrored about the box when flipped
/**
 * @param {System} sys
 * @param {CanvasImageSource} img
 * @param {[number, number, number, number]} source x, y, w, h in the image
 * @param {[number, number, number, number]} box x, y, w, h on the canvas
 * @param {boolean} [flip_x]
 * @param {boolean} [flip_y]
 */
function _draw_region(sys, img, [source_x, source_y, source_w, source_h], [x, y, w, h], flip_x, flip_y) {
  const draw = sys.app.draw_context
  if (!flip_x && !flip_y) {
    draw.drawImage(img, source_x, source_y, source_w, source_h, x, y, w, h)
    return
  }

  const save = draw.getTransform()
  try {
    draw.translate(x + (flip_x ? w : 0), y + (flip_y ? h : 0))
    draw.scale(flip_x ? -1 : 1, flip_y ? -1 : 1)
    draw.drawImage(img, source_x, source_y, source_w, source_h, 0, 0, w, h)
  }
  finally {
    draw.setTransform(save)
  }
}
