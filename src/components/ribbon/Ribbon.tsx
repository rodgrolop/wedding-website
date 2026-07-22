import { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { shaderMaterial } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Glitch,
  ChromaticAberration,
  ToneMapping,
  TiltShift2,
} from "@react-three/postprocessing";
import { GlitchMode, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import ribbonVertex from "../../shaders/ribbonVertex.glsl?raw";
import ribbonFragment from "../../shaders/ribbonFragment.glsl?raw";
import { type AudioEngineApi } from "../../audio/useAudioEngine";

// Ribbon shape resolution.
// LENGTH_SEGMENTS -> detail along each flowing line.
// WIDTH_LINES     -> number of parallel lines stacked across the ribbon.
// Mobile uses a lighter mesh: fewer parallel lines + segments dramatically cut
// the additive/transparent overdraw (the fill-rate bottleneck on phone GPUs)
// without touching the postprocessing look.
const RES = {
  desktop: { lengthSegments: 240, widthLines: 40 },
  mobile: { lengthSegments: 150, widthLines: 24 },
} as const;

// Spatial EQ: number of spectrum bands mapped along the ribbon (must match the
// N_EQ #define in ribbonVertex.glsl).
const N_EQ = 16;

const RibbonMaterial = shaderMaterial(
  {
    u_time: 0,
    u_frequency: 0, // overall 0..1 audio level
    u_bass: 0, // low band 0..1  -> central twist
    u_mid: 0, // mid band 0..1  -> waves (olas)
    u_treble: 0, // high band 0..1 -> brightness/pulse
    u_amplitude: 1.0, // kept for later animation
    u_bow: 0.75, // pushes the centreline toward the screen centre
    u_twistTurns: 1.0, // half-twists of the ribbon along the path (1 = single central twist)
    u_twistShear: 1.5, // per-line shear: spreads the nodes into tight caustics
    u_twistCenter: 1, // 0..1: concentrates the twisting toward the centre
    u_twistConcentration: 4.0, // higher = only the central twist pinches fully
    u_ribbonWidth: 0.85, // mid-path band width (ends stay full on the edges)
    u_concavity: 0.18, // concave bow of the cross-section
    u_concFreq: 3.0, // times the plane goes concave along the path (3-4)
    u_waveAmp: 0.06, // "olas": gentle shared undulation at rest (calm baseline)
    u_waveFreq: 12.0, // number of soft waves along the ribbon
    u_waveSpeed: 0.6, // how fast the waves scroll along the ribbon (u_time)
    u_audioReact: 3.0, // how much the audio level swells the wave amplitude
    u_waveFreqReact: 0, // extra waves that appear on audio peaks (0 = off)
    u_twistReact: 0.15, // how much the audio tightens/writhes the central twist
    u_twistBreatheAmp: 0.35, // slow, audio-free writhe of the central knot (0 = off)
    u_twistBreatheSpeed: 0.5, // speed of that breathing
    u_thickReact: 0, // how much the audio swells the line thickness (disabled)
    u_thickness: 0.0021, // line half-width in NDC-y units
    u_parallaxAmp: 0.05, // depth/parallax: rotation + zoom tilt (0 = off)
    u_parallaxSpeed: 0.5, // how slow the parallax drifts
    u_overscan: 0.35, // pushes the line ends beyond the viewport edges
    u_resolution: new THREE.Vector2(1, 1),
    u_opacity: 0.7,
    u_pulseReact: 0.35, // how much the audio brightens/pulses the lines (0 = off)
    u_eq: new Array(N_EQ).fill(0), // spatial EQ levels (lows->highs along u)
    u_eqReact: 1.0, // how much the spatial EQ bumps the local wave amplitude (0 = off)
    u_eqBright: 0.35, // how much the spatial EQ brightens the lines per position (0 = off)
    u_fadeBias: 0.4, // length gradient: dim at the bottom end, intense at the right end
    u_color: new THREE.Color("#ffffff"),
  },
  ribbonVertex,
  ribbonFragment,
);

// let R3F know about the custom material -> <ribbonMaterial />
extend({ RibbonMaterial });

function useRibbonGeometry(lengthSegments: number, widthLines: number) {
  return useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const cols = lengthSegments + 1;
    const rows = widthLines;
    // two vertices per sample point (one per side) so each line is a thin
    // triangle strip that can be given real thickness in the shader
    const count = cols * rows * 2;

    const positions = new Float32Array(count * 3); // unused by shader, required
    const aU = new Float32Array(count);
    const aV = new Float32Array(count);
    const aSide = new Float32Array(count);

    let p = 0;
    for (let r = 0; r < rows; r++) {
      const v = r / (rows - 1);
      for (let c = 0; c < cols; c++) {
        const u = c / (cols - 1);
        for (let side = 0; side < 2; side++) {
          aU[p] = u;
          aV[p] = v;
          aSide[p] = side === 0 ? -1 : 1;
          p++;
        }
      }
    }

    // two triangles per quad segment along each line
    const indices: number[] = [];
    for (let r = 0; r < rows; r++) {
      const base = r * cols * 2;
      for (let c = 0; c < cols - 1; c++) {
        const a = base + c * 2; // current point, side -1
        const b = a + 1; // current point, side +1
        const cN = a + 2; // next point, side -1
        const d = a + 3; // next point, side +1
        indices.push(a, cN, d);
        indices.push(a, d, b);
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
    geometry.setAttribute("aV", new THREE.BufferAttribute(aV, 1));
    geometry.setAttribute("aSide", new THREE.BufferAttribute(aSide, 1));
    geometry.setIndex(indices);

    return geometry;
  }, [lengthSegments, widthLines]);
}

function RibbonLines({
  audio,
  lengthSegments,
  widthLines,
  materialSide,
}: {
  audio: AudioEngineApi;
  lengthSegments: number;
  widthLines: number;
  materialSide: THREE.Side;
}) {
  const materialRef = useRef<any>(null);
  const geometry = useRibbonGeometry(lengthSegments, widthLines);
  const size = useThree((s) => s.size);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.u_resolution.set(size.width, size.height);
    }
  }, [size]);

  useFrame(({ clock }) => {
    const m = materialRef.current;
    if (!m) return;
    // start a fresh audio sample once per frame (shared by all consumers)
    audio.newFrame();
    m.u_time = clock.getElapsedTime();
    m.u_frequency = audio.getLevel();
    const { bass, mid, treble } = audio.getBands();
    m.u_bass = bass;
    m.u_mid = mid;
    m.u_treble = treble;
    // spatial EQ: feed the per-band spectrum (lows->highs) into the shader array
    m.u_eq = audio.getSpectrum(N_EQ);
  });

  return (
    <mesh geometry={geometry}>
      {/* @ts-expect-error custom shader material */}
      <ribbonMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={materialSide}
      />
    </mesh>
  );
}

// Beat-triggered glitch: watches the BASS band for sharp onsets (kick drums)
// and fires a short glitch burst, with a cooldown so it doesn't machine-gun.
const BEAT_THRESHOLD = 0.1; // minimum bass level to count as a hit
const BEAT_RISE = 0.01; // minimum jump vs. previous frame (onset, not sustain)
const BEAT_COOLDOWN = 1; // seconds to wait before another glitch can fire
const BURST_DURATION = 0.1; // seconds each glitch burst lasts

// Chromatic aberration (RGB channel split) look, à la analog VHS glitch:
const CA_BASE = 0.0002; // always-on subtle RGB split
const CA_BASS_GAIN = 0.00075; // extra split driven continuously by the bass level
const CA_SPIKE = 0.002; // extra split kicked in on a beat, then decays
const CA_SPIKE_DECAY = 3.5; // how fast (per second) the beat spike fades

function GlitchDriver({
  audio,
  glitchRef,
  caRef,
}: {
  audio: AudioEngineApi;
  glitchRef: React.MutableRefObject<any>;
  caRef: React.MutableRefObject<any>;
}) {
  const prevBass = useRef(0);
  const cooldown = useRef(0);
  const burst = useRef(0);
  const spike = useRef(0);

  useFrame((_, delta) => {
    const { bass } = audio.getBands();
    const rising = bass - prevBass.current;
    prevBass.current = bass;

    // --- beat detection ---
    cooldown.current -= delta;
    const beat =
      cooldown.current <= 0 && bass > BEAT_THRESHOLD && rising > BEAT_RISE;
    if (beat) {
      cooldown.current = BEAT_COOLDOWN;
      burst.current = BURST_DURATION;
      spike.current = 1; // kick the chromatic aberration
    }

    // --- blocky glitch: short subtle burst on the beat ---
    const g = glitchRef.current;
    if (g) {
      if (beat) g.mode = GlitchMode.CONSTANT_MILD;
      if (burst.current > 0) {
        burst.current -= delta;
        if (burst.current <= 0) g.mode = GlitchMode.DISABLED;
      }
    }

    // --- chromatic aberration: continuous from bass + decaying beat spike ---
    spike.current = Math.max(spike.current - delta * CA_SPIKE_DECAY, 0);
    const ca = caRef.current;
    if (ca && ca.offset) {
      const amt =
        CA_BASE +
        bass * CA_BASS_GAIN +
        spike.current * spike.current * CA_SPIKE;
      // mostly horizontal split (like the reference), a touch of vertical
      ca.offset.set(amt, amt * 0.35);
    }
  });

  return null;
}

// Fires `onReady` exactly once, after the first frame has been rendered (i.e.
// the shaders are compiled and the scene is actually drawing). Used by the
// preloader to know the heavy WebGL work is done.
function FirstFrameSignal({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

const Ribbon = ({
  audio,
  onReady,
  active = true,
}: {
  audio: AudioEngineApi;
  onReady?: () => void;
  /** When false, the render loop is paused (e.g. hero scrolled off-screen). */
  active?: boolean;
}) => {
  const glitchRef = useRef<any>(null);
  const caRef = useRef<any>(null);
  const isMobile = useBreakpoint() === "mobile";
  const res = isMobile ? RES.mobile : RES.desktop;
  const materialSide = isMobile ? THREE.FrontSide : THREE.DoubleSide;

  // ChromaticAberration uses react-postprocessing's generic wrapper, which is
  // NOT forwardRef: in React 19 the `ref` prop leaks into the effect's props
  // and gets JSON.stringify'd in a useMemo dependency. A ref OBJECT would then
  // serialize the mounted effect (an R3F instance with circular __r3f parent/
  // children) and crash. A callback ref is a function, which JSON.stringify
  // simply skips -> no circular traversal. useCallback keeps it stable so the
  // effect isn't detached/reattached on every render.
  const setCaRef = useCallback((instance: any) => {
    caRef.current = instance;
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 16], fov: 45 }}
      // Cap the pixel ratio: phones report 2-3, which quadruples fragment work
      // for a fill-rate-bound shader. 1.5 keeps it crisp at a fraction of cost.
      dpr={[1, 1.5]}
      // Pause rendering entirely when the hero is off-screen so scrolling the
      // rest of the page isn't fighting a 60fps GPU load.
      frameloop={active ? "always" : "never"}
    >
      <color attach="background" args={["#000000"]} />
      <FirstFrameSignal onReady={onReady} />
      <RibbonLines
        audio={audio}
        lengthSegments={res.lengthSegments}
        widthLines={res.widthLines}
        materialSide={materialSide}
      />
      <GlitchDriver audio={audio} glitchRef={glitchRef} caRef={caRef} />
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.4}
          radius={0.5}
          mipmapBlur
        />
        <TiltShift2 blur={0.025} taper={0.5} focusArea={0.35} feather={0.3} />
        <Glitch
          ref={glitchRef}
          mode={GlitchMode.DISABLED} // idle; the driver enables bursts on beats
          delay={new THREE.Vector2(10, 10)} // large so it never self-triggers
          duration={new THREE.Vector2(0.08, 0.14)}
          strength={new THREE.Vector2(0.02, 0.06)}
          ratio={0.4}
          columns={0.005} // scale of the blocky columns (smaller = finer blocks)
          dtSize={128} // noise map resolution (higher = finer glitch detail)
        />
        <ChromaticAberration
          ref={setCaRef}
          offset={new THREE.Vector2(CA_BASE, CA_BASE * 0.35)}
          radialModulation={false}
          modulationOffset={0}
        />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    </Canvas>
  );
};

export default Ribbon;
