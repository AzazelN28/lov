precision mediump float;

uniform sampler2D u_sampler;
uniform vec3 u_color;
varying vec2 v_texcoords;
varying float v_z;
uniform vec4 u_fog_color;
uniform float u_fog_far;
uniform float u_fog_near;

void main() {
  gl_FragColor = mix(
    vec4(u_color, 1.0) * texture2D(u_sampler, v_texcoords.st),
    u_fog_color,
    clamp((v_z - u_fog_near) / (u_fog_far - u_fog_near), 0.0, 1.0)
  );
  gl_FragColor.a = texture2D(u_sampler, v_texcoords.st).a;
}
