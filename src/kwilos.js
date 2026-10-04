/* Don't use sloppy JS. */ "use strict";

import { create_system, initialize_with_canvas } from "./kwilos/initialize";

export class Kwilos {
  #system = create_system()

  static async attach(canvas, tick, config = {}) {
    let kwilos = new Kwilos()

    await initialize_with_canvas(kwilos.#system, canvas, tick, config)

    return kwilos
  }
}