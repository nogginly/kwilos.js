---
title: Hello, forest
summary: A blue sky, some grass and a squirrel.
---

Welcome! You are going to make a game where a squirrel catches nuts that fall from an oak tree. Nobody makes a game in one go. We will build it one small step at a time, and after every step you will have a program that works.

First, a forest: a blue sky, some green grass, and a squirrel standing on it.

<!-- changes -->
<!-- playground -->

**Press Run** to see the forest. You can change the program in the editor and press Run again whenever you like.

## How it works

- `import` is how we ask Kwilos.js for the pieces we need. Here we want `rect` (a rectangle), `label` (some text, and emoji are text too!) and `Kwilos` itself.
- A `label` needs a `fill_color`, or Kwilos draws nothing. An emoji has its own colours, so the colour we pick does not show, but it still has to be there.
- `config` holds our settings. We only have one: the colour of the sky.
- `Kwilos.attach` joins our program to the **canvas**, the picture area above. The canvas is 600 across and 360 down. `x` counts from the left edge and `y` counts down from the top.
- `tick` is a **function**: some instructions with a name. Kwilos runs `tick` again and again, about 60 times a second. Each time, `tick` says what the picture looks like *right now*.
- What `tick` hands back is a list of things to draw, from the back to the front. That list is called the **scene**. The grass comes first, so the squirrel is drawn on top of it.

## Try this

- Change `"skyblue"` to `"orange"` and press Run. A sunset!
- Change the grass `h: 60` to `h: 100`. What happens?
- Move the squirrel by changing `x: 300` to any number from 0 to 600.
- Find another emoji, copy it, and paste it in place of the squirrel.

## Words we met

- **function**: a set of instructions with a name.
- **canvas**: the picture area that the game is drawn on.
- **scene**: the list of things to draw, from the back to the front.
