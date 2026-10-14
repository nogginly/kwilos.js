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
   * Fetches and decodes a sound. Decoding needs no AudioContext, so sounds
   * can load before the user has interacted with the page.
   * @param {string} path
   * @returns {Promise<AudioBuffer>} Rejects when the sound fails to load or decode
   */
  load_sound: async function (path) {
    try {
      const response = await fetch(path)
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`)
      const decoder = new OfflineAudioContext(1, 1, 48000)
      return await decoder.decodeAudioData(await response.arrayBuffer())
    }
    catch (error) {
      throw new Error(`Kwilos: could not load sound ${path}`, { cause: error })
    }
  },
  /** @returns {AudioContext} */
  create_audio_context: function () {
    return new AudioContext()
  },
  /**
   * @param {string} path
   * @returns {HTMLAudioElement} Set to load `path`, with CORS, so that a track from another site plays, rather than silently, only if that site allows it
   */
  create_audio_element: function (path) {
    const element = new Audio()
    element.crossOrigin = 'anonymous'
    element.src = path
    return element
  },
  /** @returns {boolean} The user has clicked, tapped or pressed a key on the page */
  has_user_activation: function () {
    return navigator.userActivation?.hasBeenActive ?? false
  },
  /** @returns {boolean} */
  page_hidden: function () {
    return document.hidden
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
