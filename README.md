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
- Run `npm test` to run the tests, and `npm run typecheck` to check the types

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

* Provide a `canvas` after locating it using `document.getElementById` or other DOM API.
* Define a function that is your `tick` handler, which will be called with one parameter (we call it `env`) that provides runtime state information and functionality.
* No `config` is needed to get started.

### Configuring Kwilos

When attaching a canvas, you can configure Kwilos with the following properties that you can provide in an object. 

Property | Default value | Description
----|-----|----
`background_clear` | `false` | If `true` then the background is cleared, allowing layered canvases to be transparent
`background_color` | `black` | Set the background colour between ticks. If `background_clear` is set then use `null` or a colour with alpha to see through the canvas.
`font` | `undefined` | When `undefined` the default font of the browser is used. Otherwise specify a font as you would for the CSS `font-family` property.
`preload_images` | `[]` | Provide one or more paths to images to preload to ensure the images are ready when `tick` handler is called.

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

### The `env` Parameter

The runtime environment object contains properties that are grouped as follows:
- `env.inputs` contains the properties to access input event information
- `env.state` is an object into which the app can store data that it can expect to be available across repeated calls to the `tick` handler.

#### Inputs

> Details TODO

`env.inputs` | Description
----|----
`.mouse` | TODO
&emsp;`.x` | 
&emsp;`.y` | 
&emsp;`.button_left` | `true` if left mouse button is pressed
&emsp;`.button_middle` | `true` if middle mouse button (or device equivalent) is pressed
&emsp;`.button_right` | `true` if left right button (or device equivalent) is pressed
&emsp;`.moved` | `true` if mouse has moved since last frame; if a mouse button is also pressed, this indicates _dragging_.
`.key` | TODO
&emsp;`.alt` | 
&emsp;`.shift` | 
&emsp;`.ctrl` | 
&emsp;`.meta` | 
&emsp;`.pressed[C]` | Contains an object wit `code` and `key` properties when [key code](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) `C` is pressed.
&emsp;`.typed` | 
&emsp;&emsp;`.code` | 
&emsp;&emsp;`.key` | 

#### State

> TODO


## Contributing

Bug reports and sugestions are welcome. For now I am not yet ready for code changes and pull requests. I appreciate your understanding.

## Collaboration

This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to this [code of conduct](https://www.contributor-covenant.org/version/1/4/code-of-conduct/).

## License

This library is available as open source under the terms of the [MPL 2.0 License](https://opensource.org/license/mpl-2-0).

## Acknowledgements

All images and graphics used in the samples and tests were downloaded from [Kenny.nl](https://kenney.nl/).

The entity-based API approach is inspired by [DragonRuby Game Toolkit](https://dragonruby.org/).