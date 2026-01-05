import { useRef, useState } from "react";
import { useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

import vertexShader from "../../shaders/vertex.glsl?raw";
import fragmentShader from "../../shaders/fragment.glsl?raw";

/* Shader Material */
const AudioShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_frequency: 0, // slow body
    u_pulse: 0, // fast rhythm
    u_red: 1,
    u_green: 1,
    u_blue: 1,
  },
  vertexShader,
  fragmentShader
);

extend({ AudioShaderMaterial });

type Props = {
  analyser: THREE.AudioAnalyser | null;
};

const VisualizerMesh = ({ analyser }: Props) => {
  const smoothBodyRef = useRef(0);
  const smoothPulseRef = useRef(0);

  const [time, setTime] = useState(0);
  const [frequency, setFrequency] = useState(0);
  const [pulse, setPulse] = useState(0);

  useFrame(({ clock }) => {
    if (!analyser) return;

    const raw = analyser.getAverageFrequency() / 255;

    // Slow body motion
    smoothBodyRef.current = THREE.MathUtils.lerp(
      smoothBodyRef.current,
      raw,
      0.08
    );

    // Fast rhythmic response
    smoothPulseRef.current = THREE.MathUtils.lerp(
      smoothPulseRef.current,
      raw,
      0.35
    );

    setTime(clock.getElapsedTime());
    setFrequency(smoothBodyRef.current);
    setPulse(smoothPulseRef.current);
  });

  return (
    <mesh>
      <icosahedronGeometry args={[4, 12]} />
      {/* @ts-expect-error custom material */}
      <audioShaderMaterial
        u_time={time}
        u_frequency={frequency}
        u_pulse={pulse}
        u_red={1}
        u_green={1}
        u_blue={1}
        wireframe
      />
    </mesh>
  );
};

export default VisualizerMesh;
