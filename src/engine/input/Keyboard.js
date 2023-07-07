export default class Keyboard {
  #keys = new Map()
  #callbacks = new Map()
  #target = null

  #onKey = (e) => {
    e.preventDefault()
    this.#keys.set(e.code, e.type === 'keydown' ? 1.0 : 0.0)
    if (e.type === 'keyup' && this.#callbacks.size > 0) {
      if (this.#callbacks.has(e.key)) {
        const callback = this.#callbacks.get(e.key)
        callback()
      }
    }
  }

  constructor(target = window) {
    this.#target = target
  }

  on(key, callback) {
    this.#callbacks.set(key, callback)
  }

  off(key) {
    this.#callbacks.delete(key)
  }

  reset() {
    this.#keys.clear()
  }

  stateOf(key) {
    return this.#keys.get(key) ?? 0.0
  }

  isPressed(key) {
    return this.stateOf(key) > 0.0
  }

  isReleased(key) {
    return !this.isPressed(key)
  }

  update() {}

  start() {
    this.#target.addEventListener('keydown', this.#onKey)
    this.#target.addEventListener('keyup', this.#onKey)
  }

  stop() {
    this.#target.removeEventListener('keydown', this.#onKey)
    this.#target.removeEventListener('keyup', this.#onKey)
  }
}
