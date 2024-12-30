/* Don't use sloppy JS. */ "use strict";

// 1. Import and then attach an instance of Kwilos to your Canvas, 
// supplying a `tick` handler
// 
// 2. The `tick` handler will be repeatedly called 
// based on the HTML5 `requestAnimationFrame` schedule;
// The `env` parameter provides runtime state and helper functions.
// 
// 3. Use `env.inputs.mouse` to obtain mouse pointer info and
// position the text
//
// 4. Push entities into `env.outputs` and they will be drawn 
// when the `tick()` returns
//
// 5. Use the `label` type to specify a text entity.
// 

import { Kwilos } from "../../_dist/kwilos.mjs";

await Kwilos.attach(document.getElementById("00-canvas"), tick)

function tick(env) {
  env.outputs.push(
    {
      type: 'label', text: 'Hello, world!',
      x: env.inputs.mouse.x, y: env.inputs.mouse.y,
      font_size: 32, fill_color: 'lightblue', stroke_color: 'white'
    }
  )
}

