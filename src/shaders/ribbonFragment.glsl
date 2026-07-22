precision mediump float;

uniform vec3 u_color;
uniform float u_opacity;
uniform float u_fadeBias; // shapes the length gradient (lower = brightens sooner)
uniform highp float u_treble; // high-band level 0..1 (highp to match the vertex shader)
uniform float u_pulseReact; // how much the treble brightens/pulses the lines
uniform float u_eqBright; // how much the spatial EQ brightens the lines per position

varying float vV;
varying float vU;
varying highp float vEq; // spatial EQ level at this position (highp to match vertex)

void main() {
  // slight fade of the outermost lines (across the width)
  float edge = smoothstep(0.0, 0.03, vV) * smoothstep(1.0, 0.97, vV);

  // asymmetric gradient along the length: dissolves into the bottom-edge end
  // (u = 0) and intensifies toward the right-edge end (u = 1), like the poster
  float lengthGrad = pow(clamp(vU, 0.0, 1.0), u_fadeBias);

  // treble pulse: boosts brightness and opacity with the high band. Pushing
  // the colour past 1.0 lets the bloom flare on peaks. At u_treble = 0 or
  // u_pulseReact = 0 this equals the static look.
  // spatial EQ also brightens each position by its local spectrum level
  float pulse = 1.0 + u_treble * u_pulseReact + vEq * u_eqBright;
  vec3 color = u_color * pulse;
  float alpha = clamp(u_opacity * pulse, 0.0, 1.0) * edge * lengthGrad;

  gl_FragColor = vec4(color, alpha);
}
