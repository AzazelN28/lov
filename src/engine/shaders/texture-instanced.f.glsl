precision lowp float;

uniform sampler2D u_sampler;
uniform vec3 u_color;
varying vec2 v_texcoords;
varying float v_z;
uniform vec4 u_fog_color;
uniform float u_fog_far;
uniform float u_fog_near;

// TODO: Esto molaría meterlo en un uniform
//       para poder hacer efectos atmosféricos.
#define FOG_NEAR_Z 256.0
#define FOG_FAR_Z 4352.0

void main() {
  gl_FragColor = mix(
    vec4(u_color, 1.0) * texture2D(u_sampler, v_texcoords.st),
    u_fog_color,
    clamp((v_z - u_fog_near) / (u_fog_far - u_fog_near), 0.0, 1.0)
  );
  // gl_FragColor = vec4(u_color, 1.0) * texture2D(u_sampler, v_texcoords.st);
}
