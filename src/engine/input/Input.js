import Keyboard from './Keyboard.js'
import Mouse from './Mouse.js'
import Pointer from './Pointer.js'
import Gamepads from './Gamepads.js'
import Touch from './Touch.js'

export default class Input {
  #keyboard = new Keyboard()
  #mouse = new Mouse()
  #pointer = new Pointer()
  #gamepads = new Gamepads()
  #touch = new Touch()
  #devices = null

  constructor() {
    this.#devices = [
      this.#keyboard,
      this.#mouse,
      this.#pointer,
      this.#gamepads,
      this.#touch
    ]
  }

  get keyboard() {
    return this.#keyboard
  }

  get mouse() {
    return this.#mouse
  }

  get pointer() {
    return this.#pointer
  }

  get gamepads() {
    return this.#gamepads
  }

  get touch() {
    return this.#touch
  }

  get devices() {
    return this.#devices
  }

  update() {
    this.#devices.forEach((device) => device.update())
  }

  start() {
    this.#devices.forEach((device) => device.start())
  }

  stop() {
    this.#devices.forEach((device) => device.stop())
  }
}
