import { vec3 } from 'gl-matrix'

export const Camera = {
  FORWARD: vec3.fromValues(0, 0, -1),
  BACKWARD: vec3.fromValues(0, 0, 1),
  STRAFE_LEFT: vec3.fromValues(-1, 0, 0),
  STRAFE_RIGHT: vec3.fromValues(1, 0, 0),
  UP: vec3.fromValues(0, -1, 0),
  DOWN: vec3.fromValues(0, 1, 0),
  FRICTION: vec3.fromValues(0.8, 0.8, 0.8),
}

export default Camera
