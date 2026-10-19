import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { page_errors } from './helpers.js'

// The tutorial is part of the site, built into _site/ by the test-browser
// script before these tests run. Every step is run in its page, so a step that
// stops working fails here.

const STEPS = readdirSync('tutorial', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && /^\d/.test(entry.name))
  .map(entry => entry.name)
  .sort()
const program = (step) => readFileSync(`tutorial/${step}/app.js`, 'utf8')
// A line of a step's front matter, such as its mission
const front = (step, key) => readFileSync(`tutorial/${step}/step.md`, 'utf8').match(new RegExp(`^${key}: (.*)$`, 'm'))?.[1]

const app = (page) => page.frameLocator('#stage iframe')
const canvas = (page) => app(page).locator('canvas')
// The colour of a pixel of the app's canvas, or null while the app is not there yet
const pixel = (page, x, y) => canvas(page).evaluate(
  (element, [x, y]) => Array.from(element.getContext('2d').getImageData(x, y, 1, 1).data), [x, y], { timeout: 2000 }
).catch(() => null)
// What the app has drawn so far, frame by frame: each frame is a list of
// ['text', text, x, y] and ['arc', x, y, radius]
const frames = (page) => canvas(page).evaluate(() => window.drawn_frames, null, { timeout: 2000 }).catch(() => [])
const drawn = async (page, text) => (await frames(page)).flat().filter(entry => entry[0] === 'text' && entry[1] === text)
// The cockpit's centre in each frame it was drawn: the only circle of radius 4
const cockpits = async (page) => (await frames(page)).map(frame => frame.find(entry => entry[0] === 'arc' && entry[3] === 4)).filter(Boolean)
const cockpit = async (page) => (await cockpits(page)).at(-1)
// The rocks in each frame: circles from 10 to 24 across
const rocks = async (page) => (await frames(page)).map(frame => frame.filter(entry => entry[0] === 'arc' && entry[3] >= 10 && entry[3] <= 24))

// Opens a step with its app on show, and records what it draws; with
// steady_random, Math.random always returns 0.5, so every rock comes
// straight down the middle at the same speed
async function open_step(page, step, { steady_random = false } = {}) {
  await page.addInitScript((steady_random) => {
    if (steady_random) Math.random = () => 0.5
    window.drawn_frames = []
    const proto = CanvasRenderingContext2D.prototype
    const current = () => window.drawn_frames.at(-1)
    const { fillRect, fillText, arc } = proto
    proto.fillRect = function (x, y, w, h) {
      if (x === 0 && y === 0 && w === this.canvas.width && h === this.canvas.height && window.drawn_frames.length < 2000)
        window.drawn_frames.push([])
      return fillRect.call(this, x, y, w, h)
    }
    proto.fillText = function (text, x, y, ...rest) {
      current()?.push(['text', text, x, y])
      return fillText.call(this, text, x, y, ...rest)
    }
    proto.arc = function (x, y, radius, ...rest) {
      current()?.push(['arc', x, y, radius])
      return arc.call(this, x, y, radius, ...rest)
    }
  }, steady_random)
  await page.goto(`/_site/tutorial/${step}.html`)
  await page.locator('#stage').scrollIntoViewIfNeeded()
  await canvas(page).waitFor()
}

// Moves the mouse to a place on the app's canvas, in the canvas's own pixels
async function move_to(page, x, y) {
  const box = await canvas(page).boundingBox()
  await page.mouse.move(box.x + x * box.width / 600, box.y + y * box.height / 360)
}

const SPACE = [11, 16, 32, 255]
const COCKPIT = [79, 195, 247, 255]

// Holds a key down for a while, with the app's canvas focused, as claim_keys allows
async function hold(page, key, ms) {
  await canvas(page).focus()
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
}

test.describe('the tutorial', () => {
  test('lists its steps on its home page, and starts with the first', async ({ page }) => {
    await page.goto('/_site/tutorial/index.html')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Debris Field')
    const links = page.locator('.steps a')
    await expect(links).toHaveCount(STEPS.length)
    await expect(page.getByRole('link', { name: 'Start with step 1' })).toHaveAttribute('href', `${STEPS[0]}.html`)
    await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Tutorial' })).toHaveAttribute('aria-current', 'page')
  })

  test('is linked from the site\'s home page', async ({ page }) => {
    await page.goto('/_site/index.html')
    await expect(page.locator('main a[href="tutorial/index.html"]')).toHaveText('tutorial')
  })

  for (const [index, step] of STEPS.entries()) {
    test.describe(`step ${index + 1}, ${step}`, () => {
      test('runs its program without errors, in a page with no files to add', async ({ page }) => {
        const errors = page_errors(page)
        await open_step(page, step)
        await expect(page.locator('.step-label')).toHaveText(`Step ${index + 1}`)
        await expect(page.locator('#code')).toHaveValue(program(step))
        await expect.poll(() => pixel(page, 5, 5)).toEqual(SPACE)
        await expect(page.locator('#errors')).toBeHidden()
        await expect(page.locator('#log .pg-log-error')).toHaveCount(0)
        await expect(page.locator('#files')).toBeHidden()
        await expect(page.getByRole('button', { name: 'Reset to this step' })).toBeVisible()
        expect(errors).toEqual([])
      })

      test('shows what is new, marked and folded away, unless it is short', async ({ page }) => {
        await page.goto(`/_site/tutorial/${step}.html`)
        const block = page.locator('details.pg-changes')
        const summary = block.locator('summary')
        if (index === 0) {
          await expect(summary).toHaveText(/^The whole program \(\d+ lines\)$/)
          await expect(page.locator('pre.diff ins')).toHaveCount(0)
          await expect(block).toHaveJSProperty('open', false)
        } else {
          // The new lines that are not blank, which the title counts
          const added = await page.locator('pre.diff ins').evaluateAll(lines => lines.filter(line => line.textContent.slice(1).trim() !== '').length)
          expect(added).toBeGreaterThan(0)
          await expect(summary).toHaveText(`What changed in the code (${added} new ${added === 1 ? 'line' : 'lines'})`)
          await expect(block).toHaveJSProperty('open', added <= 8)
          await expect(page.locator('pre.diff del .hljs-comment')).toHaveCount(0)
        }
      })

      test('opens with its mission beside the picture, and what to try first', async ({ page }) => {
        await open_step(page, step)
        await expect(page.locator('.pg-mission')).toHaveText(front(step, 'mission'))
        await expect(page.locator('.pg-facts')).toContainText(`About ${front(step, 'time')} minutes`)
        await expect(page.locator('.pg-try')).toContainText('Try it.')
        const [aside, preview, console_] = await Promise.all(['.pg-aside', '.pg-preview', '.pg-console'].map(selector => page.locator(selector).boundingBox()))
        // On a wide screen the mission is left of the picture, and they start together
        expect(aside.x + aside.width).toBeLessThanOrEqual(preview.x)
        expect(Math.abs(aside.y - preview.y)).toBeLessThan(40)
        expect(console_).toBeNull()
      })

      test('has no code in view when it opens, only the mission and the picture', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.goto(`/_site/tutorial/${step}.html`)
        await canvas(page).waitFor()
        const { top, bottom } = await page.locator('.pg-preview').evaluate(element => element.getBoundingClientRect().toJSON())
        expect(top).toBeGreaterThanOrEqual(0)
        expect(bottom).toBeLessThanOrEqual(800)
        // The listing of what changed is folded away, or short, and the editor is below
        const open = await page.locator('details.pg-changes').evaluate(element => element.open)
        if (!open) await expect(page.locator('pre.diff')).toBeHidden()
        const editor = await page.locator('.pg-editor').boundingBox()
        expect(editor.y).toBeGreaterThanOrEqual(bottom)
      })

      test('leads on to the steps before and after it', async ({ page }) => {
        await page.goto(`/_site/tutorial/${step}.html`)
        const nav = page.getByRole('navigation', { name: 'Steps' })
        await expect(nav.locator('.prev')).toHaveAttribute('href', index === 0 ? 'index.html' : `${STEPS[index - 1]}.html`)
        if (index === STEPS.length - 1) await expect(nav.locator('.next')).toHaveCount(0)
        else await expect(nav.locator('.next')).toHaveAttribute('href', `${STEPS[index + 1]}.html`)
      })

      test('resets to its program, after the code is changed', async ({ page }) => {
        await page.goto(`/_site/tutorial/${step}.html`)
        await page.locator('#code').fill('console.log("changed")')
        page.once('dialog', dialog => dialog.accept())
        await page.getByRole('button', { name: 'Reset to this step' }).click()
        await expect(page.locator('#code')).toHaveValue(program(step))
      })

      test('fits a phone screen, in the order mission, picture, changes, editor', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(`/_site/tutorial/${step}.html`)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
        const boxes = await Promise.all(['.pg-aside', '.pg-preview', '.pg-changes', '.pg-editor'].map(selector => page.locator(selector).boundingBox()))
        const ys = boxes.map(box => box.y)
        expect(ys).toEqual([...ys].sort((a, b) => a - b))
        expect(new Set(boxes.map(box => Math.round(box.x))).size).toBe(1)
      })
    })
  }
})

test.describe('the console', () => {
  test('stays out of sight until the app writes to it', async ({ page }) => {
    await open_step(page, STEPS[0])
    await expect(page.locator('.pg-console')).toBeHidden()
    await page.locator('#code').fill('console.log("hello from the cockpit")')
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(page.locator('.pg-console')).toBeVisible()
    await expect(page.locator('#log')).toContainText('hello from the cockpit')
  })
})

test.describe('what each step does', () => {
  test('1: a ship waits under the title', async ({ page }) => {
    await open_step(page, STEPS[0])
    await expect.poll(async () => (await drawn(page, 'DEBRIS FIELD')).length).toBeGreaterThan(0)
    expect(await pixel(page, 300, 288)).toEqual(COCKPIT)
    expect(await cockpit(page)).toEqual(['arc', 300, 288, 4])
  })

  test('2: the ship flies with the keys, and steers towards a held pointer', async ({ page }) => {
    await open_step(page, STEPS[1])
    await expect.poll(async () => (await cockpit(page))?.[1]).toBe(300)
    await hold(page, 'ArrowRight', 500)
    const [, x] = await cockpit(page)
    // 240 pixels a second for half a second, give or take a frame or two
    expect(x).toBeGreaterThan(380)
    expect(x).toBeLessThan(460)

    await move_to(page, 100, 150)
    await page.mouse.down()
    await expect.poll(async () => (await cockpit(page))?.[1], { timeout: 5000 }).toBeCloseTo(100, -1)
    await page.mouse.up()
    expect((await cockpit(page))[2]).toBeCloseTo(150 - 12, -1)
  })

  test('3: the ship stops at the edges of the screen', async ({ page }) => {
    await open_step(page, STEPS[2])
    await expect.poll(async () => (await cockpit(page))?.[1]).toBe(300)
    await hold(page, 'KeyA', 1500)
    await hold(page, 'KeyW', 1500)
    const [, x, y] = await cockpit(page)
    expect(x).toBe(20)
    expect(y).toBe(30 - 12)
  })

  test('4: one rock drifts down at a time, and another follows', async ({ page }) => {
    await open_step(page, STEPS[3], { steady_random: true })
    await expect.poll(async () => (await frames(page)).length, { timeout: 8000 }).toBeGreaterThan(200)
    const ys = (await rocks(page)).map(frame => {
      expect(frame.length).toBeLessThanOrEqual(1)
      return frame[0]?.[2]
    }).filter(y => y != null)
    // Down the middle at 130 pixels a second, then a new one from the top
    const restart = ys.findIndex((y, i) => i > 0 && y < ys[i - 1] - 100)
    expect(restart).toBeGreaterThan(10)
    expect(ys.slice(0, restart).every((y, i) => i === 0 || y >= ys[i - 1])).toBe(true)
    expect(ys[0]).toBeLessThan(0)
  })

  test('5: rocks keep coming, several on the screen at once, and leave at the bottom', async ({ page }) => {
    await open_step(page, STEPS[4], { steady_random: true })
    await expect.poll(async () => (await frames(page)).length, { timeout: 8000 }).toBeGreaterThan(300)
    const counts = (await rocks(page)).map(frame => frame.length)
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(3)
    // A rock takes about 2.9 s to cross, and one comes every 0.7 s, so the field stays at 4 or 5
    expect(Math.max(...counts)).toBeLessThanOrEqual(5)
  })

  test('6: three hits wreck the ship', async ({ page }) => {
    await open_step(page, STEPS[5], { steady_random: true })
    await expect.poll(async () => (await drawn(page, 'HULL 3')).length).toBeGreaterThan(0)
    // Every rock comes down the middle, onto the waiting ship
    await expect.poll(async () => (await drawn(page, 'HULL BREACHED')).length, { timeout: 10000 }).toBeGreaterThan(0)
    for (const hull of ['HULL 2', 'HULL 1', 'HULL 0'])
      expect((await drawn(page, hull)).length).toBeGreaterThan(0)
    const last = (await frames(page)).at(-2)
    expect(last.some(entry => entry[0] === 'arc' && entry[3] === 4)).toBe(false)
  })
})
