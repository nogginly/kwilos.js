/* Don't use sloppy JS. */ "use strict";

import { render } from './renderers'

export function ticker(_ts, sys) {
  try {
    let draw = sys.app.draw_context

    // If the ticker returns false, skip rendering outputs
    if (sys.app.tick(sys.args) == undefined) {
      // clear background
      draw.fillStyle = sys.canvas.background_color
      draw.fillRect(0, 0, sys.canvas.width, sys.canvas.height)

      // render (and reset) the output primitives
      var prims = sys.args.outputs
      sys.args.outputs = []
      render(sys, prims)
    }
  }
  finally {
    // reset of end of frame state
    let mouse = sys.args.inputs.mouse
    mouse.moved = false
    mouse.previous_x = mouse.x
    mouse.previous_y = mouse.y
    let key = sys.args.inputs.key
    delete key.typed
  }
}
