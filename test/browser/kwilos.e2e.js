import { test, expect } from '@playwright/test'
import { open_harness, expect_pixel, pixel, frames, page_errors, touchscreen } from './helpers.js'

const RED = [255, 0, 0, 255]

test.beforeEach(async ({ page }) => open_harness(page))

test.describe('attaching', () => {
  test('throws a TypeError when no canvas matches', async ({ page }) => {
    const message = await page.evaluate(() =>
      window.kwilos.Kwilos.attach('#missing', () => []).catch(error => `${error.name}: ${error.message}`))
    expect(message).toBe('TypeError: Kwilos: no canvas found for "#missing"')
  })

  test('rejects when a preloaded image fails to load', async ({ page }) => {
    const message = await page.evaluate(() =>
      window.kwilos.Kwilos.attach('#c', () => [], { preload_images: ['missing.png'] }).catch(error => error.message))
    expect(message).toBe('Kwilos: could not load image missing.png')
  })
})

test.describe('drawing', () => {
  test('redraws the last scene after the canvas is resized', async ({ page }) => {
    await page.evaluate(async () => {
      const { Kwilos, rect } = window.kwilos
      let drawn = false
      await Kwilos.attach('#c', () => {
        if (drawn) return null
        drawn = true
        return [rect({ x: 0, y: 0, w: 1000, h: 1000, fill_color: 'red' })]
      })
    })
    await expect_pixel(page, '#c', 5, 5, RED)

    await page.evaluate(() => { document.querySelector('#c').width = 300 })
    await expect_pixel(page, '#c', 250, 5, RED)
  })

  test('draws a container clipped to its size', async ({ page }) => {
    await page.evaluate(async () => {
      const { Kwilos, container, rect } = window.kwilos
      await Kwilos.attach('#c', () => [
        container({ x: 50, y: 50, w: 20, h: 20, clip: true, scene: [
          rect({ x: 0, y: 0, w: 100, h: 100, fill_color: 'red' }),
        ]}),
      ])
    })
    await expect_pixel(page, '#c', 60, 60, RED)
    expect(await pixel(page, '#c', 80, 80)).toEqual([0, 0, 0, 255])
  })
})

test.describe('input', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(async () => {
      window.typed = []
      window.clicks = []
      window.kw = await window.kwilos.Kwilos.attach('#c', (env) => {
        window.env = env
        window.typed.push(...env.inputs.key.typed.map(k => k.text))
        window.clicks.push(...env.inputs.mouse.clicks)
        return null
      }, { context_menu: false })
    })
  })

  const mouse = (page) => page.evaluate(() => ({ ...window.env.inputs.mouse }))

  test('tracks the pointer over the canvas', async ({ page }) => {
    await page.mouse.move(30, 40)
    await expect.poll(() => mouse(page)).toMatchObject({ x: 30, y: 40 })
  })

  test('keeps a button pressed until released, even outside the canvas', async ({ page }) => {
    await page.mouse.move(100, 100)
    await page.mouse.down()
    await expect.poll(() => mouse(page)).toMatchObject({ button_left: true })

    await page.mouse.move(400, 400)
    await frames(page)
    expect(await mouse(page)).toMatchObject({ button_left: true })

    await page.mouse.up()
    await expect.poll(() => mouse(page)).toMatchObject({ button_left: false })
  })

  const clicks = (page) => page.evaluate(() => window.clicks)

  test('records a click too quick for the button state to show', async ({ page }) => {
    await page.mouse.click(30, 40)
    await expect.poll(() => clicks(page)).toEqual([{ button: 'left', x: 30, y: 40 }])
  })

  test('records right and middle clicks', async ({ page }) => {
    await page.mouse.click(10, 20, { button: 'right' })
    await page.mouse.click(50, 60, { button: 'middle' })
    await expect.poll(() => clicks(page)).toEqual([
      { button: 'right', x: 10, y: 20 },
      { button: 'middle', x: 50, y: 60 },
    ])
  })

  test('keeps every click within a single frame', async ({ page }) => {
    // Both clicks run in one task, so no frame can come between them
    await page.evaluate(() => {
      const c = document.querySelector('#c')
      for (const [x, y] of [[5, 6], [7, 8]])
        c.dispatchEvent(new MouseEvent('click', { button: 0, clientX: x, clientY: y, bubbles: true }))
    })
    await expect.poll(() => clicks(page)).toEqual([
      { button: 'left', x: 5, y: 6 },
      { button: 'left', x: 7, y: 8 },
    ])
  })

  test('does not count a press released off the canvas as a click', async ({ page }) => {
    await page.mouse.move(100, 100)
    await page.mouse.down()
    await page.mouse.move(400, 400)
    await page.mouse.up()
    await frames(page)
    expect(await clicks(page)).toEqual([])
  })

  test('records held keys and typed characters', async ({ page }) => {
    const typed = () => page.evaluate(() => window.typed)

    await page.keyboard.down('Shift')
    await page.keyboard.down('KeyA')
    await expect.poll(typed).toEqual(['A'])
    expect(await page.evaluate(() => window.env.inputs.key)).toMatchObject({
      shift: true,
      pressed: { KeyA: { code: 'KeyA', text: 'A' } },
    })

    // keys typed faster than the frames are all kept, in order
    await page.keyboard.up('KeyA')
    await page.keyboard.up('Shift')
    await page.keyboard.type('hi')
    await expect.poll(typed).toEqual(['A', 'h', 'i'])
  })

  test('keeps every key typed within a single frame', async ({ page }) => {
    // Both key presses run in one task, so no frame can come between them
    await page.evaluate(() => {
      for (const [code, key] of [['KeyH', 'h'], ['KeyI', 'i']])
        document.dispatchEvent(new KeyboardEvent('keydown', { code, key }))
    })
    await expect.poll(() => page.evaluate(() => window.typed)).toEqual(['h', 'i'])
  })

  test('releases buttons and keys when the window loses focus', async ({ page }) => {
    await page.mouse.move(100, 100)
    await page.mouse.down()
    await page.keyboard.down('KeyA')
    await expect.poll(() => mouse(page)).toMatchObject({ button_left: true })

    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect.poll(() => page.evaluate(() => window.env.inputs)).toMatchObject({
      mouse: { button_left: false },
      key: { pressed: {} },
    })
  })

  test('suppresses the context menu when asked', async ({ page }) => {
    const prevented = await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      document.querySelector('#c').dispatchEvent(event)
      return event.defaultPrevented
    })
    expect(prevented).toBe(true)
  })
})

test.describe('hit-testing', () => {
  const SHEET = '../../../samples/01-different-types/assets/female_tilesheet.png'

  test.beforeEach(async ({ page }) => {
    await page.evaluate(async (SHEET) => {
      const { Kwilos, rect, circle, label, image, container } = window.kwilos
      window.kw = await Kwilos.attach('#c', (env) => {
        window.env = env
        return [
          rect({ id: 'background', x: 0, y: 0, w: 200, h: 200, fill_color: 'navy' }),
          image({ id: 'sheet', path: SHEET, x: 0, y: 150, w: 40, h: 40 }),
          label({ id: 'title', x: 100, y: 40, text: 'Kwilos', font_size: 20, fill_color: 'white' }),
          container({ x: 100, y: 100, w: 40, h: 40, clip: true, scene: [
            circle({ id: 'button', x: 20, y: 20, radius: 30, fill_color: 'red' }),
          ]}),
        ]
      }, { preload_images: [SHEET] })
    }, SHEET)
    await frames(page)
  })

  const hit_at = (page, x, y) => page.evaluate(([x, y]) => window.env.hit({ x, y })?.id ?? null, [x, y])

  test('finds the shape on top, through containers and their clips', async ({ page }) => {
    expect(await hit_at(page, 120, 120)).toBe('button')
    expect(await hit_at(page, 95, 120)).toBe('background')   // in the circle, outside the clip
    expect(await hit_at(page, 20, 170)).toBe('sheet')
    expect(await hit_at(page, 300, 300)).toBeNull()
  })

  test('measures a label by the ink of its text', async ({ page }) => {
    expect(await hit_at(page, 100, 32)).toBe('title')
    expect(await hit_at(page, 100, 5)).toBe('background')
    expect(await hit_at(page, 10, 32)).toBe('background')
  })

  test('tests the mouse position by default', async ({ page }) => {
    await page.mouse.move(120, 120)
    await expect.poll(() => page.evaluate(() => window.env.hit()?.id)).toBe('button')
  })

  test('works on a canvas displayed at another size', async ({ page }) => {
    await page.evaluate(() => { document.querySelector('#c').style.width = '400px'; document.querySelector('#c').style.height = '400px' })
    await page.mouse.move(240, 240)   // canvas pixel (120, 120)
    await expect.poll(() => page.evaluate(() => [window.env.inputs.mouse.x, window.env.inputs.mouse.y])).toEqual([120, 120])
    expect(await page.evaluate(() => window.env.hit()?.id)).toBe('button')
  })
})

test.describe('touch', () => {
  test.use({ hasTouch: true })

  // Attaches Kwilos to #c, keeping each frame's mouse state in window.frames_seen
  const attach = (config) => async ({ page }) => page.evaluate(async (config) => {
    window.frames_seen = []
    window.clicks = []
    window.kw = await window.kwilos.Kwilos.attach('#c', (env) => {
      const { x, y, button_left, pointer_type } = env.inputs.mouse
      window.frames_seen.push({ x, y, button_left, pointer_type })
      window.clicks.push(...env.inputs.mouse.clicks)
      return null
    }, config)
  }, config)

  const last_frame = (page) => page.evaluate(() => window.frames_seen.at(-1))

  test('follows a touch drag as the left button', async ({ page }) => {
    await attach({ touch_scroll: false })({ page })
    const touch = await touchscreen(page)

    await touch.start(20, 30)
    await expect.poll(() => last_frame(page)).toMatchObject({ x: 20, y: 30, button_left: true, pointer_type: 'touch' })
    for (const step of [1, 2, 3, 4])
      await touch.move(20 + step * 25, 30 + step * 20)
    await expect.poll(() => last_frame(page)).toMatchObject({ x: 120, y: 110, button_left: true })

    await touch.end()
    await expect.poll(() => last_frame(page)).toMatchObject({ button_left: false })
  })

  test('records a tap as a click', async ({ page }) => {
    await attach({})({ page })
    await page.touchscreen.tap(60, 70)
    await expect.poll(() => page.evaluate(() => window.clicks)).toEqual([{ button: 'left', x: 60, y: 70 }])
  })

  test('leaves touch scrolling to the page unless touch_scroll is false', async ({ page }) => {
    const touch_action = () => page.evaluate(() => getComputedStyle(document.querySelector('#c')).touchAction)
    await attach({})({ page })
    expect(await touch_action()).toBe('auto')

    await page.evaluate(() => window.kw.detach())
    await attach({ touch_scroll: false })({ page })
    expect(await touch_action()).toBe('none')
    await page.evaluate(() => window.kw.detach())
    expect(await touch_action()).toBe('auto')
  })
})

test.describe('lifecycle', () => {
  const count_frames = (config) => async ({ page }) => page.evaluate(async (config) => {
    window.frames_run = 0
    window.handled = []
    if (config.on_error) config.on_error = (error) => window.handled.push(error.message)
    window.kw = await window.kwilos.Kwilos.attach('#c', () => {
      window.frames_run++
      if (config.fail) throw new Error('tick failed')
      return []
    }, config)
  }, config)

  const frames_run = (page) => page.evaluate(() => window.frames_run)

  test('detach stops the frames and the input', async ({ page }) => {
    await page.evaluate(async () => {
      window.frames_run = 0
      window.kw = await window.kwilos.Kwilos.attach('#c', (env) => {
        window.frames_run++
        window.env = env
        return []
      })
    })
    await page.mouse.move(10, 10)
    await expect.poll(() => page.evaluate(() => window.env.inputs.mouse.x)).toBe(10)

    await page.evaluate(() => window.kw.detach())
    const at_detach = await frames_run(page)
    await page.mouse.move(50, 50)
    await frames(page, 5)

    expect(await frames_run(page)).toBe(at_detach)
    expect(await page.evaluate(() => window.env.inputs.mouse.x)).toBe(10)
    await page.evaluate(() => window.kw.detach())   // a second detach does nothing
  })

  test('an error without on_error stops the frames and reaches the console', async ({ page }) => {
    const errors = page_errors(page)
    await count_frames({ fail: true })({ page })
    await expect.poll(() => errors).toEqual(['tick failed'])
    await frames(page, 5)
    expect(await frames_run(page)).toBe(1)
  })

  test('on_error receives errors and the frames continue', async ({ page }) => {
    const errors = page_errors(page)
    await count_frames({ fail: true, on_error: true })({ page })
    await expect.poll(() => frames_run(page)).toBeGreaterThan(3)
    expect((await page.evaluate(() => window.handled)).length).toBeGreaterThan(3)
    expect(errors).toEqual([])
  })
})
