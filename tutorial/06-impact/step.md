---
title: Impact
summary: Rocks dent the hull, and three dents wreck the ship.
mission: Make the rocks dangerous.
time: 8
meet: collisions, distance, game over
try: Fly into a rock and watch the hull go down. Lose all three, then press **Run** to fly again.
---

Until now the rocks have passed through the ship. In this step they hit it. Working out whether two things touch is called **collision detection**, and for circles it takes one line.

<!-- changes -->
<!-- playground -->

## How it works

- Two circles touch when the distance between their centres is less than their two radii added together. `Math.hypot` works out that distance, using Pythagoras' theorem. `touching` does the check.
- The ship gets a `radius` too, so the same test works for it. A circle is only roughly the shape of the ship, and most games accept that: players forgive a near miss, but not a hit they did not see coming.
- In `update`, each rock that touches the ship takes one from `game.hull` and is marked `broken`. The `filter` now also drops broken rocks, so each rock can hit only once.
- When the hull reaches 0, `update` stops at its first line, `return`, so nothing moves any more.
- `draw` shows the hull at the top left. Once the ship is wrecked, it shows `HULL BREACHED` and leaves out the ship. `!wrecked && ...` is `false` when the ship is wrecked, and Kwilos skips a `false` in the scene.

## Try this

- Make the ship's `radius` `30`, then `4`. Which feels fair?
- Give the ship more hull points. Where is the number?
- **Challenge:** after a hit, make the ship safe from rocks for one second, and make it blink during that second. You will need a countdown, like `next_rock_in`.

## Words we met

- **collision**: two things in the game touching.
- **radius**: the distance from a circle's centre to its edge.
- **game over**: the point where the game stops responding to the player. In a later step it becomes a screen, with a way to start again.
