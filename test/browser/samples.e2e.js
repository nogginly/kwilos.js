import { test, expect } from '@playwright/test'
import { expect_pixel, pixel, pixels_unlike, frames, page_errors, canvas_fingerprint, touchscreen } from './helpers.js'

const BLACK = [0, 0, 0]

test.describe('samples', () => {
  test('00 draws the label where the mouse is, clearing it from where it was', async ({ page }) => {
    const errors = page_errors(page)
    await page.goto('/samples/00-get-started/index.html')
    const canvas = '[id="00-canvas"]'
    await expect_pixel(page, canvas, 5, 5, [0, 0, 0, 255])

    await page.locator(canvas).hover({ position: { x: 200, y: 200 } })
    await expect.poll(() => pixels_unlike(page, canvas, [100, 160, 200, 40], BLACK)).toBeGreaterThan(0)

    await page.locator(canvas).hover({ position: { x: 200, y: 380 } })
    await expect.poll(() => pixels_unlike(page, canvas, [100, 160, 200, 40], BLACK)).toBe(0)
    expect(errors).toEqual([])
  })

  test('01 draws every type of shape', async ({ page }) => {
    const errors = page_errors(page)
    await page.goto('/samples/01-different-types/index.html')
    const canvas = '#canvas-01'
    await expect_pixel(page, canvas, 5, 5, [255, 255, 0, 255])        // background colour
    expect(await pixel(page, canvas, 50, 560)).toEqual([255, 0, 0, 255])   // filled circle
    expect(await pixel(page, canvas, 150, 560)).toEqual([255, 255, 0, 255]) // outlined circle's centre
    expect(await pixel(page, canvas, 300, 560)).toEqual([255, 0, 0, 255])  // filled rect
    expect(await pixel(page, canvas, 15, 15)).not.toEqual([255, 255, 0, 255]) // image
    expect(await pixels_unlike(page, canvas, [70, 370, 350, 110], [240, 225, 195])).toBeGreaterThan(0) // tiles
    expect(errors).toEqual([])
  })

  test('01 stops drawing once its scene is complete', async ({ page }) => {
    await page.goto('/samples/01-different-types/index.html')
    await expect_pixel(page, '#canvas-01', 5, 5, [255, 255, 0, 255])

    // Paint over the canvas; a sample that returns null leaves the paint alone
    await page.evaluate(() => {
      const draw = document.querySelector('#canvas-01').getContext('2d')
      draw.fillStyle = 'blue'
      draw.fillRect(0, 0, 10, 10)
    })
    await frames(page, 5)
    expect(await pixel(page, '#canvas-01', 5, 5)).toEqual([0, 0, 255, 255])
  })

  test('02 layers a transparent canvas over another', async ({ page }) => {
    const errors = page_errors(page)
    await page.goto('/samples/02-two-canvases/index.html')
    await expect_pixel(page, '#under-canvas-02', 5, 5, [255, 255, 0, 255])
    await expect_pixel(page, '#over-canvas-02', 5, 5, [120, 255, 120, 64])
    expect(errors).toEqual([])
  })

  test('03 drags a character, and Reset puts it back', async ({ page }) => {
    const errors = page_errors(page)
    await page.goto('/samples/03-drag-and-drop/index.html')
    const canvas = page.locator('#canvas-03')
    const fingerprint = () => canvas_fingerprint(page, '#canvas-03')

    // Wait for the scene, then move the mouse over open desert; the sample
    // redraws only when the mouse moves or a button changes
    await expect.poll(() => pixels_unlike(page, '#canvas-03', [470, 340, 120, 50], [0, 0, 0])).toBeGreaterThan(0)
    await canvas.hover({ position: { x: 310, y: 110 } })
    await canvas.hover({ position: { x: 300, y: 100 } })
    await frames(page)
    const before = await fingerprint()

    // Pick up character 1 and drop it further along
    await canvas.hover({ position: { x: 80, y: 245 } })
    await page.mouse.down()
    await canvas.hover({ position: { x: 300, y: 330 } })
    await page.mouse.up()
    await canvas.hover({ position: { x: 300, y: 100 } })
    await frames(page)
    expect(await fingerprint()).not.toBe(before)

    // Reset, with a click quicker than a frame
    await canvas.click({ position: { x: 530, y: 366 } })
    // then return the mouse to where it was
    await canvas.hover({ position: { x: 300, y: 100 } })
    await expect.poll(fingerprint).toBe(before)
    expect(errors).toEqual([])
  })

  test('04 plays a sound for each coin, over music that can be paused', async ({ page }) => {
    const errors = page_errors(page)
    await page.addInitScript(() => {
      window.sounds_started = 0
      const start = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.sounds_started++
        return start.apply(this, args)
      }
      window.tracks = []
      const Original = window.Audio
      window.Audio = class extends Original {
        constructor(...args) {
          super(...args)
          window.tracks.push(this)
        }
      }
    })
    await page.goto('/samples/04-sounds/index.html')
    const canvas = page.locator('#canvas-04')
    await expect.poll(() => pixels_unlike(page, '#canvas-04', [16, 348, 124, 36], [31, 74, 58])).toBeGreaterThan(0)

    // The first coin's place, as the sample works it out
    const seed = (7 * 16807) % 2147483647
    const coin = { x: 40 + (seed % 520), y: 70 + (Math.floor(seed / 600) % 250) }
    const music = () => page.evaluate(() => ({ paused: window.tracks[0].paused, time: window.tracks[0].currentTime }))

    await canvas.click({ position: coin })
    await expect.poll(() => page.evaluate(() => window.sounds_started)).toBe(1)
    await expect.poll(async () => (await music()).time).toBeGreaterThan(0.2)

    await canvas.click({ position: { x: 78, y: 366 } })
    await expect.poll(async () => (await music()).paused).toBe(true)
    await canvas.click({ position: { x: 78, y: 366 } })
    await expect.poll(async () => (await music()).paused).toBe(false)
    expect(errors).toEqual([])
  })

  test('05 chirps where the cricket is, and catching it moves it', async ({ page }) => {
    const errors = page_errors(page)
    await page.addInitScript(() => {
      window.sounds_started = 0
      const start = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.sounds_started++
        return start.apply(this, args)
      }
    })
    await page.goto('/samples/05-find-the-cricket/index.html')
    const canvas = page.locator('#canvas-05')
    await expect.poll(() => pixels_unlike(page, '#canvas-05', [16, 348, 170, 36], [11, 20, 36])).toBeGreaterThan(0)

    // The cricket's first place, as the sample works it out
    const seed = (11 * 16807) % 2147483647
    const cricket = { x: 40 + (seed % 520), y: 70 + (Math.floor(seed / 600) % 250) }

    await canvas.click({ position: { x: 300, y: 200 } })
    await expect.poll(() => page.evaluate(() => window.sounds_started), { timeout: 4000 }).toBeGreaterThanOrEqual(2)

    // The range buttons change how far the lantern hears, drawn as a ring
    // around it: at 200, the ring passes 200 pixels to its left
    const ring = { x: 300 - 200, y: 200 }
    await canvas.hover({ position: { x: 300, y: 200 } })
    expect(await pixel(page, '#canvas-05', ring.x, ring.y)).toEqual([11, 20, 36, 255])
    for (let i = 0; i < 6; i++)
      await canvas.click({ position: { x: 402, y: 366 } })
    await canvas.hover({ position: { x: 300, y: 200 } })
    await expect.poll(() => pixel(page, '#canvas-05', ring.x, ring.y)).not.toEqual([11, 20, 36, 255])

    // Under the lantern the cricket shows; catching it moves it elsewhere
    await canvas.hover({ position: cricket })
    await expect.poll(() => pixel(page, '#canvas-05', cricket.x, cricket.y)).not.toEqual([11, 20, 36, 255])
    const before = await canvas_fingerprint(page, '#canvas-05')
    await canvas.click({ position: cricket })
    await expect.poll(() => canvas_fingerprint(page, '#canvas-05')).not.toBe(before)
    expect(errors).toEqual([])
  })

  test('06 plays its songs, and Next and a click on a song change the song', async ({ page }) => {
    const errors = page_errors(page)
    await page.addInitScript(() => {
      window.tracks = []
      const Original = window.Audio
      window.Audio = class extends Original {
        constructor(...args) {
          super(...args)
          window.tracks.push(this)
        }
      }
    })
    await page.goto('/samples/06-jukebox/index.html')
    const canvas = page.locator('#canvas-06')
    await expect.poll(() => pixels_unlike(page, '#canvas-06', [255, 330, 90, 36], [26, 22, 37])).toBeGreaterThan(0)
    const song = () => page.evaluate(() => {
      const [element] = window.tracks
      return element && { file: element.src.split('/').pop(), paused: element.paused }
    })

    await canvas.click({ position: { x: 300, y: 348 } })
    await expect.poll(song).toEqual({ file: 'dawn.mp3', paused: false })

    await canvas.click({ position: { x: 400, y: 348 } })
    await expect.poll(song).toEqual({ file: 'noon.mp3', paused: false })

    await canvas.click({ position: { x: 300, y: 220 } })
    await expect.poll(song).toEqual({ file: 'dusk.mp3', paused: false })

    await canvas.click({ position: { x: 300, y: 348 } })
    await expect.poll(song).toEqual({ file: 'dusk.mp3', paused: true })
    expect(errors).toEqual([])
  })

  test('07 walks, jumps and cheers, by playing its sprites', async ({ page }) => {
    const errors = page_errors(page)
    await page.goto('/samples/07-sprites/index.html')
    const canvas = page.locator('#canvas-07')
    // The bounds of the character: pixels between the labels and the grass
    // unlike the sky
    const hero = () => page.evaluate(() => {
      const data = document.querySelector('#canvas-07').getContext('2d').getImageData(0, 60, 600, 216).data
      let left = 600, right = -1, top = 999
      for (let i = 0; i < data.length; i += 4) {
        const sky = data[i] === 223 && data[i + 1] === 241 && data[i + 2] === 247
        if (sky) continue
        const p = i / 4, x = p % 600, y = 60 + Math.floor(p / 600)
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y)
      }
      return { left, right, top }
    })
    await expect.poll(async () => (await hero()).right).toBeGreaterThan(0)
    const standing = await hero()

    await page.keyboard.down('ArrowRight')
    await expect.poll(async () => (await hero()).right).toBeGreaterThan(standing.right + 40)
    await page.keyboard.up('ArrowRight')

    await frames(page, 3)
    const landed = await hero()
    await page.keyboard.press('Space')
    await expect.poll(async () => (await hero()).top).toBeLessThan(landed.top - 40)
    await expect.poll(async () => (await hero()).top, { timeout: 3000 }).toBeGreaterThan(landed.top - 5)

    // Clicking her cheers: the status, top left, reads "cheer" for "idle"
    const status_width = () => page.evaluate(() => {
      const data = document.querySelector('#canvas-07').getContext('2d').getImageData(0, 10, 240, 30).data
      let right = -1
      for (let i = 0; i < data.length; i += 4)
        if (data[i] < 120) right = Math.max(right, (i / 4) % 240)
      return right
    })
    const idle_width = await status_width()
    await canvas.click({ position: { x: Math.round((landed.left + landed.right) / 2), y: landed.top + 50 } })
    await expect.poll(status_width).toBeGreaterThan(idle_width + 5)
    expect(errors).toEqual([])
  })

  test('08 plays the tags of an Aseprite export: standing, walking and running in each direction', async ({ page }) => {
    const errors = page_errors(page)
    // Record the status label the sample draws: its tag, and the Aseprite frame it shows
    await page.addInitScript(() => {
      window.labels = []
      const fill_text = CanvasRenderingContext2D.prototype.fillText
      CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
        if (typeof text === 'string' && text.includes('Aseprite frame')) window.labels.push(text)
        return fill_text.call(this, text, ...rest)
      }
    })
    await page.goto('/samples/08-aseprite/index.html')
    const collect = async (ms) => {
      await page.evaluate(() => { window.labels = [] })
      await page.waitForTimeout(ms)
      return [...new Set(await page.evaluate(() => window.labels))]
    }
    const tag = (name, first) => [0, 1, 2, 3, 4].map(i => `${name} · Aseprite frame ${first + i}`)
    // The left edge of the figure: pixels between the labels unlike the background
    const left_edge = () => page.evaluate(() => {
      const data = document.querySelector('#canvas-08').getContext('2d').getImageData(0, 50, 600, 270).data
      let left = 600
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 231 && data[i + 1] === 239 && data[i + 2] === 220) continue
        left = Math.min(left, (i / 4) % 600)
      }
      return left
    })

    await expect.poll(() => collect(100)).toEqual(['Standing South · Aseprite frame 20'])

    await page.keyboard.down('ArrowRight')
    expect(await collect(700)).toEqual(expect.arrayContaining(tag('Walk East', 25)))
    await page.keyboard.up('ArrowRight')

    await page.keyboard.down('Shift')
    await page.keyboard.down('ArrowUp')
    expect(await collect(700)).toEqual(expect.arrayContaining(tag('Run North', 10)))
    await page.keyboard.up('ArrowUp')
    await page.keyboard.up('Shift')
    expect(await collect(150)).toContain('Standing North · Aseprite frame 30')

    // Running covers more ground than walking in the same time, measured
    // each time as she stands facing west, so her pose is the same
    const hold = async (keys, ms) => {
      for (const k of keys) await page.keyboard.down(k)
      await page.waitForTimeout(ms)
      for (const k of [...keys].reverse()) await page.keyboard.up(k)
      await page.waitForTimeout(100)
    }
    await hold(['ArrowLeft'], 100)
    const before = await left_edge()
    await hold(['ArrowLeft'], 600)
    const after_walking = await left_edge()
    await hold(['Shift', 'ArrowLeft'], 600)
    const after_running = await left_edge()
    const walked = before - after_walking
    const ran = after_walking - after_running
    expect(walked).toBeGreaterThan(20)
    expect(ran).toBeGreaterThan(walked * 1.4)

    // Holding the pointer far to the left runs west
    const box = await page.locator('#canvas-08').boundingBox()
    await page.mouse.move(box.x + 20, box.y + 200)
    await page.mouse.down()
    expect(await collect(500)).toEqual(expect.arrayContaining([expect.stringMatching(/^Run West · /)]))
    await page.mouse.up()
    expect(errors).toEqual([])
  })

  test.describe('on a touchscreen', () => {
    test.use({ hasTouch: true })

    test('03 drags a character by touch, and a tap on Reset puts it back', async ({ page }) => {
      const errors = page_errors(page)
      await page.goto('/samples/03-drag-and-drop/index.html')
      const canvas = page.locator('#canvas-03')
      await expect.poll(() => pixels_unlike(page, '#canvas-03', [470, 340, 120, 50], [0, 0, 0])).toBeGreaterThan(0)
      const box = await canvas.boundingBox()
      const at = (x, y) => [box.x + x, box.y + y]
      const fingerprint = () => canvas_fingerprint(page, '#canvas-03')

      await page.touchscreen.tap(...at(300, 100))
      await frames(page)
      const before = await fingerprint()

      // Drag character 1 with a finger
      const touch = await touchscreen(page)
      await touch.start(...at(80, 245))
      await frames(page)
      for (const step of [1, 2, 3, 4, 5])
        await touch.move(...at(80 + step * 44, 245 + step * 17))
      await frames(page)
      await touch.end()
      await page.touchscreen.tap(...at(300, 100))
      await frames(page)
      expect(await fingerprint()).not.toBe(before)

      await page.touchscreen.tap(...at(530, 366))
      await page.touchscreen.tap(...at(300, 100))
      await expect.poll(fingerprint).toBe(before)
      expect(errors).toEqual([])
    })
  })
})
