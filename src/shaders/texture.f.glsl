precision highp float;

uniform sampler2D u_sampler;
uniform vec3 u_color;
varying vec2 v_texcoords;

void main() {
  gl_FragColor = vec4(u_color,1.0) * texture2D(u_sampler, v_texcoords.st);
}
