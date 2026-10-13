# Changelog

Notable changes to Kwilos JS. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/); before 1.0, a minor version may break the API.

## [Unreleased]

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
