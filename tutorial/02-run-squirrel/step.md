---
title: Run, squirrel, run
summary: The squirrel follows your mouse, or your finger.
---

A game is no fun if you cannot play it! Now the squirrel follows your mouse. On a tablet or a phone, it follows your finger.

<!-- changes -->
<!-- playground -->

**Press Run**, then move the mouse over the picture. Where the mouse goes, the squirrel goes.

## How it works

- `env` is short for *environment*: everything Kwilos knows right now. It comes in every time `tick` runs. `env.inputs.mouse` tells us about the mouse.
- Here is a puzzle. `tick` starts from scratch every time, so how can it remember where the squirrel is? The answer is `env.state`. It is a box that keeps what we put in it, from one tick to the next.
- `??=` means *if it is empty, put this in*. The first time, there is no `player` yet, so it is made with `x: 300`. After that, the same `player` is found again and again.
- `mouse.moved` is true when the mouse has moved, and `mouse.button_left` is true while the button is pressed. Then the squirrel's `x` becomes the mouse's `x`. A touch counts too.
- `touch_scroll: false` stops a finger from scrolling the page, so you can use it to move the squirrel.

## Try this

- Change `y: 320` to another number. Can the squirrel fly?
- Make the squirrel bigger or smaller with `font_size`.
- **Challenge:** stop the squirrel from running off the edge. Use `Math.max(20, Math.min(580, mouse.x))` instead of `mouse.x`.

## Words we met

- **state**: what a game remembers from one tick to the next.
- **env**: everything Kwilos knows right now, such as the mouse.
