import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { darkMapStyle } from "./mapStyle";
import { VENUES, directionsUrl } from "../../data/venues";
import type { Venue } from "../../data/venues";
import { useBreakpoint } from "../../hooks/useBreakpoint";

// Hardcoded on purpose: the key is restricted by HTTP referrer to the site's
// published URL, so exposing it in the client bundle is acceptable here.
const API_KEY = "AIzaSyAH9qHznnHqtZFsuABaSd12uj8NTMxPWb8";

// fallback camera; the map auto-fits to the markers on load (see VenueMarkers).
const DEFAULT_CENTER = { lat: 37.767, lng: -3.87 };
const DEFAULT_ZOOM = 11;

type LatLng = google.maps.LatLngLiteral;

// Geocodes the venues (with a localStorage cache), renders their markers and an
// InfoWindow pop-up, and fits the map to all of them.
const VenueMarkers = ({ venues }: { venues: Venue[] }) => {
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");
  const routesLib = useMapsLibrary("routes");
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [positions, setPositions] = useState<Record<string, LatLng>>({});
  const [selected, setSelected] = useState<string | null>(null);

  // geocode each address once (cached across visits)
  useEffect(() => {
    if (!geocodingLib) return;
    const geocoder = new geocodingLib.Geocoder();
    let cancelled = false;

    (async () => {
      const resolved: Record<string, LatLng> = {};
      for (const v of venues) {
        const cacheKey = `geo:${v.address}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          resolved[v.key] = JSON.parse(cached) as LatLng;
          continue;
        }
        try {
          const { results } = await geocoder.geocode({ address: v.address });
          const loc = results[0]?.geometry.location;
          if (loc) {
            const pos = { lat: loc.lat(), lng: loc.lng() };
            resolved[v.key] = pos;
            localStorage.setItem(cacheKey, JSON.stringify(pos));
          }
        } catch (err) {
          console.warn("Geocoding failed for", v.address, err);
        }
      }
      if (!cancelled) setPositions(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [geocodingLib, venues]);

  // fit the viewport to all resolved markers
  useEffect(() => {
    const points = Object.values(positions);
    if (!map || points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 64);
  }, [map, positions]);

  // draw the driving route through the venues (computed once per load; not
  // persisted, per Google Maps ToS). preserveViewport keeps our fitBounds.
  useEffect(() => {
    if (!map || !routesLib) return;
    const ordered = venues
      .map((v) => positions[v.key])
      .filter((p): p is LatLng => Boolean(p));
    if (ordered.length < 2) return;

    const service = new routesLib.DirectionsService();
    if (!rendererRef.current) {
      rendererRef.current = new routesLib.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: {
          strokeColor: "#ffffff",
          strokeOpacity: 0.9,
          strokeWeight: 4,
        },
      });
    }

    const origin = ordered[0];
    const destination = ordered[ordered.length - 1];
    const waypoints = ordered
      .slice(1, -1)
      .map((location) => ({ location, stopover: true }));

    service
      .route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then((res) => rendererRef.current?.setDirections(res))
      .catch((err) => console.warn("Directions failed", err));

    const renderer = rendererRef.current;
    return () => {
      renderer?.setMap(null);
      rendererRef.current = null;
    };
  }, [map, routesLib, positions, venues]);

  const selectedVenue = venues.find((v) => v.key === selected);

  return (
    <>
      {venues.map((v) =>
        positions[v.key] ? (
          <Marker
            key={v.key}
            position={positions[v.key]}
            title={v.name}
            onClick={() => setSelected(v.key)}
          />
        ) : null,
      )}
      {selectedVenue && positions[selectedVenue.key] && (
        <InfoWindow
          position={positions[selectedVenue.key]}
          onCloseClick={() => setSelected(null)}
        >
          <div style={styles.infoWindow}>
            {selectedVenue.time && (
              <div>
                <strong>Hora: </strong>
                {selectedVenue.time}
              </div>
            )}
            <strong>{selectedVenue.name}</strong>
            <div style={styles.infoAddress}>{selectedVenue.address}</div>
            {selectedVenue.description && (
              <p style={styles.infoText}>{selectedVenue.description}</p>
            )}
            {selectedVenue.phone && (
              <a
                style={styles.infoLink}
                href={`tel:${selectedVenue.phone.replace(/\s+/g, "")}`}
              >
                {selectedVenue.phone}
              </a>
            )}
            {selectedVenue.website && (
              <a
                style={styles.infoLink}
                href={selectedVenue.website}
                target="_blank"
                rel="noreferrer"
              >
                Web
              </a>
            )}
            <a
              style={styles.infoLink}
              href={directionsUrl(selectedVenue.address)}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

// the vertical word shown on the left. change freely -> everything (section
// height, map left offset) is measured from it at runtime.
const SIDE_WORD = "TRANSPORTE";
// the section height matches the word's own height exactly (no vertical margin)
const SIDE_WORD_LEFT = 24; // word distance from the screen's left edge
const MAP_GAP = 24; // gap between the word and the map

// Map section with the vertical "TRANSPORTE" word pinned to the screen's left.
const MapSection = () => {
  const isMobile = useBreakpoint() === "mobile";
  const sideRef = useRef<HTMLSpanElement>(null);
  // measure the vertical word so (a) the section is never shorter than it and
  // (b) the map can start just to its right. it scales with vw -> re-measure.
  const [wordSize, setWordSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = sideRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setWordSize({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minHeight = wordSize.height;
  const mapLeft = SIDE_WORD_LEFT + wordSize.width + MAP_GAP;

  return (
    // full-width wrapper -> pins the side word to the screen edge and clips it
    // to this section's height so it can't bleed into neighbouring sections
    <section
      style={isMobile ? styles.wrapper : { ...styles.wrapper, minHeight }}
    >
      {/* On mobile the label becomes a horizontal, LEFT-aligned header above the
          map instead of the rotated side word. */}
      {isMobile && <span style={styles.header}>{SIDE_WORD}</span>}
      {/* map: full section height, from just right of the word to the screen's
          right edge (desktop); full width below the header (mobile). */}
      <div
        style={
          isMobile ? styles.mapAreaMobile : { ...styles.mapArea, left: mapLeft }
        }
      >
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={DEFAULT_ZOOM}
            gestureHandling="cooperative"
            disableDefaultUI={false}
            styles={darkMapStyle}
            style={styles.map}
          >
            <VenueMarkers venues={VENUES} />
          </Map>
        </APIProvider>
      </div>
      {!isMobile && (
        <span ref={sideRef} style={styles.sideText}>
          {SIDE_WORD}
        </span>
      )}
    </section>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: "relative",
    width: "100%",
    // clip the vertical side word to this section (no bleed into neighbours)
    overflow: "hidden",
    backgroundColor: "black",
  },
  mapArea: {
    // fill the section height and bleed to the screen's right edge; `left` is
    // set inline to clear the vertical word.
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: "black",
  },
  // Mobile: map is a normal block below the header, full width with a fixed
  // height (the desktop layout's height depends on the rotated word).
  mapAreaMobile: {
    position: "relative",
    width: "100%",
    height: "60vh",
    marginTop: "1rem",
    overflow: "hidden",
    backgroundColor: "black",
  },
  // Mobile header: horizontal, LEFT-aligned, non-rotated (mirror of LineUp's).
  header: {
    display: "block",
    boxSizing: "border-box",
    width: "80%",
    maxWidth: "1280px",
    margin: "0 auto 0 12px",
    padding: 0,
    textAlign: "left",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    fontSize: "clamp(2.5rem, 13vw, 6rem)",
    color: "black",
    WebkitTextStroke: "1px white",
    whiteSpace: "nowrap",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  infoWindow: {
    color: "#000",
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.85rem",
    lineHeight: 1.4,
    maxWidth: "240px",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  infoAddress: {
    color: "#444",
  },
  infoText: {
    margin: 0,
    color: "#222",
  },
  infoLink: {
    color: "#1a73e8",
    textDecoration: "none",
    fontWeight: 700,
  },
  sideText: {
    // same styling as LineUp's side word, but pinned to the screen's LEFT edge.
    // wrapper is full-width so 24px is measured straight from the screen edge.
    position: "absolute",
    left: "24px",
    // vertically centred within the section
    top: "50%",
    writingMode: "vertical-rl",
    transform: "translateY(-50%) rotate(180deg)",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    // same size as the countdown numbers
    fontSize: "clamp(2rem, 12vw, 8rem)",
    // black fill + 2px white outline (matching the other non-mobile headers)
    color: "black",
    WebkitTextStroke: "2px white",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
};

export default MapSection;
