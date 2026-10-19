---
title: One rock
summary: A rock drifts down the screen, and another takes its place.
mission: Send a rock through the field.
time: 8
meet: objects, velocity, random numbers
try: Watch a rock drift down. Each one has its own size, place and speed.
---

Something has to get in the ship's way. In this step we add one rock and learn how to move it. Every rock in the next step works the same way, so this is the step to understand well.

<!-- changes -->
<!-- playground -->

## How it works

- A rock is an **object** with five values: where it is (`x`, `y`), how big it is (`radius`), and how fast it goes across and down (`vx`, `vy`, in pixels a second). Speed with a direction is called **velocity**.
- `new_rock` makes a rock. `random` picks each value, so no two rocks are alike. It starts at `y: -radius`, just above the top edge, so it slides into view.
- `move_rock` uses the same rule as the ship: distance = speed × time, on each axis.
- `draw_rock` turns a rock into a circle. A `stroke_color` draws its outline.
- In `update`, once the rock is lower than the bottom of the screen, `game.rock` gets a new rock. The old one is forgotten.
- The rock's three functions follow the ship's pattern: make it, move it, draw it. Most things in a game get the same three.

## Try this

- Make every rock fall straight down. Which numbers in `new_rock` do you change?
- Make the rocks much bigger, or much faster. At what point is the game too hard?
- **Challenge:** make a rock that leaves the left or right edge come back on the other side, as in *Asteroids*.

## Words we met

- **object**: a group of named values, between `{` and `}`, such as a rock's `x`, `y` and `radius`.
- **velocity**: speed in a direction, here as `vx` across and `vy` down.
- **random**: a different value each time, picked by `Math.random`.
