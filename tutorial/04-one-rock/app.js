// A rock drifts down through the field, and another follows it.
import { Kwilos, circle, label, rect } from "kwilos.js"

// Settings for the canvas
const config = {
  background_color: "#0b1020",
  font: "14pt monospace",
  claim_keys: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"],
  touch_scroll: false,
}

await Kwilos.attach("#canvas", tick, config)

// Kwilos calls tick about 60 times a second: update the game, then draw it
function tick(env) {
  const game = env.state.game ??= new_game()
  update(game, env)
  return draw(game)
}

// Everything the game keeps track of, as it is at the start
function new_game() {
  return {
    ship: { x: 300, y: 300, speed: 240 },
    rock: new_rock(),
  }
}

// Moves the game on by one frame
function update(game, env) {
  fly_ship(game.ship, env.inputs, env.dt)
  move_rock(game.rock, env.dt)

  // Once the rock has left the bottom of the screen, a new one comes
  if (game.rock.y > 360 + game.rock.radius) {
    game.rock = new_rock()
  }
}

// Returns the scene: what to draw, from the back to the front
function draw(game) {
  const planet = circle({ x: 520, y: 420, radius: 160, fill_color: "#1d2b4f" })
  const title = label({ x: 300, y: 40, text: "DEBRIS FIELD" })

  return [planet, draw_rock(game.rock), draw_ship(game.ship), title]
}

// Moves the ship by the keys or the pointer, and keeps it on screen
function fly_ship(ship, { key, mouse }, dt) {
  // Which way to fly: -1, 0 or 1 on each axis
  let dx = 0
  let dy = 0
  if (key.pressed.ArrowLeft || key.pressed.KeyA) dx = -1
  if (key.pressed.ArrowRight || key.pressed.KeyD) dx = 1
  if (key.pressed.ArrowUp || key.pressed.KeyW) dy = -1
  if (key.pressed.ArrowDown || key.pressed.KeyS) dy = 1

  // A finger, or a held mouse button, steers towards the pointer
  if (mouse.button_left) {
    dx = clamp((mouse.x - ship.x) / 20, -1, 1)
    dy = clamp((mouse.y - ship.y) / 20, -1, 1)
  }

  // distance = speed × time, one frame at a time
  ship.x = clamp(ship.x + dx * ship.speed * dt, 20, 580)
  ship.y = clamp(ship.y + dy * ship.speed * dt, 30, 340)
}

// Returns the ship's shapes, drawn around its x and y
function draw_ship(ship) {
  return [
    rect({ x: ship.x - 17, y: ship.y, w: 34, h: 8, fill_color: "#7a8aa6" }),
    rect({ x: ship.x - 7, y: ship.y - 20, w: 14, h: 30, fill_color: "#d8dee9" }),
    circle({ x: ship.x, y: ship.y - 12, radius: 4, fill_color: "#4fc3f7" }),
  ]
}

// Returns a new rock, just above the top of the screen, at a random place,
// size and speed
function new_rock() {
  const radius = random(10, 24)
  return {
    x: random(20, 580),
    y: -radius,
    radius,
    vx: random(-30, 30),
    vy: random(80, 180),
  }
}

// Moves a rock by its speed: vx across, vy down, in pixels a second
function move_rock(rock, dt) {
  rock.x += rock.vx * dt
  rock.y += rock.vy * dt
}

// Returns the rock's shape
function draw_rock(rock) {
  return circle({ x: rock.x, y: rock.y, radius: rock.radius, fill_color: "#6b6f7a", stroke_color: "#a3a8b4" })
}

// Returns a random number from low up to high
function random(low, high) {
  return low + Math.random() * (high - low)
}

// Returns n, but no less than low and no more than high
function clamp(n, low, high) {
  return Math.max(low, Math.min(high, n))
}
