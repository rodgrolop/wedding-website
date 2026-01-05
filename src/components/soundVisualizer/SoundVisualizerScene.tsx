import { Canvas } from "@react-three/fiber";
import VisualizerMesh from "./VisualizerMesh";
import { style } from "./styles";
import * as THREE from "three";
import { useAudioAnalyser } from "../../hooks/useAudioAnalyser";
import { useEffect, useState } from "react";

const SoundVisualizerScene = () => {
  const [analyserReady, setAnalyserReady] = useState(false);
  const [started, setStarted] = useState(false);
  const audioUrl = "/track.mp3";

  const [camera] = useState(
    () =>
      new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      )
  );

  const { progress, ready, start, analyser } = useAudioAnalyser(
    audioUrl,
    camera
  );

  const handleStart = () => {
    start();
    setStarted(true);
  };

  useEffect(() => {
    if (!started || !analyser) return;

    let rafId: number;

    const checkAnalyser = () => {
      const value = analyser.getAverageFrequency();
      if (value > 1) {
        setAnalyserReady(true);
      } else {
        rafId = requestAnimationFrame(checkAnalyser);
      }
    };

    checkAnalyser();

    return () => cancelAnimationFrame(rafId);
  }, [started, analyser]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#111",
        color: "#fff",
      }}
    >
      {!ready && (
        <div style={{ fontSize: 24, textAlign: "center", marginTop: "40vh" }}>
          Loading Audio... {progress}%
        </div>
      )}
      {ready && started && !analyserReady && (
        <div style={{ color: "#fff", textAlign: "center", marginTop: "40vh" }}>
          Initializing audio…
        </div>
      )}
      {ready && !started && (
        <div
          onClick={handleStart}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            cursor: "pointer",
            background: "rgba(0,0,0,0.7)",
            userSelect: "none",
          }}
        >
          Click to Start
        </div>
      )}
      {ready && started && analyserReady && (
        <Canvas
          camera={{ position: [6, 8, 14], fov: 45 }}
          style={style.visualizerGrid}
        >
          <ambientLight intensity={0.3} />
          <VisualizerMesh analyser={analyser} />
        </Canvas>
      )}
    </div>
  );
};

export default SoundVisualizerScene;
