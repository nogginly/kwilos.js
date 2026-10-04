import { describe, it, expect, vi, afterEach } from 'vitest'
import { load_image } from '../src/kwilos/initialize.js'
import { BAL } from '../src/kwilos/bal.js'
import { attached_system } from './support/system.js'

afterEach(() => vi.restoreAllMocks())

describe('load_image', () => {
  it('starts loading an image once, however often it is asked for', async () => {
    const img = { width: 1, height: 1 }
    const create_image = vi.spyOn(BAL, 'create_image').mockResolvedValue(img)
    const sys = attached_system()

    expect(load_image(sys, 'a.png')).toBeUndefined()
    expect(load_image(sys, 'a.png')).toBeUndefined()
    await sys.atlas['a.png']

    expect(load_image(sys, 'a.png')).toBe(img)
    expect(create_image).toHaveBeenCalledTimes(1)
  })

  it('reports a failed load once and does not retry it', async () => {
    const failure = new Error('Kwilos: could not load image missing.png')
    const create_image = vi.spyOn(BAL, 'create_image').mockRejectedValue(failure)
    const console_error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sys = attached_system()

    load_image(sys, 'missing.png')
    await vi.waitFor(() => expect(console_error).toHaveBeenCalledWith(failure))
    expect(load_image(sys, 'missing.png')).toBeUndefined()

    expect(create_image).toHaveBeenCalledTimes(1)
    expect(console_error).toHaveBeenCalledTimes(1)
  })
})
