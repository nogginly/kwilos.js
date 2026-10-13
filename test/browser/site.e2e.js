import { test, expect } from '@playwright/test'
import { page_errors } from './helpers.js'

// The site is built into _site/ with the samples importing src/, by the
// test-browser script, before these tests run

const SAMPLES = ['00-get-started', '01-different-types', '02-two-canvases', '03-drag-and-drop']

test.describe('site', () => {
  test('the opening page runs every sample', async ({ page }) => {
    const errors = page_errors(page)
    await page.goto('/_site/index.html')
    await expect(page).toHaveTitle(/Kwilos/)

    for (const name of SAMPLES) {
      const frame_element = page.locator(`#sample-${name} iframe`)
      await frame_element.scrollIntoViewIfNeeded()
      const frame = frame_element.contentFrame()
      // The first canvas has drawn when its centre pixel is opaque
      await expect.poll(() => frame.locator('canvas').first().evaluate(canvas =>
        canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data[3]
      )).toBe(255)
    }
    expect(errors).toEqual([])
  })

  for (const width of [1280, 390]) {
    test(`shows every sample whole, without scrolling its frame, ${width} wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/_site/index.html')
      for (const name of SAMPLES) {
        const frame_element = page.locator(`#sample-${name} iframe`)
        await frame_element.scrollIntoViewIfNeeded()
        const frame = frame_element.contentFrame()
        await frame.locator('canvas').first().waitFor()
        const overflow = await frame.locator('html').evaluate(html => ({
          x: html.scrollWidth - html.clientWidth,
          y: html.scrollHeight - html.clientHeight,
        }))
        expect(overflow, name).toEqual({ x: 0, y: 0 })
      }
    })
  }

  test('highlights the source code', async ({ page }) => {
    await page.goto('/_site/index.html')
    await page.locator('#sample-03-drag-and-drop').getByRole('tab', { name: 'Source' }).click()
    const code = page.locator('#sample-03-drag-and-drop-source code')
    await expect(code.locator('.hljs-keyword').first()).toBeVisible()
    await expect(code.locator('.hljs-comment').first()).toBeVisible()
    await expect(code).toContainText('Kwilos.attach')
  })

  test('switches a sample between its preview and source', async ({ page }) => {
    await page.goto('/_site/index.html')
    const sample = page.locator('#sample-00-get-started')
    const preview = sample.locator('#sample-00-get-started-preview')
    const source = sample.locator('#sample-00-get-started-source')

    await expect(preview).toBeVisible()
    await expect(source).toBeHidden()

    await sample.getByRole('tab', { name: 'Source' }).click()
    await expect(source).toBeVisible()
    await expect(source).toContainText('Kwilos.attach')
    await expect(preview).toBeHidden()

    await page.keyboard.press('ArrowLeft')
    await expect(preview).toBeVisible()
    await expect(sample.getByRole('tab', { name: 'Preview' })).toBeFocused()
  })

  test('switches theme, and remembers the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/_site/index.html')
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    const light = await background()

    await page.getByRole('button', { name: /light and dark/ }).click()
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    expect(await background()).not.toBe(light)

    await page.reload()
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
  })

  test('links the API contents to its sections', async ({ page }) => {
    await page.goto('/_site/api.html')
    const targets = await page.locator('nav[aria-label="Contents"] a').evaluateAll(links =>
      links.map(link => link.getAttribute('href')))
    expect(targets.length).toBeGreaterThan(5)
    for (const target of targets)
      await expect(page.locator(target), target).toHaveCount(1)
    await expect(page.locator('#hit-testing')).toHaveText('Hit-Testing')
  })

  for (const path of ['index.html', 'api.html']) {
    test(`fits a phone screen: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/_site/${path}`)
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBe(0)
    })
  }
})
