precision highp float;

attribute vec3 a_coords;
attribute vec2 a_texcoords;

uniform vec4 u_texcoords;
uniform mat4 u_mvp;

varying vec2 v_texcoords;
varying float v_z;

void main() {
  vec4 position = u_mvp * vec4(a_coords, 1.0);

  // pass vertex position to next step in GPU pipeline.
  gl_Position = vec4(position.x, -position.y, position.z, position.w);

  v_z = position.z;
  v_texcoords = vec2(
    u_texcoords.x + (a_texcoords.x * u_texcoords.z),
    u_texcoords.y + (a_texcoords.y * u_texcoords.w)
  );
}
