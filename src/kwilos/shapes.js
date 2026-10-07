/* Don't use sloppy JS. */ "use strict";

// Factories for the entities a `tick` function returns. Each takes the
// shape's properties and returns a plain object tagged with its `type`.

/**
 * A scene: entities drawn in order. Nested arrays are drawn in place, and
 * `null`, `undefined` and `false` entries are skipped.
 * @typedef {Array<Entity | Scene | null | undefined | false>} Scene
 */

/**
 * @typedef {Circle | Rect | Label | Image | Tile | Container} Entity
 */

/**
 * @typedef {object} Circle
 * @property {'circle'} type
 * @property {string | number} [id] Identifies the shape, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {number} x Centre
 * @property {number} y Centre
 * @property {number} radius
 * @property {string} [fill_color] CSS colour; omit for no fill
 * @property {string} [stroke_color] CSS colour; omit for no outline
 */

/**
 * @typedef {object} Rect
 * @property {'rect'} type
 * @property {string | number} [id] Identifies the shape, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {number} x Top-left corner
 * @property {number} y Top-left corner
 * @property {number} w
 * @property {number} h
 * @property {string} [fill_color] CSS colour; omit for no fill
 * @property {string} [stroke_color] CSS colour; omit for no outline
 */

/**
 * @typedef {object} Label
 * @property {'label'} type
 * @property {string | number} [id] Identifies the shape, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {number} x Anchor point, see `text_align`
 * @property {number} y Anchor point, see `text_baseline`
 * @property {string} text
 * @property {string} [font_name] Defaults to "serif" when `font_size` is given, else the canvas font
 * @property {number} [font_size] In points; defaults to 14 when `font_name` is given, else the canvas font
 * @property {string} [fill_color] CSS colour; omit for no fill
 * @property {string} [stroke_color] CSS colour; omit for no outline
 * @property {CanvasTextAlign} [text_align] Defaults to "center"
 * @property {CanvasTextBaseline} [text_baseline] Defaults to "alphabetic"
 */

/**
 * @typedef {object} Image
 * @property {'image'} type
 * @property {string | number} [id] Identifies the shape, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {string} path Image URL; preload it via the `preload_images` config to draw it on the first frame
 * @property {number} x Top-left corner
 * @property {number} y Top-left corner
 * @property {number} [w] Defaults to `source_w`
 * @property {number} [h] Defaults to `source_h`
 * @property {number} [source_x] Region of the image to draw; defaults to 0
 * @property {number} [source_y] Region of the image to draw; defaults to 0
 * @property {number} [source_w] Region of the image to draw; defaults to the image width
 * @property {number} [source_h] Region of the image to draw; defaults to the image height
 */

/**
 * A tile from a tile sheet, sized either by `tile_w` and `tile_h`, or by
 * `tile_rows` and `tile_cols`.
 * @typedef {object} Tile
 * @property {'tile'} type
 * @property {string | number} [id] Identifies the shape, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {string} path Tile sheet URL
 * @property {number} tile_index Counting left to right, then top to bottom, from 0
 * @property {number} x Top-left corner
 * @property {number} y Top-left corner
 * @property {number} [w] Defaults to the tile width
 * @property {number} [h] Defaults to the tile height
 * @property {number} [tile_w]
 * @property {number} [tile_h]
 * @property {number} [tile_rows]
 * @property {number} [tile_cols]
 */

/**
 * A layer: draws its `scene` with the origin moved to (`x`, `y`).
 * @typedef {object} Container
 * @property {'container'} type
 * @property {string | number} [id] Identifies the shape, e.g. to compare with what `env.hit` returns; Kwilos does not use it
 * @property {Scene} scene
 * @property {number} [x] Defaults to 0
 * @property {number} [y] Defaults to 0
 * @property {boolean} [clip] Hides drawing outside `w` by `h`
 * @property {number} [w] Required when `clip` is set
 * @property {number} [h] Required when `clip` is set
 */

/** @param {Omit<Circle, 'type'>} props @returns {Circle} */
export const circle = (props) => ({ ...props, type: 'circle' })

/** @param {Omit<Rect, 'type'>} props @returns {Rect} */
export const rect = (props) => ({ ...props, type: 'rect' })

/** @param {Omit<Label, 'type'>} props @returns {Label} */
export const label = (props) => ({ ...props, type: 'label' })

/** @param {Omit<Image, 'type'>} props @returns {Image} */
export const image = (props) => ({ ...props, type: 'image' })

/** @param {Omit<Tile, 'type'>} props @returns {Tile} */
export const tile = (props) => ({ ...props, type: 'tile' })

/** @param {Omit<Container, 'type'>} props @returns {Container} */
export const container = (props) => ({ ...props, type: 'container' })
