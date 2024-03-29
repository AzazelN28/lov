import { vec3, vec4, mat4 } from 'gl-matrix'
import { createProgramFromSource, getProgramAttributesAndUniforms, createTexture, createBuffer } from './gl.js'
import { billboardTexture } from './textures/billboard.js'
import { defaultTexture } from './textures/default.js'
import defaultVertexShader from './shaders/texture-instanced.v.glsl'
import defaultFragmentShader from './shaders/texture-instanced.f.glsl'
import billboardVertexShader from './shaders/billboard.v.glsl'
import billboardFragmentShader from './shaders/billboard.f.glsl'
import { convertImageToContext2D, resizeAuto } from './canvas.js'
import { keepIt, shortestArc } from './angle.js'
import { state } from './state.js'
import { loadImage } from './image.js'
import Texture from './Texture.js'
import Mode from './Mode.js'
import Sprites from './Sprites.js'
import Collisions from './Collisions.js'
import Camera from './Camera.js'
import Loop from './core/Loop.js'

const VEC3_EMPTY = vec3.fromValues(0, 0, 0)

const DEFAULT_SIZE = 64
const DEFAULT_HALF_SIZE = DEFAULT_SIZE / 2

const TILE_SIZE = DEFAULT_SIZE
const TILE_HALF_SIZE = TILE_SIZE / 2

const MAX_LOOK_ANGLE = 0.25

const NUM_CHARACTERS = 200

const MAP_WIDTH = 85
const MAP_HEIGHT = 128

const CHARS_W = DEFAULT_SIZE / 1024
const CHARS_H = DEFAULT_SIZE / 640

class Transform {
  constructor(x, y, z) {
    this.position = vec3.fromValues(x, y, z)
    this.rotation = 0
    this.scale = vec3.fromValues(1, 1, 1)
    this.model = mat4.create()
    this.projectionViewModel = mat4.create()
  }
}

/**
 * Is called when the screen is resized (or when a canvas is collapsed).
 */
function resize() {
  if (resizeAuto(state.canvas, 0.5)) {
    state.input.mouse.coords.sensitivity.set(
      state.canvas.width / 64,
      state.canvas.height / 32
    )
    state.camera.projection.aspectRatio = state.canvas.width / state.canvas.height
    mat4.perspective(
      state.camera.transform.projection,
      state.camera.projection.fovY,
      state.camera.projection.aspectRatio,
      state.camera.projection.nearZ,
      state.camera.projection.farZ
    )
  }
}

function mouse(e) {
  // If we click in the view canvas, then we should
  // request pointer lock.
  if (e.type === 'click') {
    if (e.target === state.canvas) {
      state.canvas.requestPointerLock()
    }
  }
}

function getDataOffset(x, y, width) {
  return (y * width + x) * 4
}

function getTileCoordinate(position) {
  return Math.floor((-position + 32) / 64)
}

function getTileCoordinates(tile, position) {
  tile[0] = getTileCoordinate(position[0])
  tile[1] = getTileCoordinate(position[1])
  tile[2] = getTileCoordinate(position[2])
  return tile
}

function collidesWithX(x, y, cx, cy) {
  const noffset = getDataOffset(x, y, state.map.tiles.width)
  const ntile = state.map.tiles.data[noffset]
  const ntex = state.map.textures.data[noffset]
  if (x - cx < 0) {
    const coffset = getDataOffset(cx, cy, state.map.tiles.width)
    const ctile = state.map.tiles.data[coffset]
    const ctex = state.map.textures.data[coffset]
    return !(ntile & 0x01) || ((ctile >> 6) & 0x01 && ctex & 0x0f)
  } else if (x - cx > 0) {
    return !(ntile & 0x01) || ((ntile >> 6) & 0x01 && ntex & 0x0f)
  }
  return !(ntile & 0x01)
}

function collidesWithY(x, y, cx, cy) {
  const noffset = getDataOffset(x, y, state.map.tiles.width)
  const ntile = state.map.tiles.data[noffset]
  const ntex = state.map.textures.data[noffset]
  if (y - cy < 0) {
    const coffset = getDataOffset(cx, cy, state.map.tiles.width)
    const ctile = state.map.tiles.data[coffset]
    const ctex = state.map.textures.data[coffset]
    return !(ntile & 0x01) || ((ctile >> 5) & 0x01 && ctex & 0x0f)
  } else if (y - cy > 0) {
    return !(ntile & 0x01) || ((ntile >> 5) & 0x01 && ntex & 0x0f)
  }
  return !(ntile & 0x01)
}

function linear(x, a, b) {
  return a + x * (b - a)
}

function update() {
  state.dayDuration = 60 * 5
  state.dayTime = ((Date.now() / 1000) % state.dayDuration) / state.dayDuration
  state.dayStep = 1 / state.sky.colors.length
  state.dayCurrentIndex = Math.floor(state.sky.colors.length * state.dayTime)
  state.dayStepProgress = ((state.sky.colors.length * state.dayTime) - state.dayCurrentIndex)
  state.dayNextIndex = (state.dayCurrentIndex + 1) % state.sky.colors.length

  state.sky.color[0] = linear(state.dayStepProgress, state.sky.colors[state.dayCurrentIndex][0], state.sky.colors[state.dayNextIndex][0])
  state.sky.color[1] = linear(state.dayStepProgress, state.sky.colors[state.dayCurrentIndex][1], state.sky.colors[state.dayNextIndex][1])
  state.sky.color[2] = linear(state.dayStepProgress, state.sky.colors[state.dayCurrentIndex][2], state.sky.colors[state.dayNextIndex][2])

  state.sky.near = linear(state.dayStepProgress, state.sky.dists[state.dayCurrentIndex][0], state.sky.dists[state.dayNextIndex][0])
  state.sky.far = linear(state.dayStepProgress, state.sky.dists[state.dayCurrentIndex][1], state.sky.dists[state.dayNextIndex][1])
  /*
  state.sky.color[3] = linear(
    state.dayTime / state.dayStep,
    state.sky.colors[state.dayCurrentIndex][3],
    state.sky.colors[state.dayNextIndex][3]
  )
  */

  // VIEW ROTATION.
  if (state.mode === Mode.GOD) {
    mat4.identity(state.camera.transform.rotation)
    mat4.rotateY(
      state.camera.transform.rotation,
      state.camera.transform.rotation,
      state.camera.rotation[1]
    )
    mat4.rotateX(
      state.camera.transform.rotation,
      state.camera.transform.rotation,
      state.camera.rotation[0]
    )

    vec3.transformMat4(
      state.camera.forward,
      Camera.FORWARD,
      state.camera.transform.rotation
    )
    vec3.transformMat4(
      state.camera.backward,
      Camera.BACKWARD,
      state.camera.transform.rotation
    )
    vec3.transformMat4(
      state.camera.strafeLeft,
      Camera.STRAFE_LEFT,
      state.camera.transform.rotation
    )
    vec3.transformMat4(
      state.camera.strafeRight,
      Camera.STRAFE_RIGHT,
      state.camera.transform.rotation
    )
  } else if (state.mode === Mode.PLAYER) {
    mat4.identity(state.camera.transform.rotation)
    mat4.rotateY(
      state.camera.transform.rotation,
      state.camera.transform.rotation,
      state.camera.rotation[1]
    )
    // TODO: Add a comment to this line to implement the correct player movement.
    //mat4.rotateX(state.camera.transform.rotation,state.camera.transform.rotation,state.camera.rotation[0]);

    vec3.transformMat4(
      state.camera.forward,
      Camera.FORWARD,
      state.camera.transform.rotation
    )
    vec3.transformMat4(
      state.camera.backward,
      Camera.BACKWARD,
      state.camera.transform.rotation
    )
    vec3.transformMat4(
      state.camera.strafeLeft,
      Camera.STRAFE_LEFT,
      state.camera.transform.rotation
    )
    vec3.transformMat4(
      state.camera.strafeRight,
      Camera.STRAFE_RIGHT,
      state.camera.transform.rotation
    )
    // TODO: Remove this comment to implement correct player movement.
    mat4.rotateX(
      state.camera.transform.rotation,
      state.camera.transform.rotation,
      state.camera.rotation[0]
    )
  }

  // If pointerLockElement is view.canvas, then we should enable
  // 3D movement.
  if (document.pointerLockElement === state.canvas) {
    // Strafe left & right
    if (state.input.isPressed('strafeLeft')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.strafeLeft
      )
    } else if (state.input.isPressed('strafeRight')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.strafeRight
      )
    }

    // Move forward & backwards
    if (state.input.isPressed('forward')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.forward
      )
    } else if (state.input.isPressed('backward')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.backward
      )
    }

    if (state.mode === Mode.GOD) {
      // Move up & down
      if (state.input.isPressed('up')) {
        vec3.add(state.camera.velocity, state.camera.velocity, Camera.UP)
      } else if (state.input.isPressed('down')) {
        vec3.add(state.camera.velocity, state.camera.velocity, Camera.DOWN)
      }
    }
  }

  // VIEW MOVEMENT.
  if (state.mode === Mode.GOD) {
    // TODO: This is the "Free Camera Model" of movement, we should implement another different
    // camera model for the player
    // TODO: How to implement "wall sliding": https://gamedev.stackexchange.com/questions/49956/collision-detection-smooth-wall-sliding-no-bounce-effect
    // Maybe it should be easier because we are using 2D math.
    vec3.add(
      state.camera.position,
      state.camera.position,
      state.camera.velocity
    )
    vec3.mul(state.camera.velocity, state.camera.velocity, Camera.FRICTION)

    mat4.identity(state.camera.transform.model)
    mat4.translate(
      state.camera.transform.model,
      state.camera.transform.model,
      state.camera.position
    )
    mat4.multiply(
      state.camera.transform.model,
      state.camera.transform.model,
      state.camera.transform.rotation
    )

    getTileCoordinates(
      state.camera.collision.tiles.current,
      state.camera.position
    )
  } else if (state.mode === Mode.PLAYER) {
    // TODO: This is the "Free Camera Model" of movement, we should implement another different
    // camera model for the player
    // TODO: How to implement "wall sliding": https://gamedev.stackexchange.com/questions/49956/collision-detection-smooth-wall-sliding-no-bounce-effect
    // Maybe it should be easier because we are using 2D math.
    vec3.copy(state.camera.previousPosition, state.camera.position)
    vec3.copy(state.camera.collision.velocity, state.camera.velocity)
    vec3.set(state.camera.collision.velocityX, state.camera.velocity[0], 0, 0)
    vec3.set(state.camera.collision.velocityZ, 0, 0, state.camera.velocity[2])

    let tryCollisions = Collisions.XZ
    while (tryCollisions) {
      if (tryCollisions === Collisions.XZ) {
        vec3.add(
          state.camera.nextPosition,
          state.camera.position,
          state.camera.collision.velocity
        )
      } else if (tryCollisions === Collisions.X) {
        vec3.add(
          state.camera.nextPosition,
          state.camera.position,
          state.camera.collision.velocityX
        )
      } else if (tryCollisions === Collisions.Z) {
        vec3.add(
          state.camera.nextPosition,
          state.camera.position,
          state.camera.collision.velocityZ
        )
      }

      const [px, , pz] = state.camera.nextPosition
      vec3.set(state.camera.collision.box.topLeft, px - 16, 0, pz - 16)
      vec3.set(state.camera.collision.box.topRight, px + 16, 0, pz - 16)
      vec3.set(state.camera.collision.box.bottomLeft, px - 16, 0, pz + 16)
      vec3.set(state.camera.collision.box.bottomRight, px + 16, 0, pz + 16)

      getTileCoordinates(
        state.camera.collision.tiles.current,
        state.camera.position
      )
      getTileCoordinates(
        state.camera.collision.tiles.topLeft,
        state.camera.collision.box.topLeft
      )
      getTileCoordinates(
        state.camera.collision.tiles.topRight,
        state.camera.collision.box.topRight
      )
      getTileCoordinates(
        state.camera.collision.tiles.bottomLeft,
        state.camera.collision.box.bottomLeft
      )
      getTileCoordinates(
        state.camera.collision.tiles.bottomRight,
        state.camera.collision.box.bottomRight
      )

      const [ctx, , ctz] = state.camera.collision.tiles.current
      const [tlx, , tlz] = state.camera.collision.tiles.topLeft
      const [trx, , trz] = state.camera.collision.tiles.topRight
      const [blx, , blz] = state.camera.collision.tiles.bottomLeft
      const [brx, , brz] = state.camera.collision.tiles.bottomRight

      if (ctx - tlx !== 0) {
        if (collidesWithX(tlx, tlz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      if (ctx - trx !== 0) {
        if (collidesWithX(trx, trz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      if (ctx - blx !== 0) {
        if (collidesWithX(blx, blz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      if (ctx - brx !== 0) {
        if (collidesWithX(brx, brz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }

      if (ctz - tlz !== 0) {
        if (collidesWithY(tlx, tlz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      if (ctz - trz !== 0) {
        if (collidesWithY(trx, trz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      if (ctz - blz !== 0) {
        if (collidesWithY(blx, blz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      if (ctz - brz !== 0) {
        if (collidesWithY(brx, brz, ctx, ctz)) {
          tryCollisions--
          continue
        }
      }
      break
    }

    if (tryCollisions === Collisions.XZ) {
      vec3.add(
        state.camera.position,
        state.camera.position,
        state.camera.velocity
      )
    } else if (tryCollisions === Collisions.X) {
      vec3.add(
        state.camera.position,
        state.camera.position,
        vec3.fromValues(state.camera.velocity[0], 0, 0)
      )
    } else if (tryCollisions === Collisions.Z) {
      vec3.add(
        state.camera.position,
        state.camera.position,
        vec3.fromValues(0, 0, state.camera.velocity[2])
      )
    }
    vec3.mul(state.camera.velocity, state.camera.velocity, Camera.FRICTION)

    mat4.identity(state.camera.transform.model)
    mat4.translate(
      state.camera.transform.model,
      state.camera.transform.model,
      state.camera.position
    )
    mat4.multiply(
      state.camera.transform.model,
      state.camera.transform.model,
      state.camera.transform.rotation
    )
  }

  // the view matrix is the inverse of the camera matrix.
  mat4.invert(state.camera.transform.view, state.camera.transform.model)

  mat4.multiply(
    state.camera.transform.projectionView,
    state.camera.transform.projection,
    state.camera.transform.view
  )

  for (const entity of state.entities) {
    mat4.identity(entity.transform.model)
    mat4.translate(
      entity.transform.model,
      entity.transform.model,
      entity.position
    )
    mat4.multiply(
      entity.transform.model,
      entity.transform.model,
      state.camera.transform.rotation
    )
    mat4.multiply(
      entity.transform.projectionViewModel,
      state.camera.transform.projectionView,
      entity.transform.model
    )

    // TODO: Necesito arreglar los casos en los que entity.angle
    // es mayor que PI. Esto es un auténtico mojón.
    if (entity.type === 'character') {
      const anglePerSide = Math.PI / 4
      const halfAnglePerSide = Math.PI / 8
      entity.angle = shortestArc(
        keepIt(entity.rotation),
        keepIt(state.camera.rotation[1]) + halfAnglePerSide
      )
      state.angle = (entity.angle * 180) / Math.PI
      state.anglePerSide = (anglePerSide * 180) / Math.PI
      if (entity.angle < 0) {
        entity.angleIndex = -Math.floor(entity.angle / anglePerSide)
      } else {
        entity.angleIndex = -Math.ceil(entity.angle / anglePerSide)
      }

      state.shortestArc = entity.angleIndex
      if (entity.angleIndex < 0) {
        entity.uv[0] = CHARS_W * -entity.angleIndex
        entity.uv[2] = -CHARS_W
      } else {
        entity.uv[0] = CHARS_W * entity.angleIndex
        entity.uv[2] = CHARS_W
      }

      // TODO: Hacer que caminen de forma coherente.
      if (entity.ai && entity.ai.state === 'walking') {
        // FIXME: Esto es mierda pura, cambiar la manera
        // en la que se comportan los personajes que caminan.
        if (Date.now() - entity.frameTime > 250) {
          entity.frame = (entity.frame + 1) % 3
          entity.frameTime = Date.now()
        }
        entity.uv[0] += CHARS_W * 5 * entity.frame

        vec3.set(entity.velocity, 0, 0, -1)
        vec3.rotateY(
          entity.velocity,
          entity.velocity,
          VEC3_EMPTY,
          entity.rotation
        )

        // FIXME: Puro bullshit
        vec3.add(entity.nextPosition, entity.position, entity.velocity)
        for (let i = 0; i < 30; i++) {
          vec3.add(entity.nextPosition, entity.nextPosition, entity.velocity)
        }

        // FIXME: La manera en al que se detectan las colisiones
        // me producen arcadas.
        entity.nextX = getTileCoordinate(entity.nextPosition[0])
        entity.nextY = getTileCoordinate(entity.nextPosition[2])

        entity.x = getTileCoordinate(entity.position[0])
        entity.y = getTileCoordinate(entity.position[2])

        const offset = getDataOffset(entity.x, entity.y, state.map.tiles.width)
        const tile = state.map.tiles.data[offset]
        if (entity.nextX !== entity.x) {
          if (collidesWithX(entity.nextX, entity.nextY, entity.x, entity.y)) {
            if (Math.random() < 0.5) {
              entity.rotation += entity.ai.preferenceToTurn * Math.PI * 0.5
            } else {
              entity.rotation -= entity.ai.preferenceToTurn * Math.PI * 0.5
            }
            entity.ai.time = Date.now()
            entity.ai.timeToTurn = 1000 + Math.round(Math.random() * 5) * 1000
          }
        }

        if (entity.nextY !== entity.y) {
          if (collidesWithY(entity.nextX, entity.nextY, entity.x, entity.y)) {
            if (Math.random() < 0.5) {
              entity.rotation += entity.ai.preferenceToTurn * Math.PI * 0.5
            } else {
              entity.rotation -= entity.ai.preferenceToTurn * Math.PI * 0.5
            }
            entity.ai.time = Date.now()
            entity.ai.timeToTurn = 1000 + Math.round(Math.random() * 5) * 1000
          }
        }

        if (Date.now() - entity.ai.time > entity.ai.timeToTurn) {
          entity.rotation += entity.ai.preferenceToTurn * Math.PI * 0.5
          entity.ai.time = Date.now()
          entity.ai.timeToTurn = 1000 + Math.round(Math.random() * 5) * 1000
        }

        vec3.add(entity.position, entity.position, entity.velocity)
      }
    }
  }
}

/**
 * Este método renderiza toda la escena, para ello renderiza cada uno de los
 * lados de las casillas y por último renderiza todas las entidades.
 *
 * IMPORTANTE! Este método no hace ningún tipo de optimización sobre lo que se
 * ve y lo que no.
 */
function render() {
  const gl = state.context
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clearColor(...state.sky.color)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.enable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)

  gl.useProgram(state.programs.default)

  gl.uniform1f(
    state.attribsAndUniforms.default.uniforms.get('u_fog_near').location,
    state.sky.near
  )
  gl.uniform1f(
    state.attribsAndUniforms.default.uniforms.get('u_fog_far').location,
    state.sky.far
  )
  gl.uniform4fv(
    state.attribsAndUniforms.default.uniforms.get('u_fog_color').location,
    state.sky.color
  )

  gl.uniformMatrix4fv(
    state.attribsAndUniforms.default.uniforms.get('u_mvp').location,
    gl.FALSE,
    state.camera.transform.projectionView
  )

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, state.textures.base)
  gl.uniform1i(state.attribsAndUniforms.default.uniforms.get('u_sampler').location, 0)
  gl.uniform3fv(
    state.attribsAndUniforms.default.uniforms.get('u_color').location,
    state.colors.default
  )

  // draws floor.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.floor.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_coords').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_coords').location,
    3,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    0
  )

  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_texcoords').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_texcoords').location,
    2,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    3 * 4
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.floor.offset.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_offset').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_offset').location,
    3,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    state.attribsAndUniforms.default.attributes.get('a_offset').location,
    1
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.floor.texOffset.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location,
    2,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location,
    1
  )

  gl.drawArraysInstanced(
    gl.TRIANGLE_FAN,
    0,
    state.tile.floor.vertices.length / 5,
    state.tiles.floor.offset.data.length / 3
  )

  gl.enable(gl.CULL_FACE)

  // draws north.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.north.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_coords').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_coords').location,
    3,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    0
  )

  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_texcoords').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_texcoords').location,
    2,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    3 * 4
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.north.offset.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_offset').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_offset').location,
    3,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    state.attribsAndUniforms.default.attributes.get('a_offset').location,
    1
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.north.texOffset.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location,
    2,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location,
    1
  )
  gl.uniform3fv(
    gl.getUniformLocation(state.programs.default, 'u_color'),
    state.colors.north
  )
  gl.drawArraysInstanced(
    gl.TRIANGLE_FAN,
    0,
    state.tile.north.vertices.length / 5,
    state.tiles.north.offset.data.length / 3
  )

  // draws south.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.south.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_coords').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_coords').location,
    3,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    0
  )

  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_texcoords').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_texcoords').location,
    2,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    3 * 4
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.south.offset.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_offset').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_offset').location,
    3,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    state.attribsAndUniforms.default.attributes.get('a_offset').location,
    1
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.south.texOffset.buffer)
  gl.enableVertexAttribArray(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location
  )
  gl.vertexAttribPointer(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location,
    2,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    state.attribsAndUniforms.default.attributes.get('a_texoffset').location,
    1
  )
  gl.uniform3fv(
    gl.getUniformLocation(state.programs.default, 'u_color'),
    state.colors.south
  )
  gl.drawArraysInstanced(
    gl.TRIANGLE_FAN,
    0,
    state.tile.south.vertices.length / 5,
    state.tiles.south.offset.data.length / 3
  )

  // draws west.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.west.buffer)
  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_coords')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_coords'),
    3,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    0
  )

  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_texcoords')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_texcoords'),
    2,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    3 * 4
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.west.offset.buffer)
  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_offset')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_offset'),
    3,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    gl.getAttribLocation(state.programs.default, 'a_offset'),
    1
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.west.texOffset.buffer)
  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_texoffset')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_texoffset'),
    2,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    gl.getAttribLocation(state.programs.default, 'a_texoffset'),
    1
  )
  gl.uniform3fv(
    gl.getUniformLocation(state.programs.default, 'u_color'),
    state.colors.west
  )
  gl.drawArraysInstanced(
    gl.TRIANGLE_FAN,
    0,
    state.tile.west.vertices.length / 5,
    state.tiles.west.offset.data.length / 3
  )

  // draws east.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.east.buffer)
  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_coords')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_coords'),
    3,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    0
  )

  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_texcoords')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_texcoords'),
    2,
    gl.FLOAT,
    gl.FALSE,
    5 * 4,
    3 * 4
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.east.offset.buffer)
  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_offset')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_offset'),
    3,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    gl.getAttribLocation(state.programs.default, 'a_offset'),
    1
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.east.texOffset.buffer)
  gl.enableVertexAttribArray(
    gl.getAttribLocation(state.programs.default, 'a_texoffset')
  )
  gl.vertexAttribPointer(
    gl.getAttribLocation(state.programs.default, 'a_texoffset'),
    2,
    gl.FLOAT,
    gl.FALSE,
    0,
    0
  )
  gl.vertexAttribDivisor(
    gl.getAttribLocation(state.programs.default, 'a_texoffset'),
    1
  )
  gl.uniform3fv(
    gl.getUniformLocation(state.programs.default, 'u_color'),
    state.colors.east
  )
  gl.drawArraysInstanced(
    gl.TRIANGLE_FAN,
    0,
    state.tile.east.vertices.length / 5,
    state.tiles.east.offset.data.length / 3
  )

  // FIXME: Esto no funciona, comprobar por qué.
  if (state.entities.length > 0) {
    gl.useProgram(state.programs.billboard)
    gl.disable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.uniform1f(
      state.attribsAndUniforms.billboard.uniforms.get('u_fog_near').location,
      state.sky.near
    )
    gl.uniform1f(
      state.attribsAndUniforms.billboard.uniforms.get('u_fog_far').location,
      state.sky.far
    )
    gl.uniform4fv(
      state.attribsAndUniforms.billboard.uniforms.get('u_fog_color').location,
      state.sky.color
    )

    gl.bindBuffer(gl.ARRAY_BUFFER, state.billboard.buffer)
    gl.enableVertexAttribArray(
      state.attribsAndUniforms.billboard.attributes.get('a_coords').location
    )
    gl.vertexAttribPointer(
      state.attribsAndUniforms.billboard.attributes.get('a_coords').location,
      3,
      gl.FLOAT,
      gl.FALSE,
      5 * 4,
      0
    )

    gl.enableVertexAttribArray(
      state.attribsAndUniforms.billboard.attributes.get('a_texcoords').location
    )
    gl.vertexAttribPointer(
      state.attribsAndUniforms.billboard.attributes.get('a_texcoords').location,
      2,
      gl.FLOAT,
      gl.FALSE,
      5 * 4,
      3 * 4
    )

    // We need to sort the entities to draw them
    // in the correct order.
    state.entities.sort(
      (a, b) =>
        b.transform.projectionViewModel[14] -
        a.transform.projectionViewModel[14]
    )

    for (let entity of state.entities) {
      gl.uniformMatrix4fv(
        state.attribsAndUniforms.billboard.uniforms.get('u_mvp').location,
        gl.FALSE,
        entity.transform.projectionViewModel
      )

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, entity.texture)
      gl.uniform1i(
        state.attribsAndUniforms.billboard.uniforms.get('u_sampler').location,
        0
      )
      gl.uniform3fv(
        state.attribsAndUniforms.billboard.uniforms.get('u_color').location,
        entity.color
      )
      gl.uniform4fv(
        state.attribsAndUniforms.billboard.uniforms.get('u_texcoords').location,
        entity.uv
      )
      gl.drawArrays(gl.TRIANGLE_FAN, 0, state.billboard.vertices.length / 5, 1)
    }
    gl.enable(gl.CULL_FACE)
    gl.disable(gl.BLEND)
  }
}

function input(t) {
  state.input.update()
  if (document.pointerLockElement === state.canvas) {
    if (state.input.isPressed('lookUp')) {
      // state.camera.rotation[0] += state.input.mouse.coords.relative.y / state.canvas.height
      state.camera.rotation[0] -= 0.05 * state.input.stateOf('lookUp')
    } else if (state.input.isPressed('lookDown')) {
      // state.camera.rotation[0] += state.input.mouse.coords.relative.y / state.canvas.height
      state.camera.rotation[0] += 0.05 * state.input.stateOf('lookDown')
    }
    if (state.camera.rotation[0] < Math.PI * -MAX_LOOK_ANGLE) {
      state.camera.rotation[0] = Math.PI * -MAX_LOOK_ANGLE
    }
    if (state.camera.rotation[0] > Math.PI * MAX_LOOK_ANGLE) {
      state.camera.rotation[0] = Math.PI * MAX_LOOK_ANGLE
    }

    if (state.input.isPressed('turnLeft')) {
      // state.camera.rotation[0] += state.input.mouse.coords.relative.y / state.canvas.height
      state.camera.rotation[1] += 0.05 * state.input.stateOf('turnLeft')
    } else if (state.input.isPressed('turnRight')) {
      // state.camera.rotation[0] += state.input.mouse.coords.relative.y / state.canvas.height
      state.camera.rotation[1] -= 0.05 * state.input.stateOf('turnRight')
    }
    // state.camera.rotation[1] += -state.input.mouse.coords.relative.x / state.canvas.width
  }

}

const loop = new Loop([
  resize, input, update, render
])

function start() {
  const gl = state.context

  state.programs.default = createProgramFromSource(
    gl,
    defaultVertexShader,
    defaultFragmentShader
  )
  state.attribsAndUniforms.default = getProgramAttributesAndUniforms(gl, state.programs.default)
  state.programs.billboard = createProgramFromSource(
    gl,
    billboardVertexShader,
    billboardFragmentShader
  )
  state.attribsAndUniforms.billboard = getProgramAttributesAndUniforms(
    gl,
    state.programs.billboard
  )

  state.textures.default = createTexture(gl, defaultTexture)
  state.textures.billboard = createTexture(gl, billboardTexture)
  state.textures.base = createTexture(gl, state.map.textures)
  state.textures.sprites = createTexture(gl, state.map.sprites)
  state.textures.chars = createTexture(gl, state.map.chars)

  const floor = [
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    128 / Texture.HEIGHT,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    128 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    192 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    192 / Texture.HEIGHT,
  ]

  // IMPORTANT! This are verified coordinates.
  const north = [
    -TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
  ]

  // IMPORTANT! This are verified coordinates.
  const south = [
    -TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    64 / Texture.HEIGHT,
  ]
  /*const south = [
    -32.0,-32.0, 32.0, 0, 0,
     32.0,-32.0, 32.0, 0, 0,
     32.0, 32.0, 32.0, 0, 0,
    -32.0, 32.0, 32.0, 0, 0
  ];*/

  // IMPORTANT! This are verified coordinates.
  const east = [
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
  ]
  /*const east = [
    32.0,-32.0,-32.0, 0, 0,
    32.0, 32.0,-32.0, 0, 0,
    32.0, 32.0, 32.0, 0, 0,
    32.0,-32.0, 32.0, 0, 0
  ];*/

  // IMPORTANT! This are verified coordinates.
  const west = [
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    TILE_HALF_SIZE,
    TILE_HALF_SIZE,
    -TILE_HALF_SIZE,
    0 / Texture.WIDTH,
    64 / Texture.HEIGHT,
  ]

  const floorTypedArray = new Float32Array(floor)
  const northTypedArray = new Float32Array(north)
  const southTypedArray = new Float32Array(south)
  const westTypedArray = new Float32Array(west)
  const eastTypedArray = new Float32Array(east)

  state.tile = {
    floor: {
      vertices: floor,
      typedArray: floorTypedArray,
      buffer: createBuffer(gl, floorTypedArray),
    },
    north: {
      vertices: north,
      typedArray: northTypedArray,
      buffer: createBuffer(gl, northTypedArray),
    },
    south: {
      vertices: south,
      typedArray: southTypedArray,
      buffer: createBuffer(gl, southTypedArray),
    },
    west: {
      vertices: west,
      typedArray: westTypedArray,
      buffer: createBuffer(gl, westTypedArray),
    },
    east: {
      vertices: east,
      typedArray: eastTypedArray,
      buffer: createBuffer(gl, eastTypedArray),
    },
  }

  state.tiles = createTilesBufferFromImage(gl, state.map.ground)
  // FIXME: Revisar esto.
  //state.entities = [];

  const billboard = [
    -TILE_HALF_SIZE, -TILE_HALF_SIZE, 0.0, 0.0, 0.0,
     TILE_HALF_SIZE, -TILE_HALF_SIZE, 0.0, 1.0, 0.0,
     TILE_HALF_SIZE,  TILE_HALF_SIZE, 0.0, 1.0, 1.0,
    -TILE_HALF_SIZE,  TILE_HALF_SIZE, 0.0, 0.0, 1.0,
  ]

  const billboardTypedArray = new Float32Array(billboard)
  state.billboard = {
    vertices: billboard,
    typedArray: billboardTypedArray,
    buffer: createBuffer(gl, billboardTypedArray),
  }

  state.colors.default = new Float32Array([1.0, 1.0, 1.0])
  state.colors.north = new Float32Array([1.0, 1.0, 1.0])
  state.colors.south = new Float32Array([1.0, 1.0, 1.0])
  state.colors.west = new Float32Array([0.75, 0.7, 0.5])
  state.colors.east = new Float32Array([0.75, 0.7, 0.5])

  state.input.start()
  state.input.keyboard.on('Tab', () => {
    if (state.mode === Mode.GOD) {
      state.mode = Mode.PLAYER
      state.camera.position[1] = 0
    } else {
      state.mode = Mode.GOD
    }
  })

  window.addEventListener('click', mouse)

  createCharacters()

  loop.start()
}

function getCharacterKind() {
  return Math.round(Math.random() * 8)
}

function createCharacters() {
  /*
  state.entities.push({
    type: 'character',
    kind: 0,
    x: 80,
    y: 56,
    position: vec3.fromValues(-80 * 64, 0, -56 * 64),
    rotation: 0,
    transform: {
      model: mat4.create(),
      projectionViewModel: mat4.create(),
    },
    uv: vec4.fromValues(0, 0, CHARS_W, CHARS_H),
    texture: state.textures.chars,
    color: vec3.fromValues(1.0, 1.0, 1.0),
  })
  */

  for (let i = 0; i < NUM_CHARACTERS; i++) {
    let x, y

    // TODO: Esta es una manera muy burda de asegurarse de que dos entidades
    // no coinciden en el mismo sitio, tengo que buscar una alternativa mejor.
    do {
      x = Math.round(Math.random() * 80)
      y = 4 + Math.round(Math.random() * 120)
    } while (
      state.entities.find(
        (entity) =>
          entity.position[0] === -x * TILE_SIZE && entity.position[2] === -y * TILE_SIZE
      )
    )

    // Seleccionamos el tipo de personaje. Todos los personajes
    // tienen la misma probabilidad de aparecer.
    //
    // 0 - Mujer
    // 1 - Monje
    // 2 - Vampiro
    // 3 - Jester
    // 4 - Sacerdotisa
    // 5 - Hombre
    // 6 - Soldado
    // 7 - Hombre lobo
    // 8 - Enano
    const kind = getCharacterKind()

    state.entities.push({
      type: 'character',
      kind,
      x,
      y,
      frame: 0,
      frameTime: Date.now(),
      nextX: x,
      nextY: y,
      position: vec3.fromValues(-x * TILE_SIZE, 0, -y * TILE_SIZE),
      nextPosition: vec3.fromValues(-x * TILE_SIZE, 0, -y * TILE_SIZE),
      velocity: vec3.fromValues(0, 0, -1),
      rotation: Math.round((Math.random() - 0.5) * 2) * Math.PI,
      transform: new Transform(-x * TILE_SIZE, 0, -y * TILE_SIZE),
      ai: {
        state: 'walking',
        time: Date.now(),
        preferenceToTurn: Math.random() < 0.5 ? -1 : 1,
        timeToTurn: 1000 + Math.round(Math.random() * 5) * 1000,
      },
      uv: vec4.fromValues(0, CHARS_H * kind, CHARS_W, CHARS_H),
      texture: state.textures.chars,
      color: vec3.fromValues(1.0, 1.0, 1.0),
    })
  }
}

/**
 * Devuelve si la casilla es un exterior o no.
 *
 * @param {Number} tile
 */
function isExterior(tile) {
  return tile & 0x01
}

/**
 * Devuelve si la casilla es interior.
 *
 * @param {Number} tile
 */
function isInterior(tile) {
  return !isExterior(tile)
}

function isSprite(tile) {
  return (tile >> 2) & 0x07
}

function getInsideTexture(texture) {
  return (texture >> 4) & 0x0f
}

function getOutsideTexture(texture) {
  return texture & 0x0f
}

function hasNorthWall(tile) {
  return (tile >> 5) & 0x01
}

function hasWestWall(tile) {
  return (tile >> 6) & 0x01
}

function hasSecondFloor(tile) {
  return tile & 0x01 || tile & 0x02
}

/**
 * Crea un buffer de tiles.
 */
function createTilesBuffer(gl, data, textureData) {
  const typedArray = new Float32Array(data)

  const textureTypedArray = new Float32Array(textureData)
  const textureBuffer = createBuffer(gl, textureTypedArray)

  return {
    offset: {
      data: data,
      typedArray: typedArray,
      buffer: createBuffer(gl, typedArray),
    },
    texOffset: {
      data: textureData,
      typedArray: textureTypedArray,
      buffer: textureBuffer,
    },
  }
}

/**
 * Parsea el mapa y crea los paneles necesarios para definir
 * la forma del mapa.
 *
 * @param {WebGLContext} gl
 * @param {Image} image
 * @param {Number} [width=MAP_WIDTH]
 * @param {Number} [height=MAP_HEIGHT]
 */
function createTilesBufferFromImage(gl, image, width = MAP_WIDTH, height = MAP_HEIGHT) {
  const context = convertImageToContext2D(image)
  const mapData = context.getImageData(0, 0, width, height)
  const mapTextureData = context.getImageData(width, 0, width, height)
  const mapHeightData = context.getImageData(width + width, 0, width, height)
  state.map.tiles = mapData
  state.map.textures = mapTextureData
  console.log(state.map.tiles)

  const floorData = []
  const northData = []
  const southData = []
  const westData = []
  const eastData = []

  const northTextureData = []
  const southTextureData = []
  const westTextureData = []
  const eastTextureData = []
  const floorTextureData = []

  const SW = 64 / Sprites.WIDTH
  const SH = 96 / Sprites.HEIGHT

  const TW = 64 / Texture.WIDTH
  const TH = 64 / Texture.HEIGHT

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // useful offsets.
      const offset = getDataOffset(x, y, width)
      const upOffset = getDataOffset(x, y - 1, width)
      const leftOffset = getDataOffset(x - 1, y, width)

      const current = mapData.data[offset]
      const sprite = isSprite(current)
      if (sprite > 0) {
        const spriteW = SW
        const spriteH = SH
        const spriteX = 0
        const spriteY = (sprite - 2) * SH
        state.entities.push({
          type: 'static',
          x,
          y,
          position: vec3.fromValues(-x * TILE_SIZE, 0, -y * TILE_SIZE),
          rotation: 0,
          transform: new Transform(-x * TILE_SIZE, 0, -y * TILE_SIZE),
          uv: vec4.fromValues(spriteX, spriteY, spriteW, spriteH),
          texture: state.textures.sprites,
          color: vec3.fromValues(1.0, 1.0, 1.0),
        })
      }

      const up = mapData.data[upOffset]
      const left = mapData.data[leftOffset]

      const texture = mapTextureData.data[offset]
      const height = mapHeightData.data[offset]

      let tileO, tileI, tileH
      let tileOX, tileOY, tileIX, tileIY, tileHX, tileHY

      let inside = getInsideTexture(texture)
      let outside = getOutsideTexture(texture)

      tileO = outside - 1
      tileI = inside - 1
      if (height & 0x01 && height & 0x02) {
        tileH = tileO
      } else if (height & 0x02) {
        tileH = 0x0b
      } else if (height & 0x01) {
        tileH = 0x05
      }

      tileHX = (tileH % 5) * TW
      tileHY = Math.floor(tileH / 5) * TH

      tileOX = (tileO % 5) * TW
      tileOY = Math.floor(tileO / 5) * TH

      tileIX = (tileI % 5) * TW
      tileIY = (3 + Math.floor(tileI / 5)) * TH

      const floorX = (isExterior(current) ? 0 : 4) * TW
      const floorY = (isExterior(current) ? 0 : 0) * TH
      if ((current & 0x03) !== 2) {
        // Añadimos los datos del suelo.
        floorData.push(-x * TILE_SIZE, 0, -y * TILE_SIZE)
        floorTextureData.push(floorX, floorY)
      }

      // TODO: Remove this comments to draw second floor
      if (!(current & 0x01) && (current & 0x03) !== 2) {
        floorData.push(-x * TILE_SIZE, -TILE_SIZE, -y * TILE_SIZE)
        floorTextureData.push(floorX, floorY)
      }

      // const hasNorthWall = (current >> 5) & 0x01
      // const hasWestWall = (current >> 6) & 0x01
      if (hasNorthWall(current)) {
        if (
          !(isExterior(current) && outside === 0) &&
          !(isInterior(current) && inside === 0 && !isExterior(up))
        ) {
          northData.push(-x * TILE_SIZE, 0, -y * TILE_SIZE)
          southData.push(-x * TILE_SIZE, 0, -y * TILE_SIZE)
          if (isExterior(current) && isInterior(up)) {
            northTextureData.push(tileIX, tileIY)
            southTextureData.push(tileOX, tileOY)
          } else if (isExterior(current) && isExterior(up)) {
            northTextureData.push(tileOX, tileOY)
            southTextureData.push(tileOX, tileOY)
          } else if (isInterior(current) && isExterior(up)) {
            northTextureData.push(tileOX, tileOY)
            southTextureData.push(tileIX, tileIY)
          } else if (isInterior(current) && isInterior(up)) {
            northTextureData.push(tileIX, tileIY)
            southTextureData.push(tileIX, tileIY)
          }
        }

        // TODO: Investigate how this shit works.
        if (hasSecondFloor(height)) {
          northData.push(-x * TILE_SIZE, -TILE_SIZE, -y * TILE_SIZE)
          southData.push(-x * TILE_SIZE, -TILE_SIZE, -y * TILE_SIZE)
          northTextureData.push(tileHX, tileHY)
          southTextureData.push(tileHX, tileHY)
        }
      }

      if (hasWestWall(current)) {
        if (
          !(isExterior(current) && outside === 0) &&
          !(isInterior(current) && inside === 0 && !isExterior(left))
        ) {
          westData.push(-x * TILE_SIZE, 0, -y * TILE_SIZE)
          eastData.push(-x * TILE_SIZE, 0, -y * TILE_SIZE)
          if (isExterior(current) && isInterior(left)) {
            westTextureData.push(tileIX, tileIY)
            eastTextureData.push(tileOX, tileOY)
          } else if (isExterior(current) && isExterior(left)) {
            westTextureData.push(tileOX, tileOY)
            eastTextureData.push(tileOX, tileOY)
          } else if (isInterior(current) && isExterior(left)) {
            westTextureData.push(tileOX, tileOY)
            eastTextureData.push(tileIX, tileIY)
          } else if (isInterior(current) && isInterior(left)) {
            westTextureData.push(tileIX, tileIY)
            eastTextureData.push(tileIX, tileIY)
          }
        }

        if (hasSecondFloor(height)) {
          westData.push(-x * TILE_SIZE, -TILE_SIZE, -y * TILE_SIZE)
          eastData.push(-x * TILE_SIZE, -TILE_SIZE, -y * TILE_SIZE)
          westTextureData.push(tileHX, tileHY)
          eastTextureData.push(tileHX, tileHY)
        }
      }
    }
  }

  return {
    floor: createTilesBuffer(gl, floorData, floorTextureData),
    north: createTilesBuffer(gl, northData, northTextureData),
    south: createTilesBuffer(gl, southData, southTextureData),
    west: createTilesBuffer(gl, westData, westTextureData),
    east: createTilesBuffer(gl, eastData, eastTextureData),
  }
}

export function init(canvas) {
  if (state.canvas)
    return

  state.canvas = canvas
  state.context = canvas.getContext('webgl2')
  return Promise.all(
    [
      'assets/underground.png',
      'assets/ground.png',
      'assets/foreground.png',
      'assets/textures.png',
      'assets/sprites.png',
      'assets/chars.png',
    ].map(loadImage)
  ).then((data) => {
    const [underground, ground, foreground, textures, sprites, chars] = data
    console.log(underground, ground, foreground, textures, sprites, chars)
    state.map = {
      underground,
      ground,
      foreground,
      textures,
      sprites,
      chars,
    }

    start()
  })
}
