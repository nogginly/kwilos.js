import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { page_errors } from './helpers.js'

// The playground is part of the site, built into _site/ by the test-browser
// script before these tests run

const STRIPES = 'test/browser/pages/stripes.png'
const BEEP = 'test/browser/pages/beep.wav'
const RED = [255, 0, 0, 255]
const BLUE = [0, 0, 255, 255]
const GREEN = [0, 128, 0, 255]

const RED_SCREEN = `import { Kwilos, rect } from "kwilos.js"
await Kwilos.attach("#canvas", () => [rect({ x: 0, y: 0, w: 600, h: 360, fill_color: "red" })])`

const app = (page) => page.frameLocator('#stage iframe')
// The colour of a pixel of the app's canvas, or null while the app is not there yet
const pixel = (page, x, y) => app(page).locator('canvas').evaluate(
  (canvas, [x, y]) => Array.from(canvas.getContext('2d').getImageData(x, y, 1, 1).data), [x, y], { timeout: 2000 }
).catch(() => null)
const run = (page) => page.getByRole('button', { name: 'Run', exact: true }).click()
const write_and_run = async (page, code) => {
  await page.locator('#code').fill(code)
  await run(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/_site/playground.html')
})

test.describe('the starter app', () => {
  test('runs at once, in a page with the playground in its navigation', async ({ page }) => {
    const errors = page_errors(page)
    // The orbiting circle, and the label, are the only things not in the background colour
    await expect.poll(() => app(page).locator('canvas').evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      let drawn = 0
      for (let i = 0; i < data.length; i += 4)
        if (!(data[i] === 0x1b && data[i + 1] === 0x24 && data[i + 2] === 0x33)) drawn++
      return drawn
    }, null, { timeout: 2000 }).catch(() => 0)).toBeGreaterThan(500)
    await expect(page.locator('#errors')).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Playground' })).toHaveAttribute('aria-current', 'page')
    expect(errors).toEqual([])
  })

  test('is linked from the home page', async ({ page }) => {
    await page.goto('/_site/index.html')
    await expect(page.locator('main a[href="playground.html"]')).toHaveText('playground')
  })
})

test.describe('running code', () => {
  test('runs edited code, imported from "kwilos.js", in place of the app before', async ({ page }) => {
    await write_and_run(page, RED_SCREEN)
    await expect.poll(() => pixel(page, 10, 10)).toEqual(RED)
    await expect(page.locator('#stage iframe')).toHaveCount(1)
  })

  test('runs with Ctrl and Enter, and Tab types two spaces until Escape lets it leave', async ({ page }) => {
    const code = page.locator('#code')
    await code.fill(RED_SCREEN)
    await code.press('Control+Enter')
    await expect.poll(() => pixel(page, 10, 10)).toEqual(RED)

    await code.press('End')
    await code.press('Tab')
    expect(await code.inputValue()).toBe(RED_SCREEN + '  ')
    await code.press('Escape')
    await code.press('Tab')
    expect(await code.inputValue()).toBe(RED_SCREEN + '  ')
    await expect(code).not.toBeFocused()
  })

  test('shows what the app logs, and the errors it throws', async ({ page }) => {
    await write_and_run(page, `console.log("hello", 42, { a: 1 })
console.warn("careful")
throw new Error("boom")`)
    const log = page.locator('#log')
    await expect(log).toContainText('hello 42 {"a":1}')
    await expect(log).toContainText('careful')
    await expect(page.locator('#errors')).toContainText('boom')

    await write_and_run(page, `import { Kwilos } from "kwilos.js"
await Kwilos.attach("#canvas", () => { throw new Error("tick failed") })`)
    await expect(page.locator('#errors')).toContainText('tick failed')
    await expect(page.locator('#errors')).not.toContainText('boom')
    await expect(log).toBeEmpty()

    await write_and_run(page, 'const = ;')
    await expect(page.locator('#errors')).toContainText(/Unexpected token/)
  })

  test('runs the app apart from the page: no reach to the page or its storage', async ({ page }) => {
    await write_and_run(page, `try { parent.document.title; console.log("reached the page") } catch { console.log("blocked from the page") }
try { localStorage.length; console.log("has storage") } catch { console.log("blocked from storage") }`)
    await expect(page.locator('#log')).toContainText('blocked from the page')
    await expect(page.locator('#log')).toContainText('blocked from storage')
  })
})

test.describe('files', () => {
  const STRIPES_IMAGE = (path) => `import { Kwilos, image } from "kwilos.js"
await Kwilos.attach("#canvas", () => [image({ path: "${path}", x: 0, y: 0, w: 40, h: 20 })],
  { preload_images: ["${path}"], image_smoothing: false })`

  test('serves an added image to the app by its name, or by its name in any folder', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(STRIPES)
    await expect(page.locator('#file-list')).toContainText('stripes.png')

    await write_and_run(page, STRIPES_IMAGE('stripes.png'))
    await expect.poll(() => pixel(page, 19, 10)).toEqual(RED)
    expect(await pixel(page, 20, 10)).toEqual(BLUE)

    await write_and_run(page, STRIPES_IMAGE('assets/art/stripes.png'))
    await expect.poll(() => pixel(page, 19, 10)).toEqual(RED)
    await expect(page.locator('#errors')).toBeHidden()
  })

  test('says which file the app asked for that has not been added, and runs again when it is', async ({ page }) => {
    await write_and_run(page, STRIPES_IMAGE('stripes.png'))
    await expect(page.locator('#errors')).toContainText('“stripes.png”, which has not been added')
    expect(await pixel(page, 19, 10)).not.toEqual(RED)

    await page.locator('#file-input').setInputFiles(STRIPES)
    await expect.poll(() => pixel(page, 19, 10)).toEqual(RED)
    await expect(page.locator('#errors')).toBeHidden()

    await page.getByRole('button', { name: 'Remove stripes.png' }).click()
    await expect(page.locator('#file-list')).toContainText('No files added')
    await run(page)
    await expect(page.locator('#errors')).toContainText('stripes.png')
  })

  test('serves data and sound files to fetch, and sounds to preload_sounds', async ({ page }) => {
    await page.locator('#file-input').setInputFiles([
      { name: 'beep.wav', mimeType: 'audio/wav', buffer: readFileSync(BEEP) },
      { name: 'data.json', mimeType: 'application/json', buffer: Buffer.from('{ "answer": 42 }') },
    ])
    await write_and_run(page, `import { Kwilos } from "kwilos.js"
console.log("answer", (await (await fetch("data.json")).json()).answer)
console.log("beep bytes", (await (await fetch("./beep.wav")).arrayBuffer()).byteLength > 0)
await Kwilos.attach("#canvas", () => [], { preload_sounds: ["beep.wav"] })
console.log("attached")`)
    const log = page.locator('#log')
    await expect(log).toContainText('answer 42')
    await expect(log).toContainText('beep bytes true')
    await expect(log).toContainText('attached')
    await expect(page.locator('#errors')).toBeHidden()
  })

  test('imports an Aseprite sheet from the added JSON and image', async ({ page }) => {
    await page.locator('#file-input').setInputFiles(['samples/08-aseprite/assets/Uncle.json', 'samples/08-aseprite/assets/Uncle.png'])
    await write_and_run(page, `import { Kwilos, sprite } from "kwilos.js"
import { from_aseprite } from "kwilos.js/aseprite"
const hero = from_aseprite(await (await fetch("Uncle.json")).json(), { base: "Uncle.json" })
console.log(Object.keys(hero.animations).length, hero.image)
await Kwilos.attach("#canvas", () => [sprite({ animation: hero.animations["Walk South"], x: 100, y: 100 })],
  { preload_images: [hero.image], background_color: "white" })`)
    await expect(page.locator('#log')).toContainText('8 Uncle.png')
    // Something other than the white background is drawn where she stands
    await expect.poll(() => app(page).locator('canvas').evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(100, 100, 64, 64).data
      let drawn = 0
      for (let i = 0; i < data.length; i += 4) if (data[i] < 200) drawn++
      return drawn
    }, null, { timeout: 2000 }).catch(() => 0)).toBeGreaterThan(100)
    await expect(page.locator('#errors')).toBeHidden()
  })

  test('takes dropped files', async ({ page }) => {
    const data = await page.evaluateHandle(() => {
      const transfer = new DataTransfer()
      transfer.items.add(new File(['x'], 'dropped.txt', { type: 'text/plain' }))
      return transfer
    })
    await page.locator('#files').dispatchEvent('drop', { dataTransfer: data })
    await expect(page.locator('#file-list')).toContainText('dropped.txt')
  })
})

test.describe('sharing', () => {
  const GREEN_SCREEN = `// A comment with accents and symbols: é ü ✓ 日本
import { Kwilos, rect } from "kwilos.js"
await Kwilos.attach("#canvas", () => [rect({ x: 0, y: 0, w: 600, h: 360, fill_color: "green" })])`

  test('carries the code in a link, which waits to be run, as it is someone else\'s', async ({ page }) => {
    await write_and_run(page, GREEN_SCREEN)
    await expect.poll(() => pixel(page, 10, 10)).toEqual(GREEN)
    await page.getByRole('button', { name: 'Share link' }).click()
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#code=[zp]\./)

    await page.reload()
    await expect(page.locator('#code')).toHaveValue(GREEN_SCREEN)
    await expect(page.locator('#notice')).toContainText('came from a link')
    await expect(page.locator('#stage iframe')).toHaveCount(0)

    await run(page)
    await expect.poll(() => pixel(page, 10, 10)).toEqual(GREEN)
  })

  test('runs a link to the starter app at once, and shows the starter for a link it cannot read', async ({ page }) => {
    await page.getByRole('button', { name: 'Share link' }).click()
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#code=/)
    await page.reload()
    await expect(page.locator('#stage iframe')).toHaveCount(1)
    await expect(page.locator('#notice')).toBeHidden()

    await page.goto('/_site/playground.html#code=z.nonsense')
    await page.reload()
    await expect(page.locator('#notice')).toContainText('could not be read')
    await expect(page.locator('#stage iframe')).toHaveCount(1)
  })

  test('resets to the starter app, and clears the link', async ({ page }) => {
    const starter = await page.locator('#code').inputValue()
    await write_and_run(page, RED_SCREEN)
    await page.getByRole('button', { name: 'Share link' }).click()
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#code=/)

    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.locator('#code')).toHaveValue(starter)
    expect(await page.evaluate(() => location.hash)).toBe('')
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('fits the screen, and the app runs once it is scrolled into view', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBe(0)

    await page.locator('#stage').scrollIntoViewIfNeeded()
    await expect.poll(() => pixel(page, 5, 5)).toEqual([0x1b, 0x24, 0x33, 255])
  })
})
