import type { CSSProperties } from "react";
import { VENUES, directionsUrl } from "../../data/venues";

// Footer: 4 blocks. The first shows the wedding brand/location/date; the other
// 3 repeat the venue info from the "Paradas" section.
const Footer = () => {
  return (
    <footer style={styles.wrapper}>
      <div style={styles.grid}>
        <div style={styles.brandBlock}>
          <div style={styles.brandTitle}>
            <span style={styles.brandWhite}>BODAMJ</span>
            <span style={styles.brandOutline}>RODRIGO</span>
          </div>
          <div style={styles.brandLocation}>
            Salones María Luisa - Torredonjimeno
          </div>
          <div style={styles.brandDate}>1 de Agosto de 2026</div>
        </div>

        {VENUES.map((v) => (
          <div key={v.key} style={styles.block}>
            {v.time && (
              <div style={styles.time}>
                <strong>Hora: </strong>
                {v.time}
              </div>
            )}
            <div style={styles.name}>{v.name}</div>
            <div style={styles.address}>{v.address}</div>
            {v.description && <p style={styles.text}>{v.description}</p>}
            {v.phone && (
              <a
                style={styles.link}
                href={`tel:${v.phone.replace(/\s+/g, "")}`}
              >
                {v.phone}
              </a>
            )}
            {v.website && (
              <a
                style={styles.link}
                href={v.website}
                target="_blank"
                rel="noreferrer"
              >
                Web
              </a>
            )}
            <a
              style={styles.link}
              href={directionsUrl(v.address)}
              target="_blank"
              rel="noreferrer"
            >
              Cómo llegar
            </a>
          </div>
        ))}
      </div>
    </footer>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "black",
    color: "white",
    fontFamily: "Roboto Mono, monospace",
    padding: "60px 30px",
    // extra breathing room above and below the footer
    margin: "30px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
    alignItems: "stretch",
  },
  brandBlock: {
    // centred vertically within the block, left-aligned content
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: "10px",
  },
  brandTitle: {
    // small enough to fit "BODAMJRODRIGO" on a single line inside the block
    fontSize: "clamp(2.5rem, 2.2vw, 1.6rem)",
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  brandWhite: {
    // same look as App's whiteH1
    color: "white",
  },
  brandOutline: {
    // black fill + white outline, same stroke method as the other headers.
    color: "black",
    WebkitTextStroke: "1px white",
  },
  brandLocation: {
    color: "#7c7c7c",
    fontSize: "0.9rem",
    fontWeight: 300,
    lineHeight: 1.3,
  },
  brandDate: {
    color: "white",
    fontSize: "0.9rem",
    fontWeight: 300,
    lineHeight: 1.3,
  },
  block: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "0.9rem",
    lineHeight: 1.4,
  },
  time: {
    fontSize: "1rem",
  },
  name: {
    fontWeight: 700,
    fontSize: "1.05rem",
  },
  address: {
    color: "#7c7c7c",
  },
  text: {
    margin: 0,
    color: "#cfcfcf",
  },
  link: {
    color: "#4a90e2",
    textDecoration: "none",
    fontWeight: 700,
    width: "fit-content",
  },
};

export default Footer;
