import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { from_aseprite } from '../src/aseprite.js'
import { animation_status, sprite, sprite_frame } from '../src/kwilos/sprites.js'

const uncle = JSON.parse(readFileSync(new URL('../samples/08-aseprite/assets/Uncle.json', import.meta.url), 'utf8'))

const frame_data = (x, y, duration = 100, extra = {}) => ({
  frame: { x, y, w: 16, h: 16 }, rotated: false, trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 }, sourceSize: { w: 16, h: 16 }, duration, ...extra,
})
// An export of four frames, as Aseprite writes it with frames as an object
const export_of = (frameTags, meta = {}) => ({
  frames: Object.fromEntries([0, 1, 2, 3].map(i => [`hero ${i}.aseprite`, frame_data(i * 16, 0, 100 + i)])),
  meta: { image: 'hero.png', frameTags, ...meta },
})
const indexes = (anim) => anim.frames.map(f => f.index)

describe('from_aseprite', () => {
  describe('with an export from Aseprite', () => {
    const hero = from_aseprite(uncle, { base: 'assets/Uncle.json' })

    it('finds the sheet\'s image beside the JSON', () => {
      expect(hero.image).toBe('assets/Uncle.png')
    })

    it('makes a frame of every frame, in order, with its region and duration', () => {
      expect(hero.frames).toHaveLength(40)
      const entries = Object.values(uncle.frames)
      hero.frames.forEach((frame, i) => {
        const { x, y, w, h } = entries[i].frame
        expect(frame).toEqual({
          path: 'assets/Uncle.png', source_x: x, source_y: y, source_w: w, source_h: h,
          duration: entries[i].duration, dx: 0, dy: 0, index: i,
        })
      })
    })

    it('makes an animation of every tag, by its name, with the tag\'s frames', () => {
      expect(Object.keys(hero.animations)).toEqual(uncle.meta.frameTags.map(tag => tag.name))
      expect(indexes(hero.animations['Run South'])).toEqual([0, 1, 2, 3, 4])
      expect(indexes(hero.animations['Walk West'])).toEqual([35, 36, 37, 38, 39])
      expect(hero.animations['Walk West']).toMatchObject({ type: 'animation', play: 'loop' })
    })

    it('shares its frames between the list and the animations', () => {
      expect(hero.animations['Run East'].frames[0]).toBe(hero.frames[5])
    })

    it('plays as a sprite does, over the frames\' own durations', () => {
      const walking = hero.animations['Walk North']
      expect(animation_status(walking, 0).frame).toBe(0)
      expect(animation_status(walking, 120).frame).toBe(1)
      expect(animation_status(walking, 520).frame).toBe(0)

      const shown = sprite_frame(sprite({ animation: walking, start: 1000, x: 5, y: 6 }), 1250)
      expect(shown).toMatchObject({ type: 'image', path: 'assets/Uncle.png', x: 5, y: 6 })
      expect(shown).toMatchObject({ source_x: hero.frames[32].source_x, source_y: hero.frames[32].source_y, source_w: 64, source_h: 64 })
    })
  })

  describe('with frames as an array', () => {
    it('reads each frame\'s filename and rectangle', () => {
      const hero = from_aseprite({
        frames: [{ filename: 'a', ...frame_data(0, 0) }, { filename: 'b', ...frame_data(16, 0, 250) }],
        meta: { image: 'sheet.png' },
      })
      expect(hero.frames.map(f => [f.index, f.source_x, f.duration])).toEqual([[0, 0, 100], [1, 16, 250]])
      expect(hero.image).toBe('sheet.png')
    })
  })

  describe('with trimmed frames', () => {
    it('shifts each frame by where its pixels sit in the untrimmed sprite', () => {
      const hero = from_aseprite({
        frames: { a: frame_data(0, 0, 100, { trimmed: true, spriteSourceSize: { x: 3, y: 5, w: 10, h: 8 } }) },
        meta: { image: 'sheet.png' },
      })
      expect(hero.frames[0]).toMatchObject({ dx: 3, dy: 5 })
    })
  })

  describe('with tags in each direction', () => {
    const tagged = (direction) => from_aseprite(export_of([{ name: 'move', from: 1, to: 3, direction }])).animations.move

    it('plays forward and ping-pong tags in their order, and reverse ones the other way round', () => {
      expect(indexes(tagged('forward'))).toEqual([1, 2, 3])
      expect(indexes(tagged('reverse'))).toEqual([3, 2, 1])
      expect(indexes(tagged('pingpong'))).toEqual([1, 2, 3])
      expect(indexes(tagged('pingpong_reverse'))).toEqual([3, 2, 1])
    })

    it('loops forward and reverse tags, and plays the others ping-pong', () => {
      expect(['forward', 'reverse'].map(d => tagged(d).play)).toEqual(['loop', 'loop'])
      expect(['pingpong', 'pingpong_reverse'].map(d => tagged(d).play)).toEqual(['ping-pong', 'ping-pong'])
    })

    it('plays forward when a tag has no direction', () => {
      const anim = from_aseprite(export_of([{ name: 'move', from: 0, to: 1 }])).animations.move
      expect(indexes(anim)).toEqual([0, 1])
    })

    it('shows ping-pong without repeating the end frames, as Aseprite does', () => {
      const anim = tagged('pingpong_reverse')
      const shown = [50, 150, 250, 350, 450].map(t => anim.frames[animation_status(anim, t).frame].index)
      expect(shown).toEqual([3, 2, 1, 2, 3])
    })

    it('leaves the list of frames in order when a tag is reversed', () => {
      const hero = from_aseprite(export_of([{ name: 'move', from: 0, to: 3, direction: 'reverse' }]))
      expect(hero.frames.map(f => f.index)).toEqual([0, 1, 2, 3])
    })
  })

  describe('without tags', () => {
    it('makes one animation of every frame, named "default"', () => {
      const hero = from_aseprite(export_of([]))
      expect(Object.keys(hero.animations)).toEqual(['default'])
      expect(indexes(hero.animations.default)).toEqual([0, 1, 2, 3])
    })

    it('makes one when the export has no frameTags at all', () => {
      const { frameTags, ...meta } = export_of([]).meta
      expect(Object.keys(from_aseprite({ ...export_of([]), meta }).animations)).toEqual(['default'])
    })
  })

  describe('finding the image', () => {
    const at = (image, options) => from_aseprite(export_of([], { image }), options).image

    it('looks beside the JSON, whatever the folder', () => {
      expect(at('hero.png', { base: 'hero.json' })).toBe('hero.png')
      expect(at('hero.png', { base: 'art/sprites/hero.json' })).toBe('art/sprites/hero.png')
      expect(at('hero.png', { base: 'https://example.com/a/hero.json' })).toBe('https://example.com/a/hero.png')
    })

    it('uses the export\'s image as it is without a base, or when it is absolute', () => {
      expect(at('art/hero.png')).toBe('art/hero.png')
      expect(at('/art/hero.png', { base: 'a/hero.json' })).toBe('/art/hero.png')
      expect(at('https://example.com/hero.png', { base: 'a/hero.json' })).toBe('https://example.com/hero.png')
    })

    it('prefers the image option', () => {
      expect(at('/Users/me/hero.png', { base: 'a/hero.json', image: 'sprites/hero.png' })).toBe('sprites/hero.png')
    })

    it('throws a TypeError when there is no image', () => {
      const { image, ...meta } = export_of([]).meta
      expect(() => from_aseprite({ ...export_of([]), meta })).toThrow(/meta\.image, or the image option/)
    })
  })

  describe('with something that is not supported or not an export', () => {
    it.each([undefined, null, 'text', 3, {}, { frames: {} }, { meta: {} }])('throws a TypeError for %j', (json) => {
      expect(() => from_aseprite(json)).toThrow(TypeError)
    })

    it('throws a TypeError for a rotated frame, naming it', () => {
      const rotated = { frames: { 'hero 7': frame_data(0, 0, 100, { rotated: true }) }, meta: { image: 'a.png' } }
      expect(() => from_aseprite(rotated)).toThrow(/rotated frames, as in "hero 7"/)
    })

    it('throws a TypeError for a frame without a rectangle', () => {
      expect(() => from_aseprite({ frames: { a: { duration: 100 } }, meta: { image: 'a.png' } })).toThrow(/no frame rectangle in "a"/)
    })

    it.each([
      [{ name: 'x', from: 0, to: 4 }, /"x" runs from frame 0 to 4, outside the 4 frames/],
      [{ name: 'x', from: -1, to: 2 }, /outside the 4 frames/],
      [{ name: 'x', from: 3, to: 1 }, /outside the 4 frames/],
      [{ name: 'x', from: '0', to: 1 }, /outside the 4 frames/],
    ])('throws a TypeError for the tag %j', (tag, message) => {
      expect(() => from_aseprite(export_of([tag]))).toThrow(message)
    })

    it.each(['sideways', 'constructor'])('throws a TypeError for the direction "%s"', (direction) => {
      expect(() => from_aseprite(export_of([{ name: 'x', from: 0, to: 1, direction }]))).toThrow(/does not know the direction/)
    })
  })
})
