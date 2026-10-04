/* Don't use sloppy JS. */ "use strict";

import { load_image } from "./initialize";

const RENDERABLES = {
  container: _render_container,
  circle: _render_circle,
  image: _render_image,
  label: _render_label,
  rect: _render_rectangle,
  tile: _render_tile
}

// Renders a scene in order, descending into nested arrays and skipping
// null, undefined and false entries. Throws a TypeError for an entity
// whose `type` is not one of the shapes.
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

function _renderer_for(entity) {
  const renderer = Object.hasOwn(RENDERABLES, entity.type) && RENDERABLES[entity.type]
  if (!renderer)
    throw new TypeError(`Kwilos: cannot draw an entity of type ${JSON.stringify(entity.type)}`)
  return renderer
}

function _render_container(sys, { x = 0, y = 0, w, h, clip, outputs } = {}) {
  let draw = sys.app.draw_context

  if (clip == true) {
    // save/restoring draw state is expensive, so only use it
    // if clipping is required
    draw.save()
    try {
      draw.translate(x, y)
      draw.beginPath()
      draw.rect(0, 0, w, h)
      draw.clip()
      render(sys, outputs)
    }
    finally {
      draw.restore()
    }
  }
  else {
    const save = draw.getTransform()
    try {
      draw.translate(x, y)
      render(sys, outputs)
    }
    finally {
      draw.setTransform(save)
    }
  }
}

function _render_label(sys, { x, y, text, font_name, font_size, fill_color, stroke_color, text_align, text_baseline } = {}) {
  let restore_default_font = false  // assume we don't need to
  let draw = sys.app.draw_context

  draw.beginPath()
  draw.textAlign = text_align || 'center'
  draw.textBaseline = text_baseline || 'alphabetic'

  // don't change font if we don't need to
  if (font_size != null || font_name != null) {
    font_size ||= 14
    font_name ||= "serif"
    draw.font = `${font_size}pt ${font_name}`
    restore_default_font = true
  }

  if (fill_color != null) {
    draw.fillStyle = fill_color
    draw.fillText(text, x, y)
  }
  if (stroke_color != null) {
    draw.strokeStyle = stroke_color
    draw.strokeText(text, x, y)
  }

  if (restore_default_font) {
    draw.font = sys.fonts.default
  }
}

function _render_rectangle(sys, { x, y, w, h, fill_color, stroke_color } = {}) {
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

function _render_circle(sys, { x, y, radius, fill_color, stroke_color } = {}) {
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
function _render_tile(sys,
  { x, y, w, h, path, tile_w, tile_h, tile_rows, tile_cols, tile_index } = {}) {

  let draw = sys.app.draw_context
  let img = load_image(sys, path)

  if (img) {
    if (tile_w != null && tile_h != null) {
      // draw tile from tile sheet
      tile_cols = Math.trunc(img.width / tile_w)
    }
    else if (tile_rows != null && tile_cols != null) {
      // draw tile from tile sheet
      tile_w = Math.trunc(img.width / tile_cols)
      tile_h = Math.trunc(img.height / tile_rows)
    }
    else {
      // TODO - not sure what this does
      tile_w = w
      tile_h = h
    }
    let source_x = tile_index % tile_cols * tile_w
    let source_y = Math.trunc(tile_index / tile_cols) * tile_h
    w ||= tile_w
    h ||= tile_h

    draw.drawImage(img, source_x, source_y, tile_w, tile_h, x, y, w, h)
  }
}

// Render a single image, rendered
// - either as a whole sprite,
// - or as a portion of the image (via source_* parameters)
function _render_image(sys,
  { x, y, w, h, path, source_x, source_y, source_w, source_h } = {}) {

  let draw = sys.app.draw_context
  let img = load_image(sys, path)
  if (img) {
    w ||= source_w || img.width
    h ||= source_h || img.height
    source_x ||= 0
    source_y ||= 0
    source_w ||= img.width
    source_h ||= img.height

    draw.drawImage(img, source_x, source_y, source_w, source_h, x, y, w, h)
  }
}