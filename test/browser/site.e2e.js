import { test, expect } from '@playwright/test'
import { page_errors } from './helpers.js'

// The site is built into _site/, with its own copy of Kwilos from _dist/,
// by the test-browser script, before these tests run

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

  test('runs the samples with its own copy of Kwilos, and shows the CDN address in their source', async ({ page }) => {
    const requests = []
    page.on('request', request => requests.push(request.url()))
    await page.goto('/_site/samples/00-get-started/index.html')
    await page.locator('canvas').first().waitFor()
    await expect.poll(() => requests.some(url => url.endsWith('/_site/kwilos/kwilos.min.mjs'))).toBe(true)
    expect(requests.filter(url => url.includes('cdn.jsdelivr.net'))).toEqual([])

    await page.goto('/_site/index.html')
    const source = await page.locator('#sample-00-get-started pre').textContent()
    expect(source).toContain('https://cdn.jsdelivr.net/npm/kwilos.js@')
    expect(source).not.toContain('../../kwilos/')
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

  test('runs a sample that imports a module with its own copy of it, and shows the module\'s CDN address in the source', async ({ page }) => {
    const errors = page_errors(page)
    const requests = []
    page.on('request', request => requests.push(request.url()))
    await page.goto('/_site/samples/08-aseprite/index.html')
    await page.locator('canvas').waitFor()
    await expect.poll(() => requests.some(url => url.endsWith('/_site/kwilos/aseprite.min.mjs'))).toBe(true)
    await expect.poll(() => requests.some(url => url.endsWith('/_site/samples/08-aseprite/assets/Uncle.png'))).toBe(true)
    expect(requests.filter(url => url.includes('cdn.jsdelivr.net'))).toEqual([])
    expect(errors).toEqual([])

    await page.goto('/_site/index.html')
    const source = await page.locator('#sample-08-aseprite-source pre').textContent()
    expect(source).toContain('https://cdn.jsdelivr.net/npm/kwilos.js@')
    expect(source).toMatch(/kwilos\.js@[\d.]+\/_dist\/aseprite\.min\.mjs/)
    expect(source).not.toContain('../../kwilos/')
  })

  test('shows a sample\'s data files in tabs of their own, after Preview and Source', async ({ page }) => {
    await page.goto('/_site/index.html')
    const tabs = (name) => page.locator(`#sample-${name} [role="tab"]`).allTextContents()
    expect(await tabs('00-get-started')).toEqual(['Preview', 'Source'])
    expect(await tabs('08-aseprite')).toEqual(['Preview', 'Source', 'Uncle.json'])

    const sample = page.locator('#sample-08-aseprite')
    const data = sample.locator('#sample-08-aseprite-data-0')
    await expect(data).toBeHidden()

    await sample.getByRole('tab', { name: 'Uncle.json' }).click()
    await expect(data).toBeVisible()
    await expect(data).toContainText('samples/08-aseprite/assets/Uncle.json')
    await expect(data).toContainText('"frameTags"')
    await expect(data.locator('code .hljs-attr').first()).toBeVisible()
    await expect(sample.locator('#sample-08-aseprite-preview')).toBeHidden()

    await page.keyboard.press('ArrowRight')
    await expect(sample.getByRole('tab', { name: 'Preview' })).toBeFocused()
    await expect(sample.locator('#sample-08-aseprite-preview')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(sample.getByRole('tab', { name: 'Uncle.json' })).toBeFocused()
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

  for (const path of ['index.html', 'api.html', 'playground.html']) {
    test(`fits a phone screen: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/_site/${path}`)
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBe(0)
    })
  }
})
