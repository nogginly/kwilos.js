// Now the squirrel follows your mouse, or your finger.
import { Kwilos, label, rect } from "kwilos.js"

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
  return [grass, squirrel]
}
