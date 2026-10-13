/* Don't use sloppy JS. */ "use strict";

// Browser Abstraction Layer :-)

/**
 * @typedef {object} EventMapping
 * @property {string} name Event name, e.g. "pointermove"
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
  /**
   * @param {EventMapping[]} event_mappings
   * @returns {() => void} Removes the listeners
   */
  add_document_event_listeners: function (event_mappings) {
    return _listen(document, event_mappings)
  },
  /**
   * @param {EventMapping[]} event_mappings
   * @returns {() => void} Removes the listeners
   */
  add_window_event_listeners: function (event_mappings) {
    return _listen(window, event_mappings)
  },
  /**
   * @param {HTMLElement} element
   * @param {EventMapping[]} event_mappings
   * @returns {() => void} Removes the listeners
   */
  add_event_listeners: function (element, event_mappings) {
    return _listen(element, event_mappings)
  },
  /**
   * Calls `handler` on every animation frame until stopped, or until it
   * throws.
   * @template T
   * @param {(ts: number, data: T) => void} handler
   * @param {T} data
   * @returns {() => void} Stops the calls, including from within `handler`
   */
  schedule_ticker(handler, data) {
    let frame_id = 0
    let stopped = false

    /** @param {number} ts */
    let game_loop = function (ts) {
      if (stopped)
        return
      handler(ts, data)
      if (!stopped)
        frame_id = window.requestAnimationFrame(game_loop)
    }
    frame_id = window.requestAnimationFrame(game_loop)

    return () => {
      stopped = true
      window.cancelAnimationFrame(frame_id)
    }
  }
}

/**
 * @param {EventTarget} target
 * @param {EventMapping[]} event_mappings
 * @returns {() => void} Removes the listeners
 */
function _listen(target, event_mappings) {
  for (const ev of event_mappings)
    target.addEventListener(ev.name, ev.handler)
  return () => {
    for (const ev of event_mappings)
      target.removeEventListener(ev.name, ev.handler)
  }
}
