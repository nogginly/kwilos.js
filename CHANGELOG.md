# Changelog

Notable changes to Kwilos.js. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/); before 1.0, a minor version may break the API.

## [Unreleased]

### Added

- `env.dt`, the seconds since the previous frame, at most 0.1: move things by a speed times `dt` and they keep that speed at any refresh rate.
- The `text_color` config option: the colour of labels given neither `fill_color` nor `stroke_color`.
- A tutorial on the web site, "Make a game: Debris Field": an arcade game in which a salvage ship flies through a field of rocks, built in small steps that each run, for programmers of about 13 and over. Each step opens with its mission beside the running picture, and has the lines that changed marked, the editor, and things to try. The first six steps are there, up to rocks that wreck the ship, and more are on the way.
- A playground on the web site: edit a small Kwilos.js app and run it, add your own images, sounds and data files and use them by name, and share the code with a link. The code runs in a sandboxed frame, and the files stay in the browser.

### Changed

- A label with neither `fill_color` nor `stroke_color` is filled in white, or the `text_color` config option, instead of drawing nothing.

## [0.11.0] - 2026-10-17

### Added

- `from_aseprite`, in the new `kwilos.js/aseprite` module: turns the JSON that Aseprite exports with a sprite sheet into the frames and animations a `sprite` shows, one animation for each tag, in the tag's direction.
- A sample, "Aseprite", a character that walks and runs in four directions. The web site shows a sample's data files, such as its JSON, in tabs of their own.
- Tile sheets with a `margin` around their edge and `spacing` between their tiles, as tile editors such as Tiled can add; an animation's `sheet` takes them too.
- `flip_x` and `flip_y` for images and tiles, which mirror them about their own box, as they already did for sprites.
- The `image_smoothing` config option: set it to `false` to draw scaled images, tiles and sprites with hard pixel edges, as pixel art needs.

### Changed

- A `ping-pong` animation shows its first and last frames once at each turn, as Aseprite plays them: 1, 2, 3, 2, 1, 2, 3 instead of 1, 2, 3, 3, 2, 1, 1, 2, 3. This changes the timing of existing ping-pong animations; to keep it, double the `duration` of the first and last frames. The sprites sample's idle animation does so.

## [0.10.1] - 2026-10-16

### Added

- The `claim_keys` config option: key codes whose browser actions, such as Space and the arrow keys scrolling the page, are stopped while the canvas has focus. The canvas then takes focus when pressed, and with the Tab key. The sprites sample claims Space and the arrow keys.

## [0.10.0] - 2026-10-15

### Added

- Sprites: a `sprite` scene entity draws the frame of an `animation` for the time since its `start`. Animations take frames from a tile sheet or images, each with a duration in milliseconds and an optional `dx` and `dy` offset, and play in a loop, once or ping-pong, optionally along an easing curve. Sprites can be flipped, and `animation_status` tells which frame shows and when a `once` animation is done.
- `env.time`, the milliseconds since the first frame.
- A sample, "Sprites", a character that idles, walks, jumps and cheers.

## [0.9.2] - 2026-10-15

### Added

- Playlists: a track given `paths` plays its songs in turn, moving on by itself, even while the page is hidden. Its `index` tells which song is playing, and setting it plays another.
- A track's `duration`, the length of the song playing.
- A sample, "Jukebox", a small music player.

## [0.9.1] - 2026-10-15

### Added

- Positional audio: sounds and tracks with `x` and `y` are placed on the canvas and heard from `env.listener`, panning towards their side and fading with distance to silence at their `range`.
- A sample, "Find the cricket", played by ear.

## [0.9.0] - 2026-10-14

### Added

- Sound: sound effects pushed to `env.sounds`, tracks such as music kept in `env.tracks`, and `env.volume` for everything. The `sound` and `track` factories make them, `preload_sounds` loads sound effects before the first frame, and `background_audio` keeps tracks playing while the page is hidden.
- A sample with sound effects and music.

## [0.8.0] - 2026-10-12

### Added

- Touch and pen input: `env.inputs.mouse` follows a mouse, a finger or a pen, through the browser's pointer events. A touch presses the left button where it lands; with several fingers, only the first is followed. `mouse.pointer_type` tells which it is.
- The `touch_scroll` config option, which when `false` stops touches on the canvas scrolling the page, so apps can follow touch drags. The drag-and-drop sample sets it.
- A web site, [https://nogginly.github.io/kwilos.js/](https://nogginly.github.io/kwilos.js/), with the samples running live from the CDN and the API documentation, published with each release.

## [0.7.1] - 2026-10-12

### Added

- Published on npm as `kwilos.js`, and so on public CDNs such as jsDelivr and unpkg. The package contains the bundles in `_dist`, with source maps and TypeScript declarations, and the source in `src`.

## [0.7.0] - 2026-10-06

### Added

- Hit-testing: `env.hit(point)` returns the shape drawn topmost at a point, by default the mouse position, and `contains(shape, point)` tells whether a shape contains a point.
- Every shape accepts an optional `id`, which Kwilos ignores, for telling shapes apart, such as the one `env.hit` returns.
- `env.inputs.mouse.clicks` lists the clicks on the canvas since the previous frame, with the button and position of each, so a click quicker than a frame is not lost.
- `kwilos.detach()` stops the frames and removes the input listeners.
- The `on_error` config option receives errors thrown during a frame, so frames continue.
- The `context_menu` config option, which when `false` suppresses the browser's context menu over the canvas.
- A drag-and-drop sample, `samples/03-drag-and-drop`, built on `env.hit` and `clicks`.

### Changed

- **Breaking:** `env.inputs.key.typed` is a list of every printable key pressed since the previous frame, in order, and empty when there are none. It was a single key, so a key typed in the same frame as another was lost.
- An error thrown during a frame without `on_error` detaches Kwilos, removing its input listeners as well as stopping the frames.

### Fixed

- Mouse positions are in canvas pixels when the canvas is displayed at another size; they were in CSS pixels.

## [0.6.0] - 2026-10-05

### Changed (breaking)

- `tick` returns the scene to draw, replacing `env.outputs`. An array clears the background and draws its entities in order; `null` leaves the canvas as it is; any other value throws a `TypeError`.
- Entities are drawn by their `type` only. An entity without a recognised `type` throws a `TypeError`, where it was previously guessed from its fields.
- A container's entities move from `outputs` to `scene`.
- Invalid entities throw a `TypeError` where they previously drew nothing: a container without a `scene`, a clipped container without `w` and `h`, and a tile without `tile_w` and `tile_h` or `tile_rows` and `tile_cols`.
- `Kwilos.attach` throws a `TypeError` when no canvas is found, and rejects when a preloaded image fails to load.

### Added

- Shape factories, exported alongside `Kwilos`: `circle`, `rect`, `label`, `image`, `tile` and `container`.
- `null`, `undefined` and `false` entries in a scene are skipped, so conditional entities can be written inline.
- After the canvas is resized, the last scene is drawn again.
- JSDoc types, checked with TypeScript, and declarations in `_dist/types` for editors and TypeScript projects.
- `src/` runs in the browser without a build.

### Fixed

- A container without `clip` threw a `ReferenceError`.
- A mouse button released outside the canvas stayed pressed.
- Buttons and keys stayed pressed after the window lost focus.
- An image that was not preloaded was fetched again on every frame until it loaded.

### Removed

- `env.outputs`, replaced by the return value of `tick`.
- `env.grid`, which was unused.
