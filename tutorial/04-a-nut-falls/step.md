---
title: A nut falls
summary: A nut drops from the oak, lands in the grass, and drops again.
mission: Make a nut fall from the oak.
time: 6
meet: time and speed
try: Watch the nut fall, land in the grass, and drop again.
---

Oaks drop nuts, and now our squirrel has something to catch.

<!-- changes -->
<!-- playground -->

## How it works

- How far has the nut fallen? You may know the answer from school: **distance = speed × time**. We store when the nut was dropped, `dropped_at`. Then `fall_time` is how long it has been falling, and `120 * fall_time` is how far it has fallen.
- `env.time` counts the milliseconds since the game started, so we divide by 1000 to get seconds.
- After 2 seconds the nut has landed. We pick it up again by setting `dropped_at` back to now, and `fall_time` back to 0.
- The nut's picture comes just before the squirrel in the scene, so the squirrel is in front of it.

## Try this

- Change the speed `120` to `300`. A heavy nut! What about `30`?
- Move where the nut falls by changing `x: 400`.
- Change `fall_time > 2` to `fall_time > 1`. Does the nut still land in the grass? Why not? (Think about distance = speed × time.)
- Find a different emoji for the nut.

## Words we met

- **pixel**: one tiny dot of the picture. Our canvas is 600 pixels across.
- **speed**: how far something goes in one second. Here it is measured in pixels per second.

More steps are on the way.
