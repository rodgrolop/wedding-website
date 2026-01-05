import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

export function useAudioAnalyser(
  audioUrl: string,
  camera: THREE.Camera,
  fftSize = 32
) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyser, setAnalyser] = useState<THREE.AudioAnalyser | null>(null);

  const listenerRef = useRef<THREE.AudioListener | null>(null);
  const soundRef = useRef<THREE.Audio | null>(null);

  useEffect(() => {
    const listener = new THREE.AudioListener();
    listenerRef.current = listener;
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    soundRef.current = sound;

    const loader = new THREE.AudioLoader();
    loader.load(
      audioUrl,
      (buffer) => {
        sound.setBuffer(buffer);
        sound.setLoop(true);

        const audioAnalyser = new THREE.AudioAnalyser(sound, fftSize);
        setAnalyser(audioAnalyser);
        setReady(true);
      },
      (xhr) => {
        if (xhr.total) setProgress(Math.floor((xhr.loaded / xhr.total) * 100));
      },
      (err) => console.error("Audio load error:", err)
    );

    return () => {
      if (sound.isPlaying) sound.stop();
      camera.remove(listener);
    };
  }, [audioUrl, camera, fftSize]);

  const start = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || sound.isPlaying) return;

    // Resume AudioContext safely
    const context = sound.context;
    if (context.state === "suspended") {
      context.resume().then(() => sound.play());
    } else {
      sound.play();
    }

    setPlaying(true);
  }, []);

  const getSound = useCallback(() => soundRef.current, []);

  return {
    ready,
    playing,
    start,
    analyser,
    progress,
    getSound,
  };
}
