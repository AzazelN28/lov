import Input from './input/Input.js'
import Loop from './core/Loop.js'

export default class Engine {
  #scheduler = null
  #input = null
  #audio = null
  #renderer = null

  constructor() {
    this.#pipeline = [
      this.#stepResize,
      this.#stepInput,
      this.#stepUpdate,
      this.#stepAudio,
      this.#stepRender
    ]
    this.#loop = new Loop(this.#pipeline)
    this.#scheduler = null
    this.#audio = null
    this.#input = new Input()

    this.#systems = [this.#input]
  }

  start() {
    this.#input.start()
  }

  stop() {
    this.#input.stop()
  }
}
