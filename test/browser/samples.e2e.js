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

    // Under the lantern the cricket shows; catching it moves it elsewhere
    await canvas.hover({ position: cricket })
    await expect.poll(() => pixel(page, '#canvas-05', cricket.x, cricket.y)).not.toEqual([11, 20, 36, 255])
    const before = await canvas_fingerprint(page, '#canvas-05')
    await canvas.click({ position: cricket })
    await expect.poll(() => canvas_fingerprint(page, '#canvas-05')).not.toBe(before)
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
