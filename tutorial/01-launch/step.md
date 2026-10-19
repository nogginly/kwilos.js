---
title: Launch
summary: A ship, a planet and a title, made of shapes.
mission: Put a ship on the screen.
time: 5
meet: the canvas, tick, the scene
try: Press **Run**. Then change the planet's `radius` from `160` to `300` and run it again.
---

Every game is drawn on a **canvas**, and this one starts with a ship waiting at the edge of a debris field. There is no art yet: the ship is made of two rectangles and a circle. Plenty of real games are prototyped this way, and you can swap in real art in a later step.

<!-- changes -->
<!-- playground -->

## How it works

- `import` takes the parts we need from Kwilos.js: `circle`, `rect`, `label` (text) and `Kwilos` itself.
- `config` holds settings for the canvas: the colour of space, and the font for text.
- `Kwilos.attach` joins the program to the canvas. The canvas is 600 pixels across and 360 down. `x` counts from the left edge, and `y` counts **down** from the top, so `y: 300` is near the bottom.
- `tick` is a **function** that Kwilos calls about 60 times a second. Each time, it returns what the screen should look like at that moment.
- That return value is a list called the **scene**. Shapes are drawn in list order, so later ones cover earlier ones: the planet is behind everything.
- Colours such as `"#4fc3f7"` are hex codes: red, green and blue, each from `00` to `ff`. Names such as `"orange"` work too.

## Try this

- Change the cockpit's colour. Try `"#ff6b6b"` or `"gold"`.
- Move the planet to the left side of the screen. Which number do you change?
- Put `planet` last in the `return` list. What happens, and why?
- **Challenge:** give the ship two engines: small orange rectangles just under the wings.

## Words we met

- **canvas**: the area the game is drawn on, measured in pixels.
- **function**: a named set of instructions. `tick` is one.
- **scene**: the list of shapes to draw, from the back to the front.
