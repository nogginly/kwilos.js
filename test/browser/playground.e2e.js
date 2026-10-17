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

  test('draws a circle under the mouse once it has entered the app, and a greeting', async ({ page }) => {
    const TOMATO = [255, 99, 71, 255]
    await expect.poll(() => pixel(page, 300, 300)).toEqual([0x1b, 0x24, 0x33, 255])
    expect(await pixel(page, 100, 300)).not.toEqual(TOMATO)

    const canvas = await app(page).locator('canvas').boundingBox()
    await page.mouse.move(canvas.x + 100 * canvas.width / 600, canvas.y + 300 * canvas.height / 360)
    await expect.poll(() => pixel(page, 100, 300)).toEqual(TOMATO)

    // The greeting is white, on the line across the top
    const white = await app(page).locator('canvas').evaluate(element => {
      const data = element.getContext('2d').getImageData(150, 28, 300, 24).data
      let count = 0
      for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) count++
      return count
    })
    expect(white).toBeGreaterThan(50)
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

test.describe('layout', () => {
  const box = (page, selector) => page.locator(selector).boundingBox()

  test('puts the preview beside the console, and the files beside a wide editor below them', async ({ page }) => {
    const [preview, console_, files, editor] = await Promise.all(
      ['.pg-preview', '.pg-console', '#files', '.pg-editor'].map(selector => box(page, selector)))
    // The preview and console share a row, at the same height, the console to the right
    expect(console_.x).toBeGreaterThan(preview.x + preview.width)
    expect(console_.y).toBeCloseTo(preview.y, 0)
    expect(console_.height).toBeCloseTo(preview.height, 0)
    // The files and editor share the row below, and the editor is the wider
    expect(files.y).toBeGreaterThanOrEqual(preview.y + preview.height)
    expect(editor.y).toBeGreaterThanOrEqual(preview.y + preview.height)
    expect(editor.x).toBeGreaterThan(files.x + files.width)
    expect(editor.width).toBeGreaterThan(files.width * 2.5)
  })

  test('puts the keyboard hint on the preview\'s title line', async ({ page }) => {
    const hint = page.locator('.pg-preview .pg-hint')
    await expect(hint).toHaveText('Click the app to give it the keyboard.')
    const [title, note] = await Promise.all([box(page, '.pg-preview .pg-heading'), box(page, '.pg-preview .pg-hint')])
    expect(note.x).toBeGreaterThan(title.x + title.width)
    expect(Math.abs(note.y + note.height / 2 - (title.y + title.height / 2))).toBeLessThan(title.height / 2)
  })

  test('keeps the console level with the app, and an error out of the way of both', async ({ page }) => {
    const level = async () => {
      const [stage, log] = await Promise.all([box(page, '#stage'), box(page, '#log')])
      expect(log.y).toBeCloseTo(stage.y, 0)
      expect(log.y + log.height).toBeCloseTo(stage.y + stage.height, 0)
      return { stage, log }
    }
    await level()

    await write_and_run(page, 'throw new Error("boom")')
    await expect(page.locator('#errors')).toBeVisible()
    const { stage } = await level()
    // The error has a row of its own, below, across the width of both
    const errors = await box(page, '#errors')
    expect(errors.y).toBeGreaterThanOrEqual(stage.y + stage.height)
    expect(errors.width).toBeGreaterThan((await box(page, '.pg-preview')).width * 1.8)
  })

  test('draws the console as a dark pane, apart from the editor, in light and dark themes', async ({ page }) => {
    const brightness = (selector) => page.locator(selector).evaluate(element => {
      const [r, g, b] = getComputedStyle(element).backgroundColor.match(/\d+/g).map(Number)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    })
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme })
      expect(await brightness('#log')).toBeLessThan(40)
      expect(await brightness('#log')).toBeLessThan(await brightness('#code') - 5)
    }
  })

  test('keeps the editor where it is as the console fills', async ({ page }) => {
    // Measured from the top of the page, as running the code scrolls the window
    const top = (selector) => page.locator(selector).evaluate(element => element.getBoundingClientRect().top + scrollY)
    const before = await top('.pg-editor')
    await write_and_run(page, 'for (let i = 1; i <= 200; i++) console.log("line", i)')
    await expect(page.locator('#log')).toContainText('line 200')
    expect(await top('.pg-editor')).toBe(before)
    expect((await box(page, '.pg-console')).height).toBeCloseTo((await box(page, '.pg-preview')).height, 0)
  })

  test('folds the files sideways into a rail on a wide screen, so the editor grows', async ({ page }) => {
    const summary = page.locator('#files summary')
    const sizes = async () => ({ files: await box(page, '#files'), editor: await box(page, '.pg-editor') })
    const open = await sizes()

    await summary.click()
    const folded = await sizes()
    expect(folded.files.width).toBeLessThan(110)
    expect(folded.editor.width).toBeGreaterThan(open.editor.width + 100)
    // The editor's right edge stays put, and the rail runs the editor's height
    expect(folded.editor.x + folded.editor.width).toBeCloseTo(open.editor.x + open.editor.width, 0)
    expect(folded.files.height).toBeCloseTo(folded.editor.height, 0)
    expect(folded.editor.x).toBeGreaterThan(folded.files.x + folded.files.width)

    await summary.click()
    const unfolded = await sizes()
    expect(unfolded.files.width).toBeCloseTo(open.files.width, 0)
    expect(unfolded.editor.width).toBeCloseTo(open.editor.width, 0)
  })

  test('brings the preview into view when the code is run from further down the page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 })
    const in_view = () => page.locator('.pg-preview').evaluate(element => {
      const { top, bottom } = element.getBoundingClientRect()
      return top >= -1 && bottom <= innerHeight + 1
    })
    await page.locator('#code').scrollIntoViewIfNeeded()
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
    expect(await in_view()).toBe(false)

    await page.locator('#code').fill(RED_SCREEN)
    await page.locator('#code').press('Control+Enter')
    await expect.poll(in_view).toBe(true)
    await expect.poll(() => pixel(page, 10, 10)).toEqual(RED)
  })

  test('leaves the page where it is for the first run, and when the preview is in view already', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 })
    await page.reload()
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })

  test('folds the files away, keeping their count, and opens them when a file is added', async ({ page }) => {
    const files = page.locator('#files')
    const summary = page.locator('#files summary')
    await expect(files).toHaveJSProperty('open', true)
    await expect(summary).toHaveText('Files')

    await page.locator('#file-input').setInputFiles(STRIPES)
    await expect(summary).toHaveText('Files (1)')

    await summary.click()
    await expect(files).toHaveJSProperty('open', false)
    await expect(page.locator('#file-list')).toBeHidden()
    await expect(summary).toHaveText('Files (1)')

    await page.locator('#file-input').setInputFiles({ name: 'more.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
    await expect(files).toHaveJSProperty('open', true)
    await expect(summary).toHaveText('Files (2)')
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

  test('stacks the preview, editor, console and files, with the files folded away', async ({ page }) => {
    const ys = []
    for (const selector of ['.pg-preview', '.pg-editor', '.pg-console', '#files'])
      ys.push((await page.locator(selector).boundingBox()).y)
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
    await expect(page.locator('#files')).toHaveJSProperty('open', false)
  })
})
