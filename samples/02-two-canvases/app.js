/* Don't use sloppy JS. */ "use strict";

// 1. Import and then attach an instance of Kwilos to each Canvas, 
// supplying a `respective tick` handler
// 
// 2. The `tick` handlers will be repeatedly called 
// based on the HTML5 `requestAnimationFrame` schedule;
// The `env` parameter provides runtime state and helper functions.
// 
// 3. Use `env.inputs.mouse` to obtain mouse pointer info and
// position the text; note how upper canvas will block mouse events
// to the canvas underneath where they overlap
//

import { Kwilos } from "../../_dist/kwilos.mjs";

let app = {
  config_under: {
    // some Kwilos config properties
    background_color: 'yellow',
  },
  config_over: {
    // some Kwilos config properties
    background_clear: true,
    background_color: 'rgba(120, 255, 120, 0.25)',
  }
}

await Kwilos.attach(
  document.getElementById("under-canvas-02"),
  tick_under, app.config_under)

function tick_under(env) {
  env.outputs.push(
    {
      type: 'label', text: 'Hello, Underworld!',
      x: env.inputs.mouse.x, y: env.inputs.mouse.y,
      font_size: 32, fill_color: 'purple', stroke_color: 'white'
    }
  )
}

await Kwilos.attach(
  document.getElementById("over-canvas-02"),
  tick_over, app.config_over)

function tick_over(env) {
  env.outputs.push(
    {
      type: 'label', text: 'Hello, Overworld!',
      x: env.inputs.mouse.x, y: env.inputs.mouse.y,
      font_size: 32, fill_color: 'blue', stroke_color: 'white'
    }
  )
}

