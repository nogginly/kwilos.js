// The playground's checks: they look over each scene an app's tick returns
// for mistakes that Kwilos would pass over in silence, such as a NaN position
// or a misspelt property, and describe each one in words a beginner can act on.
// A shape made with a mistake is noted with the line of the app that made it.

/** @import { ShapeSpec } from './shape-spec.js' */

// Names people often write for a property, and the name Kwilos uses
const ALIASES = {
  color: 'fill_color',
  colour: 'fill_color',
  fill: 'fill_color',
  stroke: 'stroke_color',
  r: 'radius',
  size: 'font_size',
  font: 'font_name',
  width: 'w',
  height: 'h',
  align: 'text_align',
  baseline: 'text_baseline',
  src: 'path',
  image: 'path',
}

const MAX_PROBLEMS = 20

/**
 * A mistake found in a scene; `key` is the same for the same mistake in
 * every frame, so it can be reported once.
 * @typedef {object} Problem
 * @property {string} key
 * @property {string} text
 * @property {string} [hint] What usually causes it, which is the same for every mistake of its kind
 * @property {object} entity The shape with the mistake
 */

/**
 * Returns the mistakes in a scene: shapes missing a property they need,
 * numbers that are not numbers, and properties Kwilos ignores that look
 * like ones it uses. Containers' scenes are checked too.
 * @param {unknown} scene What tick returned
 * @param {Record<string, ShapeSpec>} spec
 * @returns {Problem[]}
 */
export function scene_problems(scene, spec) {
  const problems = []
  if (Array.isArray(scene)) walk(scene, spec, problems)
  return problems
}

/**
 * Returns a tick that calls `tick`, reports each new mistake in the scenes
 * it returns once, by calling `report`, with each hint only the first time
 * it applies, and throws an error that explains the likely cause when tick
 * returns nothing. A report has the line that made the shape, if `line_of`
 * knows it.
 * @param {(env: any) => unknown} tick
 * @param {Record<string, ShapeSpec>} spec
 * @param {(text: string, line?: number) => void} report
 * @param {(entity: object) => number | undefined} [line_of]
 * @returns {(env: any) => any}
 */
export function checked_tick(tick, spec, report, line_of = () => undefined) {
  const reported = new Set()
  const hinted = new Set()
  return (env) => {
    const scene = tick(env)
    if (scene === undefined)
      throw new TypeError('tick returned nothing, so there is nothing to draw. Does it end with return and the scene, as in return [ship, rocks]?')
    if (reported.size < MAX_PROBLEMS) {
      for (const { key, text, hint, entity } of scene_problems(scene, spec)) {
        if (reported.has(key) || reported.size >= MAX_PROBLEMS) continue
        reported.add(key)
        let message = hint && !hinted.has(hint) ? `${text} ${hint}` : text
        if (hint) hinted.add(hint)
        if (reported.size === MAX_PROBLEMS) message += ' (No more problems will be reported until the next Run.)'
        report(message, line_of(entity))
      }
    }
    return scene
  }
}

/**
 * Returns a shape factory that makes shapes as `factory` does, and, for a
 * shape made with a mistake, keeps the line that `locate` finds in `lines`.
 * `locate` is called from within the factory, so it can read the line of
 * its caller from a stack trace.
 * @template {(props: any) => object} F
 * @param {F} factory
 * @param {Record<string, ShapeSpec>} spec
 * @param {WeakMap<object, number>} lines
 * @param {() => number | undefined} locate
 * @returns {F}
 */
export function checked_factory(factory, spec, lines, locate) {
  return /** @type {F} */ ((props) => {
    const entity = factory(props)
    const shape = spec[entity.type]
    if (shape) {
      const problems = []
      check_shape(entity, shape, problems)
      const line = problems.length > 0 ? locate() : undefined
      if (line !== undefined) lines.set(entity, line)
    }
    return entity
  })
}

/**
 * Returns the line of the first call in a stack trace that is in the
 * script at `url`, as Chrome, Firefox and Safari write stack traces, or
 * undefined if none is.
 * @param {string | undefined} stack As in `new Error().stack`
 * @param {string} url
 * @returns {number | undefined}
 */
export function line_in(stack, url) {
  if (!url) return undefined
  for (const frame of String(stack ?? '').split('\n')) {
    const at = frame.indexOf(url)
    if (at < 0) continue
    const found = frame.slice(at + url.length).match(/^:(\d+):\d+/)
    if (found) return Number(found[1])
  }
  return undefined
}

// Steps: for each entry, skip what Kwilos skips, go into nested lists and
// containers, and check each shape of a known type against its spec
function walk(scene, spec, problems) {
  for (const entry of scene) {
    if (entry == null || entry === false) continue
    if (Array.isArray(entry)) { walk(entry, spec, problems); continue }
    if (typeof entry !== 'object') continue
    const shape = spec[entry.type]
    if (!shape) continue
    check_shape(entry, shape, problems)
    if (entry.type === 'container' && Array.isArray(entry.scene)) walk(entry.scene, spec, problems)
  }
}

function check_shape(entity, { known, required, numbers }, problems) {
  const name = describe(entity)
  for (const property of required) {
    if (entity[property] === undefined)
      problems.push({ key: `${entity.type}.${property}:missing`, text: `${name} has no ${property}, so Kwilos cannot draw it.`, entity })
  }
  for (const property of numbers) {
    const value = entity[property]
    if (value === undefined || (typeof value === 'number' && Number.isFinite(value))) continue
    problems.push({ key: `${entity.type}.${property}:number`, text: `${name} has ${property}: ${show(value)}.`, hint: number_hint(value), entity })
  }
  for (const property of Object.keys(entity)) {
    if (known.includes(property)) continue
    const meant = ALIASES[property] && known.includes(ALIASES[property]) ? ALIASES[property] : closest(property, known)
    if (meant)
      problems.push({ key: `${entity.type}.${property}:unknown`, text: `${name} has ${property}, which Kwilos ignores. Did you mean ${meant}?`, entity })
  }
}

function number_hint(value) {
  if (typeof value === 'number' && Number.isNaN(value))
    return 'NaN means "not a number": it comes from maths with something undefined, so check the spelling of the names used to work it out, such as env.dt.'
  if (typeof value === 'number')
    return 'An infinite number usually comes from dividing by zero.'
  if (typeof value === 'string')
    return 'That is text, not a number: leave out the quotes, or turn it into a number with Number().'
  return 'It needs to be a number.'
}

// Returns a shape as it appears in a message, by its type and id, if it has one
function describe(entity) {
  return entity.id == null ? `A ${entity.type}` : `The ${entity.type} with id ${show(entity.id)}`
}

function show(value) {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || value == null) return String(value)
  return typeof value
}

// Returns the known name that `property` is a slip of the keyboard away from,
// if there is just one; a property of a few letters is too short to judge
function closest(property, known) {
  if (property.length < 4) return null
  const near = known.filter(name => distance(property.toLowerCase(), name) <= 2)
  return near.length === 1 ? near[0] : null
}

// The number of single-letter edits, or swaps of neighbouring letters, that
// turn one word into the other
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}
