import InputKind from './InputKind.js'
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
      this.#buttons.set(e.button, e.type === 'mousedown' ? 1.0 : 0.0)
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

  stateOf(kind, subindex, sign) {
    if (kind === InputKind.BUTTON) {
      return this.#buttons.get(subindex) ?? 0.0
    } else if (kind === InputKind.AXIS) {
      switch (subindex) {
        case 0: return Math.sign(this.#coords.relative.x) === sign ? Math.abs(this.#coords.relative.x) : 0.0
        case 1: return Math.sign(this.#coords.relative.y) === sign ? Math.abs(this.#coords.relative.y) : 0.0
        case 3: return Math.sign(this.#coords.absolute.x) === sign ? Math.abs(this.#coords.absolute.x) : 0.0
        case 4: return Math.sign(this.#coords.absolute.y) === sign ? Math.abs(this.#coords.absolute.y) : 0.0
        default: return 0.0
      }
    }
  }

  isPressed(kind, subindex, sign) {
    return this.stateOf(kind, subindex, sign) >= 0.0
  }

  isReleased(kind, subindex, sign) {
    return !this.isPressed(kind, subindex, sign)
  }

  update() {
    /*
    if (!!document.pointerLockElement) {
      this.#coords.update(0, 0, true)
    }
    */
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
