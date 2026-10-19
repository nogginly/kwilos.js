// A salvage ship at the edge of a debris field. Press Run to see it.
import { Kwilos, circle, label, rect } from "kwilos.js"

// Settings for the canvas
const config = {
  background_color: "#0b1020",
  font: "14pt monospace",
}

await Kwilos.attach("#canvas", tick, config)

// Kwilos calls tick about 60 times a second.
// It returns the scene: what to draw, from the back to the front.
function tick(env) {
  const planet = circle({ x: 520, y: 420, radius: 160, fill_color: "#1d2b4f" })

  const wings = rect({ x: 283, y: 300, w: 34, h: 8, fill_color: "#7a8aa6" })
  const hull = rect({ x: 293, y: 280, w: 14, h: 30, fill_color: "#d8dee9" })
  const cockpit = circle({ x: 300, y: 288, radius: 4, fill_color: "#4fc3f7" })

  const title = label({ x: 300, y: 40, text: "DEBRIS FIELD" })

  return [planet, wings, hull, cockpit, title]
}
