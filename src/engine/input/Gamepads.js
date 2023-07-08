import InputKind from './InputKind.js'

export default class Gamepads {
  #gamepads = null

  #onGamepad = (e) => {
    if (e.type === 'gamepadconnected') {

    } else if (e.type === 'gamepaddisconnected') {

    }
  }

  stateOf(index, kind, subindex, sign) {
    if (!this.#gamepads) {
      return 0.0
    }
    const gamepad = this.#gamepads[index]
    if (!gamepad) {
      return 0.0
    }
    if (kind === InputKind.BUTTON) {
      const value = gamepad.buttons[subindex].value
      return Math.sign(value) === sign ? Math.abs(value) : 0.0
    } else if (kind === InputKind.AXIS) {
      const value = gamepad.axes[subindex]
      return Math.sign(value) === sign ? Math.abs(value) : 0.0
    }
    return 0.0
  }

  isPressed(index, kind, subindex, sign, threshold = 0.1) {
    return Math.abs(this.stateOf(index, kind, subindex, sign)) >= threshold
  }

  isReleased(index, kind, subindex) {
    return !this.isPressed(index, kind, subindex)
  }

  update() {
    this.#gamepads = navigator.getGamepads()

  }

  start() {
    window.addEventListener('gamepadconnected', this.#onGamepad)
    window.addEventListener('gamepaddisconnected', this.#onGamepad)
  }

  stop() {
    window.removeEventListener('gamepadconnected', this.#onGamepad)
    window.removeEventListener('gamepaddisconnected', this.#onGamepad)
  }
}
