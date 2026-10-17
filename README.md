# Kwilos.js

_Kwilos.js_ is an easy-to-use, dependency-free, entity-based JavaScript graphics toolkit for use with HTML5 Canvas.

The [Kwilos.js web site](https://nogginly.github.io/kwilos.js/) has the samples running live, and the API documentation.

_Kwilos.js_ uses a "game loop" metaphor while providing a way to use it efficiently when the drawings / graphics have limited motion.

> **About the name**
>
> A mashup of 'Quill' and 'Kalos' with phonetic jiggery-pokery to get something unique that doesn't lose its flavour.

## Using Kwilos.js

### From source

Clone the repo and then ...

- Run `npm install` to pull the dev dependencies
- Run `npm run build` to make the bundled releases in `_dist/`: `kwilos.mjs`, minified `kwilos.min.mjs`, and TypeScript declarations in `types/`
- Run `npm test` to run the unit tests, and `npm run typecheck` to check the types
- Run `npm run build-site` to build the web site into `_site/`, from `site/`, the samples and this README's API sections
- Run `npm run test-browser` to run the browser tests, which draw the samples and drive Kwilos in Chromium with [Playwright](https://playwright.dev). The first time, run `npx playwright install --only-shell chromium` to download the headless browser, or set `CHROMIUM_PATH` to use a Chromium you already have

The source in `src/` runs in the browser as is, without a build. To try the samples, serve the repository root with any static web server, for example `python3 -m http.server`, and open `samples/`.

### Types

Kwilos.js is written in JavaScript with types in JSDoc comments, checked by TypeScript. Editors use them for completion and to flag mistakes, such as a misspelt property. Types such as `Env`, `Tick`, `Config` and `Scene` are exported for use in your own JSDoc or TypeScript:

```js
/** @import { Env } from "kwilos.js" */

/** @param {Env} env */
function tick(env) { ... }
```

### Via CDN

Kwilos is published on npm as `kwilos.js`, so public CDNs such as [jsDelivr](https://www.jsdelivr.com) and [unpkg](https://unpkg.com) serve it with no build step:

```js
import { Kwilos, circle } from "https://cdn.jsdelivr.net/npm/kwilos.js@0.10.1/_dist/kwilos.min.mjs"
```

Name an exact version, as above. Before 1.0, a minor version may break the API, so a range such as `@0` could change a working page without warning; see the [changelog](CHANGELOG.md) before moving to a newer version. `_dist/kwilos.mjs` is the same build unminified, for reading and debugging.

### Via npm

```sh
npm install kwilos.js
```

```js
import { Kwilos, circle } from "kwilos.js"
```

The package includes TypeScript declarations, so editors complete and check Kwilos's API.

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

### Configuring Kwilos.js

When attaching a canvas, you can configure Kwilos with the following properties that you can provide in an object.

Property          |Default value|Description                                                                                                                                                                                                                                                                                          
------------------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
`background_clear`|`false`      |If `true` then the background is cleared, allowing layered canvases to be transparent                                                                                                                                                                                                                
`background_color`|`black`      |Set the background colour between ticks. If `background_clear` is set then use `null` or a colour with alpha to see through the canvas.                                                                                                                                                              
`font`            |`undefined`  |When `undefined` the default font of the browser is used. Otherwise specify a font as you would for the CSS `font-family` property.                                                                                                                                                                  
`image_smoothing` |`true`       |If `false` then scaled images, tiles and sprites are drawn with hard pixel edges instead of smoothed, as pixel art needs. If the page also scales the canvas itself with CSS, set `image-rendering: pixelated` on it too.
`preload_images`  |`[]`         |Provide one or more paths to images to preload to ensure the images are ready when `tick` handler is called.                                                                                                                                                                                         
`preload_sounds`  |`[]`         |Paths to sound effects to load before the first frame; a sound that was not preloaded is not played. See [Sound](#sound).                                                                                                                                                                            
`background_audio`|`false`      |If `true` then tracks keep playing while the page is hidden, as a music player might want. By default they pause, and carry on when the page is shown again.                                                                                                                                         
`context_menu`    |`true`       |If `false` then the browser's context menu is suppressed over the canvas, so the right mouse button can be used                                                                                                                                                                                      
`claim_keys`      |`[]`         |Key codes, such as `"Space"` or `"ArrowUp"`, that the app uses, so the browser does not act on them too, such as scrolling the page, while the canvas has focus. The canvas then takes focus when pressed, and with the Tab key; elsewhere on the page the keys work as usual. See [Inputs](#inputs).
`touch_scroll`    |`true`       |If `false` then a touch on the canvas does not scroll or zoom the page, so the app can follow touch drags. Leave it `true` for a canvas that only needs taps, so visitors can still scroll past it.                                                                                                  
`on_error`        |`undefined`  |A function that receives errors thrown during a frame, so that frames continue; see [Handling Errors](#handling-errors)                                                                                                                                                                              

## The `tick` Function

The `tick` function is called repeatedly, with the frame rate as defined by the browser's `requestAnimationFrame` function. This is typically 60 times a second.

It is called with an `env` parameter that contains runtime state properties and utility functions for use by the application, and returns the scene to draw.

### The Return Value

`tick` returns      |Effect                                                                                                          
--------------------|----------------------------------------------------------------------------------------------------------------
An array of entities|The background is cleared, then the entities are drawn in array order. An empty array draws only the background.
`null`              |The canvas is left as it is. If the canvas was resized since the last frame, the last scene is drawn again.     
Anything else       |Throws a `TypeError`, which stops the frame loop.                                                               

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

### Reusing Entities

Making new entities on every frame is the simplest way to write an app, and cheap enough for most: the browser clears away short-lived objects quickly. To avoid it, make entities once, keep them, edit them in place, and return the same array. Kwilos only reads entities, and keeps nothing of a scene but the array it drew last.

```js
import { Kwilos, circle } from "kwilos.js"

const ball = circle({ id: 'ball', x: 10, y: 100, radius: 5, fill_color: 'red' })
const scene = [ball]

function tick(env) {
  const grabbed = env.hit()?.id === 'ball'
  ball.x += 1
  ball.fill_color = grabbed ? 'orange' : 'red'
  return scene
}
```

- Add or remove entities by editing the array, or by setting an entry to `false`, which leaves the others in order.
- Call `env.hit` before editing, as above. It tests the entities as they are when it is called, not as they were drawn, so after moving the ball it finds the ball at its new place, which the user has not seen yet.
- Part of a scene that never changes, such as a tile map, can be made once and returned inside the array that is made on each frame, since nested arrays are drawn in place.

### Shapes

Each shape has a factory, exported alongside `Kwilos`, that takes the shape's properties and returns a plain object tagged with its `type`. A hand-written object with the same `type` is drawn the same way. An entity without a recognised `type` throws a `TypeError`.

Factory    |Required                                                                                   |Optional                                                                                                                                
-----------|-------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------
`circle`   |`x`, `y` (centre), `radius`                                                                |`fill_color`, `stroke_color`                                                                                                            
`rect`     |`x`, `y` (top-left), `w`, `h`                                                              |`fill_color`, `stroke_color`                                                                                                            
`label`    |`x`, `y`, `text`                                                                           |`font_name`, `font_size` (points), `fill_color`, `stroke_color`, `text_align` (default `center`), `text_baseline` (default `alphabetic`)
`image`    |`path`, `x`, `y`                                                                           |`w`, `h`, and `source_x`, `source_y`, `source_w`, `source_h` to draw part of the image; `flip_x`, `flip_y`                               
`tile`     |`path`, `x`, `y`, `tile_index`, and either `tile_w` + `tile_h` or `tile_rows` + `tile_cols`|`w`, `h`, `margin`, `spacing`, `flip_x`, `flip_y`                                                                                        
`container`|`scene`                                                                                    |`x`, `y` (default `0`), and `clip` with `w`, `h` to hide drawing outside that area                                                      

A tile sheet with a border or gaps between its tiles, as tile editors can add, takes `margin`, the pixels between the sheet's edge and its tiles, and `spacing`, the pixels between tiles. `flip_x` and `flip_y` mirror an image or tile left to right, or top to bottom, about its own box, which hit-testing does not change.

A `circle`, `rect` or `label` with neither `fill_color` nor `stroke_color` draws nothing. A `container` draws its `scene` with the origin moved to its `x` and `y`, which makes containers useful as layers: the containers in a scene are drawn in order, each one over the last.

### Sprites

A sprite draws a frame of an animation: a sequence of tiles from a tile sheet, or of images, each shown for a time. The app decides which animation a character is in, such as idle, walking or jumping, and since when; the sprite works out which frame to show.

```js
import { Kwilos, animation, animation_status, sprite } from "kwilos.mjs"

const sheet = { path: "hero.png", tile_w: 32, tile_h: 32 }
const walk = animation({
  sheet,
  frames: [{ tile: 4, duration: 120 }, { tile: 5, duration: 120, dy: -2 }],
})
const jump = animation({ sheet, play: "once", frames: [{ tile: 8, duration: 150 }, { tile: 9, duration: 300, dy: -30 }] })

function tick(env) {
  const hero = env.state.hero ??= { animation: walk, since: 0, x: 100, y: 200 }
  if (jump_pressed) Object.assign(hero, { animation: jump, since: env.time })
  if (hero.animation === jump && animation_status(jump, env.time - hero.since).done)
    Object.assign(hero, { animation: walk, since: env.time })
  return [sprite({ animation: hero.animation, start: hero.since, x: hero.x, y: hero.y, flip_x: facing_left })]
}
```

`animation({...})` is made once and shared by any number of sprites:

Property          |Description                                                                                                                                                                                                                                                                      
------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
`frames`          |The frames, in order. Each is a `tile` from the `sheet`, or an image `path` of its own, with optional `source_x`, `source_y`, `source_w` and `source_h` to show part of it.                                                                                                      
&emsp;`.duration` |How long the frame shows, in milliseconds                                                                                                                                                                                                                                        
&emsp;`.dx`, `.dy`|Shift the frame while it shows, such as a bounce in a walk. They are not added up from frame to frame: moving a character is the app's job, so its `x` and `y` stay where the game logic puts them.                                                                              
`sheet`           |The tile sheet for frames with a `tile`: its `path`, and `tile_w` and `tile_h`, or `tile_rows` and `tile_cols`, and any `margin` and `spacing`, as for a tile                                                                                                                                                    
`play`            |`"loop"`, the default, repeats; `"once"` stops on the last frame; `"ping-pong"` plays forwards then backwards, repeating, with each end frame shown once, as in 1, 2, 3, 2, 1, 2, 3; give an end frame a longer `duration` to hold it                                                                                                                                                       
`duration`        |The length of one pass, shared among the frames in proportion to their own durations. Without it, the frames' durations add up to the pass; frames without one show for 100 ms.                                                                                                  
`easing`          |Spaces the frames along a curve within each pass: `"linear"`, the default, or `"ease-in"`, `"ease-out"` and `"ease-in-out"`, which are cubic, or a function from progress through the pass, `0` to `1`, to the progress to show. With `"ease-in"`, the first frames show longest.

`sprite({...})` is a scene entity, drawn in order with the other shapes:

Property          |Description                                                                                                                                             
------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------
`animation`       |The animation to play                                                                                                                                   
`start`           |When it began, in `env.time` milliseconds; defaults to `0`. Set it to `env.time` when the animation changes, so the new one starts from its first frame.
`x`, `y`          |Top-left corner                                                                                                                                         
`w`, `h`          |Size to draw at; defaults to the frame's size                                                                                                           
`flip_x`, `flip_y`|Mirror the frames, such as to face the other way with right-facing frames                                                                               
`id`              |Identifies the sprite, as for other shapes                                                                                                              

Frames are timed in milliseconds rather than ticks, so an animation plays at the same speed on a 60 Hz and a 120 Hz display. A sprite animates only while scenes are drawn, so return a scene, not `null`, while one moves.

`animation_status(animation, elapsed)` returns `{ frame, done }`: which frame shows after `elapsed` milliseconds, and, for a `"once"` animation, whether it has reached its end, to move on to another state.

`env.hit` tests the frame of a sprite that was last drawn, with its offset, and returns the sprite. `contains` cannot measure a sprite, as it has no clock.

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

A shape kept between frames and edited in place is tested as it is when `env.hit` is called; see [Reusing Entities](#reusing-entities).

`contains(shape, point)` tells whether one shape contains the point, and works anywhere, without Kwilos running. It measures shapes from their own properties only: circles, rects, and images and tiles with `w` and `h`. For a label, or an image or tile sized by its file, it throws a `TypeError`; use `env.hit` for those.

### The `env` Parameter

The runtime environment object contains properties that are grouped as follows:
- `env.inputs` contains the properties to access input event information
- `env.state` is an object into which the app can store data that it can expect to be available across repeated calls to the `tick` handler.
- `env.hit(point)` returns the shape under a point, by default the mouse position; see [Hit-Testing](#hit-testing).
- `env.time` is the milliseconds since the first frame, as of this frame; sprites animate by it, see [Sprites](#sprites).
- `env.sounds`, `env.tracks`, `env.volume` and `env.listener` play sound effects and music; see [Sound](#sound).

#### Inputs

`env.inputs` holds the input state as of the current frame. `.mouse` follows a mouse, a finger on a touchscreen, or a pen alike: a touch presses the left button where it lands, and while several fingers touch, only the first is followed. Mouse positions are in canvas pixels, even when the canvas is displayed at another size with CSS, and only movement over the canvas is tracked. Keys are heard across the whole page, so every attached canvas sees the same keyboard state. Keys such as Space and the arrow keys also scroll the page; list the ones the app uses in `claim_keys` to stop that while the canvas has focus. When the window loses focus, every button and key is released.

`env.inputs`                            |Description                                                                                                                                                                         
----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
`.mouse`                                |Pointer state, for a mouse, touch or pen                                                                                                                                            
&emsp;`.x`, `.y`                        |Position of the pointer when it was last over the canvas                                                                                                                            
&emsp;`.previous_x`, `.previous_y`      |`.x` and `.y` as of the previous frame                                                                                                                                              
&emsp;`.moved`                          |`true` if the pointer moved since the previous frame; with a button pressed, this is a _drag_                                                                                       
&emsp;`.button_left`                    |`true` while the left button is pressed; pressed on the canvas, released anywhere                                                                                                   
&emsp;`.button_middle`                  |`true` while the middle button (or device equivalent) is pressed                                                                                                                    
&emsp;`.button_right`                   |`true` while the right button (or device equivalent) is pressed                                                                                                                     
&emsp;`.pointer_type`                   |`"mouse"`, `"touch"` or `"pen"`, as of the pointer's last movement or press on the canvas                                                                                           
&emsp;`.clicks`                         |The clicks on the canvas since the previous frame, in order; empty when there are none. A click is a button pressed and released over the canvas.                                   
&emsp;&emsp;`.button`                   |`"left"`, `"middle"` or `"right"`                                                                                                                                                   
&emsp;&emsp;`.x`, `.y`                  |Where the button was released, in canvas pixels                                                                                                                                     
`.key`                                  |Keyboard state                                                                                                                                                                      
&emsp;`.alt`, `.shift`, `.ctrl`, `.meta`|`true` while the modifier key is held                                                                                                                                               
&emsp;`.pressed[C]`                     |Present while the key with [key code](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values) `C` is held, e.g. `.pressed.KeyA` or `.pressed.ArrowUp`
&emsp;&emsp;`.code`                     |The key code, `C`                                                                                                                                                                   
&emsp;&emsp;`.text`                     |The character or key name produced, e.g. `"a"`, `"A"` or `"ArrowUp"`                                                                                                                
&emsp;`.typed`                          |The printable keys pressed since the previous frame, in order, each with the same `.code` and `.text` properties; empty when there are none                                         

The `button_` properties are sampled once per frame, so a click quicker than a frame may never show in them; it always appears in `clicks`. Use `button_left` for something held, such as a drag, and `clicks` for something done once, such as pressing a button:

```js
function tick(env) {
  const { clicks } = env.inputs.mouse
  env.state.count ??= 0
  env.state.count += clicks.filter(click => env.hit(click)?.id === 'add').length
  return [
    rect({ id: 'add', x: 10, y: 10, w: 80, h: 30, fill_color: 'green' }),
    label({ x: 50, y: 70, text: `Clicked ${env.state.count} times`, fill_color: 'white' }),
  ]
}
```

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

#### Sound

Kwilos plays two kinds of audio:

- **Sound effects** play once, on the frame they happen, such as a coin being picked up. Push a `sound` to `env.sounds`; after the frame, Kwilos plays it and empties the list.
- **Tracks** play for as long as they are wanted, such as music or an ambient loop. Keep a `track` in `env.tracks`, under a name of your choice. Kwilos starts it when it appears, applies changes to its properties as it plays, and stops it when it is removed.

```js
import { Kwilos, sound, track } from "kwilos.mjs"

await Kwilos.attach("#canvas", tick, { preload_sounds: ["coin.mp3"] })

function tick(env) {
  env.tracks.music ??= track({ path: "theme.mp3", looping: true, gain: 0.6 })

  if (picked_up_coin)
    env.sounds.push(sound({ path: "coin.mp3", pan: -0.5 }))

  return scene
}
```

`sound({...})` and `track({...})` return plain objects, as the shape factories do.

Property  |Sound|Track|Description                                                                                                                          
----------|:---:|:---:|-------------------------------------------------------------------------------------------------------------------------------------
`path`    |  ✓  |  ✓  |The audio file's URL. Sounds must be preloaded with `preload_sounds`; tracks are streamed, so need not be.                           
`paths`   |     |  ✓  |A list of audio file URLs, played in turn, in place of `path`; see [Playlists](#playlists)                                           
`index`   |     |  ✓  |Which of `paths` is playing, from `0`, kept up to date by Kwilos; set it to play another song                                        
`gain`    |  ✓  |  ✓  |Loudness; defaults to `1`, its loudness as recorded                                                                                  
`rate`    |  ✓  |  ✓  |Playback speed, which also changes the pitch; defaults to `1`                                                                        
`pan`     |  ✓  |  ✓  |From `-1`, left, to `1`, right; defaults to `0`, centred. Ignored for a sound with a position.                                       
`x`, `y`  |  ✓  |  ✓  |Where the sound is, in canvas coordinates; see [Positions](#positions). Give both or neither.                                        
`range`   |  ✓  |  ✓  |For a sound with a position, the distance from the listener at which it falls silent; defaults to the canvas width                   
`looping` |     |  ✓  |If `true`, plays again from the start when it ends; with `paths`, goes back to the first song after the last                         
`paused`  |     |  ✓  |If `true`, pauses it, keeping its place                                                                                              
`restart` |     |  ✓  |If `true`, plays it again from the start, from its first song. Kwilos sets it back to `false` once done, so set it on one frame only.
`time`    |     |  ✓  |Set by Kwilos: the seconds played from the start of the song                                                                         
`duration`|     |  ✓  |Set by Kwilos: the song's length in seconds, or `0` until it is known                                                                
`ended`   |     |  ✓  |Set by Kwilos: `true` once it has played to its end, or past its last song, without looping                                          

Kwilos compares `env.tracks` with what is playing, so setting a track again with the same `path`, even as a new object on every frame, leaves it playing; only a different `path` starts it afresh. To play it from the start, set `restart` on the frame it should restart, not on every frame that some condition holds:

```js
// Restarts the music once, when a new game begins
if (env.state.phase === "playing" && env.state.previous_phase !== "playing")
  env.tracks.music.restart = true
```

`env.volume` scales everything, from `0`, silent, to `1`, as given, so it makes a mute button. It defaults to `1`.

Browsers allow audio to play only once the user has clicked, tapped or pressed a key on the page. Until then, sound effects are dropped, since a sound played late is worse than none, and tracks wait, starting as soon as audio is allowed. Kwilos creates its audio only once the app uses sound, so an app without sound never touches the page's audio.

##### Playlists

A track given `paths` in place of `path` plays its songs in turn. Kwilos moves on to the next song itself when one ends, so a playlist carries on while the page is hidden and no frames run, when `background_audio` is set.

```js
function tick(env) {
  const music = env.tracks.music ??= track({ paths: ["dawn.mp3", "noon.mp3", "dusk.mp3"], looping: true })
  if (next_pressed)
    music.index += 1
  return scene
}
```

`index` is the song playing, kept up to date by Kwilos. Set it to another song, and that song plays from its start. With `looping`, an index past either end wraps round, so `-1` is the last song; without it, the track ends. Giving `index` when the track is made starts it at that song.

Kwilos writes the new `index` into the track as each song ends, so keep a playlist's track between frames, as `??=` does above. A track made afresh on every frame with `index: 0` would jump back to the first song every time the next one began.

Changing `paths` while a song plays keeps that song playing if it is still in the list, so songs can be added or removed around it. If it is gone, the new list plays from its first song. Moving between songs leaves a short gap while the next file starts, so a playlist suits separate songs better than one piece split across files.

##### Positions

A sound or track with `x` and `y` is placed on the canvas and heard from `env.listener`, such as the player or the camera, which defaults to the centre of the canvas:

```js
function tick(env) {
  env.listener = { x: player.x, y: player.y }
  env.tracks.bee = track({ path: "buzz.mp3", looping: true, x: bee.x, y: bee.y })
  if (chirped)
    env.sounds.push(sound({ path: "chirp.mp3", x: cricket.x, y: cricket.y, range: 800 }))
  return scene
}
```

The listener hears as if sitting in front of the screen, facing it, half the canvas width away. A sound to one side pans towards that side, smoothly, so one just off-centre is only a little off-centre. Every sound gets quieter with distance, from full straight ahead to silent at its `range`. Which way the player faces makes no difference. A track's position can change on every frame, and it glides to each new place.

Only positions relative to the listener matter, so a scrolling world can use world coordinates for both.

A sound that was not preloaded is not played: Kwilos warns once in the browser console and loads it, so later plays work. A preloaded sound that fails to load makes `attach` reject, as for images. A track from another site plays only if that site allows it, with [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS).

## Releasing

See [RELEASING.md](RELEASING.md).

## Contributing

Bug reports and sugestions are welcome. For now I am not yet ready for code changes and pull requests. I appreciate your understanding.

## Collaboration

This project is intended to be a safe, welcoming space for collaboration, and contributors are expected to adhere to this [code of conduct](https://www.contributor-covenant.org/version/1/4/code-of-conduct/).

## License

This library is available as open source under the terms of the [MPL 2.0 License](https://opensource.org/license/mpl-2-0).

## Acknowledgements

All images and graphics used in the samples and tests were downloaded from [Kenny.nl](https://kenney.nl/).

The entity-based API approach is inspired by [DragonRuby Game Toolkit](https://dragonruby.org/).
