---
title: Flight plan
summary: The same ship, sorted into update and draw, and kept on screen.
mission: Organise the code so the game can grow.
time: 8
meet: update and draw, functions with parameters
try: Fly into each edge of the screen. The ship stops at the edge.
---

The ship flies just as it did, with one change: it can no longer leave the screen. The bigger change is how the code is organised. Everything was in `tick`, and with rocks, lasers and a score to come, `tick` would grow to hundreds of lines. Most games split the work into two jobs, and from now on so does this one.

<!-- changes -->
<!-- playground -->

## How it works

- `tick` now does three things. It gets the `game` from `env.state`, or makes a new one. It calls `update` to move the game on by one frame. Then it returns whatever `draw` makes.
- **`update` changes things and `draw` only looks.** `update` moves the ship and, later, the rocks and lasers. `draw` turns the game into shapes and never changes it. When something looks wrong, you know which half to check.
- `new_game` returns everything the game keeps track of, as it is at the start. It holds one thing now, and will hold more.
- `fly_ship` and `draw_ship` hold the ship's code. A function can take **parameters**, the values it is given to work on: `fly_ship` is given the ship, the inputs and `dt`.
- `draw_ship` returns a list of shapes, and `draw` puts that list inside the scene. Kwilos draws lists inside lists in order, as if they were one long list.
- `clamp` keeps a number between a low and a high. It steers the ship, as before, and now also keeps it on screen.

## Try this

- Change the `clamp` limits so the ship can only fly in the bottom half of the screen.
- Add a second ship to `new_game`, such as `wingman: { x: 200, y: 320, speed: 240 }`, and draw it with `draw_ship(game.wingman)`. Why does it not move?
- **Challenge:** make the wingman fly too, by calling `fly_ship` for it in `update`. What happens, and how would you make it follow a different set of keys?

## Words we met

- **update**: the part of the game that changes things, once per frame.
- **draw**: the part that turns the game into shapes, without changing it.
- **parameter**: a value a function is given to work on.
