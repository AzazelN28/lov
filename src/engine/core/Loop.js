export default class Loop {
  #isRunning = false
  #frameId = null
  #pipeline = null
  #requestAnimationFrame = null
  #cancelAnimationFrame = null

  #onFrame = (t) => {
    this.#pipeline.forEach((step) => step(t))
    this.#frameId = this.#requestAnimationFrame.call(null, this.#onFrame)
  }

  constructor(pipeline = [], {
    requestAnimationFrame = window.requestAnimationFrame,
    cancelAnimationFrame = window.cancelAnimationFrame
  } = {}) {
    this.#pipeline = pipeline
    this.#requestAnimationFrame = requestAnimationFrame
    this.#cancelAnimationFrame = cancelAnimationFrame
  }

  get pipeline() {
    return this.#pipeline
  }

  start() {
    if (this.#isRunning) {
      return false
    }
    this.#isRunning = true
    this.#frameId = this.#requestAnimationFrame.call(null, this.#onFrame)
    return true
  }

  stop() {
    if (!this.#isRunning) {
      return false
    }
    this.#isRunning = false
    this.#cancelAnimationFrame.call(null, this.#frameId)
    this.#frameId = null
    return true
  }
}
