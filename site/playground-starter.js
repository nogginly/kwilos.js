// Edit this app, then press Run. Add images, sounds or data files with
// "Add files", and use them by name, as in image({ path: "hero.png" }).
import { Kwilos, circle, label } from "kwilos.js"

// How the canvas is set up
const config = {
  background_color: "#1b2433",
}

await Kwilos.attach("#canvas", tick, config)

// Called on every frame; returns the scene to draw, back to front
function tick(env) {
  const { mouse } = env.inputs
  const seconds = env.time / 1000

  // A circle that travels round the canvas as time passes
  const orbiter = circle({
    x: 300 + 200 * Math.cos(seconds * 2),
    y: 180 + 100 * Math.sin(seconds * 3),
    radius: 24,
    fill_color: "gold",
  })

  // A circle under the mouse, drawn once the mouse has entered the canvas;
  // a `false` in the scene is skipped
  const follower = mouse.x > 0 && circle({
    x: mouse.x,
    y: mouse.y,
    radius: 12,
    fill_color: "tomato",
  })

  const greeting = label({
    x: 300,
    y: 40,
    text: "Hello, Kwilos.js!",
    fill_color: "white",
    font_size: 16,
  })

  return [orbiter, follower, greeting]
}
