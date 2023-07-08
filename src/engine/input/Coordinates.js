import Point from '@/engine/math/Point.js'

export default class Coordinates {
  constructor() {
    this.current = new Point()
    this.previous = new Point()
    this.start = new Point()
    this.end = new Point()
    this.absolute = new Point()
    this.relative = new Point()
    this.sensitivity = new Point(1, 1)
  }

  down(x, y, relative = false) {
    if (relative) {
      this.start.copy(this.current).add(x, y)
    } else {
      this.start.set(x, y)
    }
    this.end.copy(this.start)
    this.absolute.reset()
  }

  up(x, y, relative = false) {
    if (relative) {
      this.end.copy(this.current).add(x, y)
    } else {
      this.end.set(x, y)
    }
    this.absolute.copy(this.start).subtract(this.end)
  }

  update(x, y, relative = false) {
    this.previous.copy(this.current)
    if (relative) {
      this.current.add(x, y)
      this.relative
        .set(x, y)
        .divide(this.sensitivity)
        .clamp(-1, 1)
    } else {
      this.current.set(x, y)
      this.relative.copy(this.current)
        .subtract(this.previous)
        .divide(this.sensitivity)
        .clamp(-1, 1)
    }
  }
}
