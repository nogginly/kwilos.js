// Edit this app, then press Run. Add images, sounds or data files with
// "Add files", and use them by name, as in image({ path: "hero.png" }).
import { Kwilos, circle, label } from "kwilos.js"

await Kwilos.attach("#canvas", (env) => {
  const { mouse } = env.inputs
  const t = env.time / 1000
  return [
    circle({ x: 300 + 200 * Math.cos(t * 2), y: 180 + 100 * Math.sin(t * 3), radius: 24, fill_color: "gold" }),
    mouse.x > 0 && circle({ x: mouse.x, y: mouse.y, radius: 12, fill_color: "tomato" }),
    label({ x: 300, y: 40, text: "Edit me, then press Run", fill_color: "white", font_size: 16 }),
  ]
}, { background_color: "#1b2433" })
