// Welcome to the forest! Press Run to see it.
import { Kwilos, label, rect } from "kwilos.js"

// Settings for the canvas
const config = {
  background_color: "skyblue",
}

await Kwilos.attach("#canvas", tick, config)

// Kwilos runs tick again and again, about 60 times a second.
// Each time, tick says what the picture looks like right now.
function tick(env) {
  const grass = rect({
    x: 0,
    y: 300,
    w: 600,
    h: 60,
    fill_color: "forestgreen",
  })

  const squirrel = label({
    x: 300,
    y: 320,
    text: "🐿️",
    font_size: 40,
    fill_color: "black",
  })

  // The scene: what to draw, from the back to the front
  return [grass, squirrel]
}
