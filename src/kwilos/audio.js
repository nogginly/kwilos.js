/* Don't use sloppy JS. */ "use strict";

import { BAL } from './bal.js'

/**
 * @import { System } from './types.js'
 */

// Sound effects and tracks. After each `tick`, Kwilos plays the sounds
// pushed to `env.sounds`, and brings what is playing in line with
// `env.tracks`.
//
// Browsers keep audio silent until the user clicks, taps or presses a
// key. Kwilos creates its AudioContext only once the app uses audio and
// the user has done so; until then sounds are dropped and tracks wait.
//
// A sound or track with `x` and `y` is placed on the canvas and heard from
// `env.listener`, as if by someone sitting in front of the screen facing
// it: the canvas is a wall, sounds are on it, and the listener's ears are
// half the canvas width in front of the point they listen at. Sounds off
// to the side pan smoothly towards that side, and every sound gets quieter
// with distance, falling silent at its `range`.

/**
 * A sound effect, played once from the start; push it to `env.sounds`.
 * @typedef {object} Sound
 * @property {'sound'} [type]
 * @property {string} path Audio file URL; preload it via the `preload_sounds` config, or it is not played
 * @property {number} [gain] Loudness; defaults to 1, its loudness as recorded
 * @property {number} [rate] Playback speed, which also changes the pitch; defaults to 1
 * @property {number} [pan] From -1, left, to 1, right; defaults to 0, centred; ignored when the sound has a position
 * @property {number} [x] Where the sound is, with `y`, in canvas coordinates; it is then heard from `env.listener`
 * @property {number} [y]
 * @property {number} [range] For a sound with a position: the distance from the listener at which it falls silent; defaults to the canvas width
 */

/**
 * A long sound, such as music or an ambient loop, kept in `env.tracks`
 * under a name of your choice. It plays while it is there: Kwilos starts
 * it when it appears, stops it when it is removed, and applies changes to
 * its properties as it plays. Setting a track with the same `path` again
 * leaves it playing.
 * @typedef {object} Track
 * @property {'track'} [type]
 * @property {string} path Audio file URL; tracks are streamed, so need no preloading
 * @property {number} [gain] Loudness; defaults to 1, its loudness as recorded
 * @property {number} [rate] Playback speed, which also changes the pitch, from 0.0625 to 16; defaults to 1
 * @property {number} [pan] From -1, left, to 1, right; defaults to 0, centred; ignored when the track has a position
 * @property {number} [x] Where the track is, with `y`, in canvas coordinates; it is then heard from `env.listener`, and moves as they change
 * @property {number} [y]
 * @property {number} [range] For a track with a position: the distance from the listener at which it falls silent; defaults to the canvas width
 * @property {boolean} [looping] Plays again from the start when it ends
 * @property {boolean} [paused] Pauses it, keeping its place
 * @property {boolean} [restart] Plays it again from the start; Kwilos sets it back to false once done, so set it on one frame only
 * @property {number} [time] Set by Kwilos: seconds played from the start
 * @property {boolean} [ended] Set by Kwilos: it played to its end without looping; setting `restart` plays it again
 */

/**
 * Where sounds with a position are heard from, in canvas coordinates.
 * @typedef {object} Listener
 * @property {number} x
 * @property {number} y
 */

/**
 * Kwilos's audio state, internal to it.
 * @typedef {object} Audio
 * @property {AudioContext | null} context Created once audio is used and the user has interacted with the page
 * @property {GainNode | null} master Applies `env.volume` to everything
 * @property {number} volume The volume `master` is set to
 * @property {boolean} wanted The app has preloaded sounds, or used sounds or tracks
 * @property {boolean} hidden The page is hidden and `background_audio` is not set, so tracks are paused
 * @property {Record<string, AudioBuffer | Promise<AudioBuffer>>} buffers Sounds by path, or their pending loads
 * @property {Set<string>} warned Paths already warned of as not preloaded
 * @property {Map<string, Playing>} playing Tracks by name
 * @property {Ears} ears Where the listener is, as of this frame
 * @property {boolean} listening The AudioContext's listener has been placed, so later moves glide
 */

/**
 * The listener, in canvas coordinates, and the distances that follow from
 * the canvas size.
 * @typedef {object} Ears
 * @property {number} x
 * @property {number} y
 * @property {number} depth How far in front of the canvas the ears are
 * @property {number} range The distance at which sounds fall silent, unless they give their own
 */

/**
 * The nodes a sound or track plays through: its gain, then its stereo
 * panner, then, when it has a position, a PannerNode placing it.
 * @typedef {object} Output
 * @property {GainNode} gain
 * @property {StereoPannerNode} panner
 * @property {PannerNode | null} spatial
 * @property {string} placed The position and range last set on `spatial`, to change them only when they change
 */

/**
 * @typedef {object} Playing
 * @property {string} path
 * @property {HTMLAudioElement} element
 * @property {MediaElementAudioSourceNode} source
 * @property {Output} output
 */

/** @param {Omit<Sound, 'type'>} props @returns {Sound} */
export const sound = (props) => ({ ...props, type: 'sound' })

/** @param {Omit<Track, 'type'>} props @returns {Track} */
export const track = (props) => ({ ...props, type: 'track' })

/** @returns {Audio} */
export function create_audio() {
  return {
    context: null,
    master: null,
    volume: 1,
    wanted: false,
    hidden: false,
    buffers: {},
    warned: new Set(),
    playing: new Map(),
    ears: { x: 0, y: 0, depth: 1, range: 1 },
    listening: false,
  }
}

/**
 * Loads the sounds to preload, and listens for the input that lets audio
 * play and, unless `background_audio` is set, for the page being hidden.
 * Rejects if a sound fails to load.
 * @param {System} sys
 * @param {string[] | undefined} paths
 * @returns {Promise<Array<() => void>>} Functions that stop the audio and remove the listeners
 */
export async function setup_audio(sys, paths) {
  const audio = sys.audio
  if (paths != null && paths.length > 0) {
    audio.wanted = true
    for (const path of paths)
      await _load_sound(audio, path)
  }

  const unlock = () => _unlock(audio)
  /** @type {Array<() => void>} */
  const undo = [
    BAL.add_document_event_listeners(
      ['pointerdown', 'pointerup', 'keydown', 'touchend'].map(name => ({ name, handler: unlock }))),
  ]
  if (!sys.app.config.background_audio)
    undo.push(BAL.add_document_event_listeners([
      { name: 'visibilitychange', handler: () => _page_visibility_changed(audio) },
    ]))
  undo.push(() => _close(audio))
  return undo
}

/**
 * Plays the sounds in `env.sounds`, sets the volume and the listener, and
 * starts, changes and stops tracks to match `env.tracks`. Throws a
 * TypeError for a sound or track without a path, or with only one of `x`
 * and `y`.
 * @param {System} sys
 */
export function update_audio(sys) {
  const env = sys.args
  const audio = sys.audio
  const sounds = Array.isArray(env.sounds) ? env.sounds : []
  const tracks = env.tracks ?? {}

  if (!audio.wanted && (sounds.some(Boolean) || Object.values(tracks).some(Boolean)))
    audio.wanted = true
  if (!audio.wanted)
    return
  if (audio.context == null && BAL.has_user_activation())
    _create_context(audio)

  _set_volume(audio, env.volume)
  _set_listener(audio, env.listener, sys.canvas)
  for (const one of sounds)
    if (one)
      _play_sound(audio, one)
  _update_tracks(audio, tracks)
}

/**
 * Creates the AudioContext, if wanted and not yet created, and resumes it.
 * Called from input handlers, as some browsers allow audio to start only
 * there.
 * @param {Audio} audio
 */
function _unlock(audio) {
  if (!audio.wanted || audio.hidden)
    return
  if (audio.context == null)
    _create_context(audio)
  else if (audio.context.state === 'suspended')
    audio.context.resume().catch(() => {})
}

/** @param {Audio} audio */
function _create_context(audio) {
  const context = BAL.create_audio_context()
  const master = context.createGain()
  master.gain.value = audio.volume
  master.connect(context.destination)
  audio.context = context
  audio.master = master
  audio.listening = false
  _orient_listener(context.listener)
}

// Faces the listener towards the canvas: forward is into the screen and up
// is up the screen, as is the default, but set in case a browser differs
/** @param {AudioListener} listener */
function _orient_listener(listener) {
  if (listener.forwardZ) {
    listener.forwardX.value = 0
    listener.forwardY.value = 0
    listener.forwardZ.value = -1
    listener.upX.value = 0
    listener.upY.value = 1
    listener.upZ.value = 0
  }
  else {
    listener.setOrientation(0, 0, -1, 0, 1, 0)
  }
}

// Works out where the listener is, by default the centre of the canvas, and
// moves the AudioContext's listener there, in front of the canvas. Canvas y
// grows downwards, so it is negated for the audio's y, which grows upwards.
/**
 * @param {Audio} audio
 * @param {Listener | null | undefined} wanted
 * @param {{ width: number, height: number }} canvas
 */
function _set_listener(audio, wanted, canvas) {
  const ears = audio.ears
  ears.x = _number(wanted?.x) ?? canvas.width / 2
  ears.y = _number(wanted?.y) ?? canvas.height / 2
  ears.depth = Math.max(1, canvas.width / 2)
  ears.range = Math.max(1, canvas.width)

  const context = audio.context
  if (context == null)
    return
  const listener = context.listener
  if (!listener.positionX) {
    listener.setPosition(ears.x, -ears.y, ears.depth)
  }
  else if (!audio.listening) {
    listener.positionX.value = ears.x
    listener.positionY.value = -ears.y
    listener.positionZ.value = ears.depth
  }
  else {
    _move(listener.positionX, ears.x, context)
    _move(listener.positionY, -ears.y, context)
    _move(listener.positionZ, ears.depth, context)
  }
  audio.listening = true
}

// Moves an AudioParam to a value over a few milliseconds, so that a moving
// sound or listener does not crackle
/**
 * @param {AudioParam} param
 * @param {number} value
 * @param {BaseAudioContext} context
 */
function _move(param, value, context) {
  param.setTargetAtTime(value, context.currentTime, 0.02)
}

/**
 * @param {Audio} audio
 * @param {unknown} volume
 */
function _set_volume(audio, volume) {
  const wanted = typeof volume === 'number' && Number.isFinite(volume) ? Math.max(0, volume) : 1
  if (wanted === audio.volume)
    return
  audio.volume = wanted
  if (audio.master)
    audio.master.gain.value = wanted
}

// Loads a sound once, caching the pending load so that later requests
// share it, then replacing it with the decoded sound
/**
 * @param {Audio} audio
 * @param {string} path
 * @returns {Promise<AudioBuffer>}
 */
function _load_sound(audio, path) {
  const cached = audio.buffers[path]
  if (cached)
    return Promise.resolve(cached)

  const loading = BAL.load_sound(path).then(buffer => (audio.buffers[path] = buffer))
  audio.buffers[path] = loading
  return loading
}

// Plays a loaded sound once. A sound not yet loaded is dropped, and one
// never asked for before is loaded, with a warning, so later plays work.
/**
 * @param {Audio} audio
 * @param {Sound} one
 */
function _play_sound(audio, one) {
  const path = _path_of(one, 'sound')
  const buffer = audio.buffers[path]
  if (buffer == null) {
    if (!audio.warned.has(path)) {
      audio.warned.add(path)
      console.warn(`Kwilos: sound ${path} was not in preload_sounds, so it was not played`)
    }
    _load_sound(audio, path).catch(error => console.error(error))
    return
  }
  const context = audio.context
  if (buffer instanceof Promise || context == null || context.state !== 'running')
    return

  const source = context.createBufferSource()
  source.buffer = buffer
  source.playbackRate.value = one.rate ?? 1
  const output = _output(audio, one, 'sound')
  source.connect(output.gain)
  source.addEventListener('ended', () => {
    source.disconnect()
    _disconnect(output)
  })
  source.start()
}

// Returns the nodes a sound or track plays through, connected to the master
// volume and set to its gain, pan and position
/**
 * @param {Audio} audio
 * @param {Sound | Track} one
 * @param {'sound' | 'track'} kind
 * @returns {Output}
 */
function _output(audio, one, kind) {
  const context = /** @type {AudioContext} */ (audio.context)
  const gain = context.createGain()
  const panner = context.createStereoPanner()
  gain.gain.value = one.gain ?? 1
  gain.connect(panner)
  /** @type {Output} */
  const output = { gain, panner, spatial: null, placed: '' }
  _place(audio, output, one, kind, false)
  return output
}

// Routes the output through a PannerNode while the sound or track has a
// position, placing it there, and straight to the master volume, with its
// `pan`, while it has none. Positions are moved smoothly when `smooth` is
// set, as for a track that moves.
/**
 * @param {Audio} audio
 * @param {Output} output
 * @param {Sound | Track} one
 * @param {'sound' | 'track'} kind
 * @param {boolean} smooth
 */
function _place(audio, output, one, kind, smooth) {
  const context = /** @type {AudioContext} */ (audio.context)
  const master = /** @type {GainNode} */ (audio.master)
  const place = _position_of(one, kind)

  if (place == null) {
    if (output.spatial || output.placed === '') {
      output.panner.disconnect()
      output.spatial?.disconnect()
      output.spatial = null
      output.panner.connect(master)
      output.placed = 'none'
    }
    const pan = _clamp(one.pan ?? 0, -1, 1)
    if (output.panner.pan.value !== pan)
      output.panner.pan.value = pan
    return
  }

  if (output.spatial == null) {
    output.panner.disconnect()
    output.panner.pan.value = 0
    output.spatial = _create_spatial(context)
    output.panner.connect(output.spatial)
    output.spatial.connect(master)
    output.placed = ''
    smooth = false
  }

  const range = Math.max(1, _number(one.range) ?? audio.ears.range)
  const placed = `${place.x},${place.y},${range},${audio.ears.depth}`
  if (placed === output.placed)
    return
  output.placed = placed

  const spatial = output.spatial
  spatial.refDistance = audio.ears.depth
  spatial.maxDistance = Math.hypot(range, audio.ears.depth)
  if (smooth) {
    _move(spatial.positionX, place.x, context)
    _move(spatial.positionY, -place.y, context)
  }
  else {
    spatial.positionX.value = place.x
    spatial.positionY.value = -place.y
  }
  spatial.positionZ.value = 0
}

// Returns a PannerNode that pans by direction and fades linearly with
// distance, from full at `refDistance` to silent at `maxDistance`
/** @param {AudioContext} context */
function _create_spatial(context) {
  const spatial = context.createPanner()
  spatial.panningModel = 'equalpower'
  spatial.distanceModel = 'linear'
  spatial.rolloffFactor = 1
  return spatial
}

/** @param {Output} output */
function _disconnect(output) {
  output.gain.disconnect()
  output.panner.disconnect()
  output.spatial?.disconnect()
}

// Returns where a sound or track is, or null when it has no position
/**
 * @param {Sound | Track} one
 * @param {'sound' | 'track'} kind
 * @returns {{ x: number, y: number } | null}
 */
function _position_of(one, kind) {
  if (one.x == null && one.y == null)
    return null
  const x = _number(one.x)
  const y = _number(one.y)
  if (x == null || y == null)
    throw new TypeError(`Kwilos: a ${kind} needs both x and y to be placed, got ${JSON.stringify(one)}`)
  return { x, y }
}

// Stops tracks that were removed or given another path, starts new ones
// once there is an AudioContext, then applies each track's properties
/**
 * @param {Audio} audio
 * @param {Record<string, Track | null | undefined>} tracks
 */
function _update_tracks(audio, tracks) {
  for (const [name, playing] of audio.playing) {
    const wanted = tracks[name]
    if (!wanted || wanted.path !== playing.path) {
      _stop(playing)
      audio.playing.delete(name)
    }
  }

  for (const name of Object.keys(tracks)) {
    const wanted = tracks[name]
    if (!wanted)
      continue
    const path = _path_of(wanted, 'track')
    let playing = audio.playing.get(name)
    if (playing == null) {
      if (audio.context == null) {
        wanted.restart = false
        wanted.time = 0
        wanted.ended = false
        continue
      }
      playing = _start(audio, path, wanted)
      audio.playing.set(name, playing)
    }
    else {
      _place(audio, playing.output, wanted, 'track', true)
    }
    _apply(playing, wanted, audio.hidden)
  }
}

/**
 * @param {Audio} audio
 * @param {string} path
 * @param {Track} wanted
 * @returns {Playing}
 */
function _start(audio, path, wanted) {
  const context = /** @type {AudioContext} */ (audio.context)
  const element = BAL.create_audio_element(path)
  element.preservesPitch = false
  element.addEventListener('error', () => console.error(new Error(`Kwilos: could not load track ${path}`)))
  const source = context.createMediaElementSource(element)
  const output = _output(audio, wanted, 'track')
  source.connect(output.gain)
  return { path, element, source, output }
}

// Applies a track's properties, other than its position, to it as it
// plays, then reports its time and whether it has ended
/**
 * @param {Playing} playing
 * @param {Track} wanted
 * @param {boolean} hidden
 */
function _apply(playing, wanted, hidden) {
  const element = playing.element

  element.loop = !!wanted.looping
  const rate = _clamp(wanted.rate ?? 1, 0.0625, 16)
  if (element.playbackRate !== rate)
    element.playbackRate = rate
  const gain = wanted.gain ?? 1
  if (playing.output.gain.gain.value !== gain)
    playing.output.gain.gain.value = gain

  if (wanted.restart) {
    element.currentTime = 0
    wanted.restart = false
  }

  const play = !wanted.paused && !hidden
  if (play && element.paused && !element.ended)
    element.play().catch(() => {})
  else if (!play && !element.paused)
    element.pause()

  wanted.time = element.currentTime
  wanted.ended = element.ended
}

/** @param {Playing} playing */
function _stop(playing) {
  playing.element.pause()
  playing.element.removeAttribute('src')
  playing.element.load()
  playing.source.disconnect()
  _disconnect(playing.output)
}

// Pauses tracks and suspends the AudioContext while the page is hidden;
// frames resume the tracks once it is visible again
/** @param {Audio} audio */
function _page_visibility_changed(audio) {
  audio.hidden = BAL.page_hidden()
  const context = audio.context
  if (context == null)
    return
  if (audio.hidden) {
    for (const playing of audio.playing.values())
      playing.element.pause()
    context.suspend().catch(() => {})
  }
  else {
    context.resume().catch(() => {})
  }
}

/** @param {Audio} audio */
function _close(audio) {
  for (const playing of audio.playing.values())
    _stop(playing)
  audio.playing.clear()
  audio.context?.close().catch(() => {})
  audio.context = null
  audio.master = null
  audio.wanted = false
}

/**
 * @param {Sound | Track} one
 * @param {'sound' | 'track'} kind
 * @returns {string}
 */
function _path_of(one, kind) {
  if (typeof one.path !== 'string')
    throw new TypeError(`Kwilos: a ${kind} needs a path, got ${JSON.stringify(one)}`)
  return one.path
}

// Returns the value if it is a finite number, else undefined
/**
 * @param {unknown} value
 * @returns {number | undefined}
 */
function _number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function _clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}
