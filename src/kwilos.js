/* Don't use sloppy JS. */ "use strict";

import { initialize_with_canvas } from "./kwilos/initialize";

export class Kwilos {
  // Private system information / state
  #system = {
    canvas: {
      width: 400,
      height: 400,
    },
    atlas: {},
    fonts: {
      default: "14pt serif"
    },
    args: {
      grid: {},
      state: {},
      outputs: [],
      inputs: {
        mouse: {
          x: 0,
          y: 0
        },
        key: {
          pressed: {},
        }
      }
    },
    app: {}
  }

  static async attach(canvas, tick, config = {}) {
    let kwilos = new Kwilos()

    await initialize_with_canvas(kwilos.#system, canvas, tick, config)

    return kwilos
  }
}