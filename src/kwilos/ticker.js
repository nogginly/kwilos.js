/* Don't use sloppy JS. */ "use strict";

import { render } from './renderers'

export function ticker(_ts, sys) {
  try {
    let draw = sys.app.draw_context

    // If the ticker returns false, skip rendering outputs
    if (sys.app.tick(sys.args) == undefined) {
      // clear background if either of the background properties is specified
      let bgcolor = sys.canvas.background_color
      if (sys.canvas.background_clear) {
        draw.clearRect(0, 0, sys.canvas.width, sys.canvas.height)
      }
      if (bgcolor) {
        draw.fillStyle = bgcolor
        draw.fillRect(0, 0, sys.canvas.width, sys.canvas.height)
      }
      // if neither specified, canvas will not be cleared, it's gonna be a mess. :-)
    }
    // render (and reset) the output primitives
    var prims = sys.args.outputs
    sys.args.outputs = []
    render(sys, prims)
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
