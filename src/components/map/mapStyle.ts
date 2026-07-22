// Legacy (JSON) dark map style. Applied via the Map `styles` prop, which works
// only when no `mapId` is set. Keeps the map consistent with the black design.
import type { CSSProperties } from "react";

export const darkMapStyle: google.maps.MapTypeStyle[] = [
  // hide points of interest (icons + labels)
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  // base geometry (land/terrain) fully black so it blends with the page bg
  { elementType: "geometry", stylers: [{ color: "#000000" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#3a3a3a" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6f6f6f" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#232f23" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9a9a9a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3d3d3d" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f2f2f" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f0f0f" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4e4e4e" }],
  },
];

// shared unavailable-state style (missing API key)
export const fallbackStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#8a8a8a",
  fontFamily: "Roboto Mono, monospace",
  fontSize: "0.9rem",
  textAlign: "center",
  padding: "2rem",
};
