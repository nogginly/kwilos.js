/* Don't use sloppy JS. */ "use strict";

// 1. A track with `paths` plays its songs in turn; with `looping`, it goes
//    back to the first after the last. Kwilos moves on by itself when a
//    song ends, so the track is made once, with `??=`, and kept.
//
// 2. `index` is the song playing, kept up to date by Kwilos. Set it to
//    another song to play that one: Previous and Next add or take one,
//    and clicking a song sets it outright.
//
// 3. `time` and `duration` give the progress bar.
//
// 4. `background_audio` keeps the music playing while the page is hidden.
//    Switch to another tab for a while: the songs carry on, one after
//    another, though no frames run there.
//

import { Kwilos, label, rect, track } from "../../src/kwilos.js";

/** @import { Env } from "../../src/kwilos.js" */

const SONGS = [
  { title: 'Dawn', path: 'assets/dawn.mp3' },
  { title: 'Noon', path: 'assets/noon.mp3' },
  { title: 'Dusk', path: 'assets/dusk.mp3' },
]
const WIDTH = 600
const HEIGHT = 400
const BAR = { x: 40, y: 270, w: 520, h: 10 }

await Kwilos.attach("#canvas-06", tick, {
  background_color: '#1a1625',
  background_audio: true,
})

/** @param {Env} env */
function tick(env) {
  const state = env.state
  state.playing ??= false
  const music = env.tracks.music ??= track({ paths: SONGS.map(song => song.path), looping: true, paused: true })

  for (const click of env.inputs.mouse.clicks.filter(click => click.button === 'left')) {
    const id = String(env.hit(click)?.id ?? '')
    if (id === 'play')
      state.playing = !state.playing
    else if (id === 'previous')
      music.index = (music.index ?? 0) - 1
    else if (id === 'next')
      music.index = (music.index ?? 0) + 1
    else if (id.startsWith('song ')) {
      music.index = Number(id.slice(5))
      state.playing = true
    }
  }
  music.paused = !state.playing

  const playing_now = music.index ?? 0
  const progress = music.duration ? Math.min(1, (music.time ?? 0) / music.duration) : 0
  const under_mouse = env.hit()?.id

  return [
    label({
      x: 40, y: 50, text: 'Jukebox',
      text_align: 'left', font_size: 22, font_name: 'sans-serif', fill_color: '#f1e6ff',
    }),
    label({
      x: WIDTH - 40, y: 50, text: state.playing ? 'Try another tab: it plays on' : 'Press Play to start',
      text_align: 'right', font_size: 14, font_name: 'sans-serif', fill_color: '#b9aed0',
    }),

    SONGS.map((song, i) => {
      const id = `song ${i}`
      const current = i === playing_now
      return [
        rect({ id, x: 40, y: 80 + i * 50, w: 520, h: 40, fill_color: current ? '#4a3a72' : under_mouse === id ? '#332a4a' : '#262035' }),
        current && state.playing && label({
          id, x: 58, y: 106 + i * 50, text: '▶',
          text_align: 'left', font_size: 16, font_name: 'sans-serif', fill_color: 'white',
        }),
        label({
          id, x: 86, y: 106 + i * 50, text: song.title,
          text_align: 'left', font_size: 16, font_name: 'sans-serif', fill_color: 'white',
        }),
      ]
    }),

    rect({ x: BAR.x, y: BAR.y, w: BAR.w, h: BAR.h, fill_color: '#332a4a' }),
    rect({ x: BAR.x, y: BAR.y, w: BAR.w * progress, h: BAR.h, fill_color: '#b48cff' }),
    label({
      x: BAR.x, y: BAR.y + 30, text: clock(music.time),
      text_align: 'left', font_size: 13, font_name: 'sans-serif', fill_color: '#b9aed0',
    }),
    label({
      x: BAR.x + BAR.w, y: BAR.y + 30, text: clock(music.duration),
      text_align: 'right', font_size: 13, font_name: 'sans-serif', fill_color: '#b9aed0',
    }),

    button('previous', 155, 'Previous', under_mouse),
    button('play', 255, state.playing ? 'Pause' : 'Play', under_mouse),
    button('next', 355, 'Next', under_mouse),
  ]
}

// Formats seconds as minutes and seconds, e.g. 0:07
/** @param {number | undefined} seconds */
function clock(seconds = 0) {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

// A rect and a label with the same `id`, so the text and the box around it
// respond alike
/**
 * @param {string} id
 * @param {number} x
 * @param {string} text
 * @param {string | number | undefined} under_mouse
 */
function button(id, x, text, under_mouse) {
  return [
    rect({ id, x, y: HEIGHT - 70, w: 90, h: 36, fill_color: under_mouse === id ? '#5a4a86' : '#3d3260' }),
    label({ id, x: x + 45, y: HEIGHT - 47, text, font_size: 14, font_name: 'sans-serif', fill_color: 'white' }),
  ]
}
