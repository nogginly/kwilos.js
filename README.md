# Kwilos JS

_Kwilos_ is an easy-to-use, dependency-free, entity-based Javascript graphics toolkit for use with HTML5 Canvas. 

_Kwilos_ uses a "game loop" metaphor while providing a way to use it efficiently when the drawings / graphics have limited motion.

> **About the name**
> 
> A mashup of 'Quill' and 'Kalos' with phonetic jiggery-pokery to get something unique that doesn't lose its flavour.

## Using Kwilos JS

### From source

Clone the repo and then ...

- Run `npm install` to pull the dev dependencies
- Run `npm run build` to make the bundled releases in `_dist/`: `kwilos.mjs`, minified `kwilos.min.mjs`, and TypeScript declarations in `types/`
- Run `npm test` to run the unit tests, and `npm run typecheck` to check the types
- Run `npm run test-browser` to run the browser tests, which draw the samples and drive Kwilos in Chromium with [Playwright](https://playwright.dev). The first time, run `npx playwright install --only-shell chromium` to download the headless browser, or set `CHROMIUM_PATH` to use a Chromium you already have

The source in `src/` runs in the browser as is, without a build. To try the samples, serve the repository root with any static web server, for example `python3 -m http.server`, and open `samples/`.

### Types

Kwilos is written in JavaScript with types in JSDoc comments, checked by TypeScript. Editors use them for completion and to flag mistakes, such as a misspelt property. Types such as `Env`, `Tick`, `Config` and `Scene` are exported for use in your own JSDoc or TypeScript:

```js
/** @import { Env } from "kwilos.js" */

/** @param {Env} env */
function tick(env) { ... }
```

### Via CDN

> TODO
> - figure out how to publish with versioning for people to import via CDN

## API

### Attaching to a Canvas

Kwilos can be attached to one or more canvases, allowing control of graphics in each independently.

`Kwilos.attach(canvas, tick [, config])`

* Provide a `canvas` element, or its element ID or a CSS selector. If no canvas is found, `attach` throws a `TypeError`.
* Define a function that is your `tick` handler, which will be called with one parameter (we call it `env`) that provides runtime state information and functionality.
* No `config` is needed to get started.

`attach` returns a promise of the attached `Kwilos`, resolved once any preloaded images have loaded.

### Detaching

`kwilos.detach()` stops calling `tick` and stops listening for input. The canvas keeps its last frame. Calling it again does nothing.

### Handling Errors

By default, an error thrown during a frame, whether by `tick` or while drawing its scene, detaches Kwilos and is rethrown, so it appears in the browser console.

To keep going instead, provide `on_error` in the config. It receives the error and `env`, and the frames continue. To stop after all, rethrow the error, and Kwilos detaches as above:

```js
const kwilos = await Kwilos.attach("canvas", tick, {
  on_error: (error, env) => {
    console.warn("Frame failed, starting over", error)
    env.state = {}
  }
})
```

### Configuring Kwilos

When attaching a canvas, you can configure Kwilos with the following properties that you can provide in an object. 

Property | Default value | Description
----|-----|----
`background_clear` | `false` | If `true` then the background is cleared, allowing layered canvases to be transparent
`background_color` | `black` | Set the background colour between ticks. If `background_clear` is set then use `null` or a colour with alpha to see through the canvas.
`font` | `undefined` | When `undefined` the default font of the browser is used. Otherwise specify a font as you would for the CSS `font-family` property.
`preload_images` | `[]` | Provide one or more paths to images to preload to ensure the images are ready when `tick` handler is called.
`context_menu` | `true` | If `false` then the browser's context menu is suppressed over the canvas, so the right mouse button can be used
`on_error` | `undefined` | A function that receives errors thrown during a frame, so that frames continue; see [Handling Errors](#handling-errors)

## The `tick` Function

The `tick` function is called repeatedly, with the frame rate as defined by the browser's `requestAnimationFrame` function. This is typically 60 times a second.

It is called with an `env` parameter that contains runtime state properties and utility functions for use by the application, and returns the scene to draw.

### The Return Value

`tick` returns | Effect
----|----
An array of entities | The background is cleared, then the entities are drawn in array order. An empty array draws only the background.
`null` | The canvas is left as it is. If the canvas was resized since the last frame, the last scene is drawn again.
Anything else | Throws a `TypeError`, which stops the frame loop.

Within the array, nested arrays are drawn in place, and `null`, `undefined` and `false` entries are skipped, so conditional entities can be written inline:

```js
import { Kwilos, circle, label } from "kwilos.mjs"

function tick(env) {
  const { mouse } = env.inputs
  return [
    circle({ x: mouse.x, y: mouse.y, radius: 10, fill_color: 'red' }),
    mouse.button_left && label({ x: 10, y: 20, text: 'Dragging', fill_color: 'white' }),
  ]
}
```

### Shapes

Each shape has a factory, exported alongside `Kwilos`, that takes the shape's properties and returns a plain object tagged with its `type`. A hand-written object with the same `type` is drawn the same way. An entity without a recognised `type` throws a `TypeError`.

Factory | Required | Optional
----|----|----
`circle` | `x`, `y` (centre), `radius` | `fill_color`, `stroke_color`
`rect` | `x`, `y` (top-left), `w`, `h` | `fill_color`, `stroke_color`
`label` | `x`, `y`, `text` | `font_name`, `font_size` (points), `fill_color`, `stroke_color`, `text_align` (default `center`), `text_baseline` (default `alphabetic`)
`image` | `path`, `x`, `y` | `w`, `h`, and `source_x`, `source_y`, `source_w`, `source_h` to draw part of the image
`tile` | `path`, `x`, `y`, `tile_index`, and either `tile_w` + `tile_h` or `tile_rows` + `tile_cols` | `w`, `h`
`container` | `scene` | `x`, `y` (default `0`), and `clip` with `w`, `h` to hide drawing outside that area

A `circle`, `rect` or `label` with neither `fill_color` nor `stroke_color` draws nothing. A `container` draws its `scene` with the origin moved to its `x` and `y`, which makes containers useful as layers: the containers in a scene are drawn in order, each one over the last.

### Hit-Testing

Two functions tell which shapes lie under a point, such as the mouse. Both count a shape's whole area, whether or not it is filled, so a shape with neither `fill_color` nor `stroke_color` makes an invisible hit area.

`env.hit(point)` returns the shape drawn topmost at the point in the scene last drawn, which is what the user sees, or `null`. Without a point, it tests the mouse position. It allows for containers' origins and clips, measures labels by their text, and sizes images from their loaded files. It returns the shape object from the scene. Every shape accepts an `id`, which Kwilos ignores, so the simplest test is by `id`. Comparing with `===` works only with the very object that was drawn, not a copy such as `{ ...shape }`:

```js
import { Kwilos, circle, rect } from "kwilos.js"

function tick(env) {
  const pressed = env.inputs.mouse.button_left && env.hit()?.id === 'button'
  return [
    rect({ x: 0, y: 0, w: 200, h: 200, fill_color: 'navy' }),
    circle({ id: 'button', x: 100, y: 100, radius: 30, fill_color: pressed ? 'orange' : 'red' }),
  ]
}
```

`contains(shape, point)` tells whether one shape contains the point, and works anywhere, without Kwilos running. It measures shapes from their own properties only: circles, rects, and images and tiles with `w` and `h`. For a label, or an image or tile sized by its file, it throws a `TypeError`; use `env.hit` for those.

### The `env` Parameter

The runtime environment object contains properties that are grouped as follows:
- `env.inputs` contains the properties to access input event information
- `env.state` is an object into which the app can store data that it can expect to be available across repeated calls to the `tick` handler.
- `env.hit(point)` returns the shape under a point, by default the mouse position; see [Hit-Testing](#hit-testing).

#### Inputs

`env.inputs` holds the input state as of the current frame. Mouse positions are in canvas pixels, even when the canvas is displayed at another size with CSS, and only movement over the canvas is tracked. Keys are heard across the whole page, so every attached canvas sees the same keyboard state. When the window loses focus, every button and key is released.

`env.inputs` | Description
----|----
`.mouse` | Pointer state
&emsp;`.x`, `.y` | Position of the pointer when it was last over the canvas
&emsp;`.previous_x`, `.previous_y` | `.x` and `.y` as of the previous frame
&emsp;`.moved` | `true` if the pointer moved since the previous frame; with a button pressed, this is a _drag_
&emsp;`.button_left` | `true` while the left button is pressed; pressed on the canvas, released anywhere
&emsp;`.button_middle` | `true` while the middle button (or device equivalent) is pressed
&emsp;`.button_right` | `true` while the right button (or device equivalent) is pressed
`.key` | Keyboard state
&emsp;`.alt`, `.shift`, `.ctrl`, `.meta` | `true` while the modifier key is held
&emsp;`.pressed[C]` | Present while the key with [key code](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) `C` is held, e.g. `.pressed.KeyA` or `.pressed.ArrowUp`
&emsp;&emsp;`.code` | The key code, `C`
&emsp;&emsp;`.text` | The character or key name produced, e.g. `"a"`, `"A"` or `"ArrowUp"`
&emsp;`.typed` | The printable keys pressed since the previous frame, in order, each with the same `.code` and `.text` properties; empty when there are none

For example, to move a circle with the arrow keys, and turn it red while the left button is held:

```js
function tick(env) {
  const { mouse, key } = env.inputs
  env.state.x ??= 100
  if (key.pressed.ArrowLeft) env.state.x -= 2
  if (key.pressed.ArrowRight) env.state.x += 2
  return [
    circle({ x: env.state.x, y: 100, radius: 10, fill_color: mouse.button_left ? 'red' : 'white' }),
  ]
}
```

#### State

`env.state` starts as an empty object and is kept between frames, so the app can store whatever it needs there:

```js
function tick(env) {
  env.state.frames = (env.state.frames ?? 0) + 1
  return [label({ x: 100, y: 50, text: `Frame ${env.state.frames}`, fill_color: 'white' })]
}
```

## Contributing

Bug reports and sugestions are welcome. For now I am not yet ready for code changes and pull requests. I appreciate your understanding.

## Collaboration

This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to this [code of conduct](https://www.contributor-covenant.org/version/1/4/code-of-conduct/).

## License

This library is available as open source under the terms of the [MPL 2.0 License](https://opensource.org/license/mpl-2-0).

## Acknowledgements

All images and graphics used in the samples and tests were downloaded from [Kenny.nl](https://kenney.nl/).

The entity-based API approach is inspired by [DragonRuby Game Toolkit](https://dragonruby.org/).