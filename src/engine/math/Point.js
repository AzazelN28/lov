export default class Point {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  get length() {
    return Math.hypot(this.x, this.y)
  }

  get lengthSquared() {
    return this.x * this.x + this.y * this.y
  }

  get angle() {
    return Math.atan2(this.y, this.x)
  }

  set(x, y) {
    this.x = x
    this.y = y
    return this
  }

  reset() {
    return this.set(0, 0)
  }

  copy({ x, y }) {
    return this.set(x, y)
  }

  clone() {
    return new Point(this.x, this.y)
  }

  polar(angle, length = 1) {
    return this.set(Math.cos(angle) * length, Math.sin(angle) * length)
  }

  add({ x, y }) {
    return this.set(this.x + x, this.y + y)
  }

  subtract({ x, y }) {
    return this.set(this.x - x, this.y - y)
  }

  multiply({ x, y }) {
    return this.set(this.x * x, this.y * y)
  }

  divide({ x, y }) {
    return this.set(this.x / x, this.y / y)
  }

  scale(scalar) {
    return this.set(this.x * scalar, this.y * scalar)
  }

  rotate(angle) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return this.set(c * this.x - s * this.y, s * this.x + c * this.y)
  }

  perpLeft() {
    return this.set(this.y, -this.x)
  }

  perpRight() {
    return this.set(-this.y, this.x)
  }

  dot({ x, y }) {
    return this.x * x + this.y * y
  }

  cross({ x, y }) {
    return this.x * y - this.y * x
  }

  normalize() {
    const l = this.length
    return this.set(this.x / l, this.y / l)
  }

  toString() {
    return `Point(${this.x}, ${this.y})`
  }
}
