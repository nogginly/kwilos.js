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

const app = (page) => page.frameLocator('#stage iframe')
const canvas = (page) => app(page).locator('canvas')
// The colour of a pixel of the app's canvas, or null while the app is not there yet
const pixel = (page, x, y) => canvas(page).evaluate(
  (element, [x, y]) => Array.from(element.getContext('2d').getImageData(x, y, 1, 1).data), [x, y], { timeout: 2000 }
).catch(() => null)
// What the app has drawn as text so far, as [text, x, y]
const texts = (page) => canvas(page).evaluate(() => window.drawn_texts, null, { timeout: 2000 }).catch(() => [])
const drawn = async (page, text) => (await texts(page)).filter(entry => entry[0] === text)

// Opens a step with its app on show, and records the text it draws
async function open_step(page, step) {
  await page.addInitScript(() => {
    window.drawn_texts = []
    const fill_text = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...rest) {
      if (window.drawn_texts.length < 5000) window.drawn_texts.push([text, x, y])
      return fill_text.call(this, text, x, y, ...rest)
    }
  })
  await page.goto(`/_site/tutorial/${step}.html`)
  await page.locator('#stage').scrollIntoViewIfNeeded()
  await canvas(page).waitFor()
}

// Moves the mouse to a place on the app's canvas, in the canvas's own pixels
async function move_to(page, x, y) {
  const box = await canvas(page).boundingBox()
  await page.mouse.move(box.x + x * box.width / 600, box.y + y * box.height / 360)
}

const SKY = [135, 206, 235, 255]
const GRASS = [34, 139, 34, 255]

test.describe('the tutorial', () => {
  test('lists its steps on its home page, and starts with the first', async ({ page }) => {
    await page.goto('/_site/tutorial/index.html')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nut Catcher')
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
        await expect.poll(() => pixel(page, 5, 5)).toEqual(SKY)
        expect(await pixel(page, 5, 350)).toEqual(GRASS)
        await expect(page.locator('#errors')).toBeHidden()
        await expect(page.locator('#log .pg-log-error')).toHaveCount(0)
        await expect(page.locator('#files')).toBeHidden()
        await expect(page.getByRole('button', { name: 'Reset to this step' })).toBeVisible()
        expect(errors).toEqual([])
      })

      test('shows what is new, marked, unless it is the first step', async ({ page }) => {
        await page.goto(`/_site/tutorial/${step}.html`)
        const marked = page.locator('pre.diff ins')
        if (index === 0) {
          await expect(page.getByRole('heading', { name: 'The program' })).toBeVisible()
          await expect(marked).toHaveCount(0)
        } else {
          await expect(page.getByRole('heading', { name: "What's new" })).toBeVisible()
          expect(await marked.count()).toBeGreaterThan(0)
          await expect(page.locator('pre.diff del .hljs-comment')).toHaveCount(0)
        }
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

      test('fits a phone screen', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(`/_site/tutorial/${step}.html`)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
      })
    })
  }
})

test.describe('what each step does', () => {
  test('1: a squirrel stands on the grass', async ({ page }) => {
    await open_step(page, STEPS[0])
    await expect.poll(async () => (await drawn(page, '🐿️')).length).toBeGreaterThan(0)
    const [, x, y] = (await drawn(page, '🐿️')).at(-1)
    expect([x, y]).toEqual([300, 320])
  })

  test('2: the squirrel goes where the mouse goes, and stays when it stops', async ({ page }) => {
    await open_step(page, STEPS[1])
    await move_to(page, 100, 200)
    await expect.poll(async () => (await drawn(page, '🐿️')).at(-1)?.[1]).toBeCloseTo(100, -1)
    await move_to(page, 480, 200)
    await expect.poll(async () => (await drawn(page, '🐿️')).at(-1)?.[1]).toBeCloseTo(480, -1)
    const before = (await drawn(page, '🐿️')).length
    await expect.poll(async () => (await drawn(page, '🐿️')).length).toBeGreaterThan(before + 3)
    expect((await drawn(page, '🐿️')).at(-1)[1]).toBeCloseTo(480, -1)
  })

  test('3: an oak stands behind the squirrel, with leaves above its trunk', async ({ page }) => {
    await open_step(page, STEPS[2])
    const TRUNK = [139, 69, 19, 255]
    const LEAVES = [0, 100, 0, 255]
    await expect.poll(() => pixel(page, 300, 200)).toEqual(TRUNK)
    expect(await pixel(page, 300, 40)).toEqual(LEAVES)
    expect(await pixel(page, 150, 90)).toEqual(LEAVES)
    expect(await pixel(page, 80, 200)).toEqual(SKY)
  })

  test('4: a nut falls, lands in the grass, and drops again', async ({ page }) => {
    await open_step(page, STEPS[3])
    await expect.poll(async () => (await drawn(page, '🌰')).length, { timeout: 8000 }).toBeGreaterThan(150)
    const ys = (await drawn(page, '🌰')).map(entry => entry[2])
    // It falls (the y values rise), then drops again from the top
    const dropped = ys.findIndex((y, i) => i > 0 && y < ys[i - 1] - 100)
    expect(dropped).toBeGreaterThan(10)
    expect(ys.slice(0, dropped).every((y, i) => i === 0 || y >= ys[i - 1])).toBe(true)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(110)
    expect(Math.max(...ys)).toBeGreaterThan(300)
    expect(Math.max(...ys)).toBeLessThanOrEqual(351)
  })
})
