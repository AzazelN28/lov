precision highp float;

attribute vec3 a_coords;

uniform mat4 u_mvp;

void main() {
  vec4 position = u_mvp * vec4(a_coords, 1.0);

  // pass vertex position to next step in GPU pipeline.
  gl_Position = vec4(position.x, -position.y, position.z, position.w);
}
