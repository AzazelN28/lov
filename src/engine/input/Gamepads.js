export default class Gamepads {
  #gamepads = null

  #onGamepad = (e) => {
    if (e.type === 'gamepadconnected') {

    } else if (e.type === 'gamepaddisconnected') {

    }
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
