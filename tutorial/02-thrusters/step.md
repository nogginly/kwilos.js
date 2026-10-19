---
title: Thrusters
summary: Fly the ship with the keys, the mouse or a finger.
mission: Make the ship fly.
time: 8
meet: state, input, speed × time
try: Click the picture, then fly with the arrow keys or WASD. With a mouse or a finger, hold and drag.
---

A ship that cannot move is a painting. In this step it gets thrusters, and you get the most important idea in game programming: moving things a little on every frame.

<!-- changes -->
<!-- playground -->

## How it works

- `tick` starts from nothing every time, so it cannot remember where the ship is. `env.state` can: what you put in it stays there from one tick to the next. `??=` means "if this is empty, put this in it", so the ship is created on the first tick and found again on every tick after.
- `dx` and `dy` say which way to fly: `-1`, `0` or `1` across and down. The keys set them. A held mouse button or finger sets them by how far away the pointer is, and `Math.max` and `Math.min` keep them between `-1` and `1`, so the ship slows as it arrives.
- **distance = speed × time.** `env.dt` is the time since the last tick, in seconds: about `0.017` on most screens. So `ship.speed * env.dt` is how far the ship should move in this one frame.
- Why not just add 4 pixels per frame? Because some screens draw 60 frames a second and some draw 120. Using `dt` keeps the ship at 240 pixels a second on any of them.
- The ship's shapes are now placed around `ship.x` and `ship.y`, so they move together.
- `claim_keys` stops the arrow keys scrolling the page, and `touch_scroll: false` stops a finger doing so.

## Try this

- Change the `speed` from `240` to `600`. Too fast to control? Find a speed that feels right.
- Fly diagonally, then straight across. Which is faster? (Think about a right-angled triangle.)
- **Challenge:** make the up and down thrusters weaker than the side ones, as if the ship were heavy.

## Words we met

- **state**: what a game remembers from one tick to the next.
- **frame**: one picture of the game. Kwilos draws about 60 a second.
- **dt**: short for "delta time", the time a frame takes, in seconds.
