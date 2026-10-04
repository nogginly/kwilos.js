/* Don't use sloppy JS. */ "use strict";

// Browser Abstraction Layer :-)

/**
 * @typedef {object} EventMapping
 * @property {string} name Event name, e.g. "mousemove"
 * @property {(ev: any) => void} handler
 */

export const BAL = {
  /**
   * @param {string} path
   * @returns {Promise<HTMLImageElement>} Rejects when the image fails to load
   */
  create_image: function (path) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Kwilos: could not load image ${path}`))
      img.src = path
    })
  },
  /** @param {EventMapping[]} event_mappings */
  add_document_event_listeners: function (event_mappings) {
    for (const ev of event_mappings) {
      document.addEventListener(ev.name, ev.handler)
    }
  },
  /**
   * @param {HTMLElement} element
   * @param {EventMapping[]} event_mappings
   */
  add_event_listeners: function (element, event_mappings) {
    for (const ev of event_mappings) {
      element.addEventListener(ev.name, ev.handler)
    }
  },
  /**
   * Calls `handler` on every animation frame, until it throws.
   * @template T
   * @param {(ts: number, data: T) => void} handler
   * @param {T} data
   */
  schedule_ticker(handler, data) {
    /** @param {number} ts */
    let game_loop = function (ts) {
      handler(ts, data)
      window.requestAnimationFrame(game_loop);
    }
    window.requestAnimationFrame(game_loop)
  }
}
