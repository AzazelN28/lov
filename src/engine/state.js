import { vec3, mat4 } from 'gl-matrix'
import Mode from './Mode.js'
import Input from './input/Input.js'

export const state = {
  canvas: null,
  context: null,
  colors: {
    default: null,
    north: null,
    south: null,
    west: null,
    east: null,
  },
  textures: {
    default: null,
    billboard: null,
  },
  programs: {
    default: null,
    billboard: null,
  },
  billboard: {
    buffer: null,
    typedArray: null,
    vertices: null,
  },
  tile: {
    floor: null,
    north: null,
    south: null,
    west: null,
    east: null,
  },
  tiles: null,
  entities: [],
  frame: {
    id: null,
  },
  mode: Mode.PLAYER,
  keys: new Map(),
  input: new Input(),
  camera: {
    position: vec3.fromValues(-82 * 64, 0, -56 * 64),
    previousPosition: vec3.create(),
    nextPosition: vec3.create(),
    velocity: vec3.create(),
    rotation: vec3.fromValues(0, Math.PI * -0.5, 0),
    forward: vec3.create(),
    backward: vec3.create(),
    strafeLeft: vec3.create(),
    strafeRight: vec3.create(),
    collision: {
      velocity: vec3.create(),
      velocityX: vec3.create(),
      velocityZ: vec3.create(),
      box: {
        topRight: vec3.create(),
        topLeft: vec3.create(),
        bottomRight: vec3.create(),
        bottomLeft: vec3.create(),
      },
      tiles: {
        topRight: vec3.create(),
        topLeft: vec3.create(),
        bottomRight: vec3.create(),
        bottomLeft: vec3.create(),
        current: vec3.create(),
      },
    },
    transform: {
      rotation: mat4.create(),
      model: mat4.create(),
      view: mat4.create(),
      projection: mat4.perspective(mat4.create(), Math.PI * 0.5, 1, 1e-1, 1e9),
      projectionView: mat4.create(),
    },
    projection: {
      fovY: Math.PI * 0.25,
      aspectRatio: 1,
      nearZ: 1e-1,
      farZ: 1e9,
    },
  },
  map: null,
}

window.state = state
