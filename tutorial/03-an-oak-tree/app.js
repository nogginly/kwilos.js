// An oak tree for the squirrel.
import { Kwilos, circle, label, rect } from "kwilos.js"

// Settings for the canvas
const config = {
  background_color: "skyblue",
  touch_scroll: false, // a finger moves the squirrel, not the page
}

await Kwilos.attach("#canvas", tick, config)

// Kwilos runs tick again and again, about 60 times a second.
// Each time, tick says what the picture looks like right now.
function tick(env) {
  const { mouse } = env.inputs

  // env.state remembers things from one tick to the next
  const player = env.state.player ??= { x: 300 }

  if (mouse.moved || mouse.button_left) {
    player.x = mouse.x
  }

  // The oak: a trunk, and three circles for its leaves
  const trunk = rect({
    x: 270,
    y: 100,
    w: 60,
    h: 200,
    fill_color: "saddlebrown",
  })

  const leaves_left = circle({ x: 200, y: 70, radius: 80, fill_color: "darkgreen" })
  const leaves_middle = circle({ x: 300, y: 50, radius: 90, fill_color: "darkgreen" })
  const leaves_right = circle({ x: 400, y: 70, radius: 80, fill_color: "darkgreen" })

  const grass = rect({
    x: 0,
    y: 300,
    w: 600,
    h: 60,
    fill_color: "forestgreen",
  })

  const squirrel = label({
    x: player.x,
    y: 320,
    text: "🐿️",
    font_size: 40,
    fill_color: "black",
  })

  // The scene: what to draw, from the back to the front
  return [trunk, leaves_left, leaves_middle, leaves_right, grass, squirrel]
}
