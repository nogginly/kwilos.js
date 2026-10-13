import { expect } from '@playwright/test'

// Returns the [r, g, b, a] colour of a canvas pixel
export function pixel(page, canvas, x, y) {
  return page.evaluate(([canvas, x, y]) =>
    Array.from(document.querySelector(canvas).getContext('2d').getImageData(x, y, 1, 1).data),
    [canvas, x, y])
}

// Returns how many pixels in a canvas region differ from the given colour
export function pixels_unlike(page, canvas, [x, y, w, h], [r, g, b]) {
  return page.evaluate(([canvas, x, y, w, h, r, g, b]) => {
    const data = document.querySelector(canvas).getContext('2d').getImageData(x, y, w, h).data
    let count = 0
    for (let i = 0; i < data.length; i += 4)
      if (data[i] !== r || data[i + 1] !== g || data[i + 2] !== b) count++
    return count
  }, [canvas, x, y, w, h, r, g, b])
}

// Waits until the canvas pixel has the given colour
export async function expect_pixel(page, canvas, x, y, rgba) {
  await expect.poll(() => pixel(page, canvas, x, y)).toEqual(rgba)
}

// Waits for the next animation frames to run
export function frames(page, count = 2) {
  return page.evaluate(count => new Promise(resolve => {
    const step = () => (--count <= 0 ? resolve() : requestAnimationFrame(step))
    requestAnimationFrame(step)
  }), count)
}

// Collects uncaught page errors, by message
export function page_errors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

// Opens the harness page: a 200 by 200 canvas `#c` at the page's top-left,
// with Kwilos and its factories on `window.kwilos`
export async function open_harness(page) {
  await page.goto('/test/browser/pages/harness.html')
  await page.waitForFunction(() => window.kwilos)
}

// Returns a fingerprint of every pixel in a canvas, to compare whole frames
export function canvas_fingerprint(page, canvas) {
  return page.evaluate(canvas => {
    const element = document.querySelector(canvas)
    const data = element.getContext('2d').getImageData(0, 0, element.width, element.height).data
    let hash = 0
    for (let i = 0; i < data.length; i++)
      hash = (hash * 31 + data[i]) | 0
    return hash
  }, canvas)
}

// Returns a touchscreen that sends real touch input through Chromium's
// DevTools protocol, so the page receives touch pointer events
export async function touchscreen(page) {
  const cdp = await page.context().newCDPSession(page)
  const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
  return {
    start: (x, y) => send('touchStart', [{ x, y }]),
    move: (x, y) => send('touchMove', [{ x, y }]),
    end: () => send('touchEnd', []),
  }
}
