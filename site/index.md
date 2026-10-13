# Kwilos

<p class="lede">An easy-to-use, dependency-free JavaScript toolkit for drawing on an HTML5 canvas.</p>

You write one function, `tick`, which Kwilos calls on every animation frame. It returns a description of what to draw, a list of shapes such as circles, rectangles, labels, images and tiles, and Kwilos draws it. There is nothing to create, update or remove: each frame simply describes the scene afresh.

```js
import { Kwilos, circle, label } from "https://cdn.jsdelivr.net/npm/kwilos.js@{{version}}/_dist/kwilos.min.mjs"

await Kwilos.attach("#canvas", (env) => [
  circle({ x: env.inputs.mouse.x, y: env.inputs.mouse.y, radius: 20, fill_color: "tomato" }),
  label({ x: 100, y: 40, text: "Hello, Kwilos", fill_color: "white" }),
])
```

- **Scenes are data.** Shapes are plain objects, made by small factory functions, so a scene is easy to build, inspect and test.
- **Containers make layers.** A container moves and clips the shapes in its own scene, and containers stack in the order drawn.
- **Input is ready each frame.** The mouse, its clicks and the keyboard are in `env.inputs`, and `env.hit()` tells which shape is under the pointer.
- **Typed, without a build.** The source runs in the browser as it is, and its types give editors completion and checking.

The name is a mash-up of *quill* and *kalos*, Greek for beautiful, with some phonetic jiggery-pokery to make something unique.

## Samples

Each sample runs below, using Kwilos {{version}} from the CDN. Switch to **Source** to see its code.

{{samples}}

## Get started

{{get_started}}

The [API documentation](api.html) covers attaching Kwilos to a canvas, the `tick` function, the shapes, hit-testing and input.
