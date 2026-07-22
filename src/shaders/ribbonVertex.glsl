uniform float u_time;        // animation clock
uniform float u_frequency;   // overall audio level 0..1
uniform float u_bass;        // low-band level 0..1  -> drives the central twist
uniform float u_mid;         // mid-band level 0..1  -> drives the waves (olas)
uniform float u_treble;      // high-band level 0..1 -> (brightness, in fragment)
uniform float u_amplitude;   // kept for later animation (currently unused)
uniform float u_bow;         // how far the centreline bows toward screen centre
uniform float u_twistTurns;  // half-twists of the ribbon along the path (use integers)
uniform float u_twistShear;  // per-line shear that spreads the nodes into caustics
uniform float u_twistCenter; // 0..1: concentrates the twisting toward the centre
uniform float u_twistConcentration; // higher = only the central twist pinches fully
uniform float u_ribbonWidth; // scales the band width (smaller = narrower/longer)
uniform float u_concavity;   // strength of the concave bow of the cross-section
uniform float u_concFreq;    // how many times the plane goes concave along the path
uniform float u_waveAmp;     // amplitude of the shared "olas" (0 = off)
uniform float u_waveFreq;    // how many soft waves along the ribbon
uniform float u_waveSpeed;   // how fast the waves scroll along the ribbon (u_time)
uniform float u_audioReact;  // how much u_frequency (audio) boosts the wave amplitude
uniform float u_waveFreqReact; // how many EXTRA waves appear on audio peaks
uniform float u_twistReact;  // how much the audio tightens/writhes the central twist
uniform float u_twistBreatheAmp;   // slow, audio-free writhe of the central twist
uniform float u_twistBreatheSpeed; // speed of that breathing (u_time)
uniform float u_thickReact;  // how much the audio swells the line thickness
uniform float u_thickness;   // line half-width, in NDC-y units
uniform float u_parallaxAmp;   // depth/parallax: subtle sway + zoom (0 = off)
uniform float u_parallaxSpeed; // how fast the parallax drifts (u_time)
uniform float u_overscan;      // pushes the line ends beyond the viewport edges
uniform vec2 u_resolution;   // canvas size in px, for aspect correction

#define N_EQ 16
uniform float u_eq[N_EQ];    // spatial EQ: per-position spectrum levels (lows->highs)
uniform float u_eqReact;     // how much the spatial EQ bumps the local wave amplitude

attribute float aU;
attribute float aV;
attribute float aSide;       // -1 or +1: which side of the thick line

varying float vV;
varying float vU;
varying float vEq; // spatial EQ level at this position, for the fragment shader

const float PI = 3.14159265359;

// Screen-space (NDC) family of curves.
// The container maps to x,y in [-1, 1]:
//   bottom edge = y = -1   right edge = x = +1
// Every line's LEFT end sits on the bottom edge and its RIGHT end on the
// right edge, spread out at different points, and "tied" there because the
// oscillation vanishes at u = 0 and u = 1.
// --- LAYER 1: the overall route the ribbon follows ---
vec2 basePath(float u, float v) {
  // anchor points on the container edges
  vec2 L = vec2(mix(-0.75, 0.80, v), -1.0); // bottom edge (y = -1)
  vec2 R = vec2(1.0, mix(-0.50, 0.85, v));  // right edge  (x = +1)

  // eased travel from the left anchor to the right anchor
  float s = smoothstep(0.0, 1.0, u);
  vec2 base = mix(L, R, s);

  // push ONLY the very ends beyond the viewport so they stay off-screen when
  // the parallax rotation tilts the frame; the visible middle is untouched.
  float endL = smoothstep(0.25, 0.0, u); // 1 at u = 0, fades to 0 by u = 0.25
  float endR = smoothstep(0.75, 1.0, u); // 0 until u = 0.75, 1 at u = 1
  base.y -= u_overscan * endL; // extend bottom end downward
  base.x += u_overscan * endR; // extend right end rightward

  // bow the middle of the path toward the centre of the screen (up + left),
  // fading to zero at the ends so the anchors stay put
  float bow = sin(u * PI);
  base += bow * u_bow * vec2(-0.45, 0.55);

  return base;
}

// --- LAYER 3: gentle waves of the whole ribbon ("olas") ---
// Shared by every line so the band undulates together. u_time scrolls the wave
// (flow) and u_frequency (audio level, 0..1) boosts the amplitude so the band
// reacts to sound. At u_time = 0 and u_frequency = 0 this equals the static look.
// Spatial EQ: sample the spectrum at position u (0 = lows on the left end,
// 1 = highs on the right end), linearly interpolated between adjacent bands.
float eqAt(float u) {
  float x = clamp(u, 0.0, 1.0) * float(N_EQ - 1);
  int i = int(floor(x));
  float f = x - float(i);
  int j = i + 1;
  if (j > N_EQ - 1) j = N_EQ - 1;
  return mix(u_eq[i], u_eq[j], f);
}

vec2 waves(float u) {
  float env = sin(u * PI);
  // MID band drives the waves: more/larger olas with the mids
  float freq = u_waveFreq + u_mid * u_waveFreqReact;
  float phase = u * PI * freq + u_time * u_waveSpeed;
  // spatial EQ: the band that maps to this u position bumps the local amplitude
  float eq = eqAt(u);
  float amp = u_waveAmp * (1.0 + u_mid * u_audioReact + eq * u_eqReact);
  return amp * env * vec2(0.0, sin(phase));
}

// The single centre line the ribbon is twisted around.
vec2 centrePath(float u) {
  return basePath(u, 0.5) + waves(u);
}

// --- LAYER 2: the twisted ribbon ---
// Think of a flat ribbon following the centre line. Each line is a "ruling"
// across the ribbon's width. As the ribbon twists about its own axis, its
// projected width scales by cos(theta): fully open when face-on, pinched to a
// node when edge-on, and flipping sign so the lines cross -- exactly the look
// of twisting a physical lazo. theta is an integer number of half-turns so
// the width returns to full (+/-) at u = 1, keeping the anchors on the edges.
vec2 rawPos(float u, float v) {
  vec2 centre = centrePath(u);

  // full fanned width of the ribbon at this point (anchor spread, bow removed).
  // widthProfile is 1.0 at the ends (so the anchors keep their full reach on
  // the bottom/right edges) and narrows toward u_ribbonWidth in the middle.
  float widthProfile = mix(1.0, u_ribbonWidth, sin(u * PI));
  vec2 spread = (basePath(u, v) - basePath(u, 0.5)) * widthProfile;

  // concentrate the twist in the middle: g(u) sweeps 0->1 but its rate is
  // ~zero at the ends and peaks at the centre, so the ribbon barely twists
  // near the extremes and does all its turning in the middle (like the poster)
  float g = u - u_twistCenter * sin(2.0 * PI * u) / (2.0 * PI);

  // small per-line shear (fading to zero at the ends so the anchors stay put)
  // so each line goes edge-on at a slightly different point. This turns the
  // hard single-point nodes into tight caustics, like the poster.
  float shear = (v - 0.5) * u_twistShear * sin(u * PI);
  // BASS band writhe: extra rotation concentrated at the centre so the knot
  // tightens/twists with the low end (zero at u = 0/1 and when u_bass = 0)
  float audioTwist = u_bass * u_twistReact * sin(u * PI);
  // slow audio-free breathing: the central knot gently writhes back and forth
  float breatheTwist =
    sin(u_time * u_twistBreatheSpeed) * u_twistBreatheAmp * sin(u * PI);
  float theta = u_twistTurns * PI * g + shear + audioTwist + breatheTwist;

  // twist factor scales the projected width of the ribbon. depth peaks sharply
  // at the centre, so only the central twist pinches/crosses fully; the outer
  // twists barely close (soft width undulation, no hard nodes).
  float depth = pow(sin(u * PI), u_twistConcentration);
  float twist = mix(1.0, cos(theta), depth);

  // concavity: bow the otherwise-flat cross-section into a shallow concave arc
  // a few times along the path (sin^2 -> N humps that return to flat between,
  // and vanish at the extremes). Displaced perpendicular to the fan axis.
  vec2 axis = normalize(basePath(u, 1.0) - basePath(u, 0.0));
  vec2 perp = vec2(-axis.y, axis.x);
  float parab = 1.0 - 4.0 * (v - 0.5) * (v - 0.5);      // 0 at fan edges, 1 at centre
  float conc = u_concavity * pow(sin(u * PI * u_concFreq), 2.0);

  return centre + spread * twist + perp * conc * parab;
}

vec2 samplePos(float u, float v) {
  return rawPos(u, v);
}

void main() {
  vU = aU;
  vV = aV;
  vEq = eqAt(aU); // spectrum level at this position, passed to the fragment
  float u = aU;
  float v = aV;

  float aspect = u_resolution.x / u_resolution.y;

  // sample the curve and two neighbours to get the tangent
  vec2 p = samplePos(u, v);
  float eps = 0.001;
  vec2 pa = samplePos(u - eps, v);
  vec2 pb = samplePos(u + eps, v);

  // compute the normal in an isotropic (aspect-corrected) space so the
  // thickness ends up uniform in pixels
  vec2 tangent = normalize((pb - pa) * vec2(aspect, 1.0));
  vec2 normal = vec2(-tangent.y, tangent.x);
  float thickness = u_thickness * (1.0 + u_frequency * u_thickReact);
  vec2 offset = normal * thickness * aSide;
  offset.x /= aspect; // back to NDC

  vec2 pos = p + offset;

  // --- depth / parallax ---
  // a slow rotation about the screen centre plus a gentle zoom breathing,
  // driven purely by u_time. Rotation reads as depth/tilt much more clearly
  // than a plain translation. At u_parallaxAmp = 0 this is a no-op.
  float t = u_time * u_parallaxSpeed;
  float ang = u_parallaxAmp * sin(t);
  float zoom = 1.0 + u_parallaxAmp * 0.6 * sin(t * 0.5);
  // rotate in aspect-corrected space so the tilt doesn't skew, then back
  vec2 pc = pos * vec2(aspect, 1.0);
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  pc = rot * pc * zoom;
  pos = pc / vec2(aspect, 1.0);
  // subtle sway on top so it also drifts a touch
  pos += u_parallaxAmp * 0.4 * vec2(sin(t * 0.8), cos(t * 0.6));

  gl_Position = vec4(pos, 0.0, 1.0);
}
