import "@fontsource/roboto-mono/400.css";
import "@fontsource/roboto-mono/500.css";
import "@fontsource/roboto-mono/700.css";

import { useEffect, useRef, useState } from "react";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Typography from "@mui/joy/Typography";
import { style } from "./styles";
import { theme } from "./theme";
import { useAudioEngine } from "./audio/useAudioEngine";
import { readMode, readMuted } from "./audio/preferences";
import { useBreakpoint } from "./hooks/useBreakpoint";
import Countdown from "./components/countdown/Countdown";
import LineUp from "./components/names/LineUp";
import MapSection from "./components/map/MapSection";
import TransportInfoSection from "./components/transport/TransportInfoSection";
import GallerySection from "./components/gallery/GallerySection";
import PhotoUpload from "./components/gallery/PhotoUpload";
import Footer from "./components/footer/Footer";
import Ribbon from "./components/ribbon/Ribbon";
import Preloader from "./components/preloader/Preloader";
import Controls from "./components/controls/Controls";
import HamburgerMenu from "./components/nav/HamburgerMenu";
import LazyMount from "./components/common/LazyMount";

// Playlist served from /public. Add more here (e.g. "/track2.mp3",
// "/track3.mp3") and the "next track" control appears automatically.
const TRACKS = ["/track.mp3"];

// Session-scoped flag: once the user has entered, remounting <App/> (e.g. after
// navigating to /galeria and back) skips the preloader. It lives at module
// level so it survives route changes but resets on a full page reload, where
// the WebGL scene starts cold and the preloader is still worth showing.
let hasEnteredSession = false;

const App = () => {
  // one shared audio engine, driven by the ribbon and started on entry
  const audio = useAudioEngine({ mode: "files", files: TRACKS });

  const isMobile = useBreakpoint() === "mobile";

  const [ribbonReady, setRibbonReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [introDone, setIntroDone] = useState(hasEnteredSession);

  // Pause the WebGL render loop when the hero scrolls out of view so the rest
  // of the page scrolls without fighting a 60fps GPU load.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Warm the track so it can start instantly on entry, and use canplaythrough
  // as the "audio ready" signal. A timeout fallback prevents a stuck gate if
  // the browser throttles preloading.
  useEffect(() => {
    const el = new Audio();
    el.preload = "auto";
    el.src = TRACKS[0];
    const ready = () => setAudioReady(true);
    el.addEventListener("canplaythrough", ready, { once: true });
    if (el.readyState >= 4) ready();
    const fallback = window.setTimeout(ready, 8000);
    return () => {
      window.clearTimeout(fallback);
      el.removeEventListener("canplaythrough", ready);
      el.src = "";
    };
  }, []);

  // The ONLY place audio ever starts: the entry click. We apply the persisted
  // selection here so it's coordinated with resume() (nothing plays on load,
  // even if the last choice was the song).
  const handleEnter = () => {
    hasEnteredSession = true;
    audio.setMuted(readMuted());
    const mode = readMode();
    void (async () => {
      if (mode !== "files") await audio.setMode(mode);
      await audio.resume();
    })();
  };

  // When we skip the preloader on a return visit (App remounted after a route
  // change), still restore audio: the document already has sticky activation
  // from the earlier entry click, so resume() is allowed without a new gesture.
  useEffect(() => {
    if (hasEnteredSession) handleEnter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CssVarsProvider theme={theme}>
      <CssBaseline />
      <div id="inicio" ref={heroRef} style={style.mainContainer}>
        <div style={style.overlay}>
          <div id="hero-title" style={style.overlayRow}>
            <Typography level="h1" sx={style.whiteH1}>
              MJ
            </Typography>
            <Typography
              level="h1"
              sx={{
                ...style.transH1,
                WebkitTextStroke: isMobile ? "1px white" : "2px white",
              }}
            >
              RODRIGO
            </Typography>
          </div>
          <Typography level="body-md" sx={style.whiteDate}>
            37.7698059,-3.9712233
          </Typography>
          <Typography level="body-md" sx={style.whiteLocation}>
            Salones María Luisa - Torredonjimeno
          </Typography>
          <Typography level="body-md" sx={style.whiteDate}>
            1 - 1000 - 11010
          </Typography>
          <Controls audio={audio} />
        </div>
        <div style={style.canvasLayer}>
          <Ribbon
            audio={audio}
            onReady={() => setRibbonReady(true)}
            active={heroVisible}
          />
        </div>
        <div style={style.countdownOverlay}>
          <Countdown />
        </div>
      </div>
      <div id="lineup">
        <LineUp />
      </div>
      <div id="transporte">
        <LazyMount minHeight="80vh">
          <MapSection />
        </LazyMount>
      </div>
      <div id="paradas">
        <TransportInfoSection />
      </div>
      <div id="galeria">
        <LazyMount minHeight="80vh">
          <GallerySection />
        </LazyMount>
        <PhotoUpload />
      </div>
      <div id="info">
        <Footer />
      </div>
      {/* Rendered unconditionally: the preloader (z-index 9999) covers it while
          loading and reveals it during its own fade, so it no longer waits the
          full ~1s fade before appearing. */}
      <HamburgerMenu />
      {!introDone && (
        <Preloader
          ready={ribbonReady && audioReady}
          onEnter={handleEnter}
          onExited={() => setIntroDone(true)}
        />
      )}
    </CssVarsProvider>
  );
};

export default App;
