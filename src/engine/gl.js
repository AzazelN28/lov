export function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

export function createVertexShader(gl, source) {
  return createShader(gl, gl.VERTEX_SHADER, source)
}

export function createFragmentShader(gl, source) {
  return createShader(gl, gl.FRAGMENT_SHADER, source)
}

export function createProgramFromSource(gl, vertexShaderSource, fragmentShaderSource) {
  return createProgram(
    gl,
    createVertexShader(gl, vertexShaderSource),
    createFragmentShader(gl, fragmentShaderSource)
  )
}

export function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }
  return program
}

export function getProgramUniforms(gl, program) {
  const uniforms = new Map()
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)
    const location = gl.getUniformLocation(program, info.name)
    uniforms.set(info.name, { info, location })
  }
  return uniforms
}

export function getProgramAttributes(gl, program) {
  const attributes = new Map()
  const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveAttrib(program, i)
    const location = gl.getAttribLocation(program, info.name)
    attributes.set(info.name, { info, location })
  }
  return attributes
}

export function getProgramAttributesAndUniforms(gl, program) {
  return {
    attributes: getProgramAttributes(gl, program),
    uniforms: getProgramUniforms(gl, program),
  }
}

export function createBuffer(
  gl,
  data,
  target = gl.ARRAY_BUFFER,
  usage = gl.STATIC_DRAW
) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(target, buffer)
  gl.bufferData(target, data, usage)
  gl.bindBuffer(target, null)
  return buffer
}

export function createTexture(gl, data) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.bindTexture(gl.TEXTURE_2D, null)
  return texture
}
