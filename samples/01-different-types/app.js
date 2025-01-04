/* Don't use sloppy JS. */ "use strict";

// 1. Import Kwilos
// 
// 2. Use a `config` object to set defaults and pre-load images when
//    attaching `Kwilos` to your canvas using selector
// 
// 3. Push a different types of renderables to be drawn at the end of 
//    each tick:
//      - 'circle`
//      - 'rect`
//      - 'image`
//      - 'tile`
//      - 'label`
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
  env.outputs.push(
    // whole image
    { type: 'image', x: 10, y: 10, path: BG_DESERT },
    { // extract portion of image
      type: 'image', path: BG_DESERT, x: 20, y: 20,
      source_x: 283, source_y: 223, source_w: 140, source_h: 120,
    },
    { type: 'rect', x: 10 + 283, y: 10 + 223, w: 140, h: 120, stroke_color: 'red' },
    { // render tile from sprite sheet defined using tile size
      type: 'tile', x: 10, y: 220, path: FEM_TILESHEET,
      tile_w: 80, tile_h: 110, tile_index: 3,
    },
    {
      type: 'label', x: 300, y: 200, text: 'Hello, world!',
      font_size: 32, fill_color: 'blue',
    },
    { type: 'circle', x: 50, y: 560, radius: 25, fill_color: 'red' },
    { type: 'circle', x: 150, y: 560, radius: 25, stroke_color: 'red' },
    { type: 'rect', x: 250, y: 560 - 25, w: 100, h: 50, fill_color: 'red' },
  )
  // render some tiles from a tilesheet defined using rows and cols
  for (let i = 3; i < 8; i++) {
    env.outputs.push({
      type: 'tile', x: ((i - 2) * 70), y: 370, path: FEM_TILESHEET,
      tile_cols: 9, tile_rows: 3, tile_index: i * 2,
    },
    )
  }
}

