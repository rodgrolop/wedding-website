import type { CSSProperties } from "react";
import PhotoUpload from "./PhotoUpload";

// Standalone upload experience served at /subir. It skips the preloader and
// hero entirely so guests land directly on the drag-drop / camera box.
const UploadPage = () => {
  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <span style={styles.brandWhite}>BODAMJ</span>
        <span style={styles.brandTrans}>RODRIGO</span>
      </header>
      <p style={styles.subtitle}>Comparte tus fotos con nosotros</p>
      <PhotoUpload />
    </main>
  );
};

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: "black",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box",
    paddingTop: "48px",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    fontSize: "1.6rem",
    lineHeight: 1,
  },
  brandWhite: {
    color: "white",
  },
  brandTrans: {
    color: "transparent",
    WebkitTextStroke: "1px white",
  },
  subtitle: {
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    fontSize: "0.85rem",
    opacity: 0.7,
    marginTop: "12px",
    marginBottom: "0",
  },
};

export default UploadPage;
