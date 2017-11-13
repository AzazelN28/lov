import {vec2,vec3,vec4,mat4} from "gl-matrix";
import defaultVertexShader from "../shaders/texture-instanced.v.glsl";
import defaultFragmentShader from "../shaders/texture-instanced.f.glsl";
import billboardVertexShader from "../shaders/billboard.v.glsl";
import billboardFragmentShader from "../shaders/billboard.f.glsl";

const canvas = document.querySelector("canvas#game");
const debug = document.querySelector("canvas#debug");
const context = canvas.getContext("webgl2");
const dcx = debug.getContext("2d");

const VEC3_EMPTY = vec3.fromValues(0, 0, 0);

const CHARS_W = 64 / 1024;
const CHARS_H = 64 / 640;

const billboardTexture = (function() {
  const t = document.createElement("canvas");
  t.width = 64;
  t.height = 64;
  const cx = t.getContext("2d");
  cx.fillStyle = "rgba(255,255,255,0)";
  cx.fillRect(0,0,64,64);
  cx.fillStyle = "red";
  cx.fillRect(0,0,32,32);
  cx.fillRect(32,32,32,32);
  return t;
})();

const defaultTexture = (function() {
  const t = document.createElement("canvas");
  t.width = 64;
  t.height = 64;
  const cx = t.getContext("2d");
  cx.fillStyle = "white";
  cx.fillRect(0,0,64,64);
  cx.fillStyle = "red";
  cx.fillRect(0,0,32,32);
  cx.fillRect(32,32,32,32);
  return t;
})();

function keepIt(angle) {
  if (angle < 0) {
    while (angle < -Math.PI * 2) {
      angle += Math.PI * 2;
    }
  } else {
    while (angle > Math.PI * 2) {
      angle -= Math.PI * 2;
    }
  }
  return angle;
}

function shortestArc(a, b) {
  if (Math.abs(b - a) < Math.PI) {
    return b - a;
  }
  if (b > a) {
    return b - a - Math.PI * 2;
  }
  return b - a + Math.PI * 2;
}

function createImage(url) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  return image;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    function handler(e) {
      const image = e.target;
      image.removeEventListener("load", handler);
      image.removeEventListener("error", handler);
      image.removeEventListener("abort", handler);
      if (e.type === "load") {
        return resolve(image);
      } else {
        return reject(e.type);
      }
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", handler);
    image.addEventListener("error", handler);
    image.addEventListener("abort", handler);
    image.src = url;
  });
}

const Texture = {
  WIDTH: 640,
  HEIGHT: 768
};

const Sprites = {
  WIDTH: 512,
  HEIGHT: 768
};

const Collisions = {
  XZ: 3,
  X: 2,
  Z: 1
};

const Camera = {
  FORWARD: vec3.fromValues(0,0,-1),
  BACKWARD: vec3.fromValues(0,0,1),
  STRAFE_LEFT: vec3.fromValues(-1,0,0),
  STRAFE_RIGHT: vec3.fromValues(1,0,0),
  UP: vec3.fromValues(0,-1,0),
  DOWN: vec3.fromValues(0,1,0),
  FRICTION: vec3.fromValues(0.9,0.9,0.9)
};

const Mode = {
  GOD: 0,
  PLAYER: 1
};

const state = window.state = {
  canvas: canvas,
  context: context,
  colors: {
    default: null
  },
  textures: {
    default: null,
    billboard: null
  },
  programs: {
    default: null,
    billboard: null
  },
  billboard: {
    buffer: null,
    typedArray: null,
    vertices: null
  },
  tile: {
    floor: null,
    north: null,
    south: null,
    west: null,
    east: null
  },
  tiles: null,
  entities: [],
  frame: {
    id: null
  },
  mode: Mode.PLAYER,
  keys: new Map(),
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
        bottomLeft: vec3.create()
      },
      tiles: {
        topRight: vec3.create(),
        topLeft: vec3.create(),
        bottomRight: vec3.create(),
        bottomLeft: vec3.create(),
        current: vec3.create()
      }
    },
    transform: {
      rotation: mat4.create(),
      model: mat4.create(),
      view: mat4.create(),
      projection: mat4.perspective(mat4.create(), Math.PI * 0.5, 1, 1e-1, 1e9),
      projectionView: mat4.create()
    },
    projection: {
      fovY: Math.PI * 0.5,
      aspectRatio: 1,
      nearZ: 1e-1,
      farZ: 1e9
    }
  },
  map: null
};

/**
 * Is called when the screen is resized (or when a canvas is collapsed).
 */
function resize() {
  debug.width = debug.offsetWidth;
  debug.height = debug.offsetHeight;

  state.canvas.width = state.canvas.offsetWidth;
  state.canvas.height = state.canvas.offsetHeight;

  state.camera.projection.aspectRatio = state.canvas.width / state.canvas.height;
  mat4.perspective(
    state.camera.transform.projection,
    state.camera.projection.fovY,
    state.camera.projection.aspectRatio,
    state.camera.projection.nearZ,
    state.camera.projection.farZ
  );
}

function mouse(e) {
  // If we click in the view canvas, then we should
  // request pointer lock.
  if (e.type === "click") {
    if (e.target === state.canvas) {
      state.canvas.requestPointerLock();
    }
  } else if (e.type === "mousemove") {
    if (document.pointerLockElement === state.canvas) {
      state.camera.rotation[0] += e.movementY / state.canvas.height;
      state.camera.rotation[1] += -e.movementX / state.canvas.width;
    }
  }
}

function key(e) {
  e.preventDefault();
  state.keys.set(e.code, e.type === "keydown");
  if (e.code === "Tab" && e.type === "keyup") {
    if (state.mode === Mode.GOD) {
      state.mode = Mode.PLAYER;
      state.camera.position[1] = 0;
    } else {
      state.mode = Mode.GOD;
    }
  }
}

function getDataOffset(x,y,width) {
  return ((y * width) + x) * 4;
}

function getTileCoordinates(tile, position) {
  tile[0] = Math.floor((-position[0] + 32) / 64);
  tile[1] = Math.floor((-position[1] + 32) / 64);
  tile[2] = Math.floor((-position[2] + 32) / 64);
  return tile;
}

function collidesWithX(x,y,cx,cy) {
  const noffset = getDataOffset(x,y,state.map.tiles.width);
  const ntile = state.map.tiles.data[noffset];
  const ntex = state.map.textures.data[noffset];
  if (x - cx < 0) {
    const coffset = getDataOffset(cx,cy,state.map.tiles.width);
    const ctile = state.map.tiles.data[coffset];
    const ctex = state.map.textures.data[coffset];
    return (!(ntile & 0x01)) || ((ctile >> 6) & 0x01) && ctex & 0x0F;
  } else if (x - cx > 0) {
    return (!(ntile & 0x01)) || ((ntile >> 6) & 0x01) && ntex & 0x0F;
  }
  return !(ntile & 0x01);
}

function collidesWithY(x,y,cx,cy) {
  const noffset = getDataOffset(x,y,state.map.tiles.width);
  const ntile = state.map.tiles.data[noffset];
  const ntex = state.map.textures.data[noffset];
  if (y - cy < 0) {
    const coffset = getDataOffset(cx,cy,state.map.tiles.width);
    const ctile = state.map.tiles.data[coffset];
    const ctex = state.map.textures.data[coffset];
    return (!(ntile & 0x01)) || ((ctile >> 5) & 0x01) && ctex & 0x0F;
  } else if (y - cy > 0) {
    return (!(ntile & 0x01)) || ((ntile >> 5) & 0x01) && ntex & 0x0F;
  }
  return !(ntile & 0x01);
}

function isKeyPressed(code) {
  if (state.keys.has(code)) {
    return state.keys.get(code);
  }
  return false;
}

function isKeyReleased(code) {
  return !isKeyPressed(code);
}

function update() {

  // VIEW ROTATION.
  if (state.mode === Mode.GOD) {

    mat4.identity(state.camera.transform.rotation);
    mat4.rotateY(state.camera.transform.rotation,state.camera.transform.rotation,state.camera.rotation[1]);
    mat4.rotateX(state.camera.transform.rotation,state.camera.transform.rotation,state.camera.rotation[0]);

    vec3.transformMat4(state.camera.forward,Camera.FORWARD,state.camera.transform.rotation);
    vec3.transformMat4(state.camera.backward,Camera.BACKWARD,state.camera.transform.rotation);
    vec3.transformMat4(state.camera.strafeLeft,Camera.STRAFE_LEFT,state.camera.transform.rotation);
    vec3.transformMat4(state.camera.strafeRight,Camera.STRAFE_RIGHT,state.camera.transform.rotation);

  } else if (state.mode === Mode.PLAYER) {

    mat4.identity(state.camera.transform.rotation);
    mat4.rotateY(state.camera.transform.rotation,state.camera.transform.rotation,state.camera.rotation[1]);
    // TODO: Add a comment to this line to implement the correct player movement.
    //mat4.rotateX(state.camera.transform.rotation,state.camera.transform.rotation,state.camera.rotation[0]);

    vec3.transformMat4(state.camera.forward,Camera.FORWARD,state.camera.transform.rotation);
    vec3.transformMat4(state.camera.backward,Camera.BACKWARD,state.camera.transform.rotation);
    vec3.transformMat4(state.camera.strafeLeft,Camera.STRAFE_LEFT,state.camera.transform.rotation);
    vec3.transformMat4(state.camera.strafeRight,Camera.STRAFE_RIGHT,state.camera.transform.rotation);
    // TODO: Remove this comment to implement correct player movement.
    mat4.rotateX(state.camera.transform.rotation,state.camera.transform.rotation,state.camera.rotation[0]);

  }

  // If pointerLockElement is view.canvas, then we should enable
  // 3D movement.
  if (document.pointerLockElement === state.canvas) {
    // Move forward & backwards
    if (isKeyPressed("KeyA") || isKeyPressed("ArrowLeft")) {
      vec3.add(state.camera.velocity, state.camera.velocity, state.camera.strafeLeft);
    } else if (isKeyPressed("KeyD") || isKeyPressed("ArrowRight")) {
      vec3.add(state.camera.velocity, state.camera.velocity, state.camera.strafeRight);
    }

    // Strafe left & right
    if (isKeyPressed("KeyW") || isKeyPressed("ArrowUp")) {
      vec3.add(state.camera.velocity, state.camera.velocity, state.camera.forward);
    } else if (isKeyPressed("KeyS") || isKeyPressed("ArrowDown")) {
      vec3.add(state.camera.velocity, state.camera.velocity, state.camera.backward);
    }

    if (state.mode === Mode.GOD) {
      // Move up & down
      if (isKeyPressed("KeyQ") || isKeyPressed("PageUp")) {
        vec3.add(state.camera.velocity, state.camera.velocity, Camera.UP);
      } else if (isKeyPressed("KeyE") || isKeyPressed("PageDown")) {
        vec3.add(state.camera.velocity, state.camera.velocity, Camera.DOWN);
      }
    }
  }

  // VIEW MOVEMENT.
  if (state.mode === Mode.GOD) {
    // TODO: This is the "Free Camera Model" of movement, we should implement another different
    // camera model for the player
    // TODO: How to implement "wall sliding": https://gamedev.stackexchange.com/questions/49956/collision-detection-smooth-wall-sliding-no-bounce-effect
    // Maybe it should be easier because we are using 2D math.
    vec3.add(state.camera.position, state.camera.position, state.camera.velocity);
    vec3.mul(state.camera.velocity, state.camera.velocity, Camera.FRICTION);

    mat4.identity(state.camera.transform.model);
    mat4.translate(state.camera.transform.model, state.camera.transform.model, state.camera.position);
    mat4.multiply(state.camera.transform.model, state.camera.transform.model, state.camera.transform.rotation);

    getTileCoordinates(state.camera.collision.tiles.current, state.camera.position);

  } else if (state.mode === Mode.PLAYER) {
    // TODO: This is the "Free Camera Model" of movement, we should implement another different
    // camera model for the player
    // TODO: How to implement "wall sliding": https://gamedev.stackexchange.com/questions/49956/collision-detection-smooth-wall-sliding-no-bounce-effect
    // Maybe it should be easier because we are using 2D math.
    vec3.copy(state.camera.previousPosition, state.camera.position);
    vec3.copy(state.camera.collision.velocity, state.camera.velocity);
    vec3.set(state.camera.collision.velocityX, state.camera.velocity[0],0,0);
    vec3.set(state.camera.collision.velocityZ, 0,0,state.camera.velocity[2]);

    let tryCollisions = Collisions.XZ;
    while (tryCollisions) {
      if (tryCollisions === Collisions.XZ) {
        vec3.add(state.camera.nextPosition, state.camera.position, state.camera.collision.velocity);
      } else if (tryCollisions === Collisions.X) {
        vec3.add(state.camera.nextPosition, state.camera.position, state.camera.collision.velocityX);
      } else if (tryCollisions === Collisions.Z) {
        vec3.add(state.camera.nextPosition, state.camera.position, state.camera.collision.velocityZ);
      }

      const [px,,pz] = state.camera.nextPosition;
      vec3.set(state.camera.collision.box.topLeft, px - 16, 0, pz - 16);
      vec3.set(state.camera.collision.box.topRight, px + 16, 0, pz - 16);
      vec3.set(state.camera.collision.box.bottomLeft, px - 16, 0, pz + 16);
      vec3.set(state.camera.collision.box.bottomRight, px + 16, 0, pz + 16);

      getTileCoordinates(state.camera.collision.tiles.current, state.camera.position);
      getTileCoordinates(state.camera.collision.tiles.topLeft, state.camera.collision.box.topLeft);
      getTileCoordinates(state.camera.collision.tiles.topRight, state.camera.collision.box.topRight);
      getTileCoordinates(state.camera.collision.tiles.bottomLeft, state.camera.collision.box.bottomLeft);
      getTileCoordinates(state.camera.collision.tiles.bottomRight, state.camera.collision.box.bottomRight);

      const [ctx,,ctz] = state.camera.collision.tiles.current;
      const [tlx,,tlz] = state.camera.collision.tiles.topLeft;
      const [trx,,trz] = state.camera.collision.tiles.topRight;
      const [blx,,blz] = state.camera.collision.tiles.bottomLeft;
      const [brx,,brz] = state.camera.collision.tiles.bottomRight;

      if (ctx - tlx !== 0) {
        if (collidesWithX(tlx,tlz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      if (ctx - trx !== 0) {
        if (collidesWithX(trx,trz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      if (ctx - blx !== 0) {
        if (collidesWithX(blx,blz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      if (ctx - brx !== 0) {
        if (collidesWithX(brx,brz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }

      if (ctz - tlz !== 0) {
        if (collidesWithY(tlx,tlz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      if (ctz - trz !== 0) {
        if (collidesWithY(trx,trz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      if (ctz - blz !== 0) {
        if (collidesWithY(blx,blz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      if (ctz - brz !== 0) {
        if (collidesWithY(brx,brz,ctx,ctz)) {
          tryCollisions--;
          continue;
        }
      }
      break;
    }

    if (tryCollisions === Collisions.XZ) {
      vec3.add(state.camera.position, state.camera.position, state.camera.velocity);
    } else if (tryCollisions === Collisions.X) {
      vec3.add(state.camera.position, state.camera.position, vec3.fromValues(state.camera.velocity[0],0,0));
    } else if (tryCollisions === Collisions.Z) {
      vec3.add(state.camera.position, state.camera.position, vec3.fromValues(0,0,state.camera.velocity[2]));
    }
    vec3.mul(state.camera.velocity, state.camera.velocity, Camera.FRICTION);

    mat4.identity(state.camera.transform.model);
    mat4.translate(state.camera.transform.model, state.camera.transform.model, state.camera.position);
    mat4.multiply(state.camera.transform.model, state.camera.transform.model, state.camera.transform.rotation);
  }

  // the view matrix is the inverse of the camera matrix.
  mat4.invert(state.camera.transform.view, state.camera.transform.model);

  mat4.multiply(state.camera.transform.projectionView, state.camera.transform.projection, state.camera.transform.view);

  for (const entity of state.entities) {
    mat4.identity(entity.transform.model);
    mat4.translate(entity.transform.model, entity.transform.model, entity.position);
    mat4.multiply(entity.transform.model, entity.transform.model, state.camera.transform.rotation);
    mat4.multiply(entity.transform.projectionViewModel, state.camera.transform.projectionView, entity.transform.model);

    // TODO: Necesito arreglar los casos en los que entity.angle
    // es mayor que PI. Esto es un auténtico mojón.
    if (entity.type === "character") {
      const anglePerSide = Math.PI / 4;
      const halfAnglePerSide = Math.PI / 8;
      entity.angle = shortestArc(keepIt(entity.rotation), keepIt(state.camera.rotation[1]) + halfAnglePerSide);
      state.angle = entity.angle * 180 / Math.PI;
      state.anglePerSide = anglePerSide * 180 / Math.PI;
      if (entity.angle < 0) {
        entity.angleIndex = -Math.floor(entity.angle / anglePerSide);
      } else {
        entity.angleIndex = -Math.ceil(entity.angle / anglePerSide);
      }
      state.shortestArc = entity.angleIndex;
      if (entity.angleIndex < 0) {
        entity.uv[0] = CHARS_W * -entity.angleIndex;
        entity.uv[2] = -CHARS_W;
      } else {
        entity.uv[0] = CHARS_W * entity.angleIndex;
        entity.uv[2] = CHARS_W;
      }

      if (entity.ai && entity.ai.state === "walking") {
        vec3.set(entity.velocity, 0,0,-1);
        vec3.rotateY(entity.velocity, entity.velocity, VEC3_EMPTY, entity.rotation);
        vec3.add(entity.position, entity.position, entity.velocity);
        entity.x = -entity.position[0] / 64;
        entity.y = -entity.position[2] / 64;

        if (Date.now() - entity.ai.time > entity.ai.timeToTurn) {
          entity.rotation += entity.ai.preferenceToTurn * Math.PI * 0.5;
          entity.ai.time = Date.now();
          entity.ai.timeToTurn = 1000 + Math.round(Math.random() * 5) * 1000;
        }
      }
    }
  }

}

function renderDebug() {
  const tile = vec3.create();
  const nextTile = vec3.create();
  const topLeft = vec3.create();
  const topRight = vec3.create();
  const bottomLeft = vec3.create();
  const bottomRight = vec3.create();
  const [px,py,pz] = state.camera.position;
  const [,rotation] = state.camera.rotation;
  const [tx,ty,tz] = state.camera.collision.tiles.current;
  const cx = (dcx.canvas.width * 0.75);
  const cy = (dcx.canvas.height * 0.75);

  const V = 8;
  const S = 16;
  const S_HALF = S * 0.5;
  const S_QRTR = S * 0.25;

  const ctx = cx - (V * S);
  const cty = cy - (V * S);

  let l = 0;

  dcx.clearRect(0,0,dcx.canvas.width,dcx.canvas.height);
  dcx.font = "16px monospace";
  dcx.textAlign = "left";
  dcx.textBaseline = "top";
  dcx.fillStyle = "white";
  dcx.fillText(`${px.toFixed(2)},${py.toFixed(2)},${pz.toFixed(2)}`, 0, l++ * 16);
  dcx.fillText(`${tx},${ty},${tz}`, 0, l++ * 16);
  dcx.fillText(`${state.camera.transform.rotation[0].toFixed(2)},${state.camera.transform.rotation[1].toFixed(2)},${state.camera.transform.rotation[2].toFixed(2)}, ${state.camera.rotation[0].toFixed(2)}, ${state.camera.rotation[1].toFixed(2)}`, 0, l++ * 16);
  dcx.fillText(`Mode: ${state.mode === Mode.GOD ? "God" : "Player"} (To change between modes use Tab key)`, 0, l++ * 16);
  dcx.fillText("Use AWSD to move", 0, l++ * 16);
  dcx.fillText(`angle: ${state.angle}`, 0, l++ * 16);
  dcx.fillText(`anglePerSide: ${state.anglePerSide}`, 0, l++ * 16);
  dcx.fillText(`Shortest arc: ${state.shortestArc}`, 0, l++ * 16);

  if (state.map.tiles) {
    const rsx = tx - V;
    const rsy = tz - V;
    const sx = Math.max(0, rsx);
    const sy = Math.max(0, rsy);
    const ex = Math.min(state.map.tiles.width, tx + V + 1);
    const ey = Math.min(state.map.tiles.height, tz + V + 1);
    for (let y = sy; y < ey; y++) {
      for (let x = sx; x < ex; x++) {
        const offset = getDataOffset(x,y,state.map.tiles.width);
        const tile = state.map.tiles.data[offset];
        const texture = state.map.textures.data[offset];
        const tcx = ctx + ((x - rsx) * S);
        const tcy = cty + ((y - rsy) * S);
        if (!(tile & 0x01)) {
          dcx.fillStyle = "white";
          dcx.fillRect(tcx, tcy, S, S);
        } else {
          dcx.strokeStyle = "white";
          dcx.strokeRect(tcx, tcy, S, S);
        }

        const hasNorthWall = ((tile >> 5) & 0x01) && (texture & 0x0F);
        const hasWestWall = ((tile >> 6) & 0x01) && (texture & 0x0F);

        if (hasNorthWall) {
          dcx.fillStyle = "white";
          dcx.fillRect(tcx, tcy - 2, S, 4);
        }

        if (hasWestWall) {
          dcx.fillStyle = "white";
          dcx.fillRect(tcx - 2, tcy, 4, S);
        }

        if (x === tx && y === tz) {
          dcx.fillStyle = "green";
          dcx.fillRect(tcx, tcy, S, S);
        }
      }
    }

    for (const entity of state.entities) {
      if (entity.x > sx
       && entity.y > sy
       && entity.x < ex
       && entity.y < ey) {
        const tcx = ctx + ((entity.x - rsx) * S);
        const tcy = cty + ((entity.y - rsy) * S);
        if (entity.type === "character") {
          dcx.fillStyle = "blue";
        } else if (entity.type === "static") {
          dcx.fillStyle = "cyan";
        }
        dcx.fillRect(tcx, tcy, S, S);
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

  renderDebug();

  const gl = state.context;
  gl.viewport(0,0,gl.canvas.width,gl.canvas.height);
  gl.clearColor(0.17,0.66,0.95,1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  gl.useProgram(state.programs.default);

  gl.uniformMatrix4fv(
    gl.getUniformLocation(state.programs.default, "u_mvp"),
    gl.FALSE,
    state.camera.transform.projectionView
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, state.textures.base);
  gl.uniform1i(gl.getUniformLocation(state.programs.default, "u_sampler"), 0);
  gl.uniform3fv(gl.getUniformLocation(state.programs.default, "u_color"), state.colors.default);

  // draws floor.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.floor.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_coords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_coords"), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0);

  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texcoords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texcoords"), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.floor.offset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_offset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_offset"), 3, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_offset"), 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.floor.texOffset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texoffset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texoffset"), 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_texoffset"), 1);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, state.tile.floor.vertices.length / 5, state.tiles.floor.offset.data.length / 3);

  gl.enable(gl.CULL_FACE);

  // draws north.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.north.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_coords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_coords"), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0);

  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texcoords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texcoords"), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.north.offset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_offset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_offset"), 3, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_offset"), 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.north.texOffset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texoffset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texoffset"), 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_texoffset"), 1);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, state.tile.north.vertices.length / 5, state.tiles.north.offset.data.length / 3);

  // draws south.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.south.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_coords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_coords"), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0);

  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texcoords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texcoords"), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.south.offset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_offset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_offset"), 3, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_offset"), 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.south.texOffset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texoffset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texoffset"), 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_texoffset"), 1);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, state.tile.south.vertices.length / 5, state.tiles.south.offset.data.length / 3);

  // draws west.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.west.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_coords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_coords"), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0);

  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texcoords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texcoords"), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.west.offset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_offset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_offset"), 3, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_offset"), 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.west.texOffset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texoffset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texoffset"), 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_texoffset"), 1);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, state.tile.west.vertices.length / 5, state.tiles.west.offset.data.length / 3);

  // draws east.
  gl.bindBuffer(gl.ARRAY_BUFFER, state.tile.east.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_coords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_coords"), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0);

  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texcoords"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texcoords"), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.east.offset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_offset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_offset"), 3, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_offset"), 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, state.tiles.east.texOffset.buffer);
  gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.default, "a_texoffset"));
  gl.vertexAttribPointer(gl.getAttribLocation(state.programs.default, "a_texoffset"), 2, gl.FLOAT, gl.FALSE, 0, 0);
  gl.vertexAttribDivisor(gl.getAttribLocation(state.programs.default, "a_texoffset"), 1);

  gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, state.tile.east.vertices.length / 5, state.tiles.east.offset.data.length / 3);

  // FIXME: Esto no funciona, comprobar por qué.
  if (state.entities.length > 0) {
    gl.useProgram(state.programs.billboard);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindBuffer(gl.ARRAY_BUFFER, state.billboard.buffer);
    gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.billboard, "a_coords"));
    gl.vertexAttribPointer(gl.getAttribLocation(state.programs.billboard, "a_coords"), 3, gl.FLOAT, gl.FALSE, 5 * 4, 0);

    gl.enableVertexAttribArray(gl.getAttribLocation(state.programs.billboard, "a_texcoords"));
    gl.vertexAttribPointer(gl.getAttribLocation(state.programs.billboard, "a_texcoords"), 2, gl.FLOAT, gl.FALSE, 5 * 4, 3 * 4 );

    // We need to sort the entities to draw them
    // in the correct order.
    state.entities.sort((a,b) => b.transform.projectionViewModel[14] - a.transform.projectionViewModel[14]);

    for (let entity of state.entities) {
      gl.uniformMatrix4fv(
        gl.getUniformLocation(state.programs.billboard, "u_mvp"),
        gl.FALSE,
        entity.transform.projectionViewModel
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, entity.texture);
      gl.uniform1i(gl.getUniformLocation(state.programs.billboard, "u_sampler"), 0);
      gl.uniform3fv(gl.getUniformLocation(state.programs.billboard, "u_color"), entity.color);
      gl.uniform4fv(gl.getUniformLocation(state.programs.billboard, "u_texcoords"), entity.uv);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, state.billboard.vertices.length / 5, 1);
    }
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

  }
}

function frame(t) {
  update(t);
  render(t);
  requestFrame();
}

function requestFrame() {
  state.frame.id = window.requestAnimationFrame(frame);
}

function cancelFrame() {
  if (state.frame.id !== null) {
    window.cancelAnimationFrame(state.frame.id);
    state.frame.id = null;
  }
}

function createProgramFromSource(gl, vertexShaderSource, fragmentShaderSource) {
  return createProgram(gl, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource), createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createBuffer(gl, data, type = gl.ARRAY_BUFFER, drawMode = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, data, drawMode);
  gl.bindBuffer(type, null);
  return buffer;
}

function createTexture(gl, data) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function start() {

  const gl = state.context;

  state.programs.default = createProgramFromSource(gl, defaultVertexShader, defaultFragmentShader);
  state.programs.billboard = createProgramFromSource(gl, billboardVertexShader, billboardFragmentShader);

  state.textures.default = createTexture(gl, defaultTexture);
  state.textures.billboard = createTexture(gl, billboardTexture);
  state.textures.base = createTexture(gl, state.map.textures);
  state.textures.sprites = createTexture(gl, state.map.sprites);
  state.textures.chars = createTexture(gl, state.map.chars);


  const floor = [
    -32.0, 32.0, -32.0,  0 / Texture.WIDTH, 128 / Texture.HEIGHT,
    -32.0, 32.0,  32.0, 64 / Texture.WIDTH, 128 / Texture.HEIGHT,
     32.0, 32.0,  32.0, 64 / Texture.WIDTH, 192 / Texture.HEIGHT,
     32.0, 32.0, -32.0,  0 / Texture.WIDTH, 192 / Texture.HEIGHT
  ];

  // IMPORTANT! This are verified coordinates.
  const north = [
    -32.0,-32.0, 32.0,  0 / Texture.WIDTH,  0 / Texture.HEIGHT,
    -32.0, 32.0, 32.0,  0 / Texture.WIDTH, 64 / Texture.HEIGHT,
     32.0, 32.0, 32.0, 64 / Texture.WIDTH, 64 / Texture.HEIGHT,
     32.0,-32.0, 32.0, 64 / Texture.WIDTH,  0 / Texture.HEIGHT
  ];

  // IMPORTANT! This are verified coordinates.
  const south = [
    -32.0,-32.0, 32.0,  0 / Texture.WIDTH,  0 / Texture.HEIGHT,
     32.0,-32.0, 32.0, 64 / Texture.WIDTH,  0 / Texture.HEIGHT,
     32.0, 32.0, 32.0, 64 / Texture.WIDTH, 64 / Texture.HEIGHT,
    -32.0, 32.0, 32.0,  0 / Texture.WIDTH, 64 / Texture.HEIGHT
  ];
  /*const south = [
    -32.0,-32.0, 32.0, 0, 0,
     32.0,-32.0, 32.0, 0, 0,
     32.0, 32.0, 32.0, 0, 0,
    -32.0, 32.0, 32.0, 0, 0
  ];*/

  // IMPORTANT! This are verified coordinates.
  const east = [
    32.0,-32.0,-32.0,  0 / Texture.WIDTH,  0 / Texture.HEIGHT,
    32.0, 32.0,-32.0,  0 / Texture.WIDTH, 64 / Texture.HEIGHT,
    32.0, 32.0, 32.0, 64 / Texture.WIDTH, 64 / Texture.HEIGHT,
    32.0,-32.0, 32.0, 64 / Texture.WIDTH,  0 / Texture.HEIGHT
  ];
  /*const east = [
    32.0,-32.0,-32.0, 0, 0,
    32.0, 32.0,-32.0, 0, 0,
    32.0, 32.0, 32.0, 0, 0,
    32.0,-32.0, 32.0, 0, 0
  ];*/

  // IMPORTANT! This are verified coordinates.
  const west = [
    32.0,-32.0,-32.0,  0 / Texture.WIDTH,  0 / Texture.HEIGHT,
    32.0,-32.0, 32.0, 64 / Texture.WIDTH,  0 / Texture.HEIGHT,
    32.0, 32.0, 32.0, 64 / Texture.WIDTH, 64 / Texture.HEIGHT,
    32.0, 32.0,-32.0,  0 / Texture.WIDTH, 64 / Texture.HEIGHT
  ];

  const floorTypedArray = new Float32Array(floor);
  const northTypedArray = new Float32Array(north);
  const southTypedArray = new Float32Array(south);
  const westTypedArray = new Float32Array(west);
  const eastTypedArray = new Float32Array(east);

  state.tile = {
    floor: {
      vertices: floor,
      typedArray: floorTypedArray,
      buffer: createBuffer(gl, floorTypedArray)
    },
    north: {
      vertices: north,
      typedArray: northTypedArray,
      buffer: createBuffer(gl, northTypedArray)
    },
    south: {
      vertices: south,
      typedArray: southTypedArray,
      buffer: createBuffer(gl, southTypedArray)
    },
    west: {
      vertices: west,
      typedArray: westTypedArray,
      buffer: createBuffer(gl, westTypedArray)
    },
    east: {
      vertices: east,
      typedArray: eastTypedArray,
      buffer: createBuffer(gl, eastTypedArray)
    }
  };

  state.tiles = createTilesBufferFromImage(gl, state.map.ground);
  // FIXME: Revisar esto.
  //state.entities = [];

  const billboard = [
    -32.0,-32.0,  0.0, 0.0, 0.0,
     32.0,-32.0,  0.0, 1.0, 0.0,
     32.0, 32.0,  0.0, 1.0, 1.0,
    -32.0, 32.0,  0.0, 0.0, 1.0
  ];

  const billboardTypedArray = new Float32Array(billboard);
  state.billboard = {
    vertices: billboard,
    typedArray: billboardTypedArray,
    buffer: createBuffer(gl, billboardTypedArray)
  };

  state.colors.default = new Float32Array([1.0,1.0,1.0]);

  window.addEventListener("resize", resize);
  window.dispatchEvent(new Event("resize"));

  window.addEventListener("keyup", key);
  window.addEventListener("keydown", key);

  window.addEventListener("mousemove", mouse);
  window.addEventListener("mousedown", mouse);
  window.addEventListener("mouseup", mouse);
  window.addEventListener("click", mouse);

  createCharacters();

  requestFrame();
}

function createCharacters() {

  state.entities.push({
    type: "character",
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
    color: vec3.fromValues(1.0, 1.0, 1.0)
  });

  for (let i = 0; i < 200; i++) {
    let x, y;

    // TODO: Esta es una manera muy burda de asegurarse de que dos entidades
    // no coinciden en el mismo sitio, tengo que buscar una alternativa mejor.
    do {
      x = Math.round(Math.random() * 80);
      y = 4 + Math.round(Math.random() * 120);
    } while (state.entities.find((entity) => entity.position[0] === -x * 64 && entity.position[2] === -y * 64));

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
    const kind = Math.round(Math.random() * 8);

    state.entities.push({
      type: "character",
      kind,
      x, y,
      position: vec3.fromValues(-x * 64, 0, -y * 64),
      velocity: vec3.fromValues(0,0,-1),
      rotation: Math.round((Math.random() - 0.5) * 2) * Math.PI,
      transform: {
        model: mat4.create(),
        projectionViewModel: mat4.create(),
      },
      ai: {
        state: "walking",
        time: Date.now(),
        preferenceToTurn: Math.random() < 0.5 ? -1 : 1,
        timeToTurn: 1000 + Math.round(Math.random() * 5) * 1000
      },
      uv: vec4.fromValues(0, CHARS_H * kind, CHARS_W, CHARS_H),
      texture: state.textures.chars,
      color: vec3.fromValues(1.0, 1.0, 1.0)
    });
  }

}

/**
 * Devuelve si la casilla es un exterior o no.
 *
 * @param {Number} tile
 */
function isExterior(tile) {
  return (tile & 0x01);
}

/**
 * Devuelve si la casilla es interior.
 *
 * @param {Number} tile
 */
function isInterior(tile) {
  return !isExterior(tile);
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
  const context = createContext2DFromImage(image);
  const mapData = context.getImageData(0,0,width,height);
  const mapTextureData = context.getImageData(width,0,width,height);
  const mapHeightData = context.getImageData(width + width,0,width,height);
  state.map.tiles = mapData;
  state.map.textures = mapTextureData;
  console.log(state.map.tiles);

  const floorData = [];
  const northData = [];
  const southData = [];
  const westData = [];
  const eastData = [];

  const northTextureData = [];
  const southTextureData = [];
  const westTextureData = [];
  const eastTextureData = [];
  const floorTextureData = [];

  const SW = 64 / Sprites.WIDTH;
  const SH = 96 / Sprites.HEIGHT;

  const TW = 64 / Texture.WIDTH;
  const TH = 64 / Texture.HEIGHT;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // useful offsets.
      const offset = ((y * width) + x) * 4;
      const upOffset = (((y - 1) * width) + x) * 4;
      const leftOffset = ((y * width) + (x - 1)) * 4;

      const current = mapData.data[offset];
      const sprite = (current >> 2) & 0x07;
      if (sprite > 0) {
        const spriteW = SW;
        const spriteH = SH;
        const spriteX = 0;
        const spriteY = (sprite - 2) * SH;
        state.entities.push({
          type: "static",
          x, y,
          position: vec3.fromValues(-x * 64,0,-y * 64),
          rotation: 0,
          transform: {
            model: mat4.create(),
            projectionViewModel: mat4.create(),
          },
          uv: vec4.fromValues(spriteX,spriteY,spriteW,spriteH),
          texture: state.textures.sprites,
          color: vec3.fromValues(1.0,1.0,1.0)
        });
      }

      const up = mapData.data[upOffset];
      const left = mapData.data[leftOffset];

      const texture = mapTextureData.data[offset];
      const height = mapHeightData.data[offset];

      let tileO, tileI, tileH;
      let tileOX, tileOY, tileIX, tileIY, tileHX, tileHY;

      let inside = ((texture >> 4) & 0x0F);
      let outside = (texture & 0x0F);

      tileO = outside - 1;
      tileI = inside - 1;
      if ((height & 0x01) && (height & 0x02)) {
        tileH = tileO;
      } else if (height & 0x02) {
        tileH = 0x0B;
      } else if (height & 0x01) {
        tileH = 0x05;
      }

      tileHX = (tileH % 5) * TW;
      tileHY = Math.floor(tileH / 5) * TH;

      tileOX = (tileO % 5) * TW;
      tileOY = Math.floor(tileO / 5) * TH;

      tileIX = (tileI % 5) * TW;
      tileIY = (3 + Math.floor(tileI / 5)) * TH;

      const floorX = (isExterior(current) ? 0 : 4) * TW;
      const floorY = (isExterior(current) ? 0 : 0) * TH;
      if ((current & 0x03) !== 2) {
        // Añadimos los datos del suelo.
        floorData.push(-x * 64, 0, -y * 64);
        floorTextureData.push(floorX,floorY);
      }

      // TODO: Remove this comments to draw second floor
      if (!(current & 0x01) && (current & 0x03) !== 2) {
        floorData.push(-x * 64, -64, -y * 64);
        floorTextureData.push(floorX,floorY);
      }

      const hasNorthWall = (current >> 5) & 0x01;
      const hasWestWall = (current >> 6) & 0x01;
      if (hasNorthWall) {
        if (!(isExterior(current) && outside === 0) && !(isInterior(current) && inside === 0 && !isExterior(up))) {
          northData.push(-x * 64, 0, -y * 64);
          southData.push(-x * 64, 0, -y * 64);
          if (isExterior(current) && isInterior(up)) {
            northTextureData.push(tileIX,tileIY);
            southTextureData.push(tileOX,tileOY);
          } else if (isExterior(current) && isExterior(up)) {
            northTextureData.push(tileOX,tileOY);
            southTextureData.push(tileOX,tileOY);
          } else if (isInterior(current) && isExterior(up)) {
            northTextureData.push(tileOX,tileOY);
            southTextureData.push(tileIX,tileIY);
          } else if (isInterior(current) && isInterior(up)) {
            northTextureData.push(tileIX,tileIY);
            southTextureData.push(tileIX,tileIY);
          }
        }

        // TODO: Investigate how this shit works.
        if (height & 0x01 || height & 0x02) {
          northData.push(-x * 64, -64, -y * 64);
          southData.push(-x * 64, -64, -y * 64);
          northTextureData.push(tileHX,tileHY);
          southTextureData.push(tileHX,tileHY);
        }
      }

      if (hasWestWall) {
        if (!(isExterior(current) && outside === 0) && !(isInterior(current) && inside === 0 && !isExterior(left))) {
          westData.push(-x * 64, 0, -y * 64);
          eastData.push(-x * 64, 0, -y * 64);
          if (isExterior(current) && isInterior(left)) {
            westTextureData.push(tileIX,tileIY);
            eastTextureData.push(tileOX,tileOY);
          } else if (isExterior(current) && isExterior(left)) {
            westTextureData.push(tileOX,tileOY);
            eastTextureData.push(tileOX,tileOY);
          } else if (isInterior(current) && isExterior(left)) {
            westTextureData.push(tileOX,tileOY);
            eastTextureData.push(tileIX,tileIY);
          } else if (isInterior(current) && isInterior(left)) {
            westTextureData.push(tileIX,tileIY);
            eastTextureData.push(tileIX,tileIY);
          }
        }

        if (height & 0x01 || height & 0x02) {
          westData.push(-x * 64, -64, -y * 64);
          eastData.push(-x * 64, -64, -y * 64);
          westTextureData.push(tileHX,tileHY);
          eastTextureData.push(tileHX,tileHY);
        }
      }
    }
  }

  const floorTypedArray = new Float32Array(floorData);

  const northTypedArray = new Float32Array(northData);
  const southTypedArray = new Float32Array(southData);
  const westTypedArray = new Float32Array(westData);
  const eastTypedArray = new Float32Array(eastData);

  const floorTextureTypedArray = new Float32Array(floorTextureData);
  const floorTextureBuffer = createBuffer(gl, floorTextureTypedArray);

  const northTextureTypedArray = new Float32Array(northTextureData);
  const northTextureBuffer = createBuffer(gl, northTextureTypedArray);

  const southTextureTypedArray = new Float32Array(southTextureData);
  const southTextureBuffer = createBuffer(gl, southTextureTypedArray);

  const westTextureTypedArray = new Float32Array(westTextureData);
  const westTextureBuffer = createBuffer(gl, westTextureTypedArray);

  const eastTextureTypedArray = new Float32Array(eastTextureData);
  const eastTextureBuffer = createBuffer(gl, eastTextureTypedArray);

  return {
    floor: {
      offset: {
        data: floorData,
        typedArray: floorTypedArray,
        buffer: createBuffer(gl, floorTypedArray)
      },
      texOffset: {
        data: floorTextureData,
        typedArray: floorTextureTypedArray,
        buffer: floorTextureBuffer
      }
    },
    north: {
      offset: {
        data: northData,
        typedArray: northTypedArray,
        buffer: createBuffer(gl, northTypedArray)
      },
      texOffset: {
        data: northTextureData,
        typedArray: northTextureTypedArray,
        buffer: northTextureBuffer
      }
    },
    south: {
      offset: {
        data: southData,
        typedArray: southTypedArray,
        buffer: createBuffer(gl, southTypedArray)
      },
      texOffset: {
        data: southTextureData,
        typedArray: southTextureTypedArray,
        buffer: southTextureBuffer
      }
    },
    west: {
      offset: {
        data: westData,
        typedArray: westTypedArray,
        buffer: createBuffer(gl, westTypedArray)
      },
      texOffset: {
        data: westTextureData,
        typedArray: westTextureTypedArray,
        buffer: westTextureBuffer
      }
    },
    east: {
      offset: {
        data: eastData,
        typedArray: eastTypedArray,
        buffer: createBuffer(gl, eastTypedArray)
      },
      texOffset: {
        data: eastTextureData,
        typedArray: eastTextureTypedArray,
        buffer: eastTextureBuffer
      }
    }
  };
}

function createContext2DFromImage(image) {
  const canvas = createCanvasFromImage(image);
  const context = canvas.getContext("2d");
  context.drawImage(image,0,0);
  return context;
}

function createCanvasFromImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  return canvas;
}

Promise.all([
  "assets/underground.png",
  "assets/ground.png",
  "assets/foreground.png",
  "assets/textures.png",
  "assets/sprites.png",
  "assets/chars.png"
].map(loadImage)).then(([underground,ground,foreground,textures,sprites,chars]) => {
  console.log(underground,ground,foreground,textures,sprites,chars);
  state.map = {
    underground,
    ground,
    foreground,
    textures,
    sprites,
    chars
  };

  start();
});
