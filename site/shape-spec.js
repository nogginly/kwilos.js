// Reads the shapes Kwilos draws, and their properties, from the JSDoc
// typedefs in its source, so the playground's checks know every property
// as soon as it is documented.

/**
 * What a shape type accepts.
 * @typedef {object} ShapeSpec
 * @property {string[]} known Every property the type accepts
 * @property {string[]} required Properties the type must have
 * @property {string[]} numbers Properties that must be numbers when given
 */

/**
 * Returns the spec of each shape type documented in the sources: each
 * typedef with a required `type` property that is a single string, such as
 * `@property {'circle'} type`, keyed by that string.
 * @param {string[]} sources JavaScript source texts
 * @returns {Record<string, ShapeSpec>}
 */
export function shape_spec(sources) {
  const spec = {}
  for (const source of sources) {
    for (const [, block] of source.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
      if (!/@typedef\s+\{object\}/.test(block)) continue
      const properties = [...block.matchAll(/@property\s+\{(.+?)\}\s+(\[?)(\w+)/g)]
        .map(([, type, optional, name]) => ({ type, optional: optional === '[', name }))
      const type = properties.find(property => property.name === 'type' && !property.optional)
      const tag = type?.type.match(/^'([\w-]+)'$/)?.[1]
      if (!tag) continue
      spec[tag] = {
        known: properties.map(property => property.name),
        required: properties.filter(property => !property.optional && property.name !== 'type').map(property => property.name),
        numbers: properties.filter(property => property.type === 'number').map(property => property.name),
      }
    }
  }
  return spec
}
