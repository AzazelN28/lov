import Coordinates from './Coordinates.js'

export default class Mouse {
  static getButtonName(button) {
    return `Button${button + 1}`
  }

  #target = null
  #buttons = new Map()
  #coords = new Coordinates()

  #onMouse = (e) => {
    const x = document.pointerLockElement ? e.movementX : e.offsetX
    const y = document.pointerLockElement ? e.movementY : e.offsetY
    this.#coords.update(x, y, !!document.pointerLockElement)
    if (e.type === 'mousedown' || e.type === 'mouseup') {
      this.#buttons.set(Mouse.getButtonName(e.button), e.type === 'mousedown' ? 1.0 : 0.0)
      if (e.type === 'mousedown') {
        this.#coords.down(x, y, !!document.pointerLockElement)
      } else if (e.type === 'mouseup') {
        this.#coords.up(x, y, !!document.pointerLockElement)
      }
    }
  }

  constructor(target = window) {
    this.#target = target
  }

  get coords() {
    return this.#coords
  }

  update() {
    if (!!document.pointerLockElement) {
      this.#coords.update(0, 0, true)
    }
  }

  start() {
    this.#target.addEventListener('mousemove', this.#onMouse)
    this.#target.addEventListener('mousedown', this.#onMouse)
    this.#target.addEventListener('mouseup', this.#onMouse)
  }

  stop() {
    this.#target.removeEventListener('mousemove', this.#onMouse)
    this.#target.removeEventListener('mousedown', this.#onMouse)
    this.#target.removeEventListener('mouseup', this.#onMouse)
  }
}
