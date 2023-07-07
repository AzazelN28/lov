precision highp float;

uniform sampler2D u_sampler;
uniform vec3 u_color;
varying vec2 v_texcoords;
varying float v_z;

// TODO: Esto molaría meterlo en un uniform
//       para poder hacer efectos atmosféricos.
#define FOG_NEAR_Z 256.0
#define FOG_FAR_Z 4352.0

void main() {
  gl_FragColor = mix(
    vec4(u_color, 1.0) * texture2D(u_sampler, v_texcoords.st),
    vec4(0.17, 0.66, 0.95, 1.0),
    clamp((v_z - FOG_NEAR_Z) / (FOG_FAR_Z - FOG_NEAR_Z), 0.0, 1.0)
  );
  // gl_FragColor = vec4(u_color, 1.0) * texture2D(u_sampler, v_texcoords.st);
}
