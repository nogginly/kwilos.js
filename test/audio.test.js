import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sound, track, setup_audio } from '../src/kwilos/audio.js'
import { ticker } from '../src/kwilos/ticker.js'
import { BAL } from '../src/kwilos/bal.js'
import { attached_system } from './support/system.js'

// Audio nodes that record what they are connected to
function node(kind, props = {}) {
  return { kind, connected: [], connect(to) { this.connected.push(to); return to }, disconnect: vi.fn(), ...props }
}

// An AudioParam whose gliding changes take effect at once
function param(value) {
  return { value, setTargetAtTime: vi.fn(function (to) { this.value = to }) }
}

class FakeContext {
  state = 'running'
  currentTime = 0
  destination = node('destination')
  listener = {
    positionX: param(0), positionY: param(0), positionZ: param(0),
    forwardX: param(0), forwardY: param(0), forwardZ: param(-1),
    upX: param(0), upY: param(1), upZ: param(0),
  }
  sources = []
  spatials = []
  createGain() { return node('gain', { gain: { value: 1 } }) }
  createStereoPanner() { return node('panner', { pan: { value: 0 } }) }
  createPanner() {
    const spatial = node('spatial', { positionX: param(0), positionY: param(0), positionZ: param(0) })
    this.spatials.push(spatial)
    return spatial
  }
  createBufferSource() {
    const source = node('buffer', { buffer: null, playbackRate: { value: 1 }, start: vi.fn(), addEventListener() {} })
    this.sources.push(source)
    return source
  }
  createMediaElementSource(element) { return node('media', { element }) }
  resume = vi.fn(async () => { this.state = 'running' })
  suspend = vi.fn(async () => { this.state = 'suspended' })
  close = vi.fn(async () => { this.state = 'closed' })
}

// An audio element; setting `src` starts the new song from its beginning,
// paused, as browsers do
function fake_element(path) {
  return {
    song: path, paused: true, ended: false, currentTime: 0, duration: NaN, loop: false, playbackRate: 1,
    listeners: {},
    get src() { return this.song },
    set src(path) { Object.assign(this, { song: path, paused: true, ended: false, currentTime: 0 }) },
    play: vi.fn(function () { this.paused = false; return Promise.resolve() }),
    pause: vi.fn(function () { this.paused = true }),
    addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler) },
    removeAttribute: vi.fn(), load: vi.fn(),
  }
}

// Plays a song to its end, as the browser would
function finish(element) {
  Object.assign(element, { ended: true, paused: true })
  for (const handler of element.listeners.ended ?? [])
    handler()
}

// The fakes behind BAL, and the document listeners Kwilos adds
let contexts, elements, listeners, activated, hidden

beforeEach(() => {
  contexts = []
  elements = []
  listeners = {}
  activated = true
  hidden = false
  vi.spyOn(BAL, 'create_audio_context').mockImplementation(() => {
    const context = new FakeContext()
    contexts.push(context)
    return context
  })
  vi.spyOn(BAL, 'create_audio_element').mockImplementation(path => {
    const element = fake_element(path)
    elements.push(element)
    return element
  })
  vi.spyOn(BAL, 'load_sound').mockImplementation(async path => ({ path }))
  vi.spyOn(BAL, 'has_user_activation').mockImplementation(() => activated)
  vi.spyOn(BAL, 'page_hidden').mockImplementation(() => hidden)
  vi.spyOn(BAL, 'add_document_event_listeners').mockImplementation(mappings => {
    for (const { name, handler } of mappings)
      listeners[name] = handler
    return () => {}
  })
})

afterEach(() => vi.restoreAllMocks())

// Returns a system whose `tick` runs `each(env)` and returns an empty
// scene, with audio set up as `attach` would
async function audio_system(each, config = {}) {
  const sys = attached_system({ tick: (env) => (each(env), []), config })
  const undo = await setup_audio(sys, config.preload_sounds)
  return { sys, detach: () => undo.forEach(one => one()), frame: () => ticker(0, sys) }
}

// The gain and panner a sound or track plays through
function output(source) {
  const gain = source.connected[0]
  return { gain: gain.gain.value, pan: gain.connected[0].pan.value }
}

describe('sound and track', () => {
  it('return plain objects tagged with their type', () => {
    expect(sound({ path: 'coin.mp3', gain: 1.5 })).toEqual({ type: 'sound', path: 'coin.mp3', gain: 1.5 })
    expect(track({ path: 'theme.mp3', looping: true })).toEqual({ type: 'track', path: 'theme.mp3', looping: true })
  })
})

describe('audio', () => {
  it('creates no AudioContext for an app that uses no audio', async () => {
    const { frame } = await audio_system(() => {})
    frame()
    frame()
    expect(contexts).toHaveLength(0)
  })

  it('creates the AudioContext only once the user has interacted with the page', async () => {
    activated = false
    const { frame } = await audio_system(env => { env.tracks.music = track({ path: 'theme.mp3' }) })

    frame()
    expect(contexts).toHaveLength(0)

    activated = true
    frame()
    expect(contexts).toHaveLength(1)
    expect(elements).toHaveLength(1)
  })

  it('creates the AudioContext from an input handler when audio is wanted', async () => {
    activated = false
    await audio_system(() => {}, { preload_sounds: ['coin.mp3'] })

    listeners.pointerdown()
    expect(contexts).toHaveLength(1)

    contexts[0].state = 'suspended'
    listeners.keydown()
    expect(contexts[0].resume).toHaveBeenCalled()
  })

  it('does not create an AudioContext on input for an app that uses no audio', async () => {
    await audio_system(() => {})
    listeners.pointerdown()
    expect(contexts).toHaveLength(0)
  })
})

describe('sounds', () => {
  it('plays a preloaded sound with its gain, rate and pan, then empties env.sounds', async () => {
    let env_seen
    const { frame } = await audio_system(env => {
      env_seen = env
      env.sounds.push(sound({ path: 'coin.mp3', gain: 1.5, rate: 2, pan: -0.5 }))
    }, { preload_sounds: ['coin.mp3'] })

    frame()

    const [source] = contexts[0].sources
    expect(source.buffer).toEqual({ path: 'coin.mp3' })
    expect(source.playbackRate.value).toBe(2)
    expect(output(source)).toEqual({ gain: 1.5, pan: -0.5 })
    expect(source.start).toHaveBeenCalled()
    expect(env_seen.sounds).toEqual([])
  })

  it('skips false, null and undefined entries', async () => {
    const { frame } = await audio_system(env => env.sounds.push(false, null, sound({ path: 'coin.mp3' })),
      { preload_sounds: ['coin.mp3'] })
    frame()
    expect(contexts[0].sources).toHaveLength(1)
  })

  it('drops a sound while audio is not allowed to play', async () => {
    const { frame } = await audio_system(env => env.sounds.push(sound({ path: 'coin.mp3' })),
      { preload_sounds: ['coin.mp3'] })
    listeners.pointerdown()
    contexts[0].state = 'suspended'

    frame()
    expect(contexts[0].sources).toHaveLength(0)
  })

  it('drops a sound that was not preloaded, warning once, and loads it for later', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { sys, frame } = await audio_system(env => env.sounds.push(sound({ path: 'late.mp3' })))

    frame()
    frame()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('Kwilos: sound late.mp3 was not in preload_sounds, so it was not played')
    expect(BAL.load_sound).toHaveBeenCalledTimes(1)
    expect(contexts[0].sources).toHaveLength(0)

    await sys.audio.buffers['late.mp3']
    frame()
    expect(contexts[0].sources).toHaveLength(1)
  })

  it('throws a TypeError for a sound without a path', async () => {
    const { frame } = await audio_system(env => env.sounds.push({ gain: 1 }))
    expect(frame).toThrow(new TypeError('Kwilos: a sound needs a path, got {"gain":1}'))
  })

  it('rejects when a preloaded sound fails to load', async () => {
    BAL.load_sound.mockRejectedValue(new Error('Kwilos: could not load sound missing.mp3'))
    await expect(audio_system(() => {}, { preload_sounds: ['missing.mp3'] }))
      .rejects.toThrow('Kwilos: could not load sound missing.mp3')
  })
})

describe('tracks', () => {
  it('starts a track and leaves it playing when it is set again each frame', async () => {
    const { frame } = await audio_system(env => {
      env.tracks.music = track({ path: 'theme.mp3', looping: true, gain: 0.6 })
    })
    frame()
    frame()
    frame()

    expect(elements).toHaveLength(1)
    const [element] = elements
    expect(element.src).toBe('theme.mp3')
    expect(element.loop).toBe(true)
    expect(element.play).toHaveBeenCalledTimes(1)
  })

  it('applies changes to gain, pan and rate as the track plays', async () => {
    let gain = 1
    const { sys, frame } = await audio_system(env => {
      env.tracks.music = track({ path: 'theme.mp3', gain, pan: gain - 1, rate: gain * 100 })
    })
    frame()
    gain = 0.5
    frame()

    const { output } = sys.audio.playing.get('music')
    expect(output.gain.gain.value).toBe(0.5)
    expect(output.panner.pan.value).toBe(-0.5)
    expect(elements[0].playbackRate).toBe(16)
  })

  it('stops a track that is removed, and replaces one whose path changes', async () => {
    let tracks = { music: track({ path: 'a.mp3' }), wind: track({ path: 'wind.mp3' }) }
    const { sys, frame } = await audio_system(env => { env.tracks = tracks })
    frame()
    const [a, wind] = elements

    tracks = { music: track({ path: 'b.mp3' }) }
    frame()

    expect(a.pause).toHaveBeenCalled()
    expect(wind.pause).toHaveBeenCalled()
    expect(elements.map(element => element.src)).toEqual(['a.mp3', 'wind.mp3', 'b.mp3'])
    expect([...sys.audio.playing.keys()]).toEqual(['music'])
  })

  it('pauses and resumes a track with paused', async () => {
    let paused = false
    const { frame } = await audio_system(env => { env.tracks.music = track({ path: 'theme.mp3', paused }) })
    frame()
    paused = true
    frame()
    expect(elements[0].paused).toBe(true)

    paused = false
    frame()
    expect(elements[0].paused).toBe(false)
    expect(elements[0].play).toHaveBeenCalledTimes(2)
  })

  it('restarts a track from the start, once, with restart', async () => {
    let env_seen
    const { frame } = await audio_system(env => {
      env_seen = env
      env.tracks.music ??= track({ path: 'theme.mp3' })
    })
    frame()
    elements[0].currentTime = 12

    env_seen.tracks.music.restart = true
    frame()
    expect(elements[0].currentTime).toBe(0)
    expect(env_seen.tracks.music.restart).toBe(false)
  })

  it('reports how far a track has played, and whether it has ended', async () => {
    let env_seen
    const { frame } = await audio_system(env => {
      env_seen = env
      env.tracks.music ??= track({ path: 'theme.mp3' })
    })
    frame()
    Object.assign(elements[0], { currentTime: 3.5, ended: true, paused: true })
    frame()

    expect(env_seen.tracks.music.time).toBe(3.5)
    expect(env_seen.tracks.music.ended).toBe(true)
    expect(elements[0].play).toHaveBeenCalledTimes(1)
  })

  it('throws a TypeError for a track without a path', async () => {
    const { frame } = await audio_system(env => { env.tracks.music = {} })
    expect(frame).toThrow(new TypeError('Kwilos: a track needs a path or paths, but not both, got {}'))
  })

  it('pauses tracks while the page is hidden', async () => {
    const { frame } = await audio_system(env => { env.tracks.music = track({ path: 'theme.mp3' }) })
    frame()

    hidden = true
    listeners.visibilitychange()
    expect(elements[0].paused).toBe(true)
    expect(contexts[0].suspend).toHaveBeenCalled()

    hidden = false
    listeners.visibilitychange()
    frame()
    expect(elements[0].paused).toBe(false)
  })

  it('keeps tracks playing while the page is hidden, with background_audio', async () => {
    await audio_system(() => {}, { background_audio: true })
    expect(listeners.visibilitychange).toBeUndefined()
  })
})

describe('playlists', () => {
  // Returns a system whose `tick` keeps one track, made once from `props`,
  // and records it
  async function playlist(props) {
    const seen = {}
    const run = await audio_system(env => {
      seen.music = env.tracks.music ??= track(props)
    })
    run.frame()
    return { ...run, music: () => seen.music, element: () => elements.at(-1) }
  }

  it('plays its songs in turn, moving on as each ends, without waiting for a frame', async () => {
    const { music, element } = await playlist({ paths: ['a.mp3', 'b.mp3', 'c.mp3'] })
    expect(element().src).toBe('a.mp3')
    expect(element().loop).toBe(false)
    expect(music().index).toBe(0)

    finish(element())
    expect(element().src).toBe('b.mp3')
    expect(element().paused).toBe(false)
    expect(music().index).toBe(1)
    expect(elements).toHaveLength(1)
  })

  it('ends after its last song, or goes back to the first when looping', async () => {
    const once = await playlist({ paths: ['a.mp3', 'b.mp3'] })
    finish(once.element())
    finish(once.element())
    once.frame()
    expect(once.element().src).toBe('b.mp3')
    expect(once.music().ended).toBe(true)

    const again = await playlist({ paths: ['a.mp3', 'b.mp3'], looping: true })
    finish(again.element())
    finish(again.element())
    again.frame()
    expect(again.element().src).toBe('a.mp3')
    expect(again.music().ended).toBe(false)
  })

  it('jumps to the song its index is set to', async () => {
    const { music, element, frame } = await playlist({ paths: ['a.mp3', 'b.mp3', 'c.mp3'] })
    element().currentTime = 30
    music().index = 2
    frame()
    expect(element().src).toBe('c.mp3')
    expect(element().currentTime).toBe(0)
    expect(element().paused).toBe(false)

    music().index += 1
    frame()
    expect(music().ended).toBe(true)
    expect(element().paused).toBe(true)
  })

  it('wraps an index past either end round when looping', async () => {
    const { music, element, frame } = await playlist({ paths: ['a.mp3', 'b.mp3', 'c.mp3'], looping: true })
    music().index = -1
    frame()
    expect(element().src).toBe('c.mp3')
    expect(music().index).toBe(2)

    music().index += 1
    frame()
    expect(element().src).toBe('a.mp3')
    expect(music().index).toBe(0)
  })

  it('starts at the song its index gives', async () => {
    const { element } = await playlist({ paths: ['a.mp3', 'b.mp3'], index: 1 })
    expect(element().src).toBe('b.mp3')
  })

  it('restarts from its first song', async () => {
    const { music, element, frame } = await playlist({ paths: ['a.mp3', 'b.mp3'] })
    finish(element())
    music().restart = true
    frame()
    expect(element().src).toBe('a.mp3')
    expect(music().index).toBe(0)
  })

  it('keeps the song playing when the list changes around it', async () => {
    const { music, element, frame } = await playlist({ paths: ['a.mp3', 'b.mp3'] })
    finish(element())
    element().currentTime = 12
    music().paths = ['b.mp3', 'c.mp3', 'd.mp3']
    frame()

    expect(elements).toHaveLength(1)
    expect(element().src).toBe('b.mp3')
    expect(element().currentTime).toBe(12)
    expect(music().index).toBe(0)
    frame()
    expect(element().src).toBe('b.mp3')
  })

  it('starts the new list from its first song when the song playing is no longer in it', async () => {
    const { music, element, frame } = await playlist({ paths: ['a.mp3', 'b.mp3'] })
    music().paths = ['x.mp3', 'y.mp3']
    frame()
    expect(elements).toHaveLength(2)
    expect(element().src).toBe('x.mp3')
    expect(music().index).toBe(0)
  })

  it('reports the length of the song, or 0 until it is known', async () => {
    const { music, element, frame } = await playlist({ path: 'theme.mp3' })
    expect(music().duration).toBe(0)
    element().duration = 42.5
    frame()
    expect(music().duration).toBe(42.5)
  })

  it('throws a TypeError for a track with both path and paths, or no songs in paths', async () => {
    const both = await audio_system(env => { env.tracks.music = { path: 'a.mp3', paths: ['b.mp3'] } })
    expect(both.frame).toThrow(/a track needs a path or paths, but not both/)
    const none = await audio_system(env => { env.tracks.music = { paths: [] } })
    expect(none.frame).toThrow(/a track's paths must be a list of one or more paths/)
  })
})

describe('positions', () => {
  // The fake canvas is 100 by 80, so the listener defaults to (50, 40), its
  // ears are 50 in front of the canvas, and sounds fall silent at 100

  it('places a sound with x and y, heard from the centre of the canvas by default', async () => {
    const { sys, frame } = await audio_system(env => env.sounds.push(sound({ path: 'chirp.wav', x: 20, y: 30, pan: 1 })),
      { preload_sounds: ['chirp.wav'] })
    frame()

    const [context] = contexts
    const [spatial] = context.spatials
    const panner = context.sources[0].connected[0].connected[0]
    expect(panner.connected).toEqual([spatial])
    expect(panner.pan.value).toBe(0)
    expect(spatial.connected).toEqual([sys.audio.master])
    expect([spatial.positionX.value, spatial.positionY.value, spatial.positionZ.value]).toEqual([20, -30, 0])
    expect(spatial.panningModel).toBe('equalpower')
    expect(spatial.distanceModel).toBe('linear')
    expect(spatial.refDistance).toBe(50)
    expect(spatial.maxDistance).toBe(Math.hypot(100, 50))
    const { listener } = context
    expect([listener.positionX.value, listener.positionY.value, listener.positionZ.value]).toEqual([50, -40, 50])
  })

  it('plays a sound without a position through no PannerNode', async () => {
    const { frame } = await audio_system(env => env.sounds.push(sound({ path: 'coin.mp3', pan: 0.5 })),
      { preload_sounds: ['coin.mp3'] })
    frame()
    expect(contexts[0].spatials).toHaveLength(0)
    expect(output(contexts[0].sources[0]).pan).toBe(0.5)
  })

  it('uses a sound\'s own range', async () => {
    const { frame } = await audio_system(env => env.sounds.push(sound({ path: 'chirp.wav', x: 0, y: 0, range: 300 })),
      { preload_sounds: ['chirp.wav'] })
    frame()
    expect(contexts[0].spatials[0].maxDistance).toBe(Math.hypot(300, 50))
  })

  it('moves the listener to env.listener, gliding after it is first placed', async () => {
    let listener = { x: 10, y: 20 }
    const { frame } = await audio_system(env => {
      env.listener = listener
      env.tracks.bee = track({ path: 'buzz.wav', x: 0, y: 0 })
    })
    frame()
    const { positionX, positionY } = contexts[0].listener
    expect([positionX.value, positionY.value]).toEqual([10, -20])
    expect(positionX.setTargetAtTime).not.toHaveBeenCalled()

    listener = { x: 60, y: 70 }
    frame()
    expect(positionX.setTargetAtTime).toHaveBeenCalledWith(60, 0, 0.02)
    expect(positionY.setTargetAtTime).toHaveBeenCalledWith(-70, 0, 0.02)
  })

  it('moves a track smoothly as its position changes, and only then', async () => {
    let x = 10
    const { frame } = await audio_system(env => { env.tracks.bee = track({ path: 'buzz.wav', x, y: 5 }) })
    frame()
    const [spatial] = contexts[0].spatials
    expect(spatial.positionX.value).toBe(10)

    frame()
    expect(spatial.positionX.setTargetAtTime).not.toHaveBeenCalled()

    x = 90
    frame()
    expect(spatial.positionX.setTargetAtTime).toHaveBeenCalledWith(90, 0, 0.02)
    expect(contexts[0].spatials).toHaveLength(1)
  })

  it('routes a track through a PannerNode only while it has a position', async () => {
    let placed = true
    const { sys, frame } = await audio_system(env => {
      env.tracks.bee = placed
        ? track({ path: 'buzz.wav', x: 1, y: 2 })
        : track({ path: 'buzz.wav', pan: -1 })
    })
    frame()
    const out = sys.audio.playing.get('bee').output
    expect(out.spatial).not.toBeNull()

    placed = false
    frame()
    expect(out.spatial).toBeNull()
    expect(out.panner.connected.at(-1)).toBe(sys.audio.master)
    expect(out.panner.pan.value).toBe(-1)
    expect(elements).toHaveLength(1)
  })

  it('throws a TypeError for a sound with only one of x and y', async () => {
    const { frame } = await audio_system(env => env.sounds.push(sound({ path: 'chirp.wav', x: 3 })),
      { preload_sounds: ['chirp.wav'] })
    expect(frame).toThrow(new TypeError('Kwilos: a sound needs both x and y to be placed, got {"path":"chirp.wav","x":3,"type":"sound"}'))
  })
})

describe('volume and detaching', () => {
  it('scales everything by env.volume, treating anything but a number as 1', async () => {
    let volume = 0.25
    const { sys, frame } = await audio_system(env => {
      env.volume = volume
      env.tracks.music = track({ path: 'theme.mp3' })
    })
    frame()
    expect(sys.audio.master.gain.value).toBe(0.25)

    volume = 'loud'
    frame()
    expect(sys.audio.master.gain.value).toBe(1)
  })

  it('stops tracks and closes the AudioContext on detach', async () => {
    const { frame, detach } = await audio_system(env => { env.tracks.music = track({ path: 'theme.mp3' }) })
    frame()
    detach()

    expect(elements[0].pause).toHaveBeenCalled()
    expect(contexts[0].close).toHaveBeenCalled()
  })
})
