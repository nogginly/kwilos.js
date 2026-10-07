import { test, expect } from '@playwright/test'
import { expect_pixel, pixel, pixels_unlike, frames, page_errors, canvas_fingerprint } from './helpers.js'

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

    // Reset, holding the button for a frame as a person would; Kwilos
    // samples buttons once per frame, so a press and release within one
    // frame is not seen
    await canvas.hover({ position: { x: 530, y: 366 } })
    await page.mouse.down()
    await frames(page)
    await page.mouse.up()
    // then return the mouse to where it was
    await canvas.hover({ position: { x: 300, y: 100 } })
    await expect.poll(fingerprint).toBe(before)
    expect(errors).toEqual([])
  })
})
