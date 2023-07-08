import Coordinates from './Coordinates.js'

export default class Touch {
  #target = null
  #coords = null

  #onTouch = (e) => {
    this.#coords.update(x, y)
    if (e.type === 'touchstart' || e.type === 'touchend') {
      if (e.type === 'touchstart') {
        this.#coords.down(x, y)
      } else if (e.type === 'touchend') {
        this.#coords.up(x, y)
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

  }

  start() {
    if (navigator.maxTouchPoints > 0) {
      this.#coords = Array.from(new Array(navigator.maxTouchPoints), () => new Coordinates())
    }

    this.#target.addEventListener('touchmove', this.#onTouch)
    this.#target.addEventListener('touchstart', this.#onTouch)
    this.#target.addEventListener('touchend', this.#onTouch)
    this.#target.addEventListener('touchcancel', this.#onTouch)
  }

  stop() {
    this.#target.removeEventListener('touchmove', this.#onTouch)
    this.#target.removeEventListener('touchstart', this.#onTouch)
    this.#target.removeEventListener('touchend', this.#onTouch)
    this.#target.removeEventListener('touchcancel', this.#onTouch)
  }
}
