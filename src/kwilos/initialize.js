/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal'
import { setup_event_handlers } from './event_handlers';
import { ticker } from './ticker';

// 
// Intentionally keeping this procedural, using OOP with WGTK class to
// encapsulate the system information / state per canvas
// 
export async function initialize_with_canvas(system, canvas, tick, config) {
  let app = system.app

  app.canvas = canvas
  app.config = config
  app.tick = tick

  system.canvas.background_color = config.background_color || 'black'
  system.canvas.width = canvas.width
  system.canvas.height = canvas.height

  if (typeof config.font == 'string')
    system.fonts.default = config.font

  app.draw_context = canvas.getContext('2d')
  app.draw_context.font = system.fonts.default

  await _preload_images(system, config.preload_images)
  setup_event_handlers(system, canvas)

  BAL.schedule_ticker(ticker, system)
}

// Intentionally separating async and immediate image loading 
// so that image rendering is immediate; otherwise the image/tile
// renderers have to be async which causes image drawing to 
// occur out of order with the output list
// 
async function _preload_images(system, paths) {
  if (paths != null) {
    for (const p of paths) {
      await _preload_image(system, p)
    }
  }
}
// 
// Separate async preloader
async function _preload_image(sys, path) {
  return (sys.atlas[path] ||= await BAL.create_image(path))
}

// 
// Immediate (non async) load image from a path, caching images in an atlas to avoid reloading them
export function load_image(sys, path) {
  let image = sys.atlas[path]
  if (image == null) {
    _preload_image(sys, path)  // this will run async
  }
  return image
}
