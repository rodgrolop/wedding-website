import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import vertexShader from "../../shaders/vertex.glsl?raw";
import fragmentShader from "../../shaders/fragment.glsl?raw";

const AudioShaderMaterial = shaderMaterial(
  {
    u_time: 0,
    u_frequency: 0,
    u_red: 1,
    u_green: 1,
    u_blue: 1,
  },
  vertexShader,
  fragmentShader
);

// let R3F know about it
extend({ AudioShaderMaterial });

type VisualizerMeshProps = {
  audioUrl: string;
};

function VisualizerMesh({ audioUrl }: VisualizerMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<any>(null); // using any here to keep it simple

  const { camera } = useThree();
  const [analyser, setAnalyser] = useState<any>(null);

  useEffect(() => {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    const loader = new THREE.AudioLoader();

    loader.load(audioUrl, (buffer: any) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      window.onclick = () => sound.play();

      const audioAnalyser = new THREE.AudioAnalyser(sound, 32);
      setAnalyser(audioAnalyser);
    });
  }, [audioUrl, camera]);

  useFrame(({ clock }) => {
    if (analyser && materialRef.current) {
      materialRef.current.u_time = clock.getElapsedTime();
      materialRef.current.u_frequency = analyser.getAverageFrequency();
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[4, 4]} />
      {/* @ts-expect-error custom material */}
      <audioShaderMaterial ref={materialRef} wireframe />
    </mesh>
  );
}

const SoundVisualizer = () => {
  return (
    <Canvas camera={{ position: [6, 8, 14], fov: 45 }}>
      <ambientLight intensity={0.3} />
      <VisualizerMesh audioUrl="/track.mp3" />
    </Canvas>
  );
};
export default SoundVisualizer;
