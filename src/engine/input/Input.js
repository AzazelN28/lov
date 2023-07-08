import InputDevice from './InputDevice.js'
import InputKind from './InputKind.js'

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

  #bindings = new Map([
    [
      'forward',
      [
        [InputDevice.KEYBOARD, 'KeyW'],
        [InputDevice.KEYBOARD, 'ArrowUp'],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 1, -1],
      ],
    ],
    [
      'backward',
      [
        [InputDevice.KEYBOARD, 'KeyS'],
        [InputDevice.KEYBOARD, 'ArrowDown'],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 1, 1],
      ],
    ],
    [
      'strafeLeft',
      [
        [InputDevice.KEYBOARD, 'KeyA'],
        [InputDevice.KEYBOARD, 'ArrowLeft'],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 0, -1],
      ],
    ],
    [
      'strafeRight',
      [
        [InputDevice.KEYBOARD, 'KeyD'],
        [InputDevice.KEYBOARD, 'ArrowRight'],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 0, 1],
      ],
    ],
    [
      'up',
      [
        [InputDevice.KEYBOARD, 'KeyQ'],
        [InputDevice.KEYBOARD, 'PageUp'],
      ],
    ],
    [
      'down',
      [
        [InputDevice.KEYBOARD, 'KeyE'],
        [InputDevice.KEYBOARD, 'PageDown'],
      ],
    ],
    [
      'lookUp',
      [
        [InputDevice.MOUSE, InputKind.AXIS, 1, -1],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 4, -1],
      ],
    ],
    [
      'lookDown',
      [
        [InputDevice.MOUSE, InputKind.AXIS, 1, 1],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 4, 1],
      ],
    ],
    [
      'turnLeft',
      [
        [InputDevice.MOUSE, InputKind.AXIS, 0, -1],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 3, -1],
      ],
    ],
    [
      'turnRight',
      [
        [InputDevice.MOUSE, InputKind.AXIS, 0, 1],
        [InputDevice.GAMEPAD, 0, InputKind.AXIS, 3, 1],
      ],
    ],
  ])

  #state = new Map()

  #devices = null

  constructor() {
    this.#devices = [
      this.#keyboard,
      this.#mouse,
      this.#pointer,
      this.#touch,
      this.#gamepads,
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

  stateOf(action) {
    return this.#state.get(action) ?? 0.0
  }

  isPressed(action, threshold = 0.25) {
    return Math.abs(this.stateOf(action)) >= threshold
  }

  isReleased(action) {
    return !this.isPressed(action)
  }

  #clearState() {
    for (const [action] of this.#state) {
      this.#state.set(action, 0)
    }
  }

  #updateState() {
    for (const [action, bindings] of this.#bindings) {
      for (const [deviceIndex, ...deviceBindings] of bindings) {
        if (deviceBindings.length === 0) {
          continue
        }
        const device = this.#devices[deviceIndex]
        const deviceState = device.stateOf(...deviceBindings)
        const currentState = this.#state.get(action)
        this.#state.set(action, Math.max(currentState ?? 0.0, deviceState))
      }
    }
  }

  update() {
    this.#clearState()
    this.#devices.forEach((device) => device.update())
    this.#updateState()
  }

  start() {
    this.#devices.forEach((device) => device.start())
  }

  stop() {
    this.#devices.forEach((device) => device.stop())
  }
}
