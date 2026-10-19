---
title: Debris field
summary: Rocks keep coming, as many as are on the screen at once.
mission: Turn one rock into a field of them.
time: 8
meet: lists, loops, filter
try: Watch the rocks come in, one every 0.7 seconds, and fly among them.
---

One rock is a hazard, but a field is a game. This step turns `rock` into `rocks`, a list. Lists are how games keep track of things that come and go: enemies, bullets, coins, sparks.

<!-- changes -->
<!-- playground -->

## How it works

- `game.rocks` starts as an empty list, `[]`. `game.next_rock_in` is a countdown, in seconds.
- Each frame, the countdown goes down by `dt`. When it reaches zero, `push` adds a new rock to the end of the list and the countdown starts again from `0.7`.
- `for (const rock of game.rocks)` is a **loop**. It runs `move_rock` once for each rock in the list. Compare it with step 4: the line inside the loop is the same, just used for every rock.
- `filter` makes a new list that keeps only the rocks for which the test is true, here those still above the bottom edge. The rest are dropped. Without this, the list would grow forever, each lost rock costing a little time on every frame.
- `game.rocks.map(draw_rock)` makes a list of shapes, one for each rock, and puts it in the scene.
- Push to add, a loop to move, and filter to remove: this pattern works for anything that comes and goes. The lasers in a later step use it too.

## Try this

- Change `0.7` to `0.2`. Then to `2`. Which makes the best game?
- Add `console.log(game.rocks.length)` at the end of `update`. How many rocks are there at once? What happens to the number if you delete the `filter` line?
- **Challenge:** add a starfield behind the rocks: a list of 50 small dots made once in `new_game`, which drift slowly down and wrap from the bottom back to the top.

## Words we met

- **list**: things in order, between `[` and `]`. JavaScript calls it an **array**.
- **loop**: code that runs once for each thing in a list.
- **filter**: keeps only the things in a list that pass a test.
