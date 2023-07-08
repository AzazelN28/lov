precision mediump float;

attribute vec3 a_coords;
attribute vec2 a_texcoords;
attribute vec3 a_offset;
attribute vec2 a_texoffset;

varying vec2 v_texcoords;
varying float v_z;

uniform mat4 u_mvp;

void main() {
  vec4 position = u_mvp * vec4(a_coords + a_offset, 1.0);

  // pass vertex position to next step in GPU pipeline.
  gl_Position = vec4(position.x, -position.y, position.z, position.w);

  v_z = position.z;
  v_texcoords = a_texcoords + a_texoffset;
}
