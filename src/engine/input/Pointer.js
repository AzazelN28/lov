import Coordinates from './Coordinates.js'

export default class Pointer {
  static getButtonName(button) {
    return `Button${button + 1}`
  }

  #target = null
  #buttons = new Map()
  #coords = new Coordinates()

  #onPointer = (e) => {
    const x = document.pointerLockElement ? e.movementX : e.offsetX
    const y = document.pointerLockElement ? e.movementY : e.offsetY
    this.#coords.update(x, y, !!document.pointerLockElement)
    if (e.type === 'pointerdown' || e.type === 'pointerup') {
      this.#buttons.set(
        Pointer.getButtonName(e.button),
        e.type === 'pointerdown' ? 1.0 : 0.0
      )
      if (e.type === 'pointerdown') {
        this.#coords.down(x, y, !!document.pointerLockElement)
      } else if (e.type === 'pointerup') {
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

  start() {
    this.#target.addEventListener('pointermove', this.#onPointer)
    this.#target.addEventListener('pointerdown', this.#onPointer)
    this.#target.addEventListener('pointerup', this.#onPointer)
  }

  stop() {
    this.#target.removeEventListener('pointermove', this.#onPointer)
    this.#target.removeEventListener('pointerdown', this.#onPointer)
    this.#target.removeEventListener('pointerup', this.#onPointer)
  }
}
