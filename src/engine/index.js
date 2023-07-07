import { vec3, vec4, mat4 } from 'gl-matrix'
import { createProgramFromSource, createTexture, createBuffer } from './gl.js'
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

const CHARS_W = 64 / 1024
const CHARS_H = 64 / 640

/**
 * Is called when the screen is resized (or when a canvas is collapsed).
 */
function resize() {
  if (resizeAuto(state.canvas, 0.5)) {
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
  } else if (e.type === 'mousemove') {
    if (document.pointerLockElement === state.canvas) {
      state.camera.rotation[0] += e.movementY / state.canvas.height
      state.camera.rotation[1] += -e.movementX / state.canvas.width
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

function update() {
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
    // Move forward & backwards
    if (state.input.keyboard.isPressed('KeyA') || state.input.keyboard.isPressed('ArrowLeft')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.strafeLeft
      )
    } else if (state.input.keyboard.isPressed('KeyD') || state.input.keyboard.isPressed('ArrowRight')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.strafeRight
      )
    }

    // Strafe left & right
    if (state.input.keyboard.isPressed('KeyW') || state.input.keyboard.isPressed('ArrowUp')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.forward
      )
    } else if (state.input.keyboard.isPressed('KeyS') || state.input.keyboard.isPressed('ArrowDown')) {
      vec3.add(
        state.camera.velocity,
        state.camera.velocity,
        state.camera.backward
      )
    }

    if (state.mode === Mode.GOD) {
      // Move up & down
      if (state.input.keyboard.isPressed('KeyQ') || state.input.keyboard.isPressed('PageUp')) {
        vec3.add(state.camera.velocity, state.camera.velocity, Camera.UP)
      } else if (state.input.keyboard.isPressed('KeyE') || state.input.keyboard.isPressed('PageDown')) {
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
  gl.clearColor(0.17, 0.66, 0.95, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.enable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)

  gl.useProgram(state.programs.default)

  gl.uniformMatrix4fv(
    gl.getUniformLocation(state.programs.default, 'u_mvp'),
    gl.FALSE,
    state.camera.transform.projectionView
  )

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, state.textures.base)
  gl.uniform1i(gl.getUniformLocation(state.programs.default, 'u_sampler'), 0)
  gl.uniform3fv(
    gl.getUniformLocation(state.programs.default, 'u_color'),
    state.colors.default
  )

  // draws floor.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.floor.buffer)
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

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.floor.offset.buffer)
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

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.floor.texOffset.buffer)
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

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.north.offset.buffer)
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

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.north.texOffset.buffer)
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

  gl.drawArraysInstanced(
    gl.TRIANGLE_FAN,
    0,
    state.tile.north.vertices.length / 5,
    state.tiles.north.offset.data.length / 3
  )

  // draws south.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.south.buffer)
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

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.south.offset.buffer)
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

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.south.texOffset.buffer)
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

    gl.bindBuffer(gl.ARRAY_BUFFER, state.billboard.buffer)
    gl.enableVertexAttribArray(
      gl.getAttribLocation(state.programs.billboard, 'a_coords')
    )
    gl.vertexAttribPointer(
      gl.getAttribLocation(state.programs.billboard, 'a_coords'),
      3,
      gl.FLOAT,
      gl.FALSE,
      5 * 4,
      0
    )

    gl.enableVertexAttribArray(
      gl.getAttribLocation(state.programs.billboard, 'a_texcoords')
    )
    gl.vertexAttribPointer(
      gl.getAttribLocation(state.programs.billboard, 'a_texcoords'),
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
        gl.getUniformLocation(state.programs.billboard, 'u_mvp'),
        gl.FALSE,
        entity.transform.projectionViewModel
      )

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, entity.texture)
      gl.uniform1i(
        gl.getUniformLocation(state.programs.billboard, 'u_sampler'),
        0
      )
      gl.uniform3fv(
        gl.getUniformLocation(state.programs.billboard, 'u_color'),
        entity.color
      )
      gl.uniform4fv(
        gl.getUniformLocation(state.programs.billboard, 'u_texcoords'),
        entity.uv
      )
      gl.drawArrays(gl.TRIANGLE_FAN, 0, state.billboard.vertices.length / 5, 1)
    }
    gl.enable(gl.CULL_FACE)
    gl.disable(gl.BLEND)
  }
}

function input(t) {
  if (document.pointerLockElement === state.canvas) {
    state.camera.rotation[0] += state.input.mouse.coords.relative.y / state.canvas.height
    state.camera.rotation[1] += -state.input.mouse.coords.relative.x / state.canvas.width
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
  state.programs.billboard = createProgramFromSource(
    gl,
    billboardVertexShader,
    billboardFragmentShader
  )

  state.textures.default = createTexture(gl, defaultTexture)
  state.textures.billboard = createTexture(gl, billboardTexture)
  state.textures.base = createTexture(gl, state.map.textures)
  state.textures.sprites = createTexture(gl, state.map.sprites)
  state.textures.chars = createTexture(gl, state.map.chars)

  const floor = [
    -32.0,
    32.0,
    -32.0,
    0 / Texture.WIDTH,
    128 / Texture.HEIGHT,
    -32.0,
    32.0,
    32.0,
    64 / Texture.WIDTH,
    128 / Texture.HEIGHT,
    32.0,
    32.0,
    32.0,
    64 / Texture.WIDTH,
    192 / Texture.HEIGHT,
    32.0,
    32.0,
    -32.0,
    0 / Texture.WIDTH,
    192 / Texture.HEIGHT,
  ]

  // IMPORTANT! This are verified coordinates.
  const north = [
    -32.0,
    -32.0,
    32.0,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    -32.0,
    32.0,
    32.0,
    0 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    32.0,
    32.0,
    32.0,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    32.0,
    -32.0,
    32.0,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
  ]

  // IMPORTANT! This are verified coordinates.
  const south = [
    -32.0,
    -32.0,
    32.0,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    32.0,
    -32.0,
    32.0,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    32.0,
    32.0,
    32.0,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    -32.0,
    32.0,
    32.0,
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
    32.0,
    -32.0,
    -32.0,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    32.0,
    32.0,
    -32.0,
    0 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    32.0,
    32.0,
    32.0,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    32.0,
    -32.0,
    32.0,
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
    32.0,
    -32.0,
    -32.0,
    0 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    32.0,
    -32.0,
    32.0,
    64 / Texture.WIDTH,
    0 / Texture.HEIGHT,
    32.0,
    32.0,
    32.0,
    64 / Texture.WIDTH,
    64 / Texture.HEIGHT,
    32.0,
    32.0,
    -32.0,
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
    -32.0, -32.0, 0.0, 0.0, 0.0,
     32.0, -32.0, 0.0, 1.0, 0.0,
     32.0,  32.0, 0.0, 1.0, 1.0,
    -32.0,  32.0, 0.0, 0.0, 1.0,
  ]

  const billboardTypedArray = new Float32Array(billboard)
  state.billboard = {
    vertices: billboard,
    typedArray: billboardTypedArray,
    buffer: createBuffer(gl, billboardTypedArray),
  }

  state.colors.default = new Float32Array([1.0, 1.0, 1.0])

  window.addEventListener('resize', resize)
  window.dispatchEvent(new Event('resize'))

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

function createCharacters() {
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

  for (let i = 0; i < 200; i++) {
    let x, y

    // TODO: Esta es una manera muy burda de asegurarse de que dos entidades
    // no coinciden en el mismo sitio, tengo que buscar una alternativa mejor.
    do {
      x = Math.round(Math.random() * 80)
      y = 4 + Math.round(Math.random() * 120)
    } while (
      state.entities.find(
        (entity) =>
          entity.position[0] === -x * 64 && entity.position[2] === -y * 64
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
    const kind = Math.round(Math.random() * 8)

    state.entities.push({
      type: 'character',
      kind,
      x,
      y,
      frame: 0,
      frameTime: Date.now(),
      nextX: x,
      nextY: y,
      position: vec3.fromValues(-x * 64, 0, -y * 64),
      nextPosition: vec3.fromValues(-x * 64, 0, -y * 64),
      velocity: vec3.fromValues(0, 0, -1),
      rotation: Math.round((Math.random() - 0.5) * 2) * Math.PI,
      transform: {
        model: mat4.create(),
        projectionViewModel: mat4.create(),
      },
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

/**
 * Parsea el mapa y crea los paneles necesarios para definir
 * la forma del mapa.
 *
 * @param {WebGLContext} gl
 * @param {Image} image
 * @param {Number} [width=85]
 * @param {Number} [height=128]
 */
function createTilesBufferFromImage(gl, image, width = 85, height = 128) {
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
      const offset = (y * width + x) * 4
      const upOffset = ((y - 1) * width + x) * 4
      const leftOffset = (y * width + (x - 1)) * 4

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
          position: vec3.fromValues(-x * 64, 0, -y * 64),
          rotation: 0,
          transform: {
            model: mat4.create(),
            projectionViewModel: mat4.create(),
          },
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
        floorData.push(-x * 64, 0, -y * 64)
        floorTextureData.push(floorX, floorY)
      }

      // TODO: Remove this comments to draw second floor
      if (!(current & 0x01) && (current & 0x03) !== 2) {
        floorData.push(-x * 64, -64, -y * 64)
        floorTextureData.push(floorX, floorY)
      }

      const hasNorthWall = (current >> 5) & 0x01
      const hasWestWall = (current >> 6) & 0x01
      if (hasNorthWall) {
        if (
          !(isExterior(current) && outside === 0) &&
          !(isInterior(current) && inside === 0 && !isExterior(up))
        ) {
          northData.push(-x * 64, 0, -y * 64)
          southData.push(-x * 64, 0, -y * 64)
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
        if (height & 0x01 || height & 0x02) {
          northData.push(-x * 64, -64, -y * 64)
          southData.push(-x * 64, -64, -y * 64)
          northTextureData.push(tileHX, tileHY)
          southTextureData.push(tileHX, tileHY)
        }
      }

      if (hasWestWall) {
        if (
          !(isExterior(current) && outside === 0) &&
          !(isInterior(current) && inside === 0 && !isExterior(left))
        ) {
          westData.push(-x * 64, 0, -y * 64)
          eastData.push(-x * 64, 0, -y * 64)
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

        if (height & 0x01 || height & 0x02) {
          westData.push(-x * 64, -64, -y * 64)
          eastData.push(-x * 64, -64, -y * 64)
          westTextureData.push(tileHX, tileHY)
          eastTextureData.push(tileHX, tileHY)
        }
      }
    }
  }

  const floorTypedArray = new Float32Array(floorData)

  const northTypedArray = new Float32Array(northData)
  const southTypedArray = new Float32Array(southData)
  const westTypedArray = new Float32Array(westData)
  const eastTypedArray = new Float32Array(eastData)

  const floorTextureTypedArray = new Float32Array(floorTextureData)
  const floorTextureBuffer = createBuffer(gl, floorTextureTypedArray)

  const northTextureTypedArray = new Float32Array(northTextureData)
  const northTextureBuffer = createBuffer(gl, northTextureTypedArray)

  const southTextureTypedArray = new Float32Array(southTextureData)
  const southTextureBuffer = createBuffer(gl, southTextureTypedArray)

  const westTextureTypedArray = new Float32Array(westTextureData)
  const westTextureBuffer = createBuffer(gl, westTextureTypedArray)

  const eastTextureTypedArray = new Float32Array(eastTextureData)
  const eastTextureBuffer = createBuffer(gl, eastTextureTypedArray)

  return {
    floor: {
      offset: {
        data: floorData,
        typedArray: floorTypedArray,
        buffer: createBuffer(gl, floorTypedArray),
      },
      texOffset: {
        data: floorTextureData,
        typedArray: floorTextureTypedArray,
        buffer: floorTextureBuffer,
      },
    },
    north: {
      offset: {
        data: northData,
        typedArray: northTypedArray,
        buffer: createBuffer(gl, northTypedArray),
      },
      texOffset: {
        data: northTextureData,
        typedArray: northTextureTypedArray,
        buffer: northTextureBuffer,
      },
    },
    south: {
      offset: {
        data: southData,
        typedArray: southTypedArray,
        buffer: createBuffer(gl, southTypedArray),
      },
      texOffset: {
        data: southTextureData,
        typedArray: southTextureTypedArray,
        buffer: southTextureBuffer,
      },
    },
    west: {
      offset: {
        data: westData,
        typedArray: westTypedArray,
        buffer: createBuffer(gl, westTypedArray),
      },
      texOffset: {
        data: westTextureData,
        typedArray: westTextureTypedArray,
        buffer: westTextureBuffer,
      },
    },
    east: {
      offset: {
        data: eastData,
        typedArray: eastTypedArray,
        buffer: createBuffer(gl, eastTypedArray),
      },
      texOffset: {
        data: eastTextureData,
        typedArray: eastTextureTypedArray,
        buffer: eastTextureBuffer,
      },
    },
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
