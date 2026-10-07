/* Don't use sloppy JS. */ "use strict";

import { create_system, initialize_with_canvas } from "./kwilos/initialize.js";

export { circle, rect, label, image, tile, container } from "./kwilos/shapes.js";
export { contains } from "./kwilos/hits.js";

/**
 * @typedef {import("./kwilos/types.js").Tick} Tick
 * @typedef {import("./kwilos/types.js").Config} Config
 * @typedef {import("./kwilos/types.js").ErrorHandler} ErrorHandler
 * @typedef {import("./kwilos/types.js").Env} Env
 * @typedef {import("./kwilos/types.js").Inputs} Inputs
 * @typedef {import("./kwilos/types.js").Mouse} Mouse
 * @typedef {import("./kwilos/types.js").Keyboard} Keyboard
 * @typedef {import("./kwilos/types.js").KeyPress} KeyPress
 * @typedef {import("./kwilos/types.js").Point} Point
 * @typedef {import("./kwilos/types.js").Click} Click
 * @typedef {import("./kwilos/shapes.js").Scene} Scene
 * @typedef {import("./kwilos/shapes.js").Entity} Entity
 * @typedef {import("./kwilos/shapes.js").Circle} Circle
 * @typedef {import("./kwilos/shapes.js").Rect} Rect
 * @typedef {import("./kwilos/shapes.js").Label} Label
 * @typedef {import("./kwilos/shapes.js").Image} Image
 * @typedef {import("./kwilos/shapes.js").Tile} Tile
 * @typedef {import("./kwilos/shapes.js").Container} Container
 */

export class Kwilos {
  #system = create_system()

  /**
   * Attaches Kwilos to a canvas and starts calling `tick` on every frame.
   * @param {HTMLElement | string | null} canvas The canvas, or its element ID or a CSS selector; throws a TypeError if no canvas is found
   * @param {Tick} tick
   * @param {Config} [config]
   * @returns {Promise<Kwilos>} Resolves once preloaded images have loaded
   */
  static async attach(canvas, tick, config = {}) {
    let kwilos = new Kwilos()

    await initialize_with_canvas(kwilos.#system, canvas, tick, config)

    return kwilos
  }

  /**
   * Stops calling `tick` and stops listening for input. The canvas keeps
   * its last frame. Does nothing once detached.
   */
  detach() {
    this.#system.app.detach()
  }
}