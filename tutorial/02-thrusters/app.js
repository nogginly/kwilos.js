// Fly the ship with the arrow keys, WASD, or a finger.
import { Kwilos, circle, label, rect } from "kwilos.js"

// Settings for the canvas
const config = {
  background_color: "#0b1020",
  font: "14pt monospace",
  claim_keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
  touch_scroll: false,
}

await Kwilos.attach("#canvas", tick, config)

// Kwilos calls tick about 60 times a second.
// It returns the scene: what to draw, from the back to the front.
function tick(env) {
  const { key, mouse } = env.inputs

  // env.state keeps the ship from one tick to the next
  const ship = env.state.ship ??= { x: 300, y: 300, speed: 240 }

  // Which way to fly: -1, 0 or 1 on each axis
  let dx = 0
  let dy = 0
  if (key.pressed.ArrowLeft || key.pressed.KeyA) dx = -1
  if (key.pressed.ArrowRight || key.pressed.KeyD) dx = 1
  if (key.pressed.ArrowUp || key.pressed.KeyW) dy = -1
  if (key.pressed.ArrowDown || key.pressed.KeyS) dy = 1

  // A finger, or a held mouse button, steers towards the pointer
  if (mouse.button_left) {
    dx = Math.max(-1, Math.min(1, (mouse.x - ship.x) / 20))
    dy = Math.max(-1, Math.min(1, (mouse.y - ship.y) / 20))
  }

  // distance = speed × time, one frame at a time
  ship.x += dx * ship.speed * env.dt
  ship.y += dy * ship.speed * env.dt

  const planet = circle({ x: 520, y: 420, radius: 160, fill_color: "#1d2b4f" })

  const wings = rect({ x: ship.x - 17, y: ship.y, w: 34, h: 8, fill_color: "#7a8aa6" })
  const hull = rect({ x: ship.x - 7, y: ship.y - 20, w: 14, h: 30, fill_color: "#d8dee9" })
  const cockpit = circle({ x: ship.x, y: ship.y - 12, radius: 4, fill_color: "#4fc3f7" })

  const title = label({ x: 300, y: 40, text: "DEBRIS FIELD" })

  return [planet, wings, hull, cockpit, title]
}
