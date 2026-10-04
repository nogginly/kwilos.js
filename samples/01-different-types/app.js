/* Don't use sloppy JS. */ "use strict";

// 1. Import Kwilos
//
// 2. Use a `config` object to set defaults and pre-load images when
//    attaching `Kwilos` to your canvas using selector
//
// 3. Return the different types of renderables to be drawn at the
//    end of each tick:
//      - 'circle`
//      - 'rect`
//      - 'image`
//      - 'tile`
//      - 'label`
//
// 4. Return `null` once the scene is drawn to leave the canvas as it is,
//    since nothing in this scene changes
//

import { Kwilos } from "../../_dist/kwilos.mjs";

const BG_DESERT = 'assets/backgroundColorDesert.png'
const FEM_TILESHEET = 'assets/female_tilesheet.png'

let app = {
  config: {
    // some Kwilos config properties
    background_color: 'yellow',
    preload_images: [
      BG_DESERT,
      FEM_TILESHEET
    ]
  }
}

await Kwilos.attach("#canvas-01", tick, app.config)

// The engine calls `tick` every frame at some frame-rate
function tick(env) {
  if (env.state.drawn)
    return null
  env.state.drawn = true

  return [
    // whole image
    { x: 10, y: 10, path: BG_DESERT },
    { // extract portion of image
      path: BG_DESERT, x: 20, y: 20,
      source_x: 283, source_y: 223, source_w: 140, source_h: 120,
    },
    { x: 10 + 283, y: 10 + 223, w: 140, h: 120, stroke_color: 'red' },
    { // render tile from sprite sheet defined using tile size
      x: 10, y: 220, path: FEM_TILESHEET,
      tile_w: 80, tile_h: 110, tile_index: 3,
    },
    {
      x: 300, y: 200, text: 'Hello, world!',
      font_size: 32, fill_color: 'blue',
    },
    { x: 50, y: 560, radius: 25, fill_color: 'red' },
    { x: 150, y: 560, radius: 25, stroke_color: 'red' },
    { x: 250, y: 560 - 25, w: 100, h: 50, fill_color: 'red' },
    // render some tiles from a tilesheet defined using rows and cols;
    // nested arrays are drawn in place
    [3, 4, 5, 6, 7].map(i => ({
      x: ((i - 2) * 70), y: 370, path: FEM_TILESHEET,
      tile_cols: 9, tile_rows: 3, tile_index: i * 2,
    })),
  ]
}
