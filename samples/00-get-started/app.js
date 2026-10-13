/* Don't use sloppy JS. */ "use strict";

// 1. Import and then attach an instance of Kwilos to your Canvas, 
// by providing element ID, and supplying a `tick` handler
// 
// 2. The `tick` handler will be repeatedly called 
// based on the HTML5 `requestAnimationFrame` schedule;
// The `env` parameter provides runtime state and helper functions.
// 
// 3. Use `env.inputs.mouse` to obtain mouse pointer info and
// position the text; until the mouse has moved over the canvas, the
// text waits in the middle. `env.state` keeps data between calls.
//
// 4. Return an array of entities from `tick` and they will be drawn
// after it returns
//
// 5. Use the `label` factory to create a text entity.
// 

import { Kwilos, label } from "../../src/kwilos.js";

/** @import { Env } from "../../src/kwilos.js" */

await Kwilos.attach("00-canvas", tick)

/** @param {Env} env */
function tick(env) {
  const { mouse } = env.inputs
  env.state.mouse_seen ||= mouse.moved

  return [
    label({
      text: 'Hello, world!',
      x: env.state.mouse_seen ? mouse.x : 200,
      y: env.state.mouse_seen ? mouse.y : 200,
      font_size: 32, fill_color: 'lightblue', stroke_color: 'white'
    })
  ]
}

