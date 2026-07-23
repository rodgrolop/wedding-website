import { useMemo } from "react";
import type { CSSProperties } from "react";
import { useBreakpoint } from "../../hooks/useBreakpoint";

// Fisher-Yates shuffle -> returns a new array in random order.
function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Guest names. Rows that originally had two people joined by "y" have been
// split into separate entries. Order preserved from the source list.
const NAMES: string[] = [
  "Juanjo",
  "Pablito",
  "Blanquita",
  "Laurita",
  "Bea",
  "Albert",
  "Fernandito",
  "Julita",
  "Christian",
  "Ana L.",
  "Martita",
  "Tita María",
  "Belén",
  "Óliver Peque",
  "Lola",
  "Álvaro G.",
  "Guille",
  "Martyna",
  "Juanito G.",
  "Pedro Padrino",
  "Marina",
  "Liencho",
  "María",
  "Juan Carlos",
  "Abuela",
  "Tito Manolo",
  "Marinilla",
  "Tito Jesús",
  "Mari C.",
  "Elvira Sis",
  "Rosa",
  "Pilar",
  "Chelo",
  "Juan José",
  "Tito Manolín",
  "Abuelo",
  "Tita Paki",
  "Andrea",
  "Tita Dori",
  "Fran",
  "Rocío Peque",
  "Edu",
  "Sofía",
  "Jorge",
  "Noelia",
  "Tita Jose",
  "Ali José",
  "Poyo",
  "Laurita Toxiria",
  "Lilo",
  "Gomi",
  "Chiqui",
  "TQ x si me muero",
  "Kenny",
  "Lucía M.",
  "Lolo Liébana",
  "Mili",
  "Jesús Redondo",
  "Rober",
  "Raquel Gusa",
  "Barby",
  "Blanqui",
  "Negra",
  "Susana",
  "Jesús",
  "Cristi",
  "Rafa",
  "Xoni",
  "Benja",
  "Mamen",
  "David",
  "Vane",
  "Lisa",
  "Román Guso",
  "Joselito",
  "Car",
  "Ivor",
  "Carmelo",
  "Elisa",
  "Pollete",
  "Carol Prima",
  "Dani Apu",
  "Raqueee",
  "Martis",
  "Alba",
  "Chapu",
  "Salomé",
  "Javi Garrido",
  "Rocío",
  "Quique",
  "The gardener",
  "Camila",
  "Andreçao",
  "Labio",
  "Masto",
  "Quisco",
  "Pedro Vera",
  "Utrilla",
  "Almu",
  "Vito",
  "Lucy Demonio",
  "Inma Tena",
  "Lea",
  "Álvaro Cabesa",
  "Lidia",
  "Sergio",
  "Stéphanie",
  "Javi Cantabrio",
  "Cristina Telepi",
  "Ayose",
  "Magda",
  "Loida",
  "Juan Moro",
  "Deivid",
  "Álex",
  "Pitufo",
  "Raulito",
  "Josemi",
  "Tete",
  "Gema",
  "Manue",
  "Dami Hijo",
  "Rubén",
  "Chelsey",
  "Pier",
  "Martínez",
  "Dani Papy",
  "Gilete",
  "Julito",
  "Monti",
  "Rocío A.",
  "Judit",
  "Lolo Carpio",
  "Anna",
  "Mari Carmen",
  "Mario Peque",
  "Mari L.",
  "Isabel",
  "José Antonio",
  "Rafa Puche",
  "Trini",
  "Paloma",
  "Francis",
  "Caty",
  "Rosi Madre",
  "Manolo D.",
  "Loli O.",
  "José V.",
  "Juan Ángel T.",
  "Antonia A.",
  "Joselín",
  "Ángel",
  "Candi",
  "Pili",
  "Jose I.",
  "Agustín",
  "Loli M.",
  "Manolo P.",
  "Manoli P.",
  "Meli Toxiria",
  "Miguel G.",
  "Antonia H.",
  "Juani M.",
  "Jose L.",
  "Eva",
  "Tita Juani",
  "Paco C.",
  "Mari Paz",
  "Juan Antonio",
  "César",
  "Alicia",
  "Juanito F.",
  "Meli Higuera",
  "Pablo",
  "Mari G.",
  "Chari",
  "Cosme",
  "Inés",
  "Manolo O.",
  "Tito Julián",
  "Inma",
  "Cristina M.",
  "Ana E.",
  "Juan E.",
  "Tita Luisa",
  "José Amador",
  "Dolores",
  "Pedro",
  "Juani",
  "Felipe",
  "Paco L.",
  "Esperanci",
  "Paco T.",
  "Eloisa",
  "Chunga",
];

// Parents: shown in a fixed order (never shuffled) on their own row.
const PARENTS: string[] = ["MARILUZ", "GONZALO", "JOSÉ", "ELVIRA"];

const LineUp = () => {
  // shuffled once per mount -> a fresh random order on every page load
  const names = useMemo(() => shuffle(NAMES), []);
  const isMobile = useBreakpoint() === "mobile";

  return (
    // full-width wrapper -> pins the side word to the screen edge and clips it
    // to this section's height so it can't bleed into neighbouring sections
    <section style={styles.wrapper}>
      {/* On mobile the label becomes a horizontal, right-aligned header above
          the list instead of the rotated side word. */}
      {isMobile && <span style={styles.header}>LINE UP</span>}
      <div
        style={
          isMobile
            ? {
                ...styles.container,
                padding: "1rem 0 30px",
              }
            : styles.container
        }
      >
        {/* Highlighted headline row: the couple, bigger than the guest list and
            on its own centred line. MJ = white fill/outline, B2B = list grey,
            RODRIGO = black fill + white outline (matching the rest of the app). */}
        <div style={styles.headlineRow}>
          <span style={styles.hlMj}>MJ</span>
          <span style={styles.hlB2b}>B2B</span>
          <span style={styles.hlRodrigo}>RODRIGO</span>
        </div>
        {/* Parents row: fixed order (not shuffled), sized between the couple
            headline and the guest list, alternating white/grey like the list. */}
        <div style={styles.parentsRow}>
          {PARENTS.map((name, i) => (
            <span
              key={name}
              style={(i + 1) % 2 === 1 ? styles.parentOdd : styles.parentEven}
            >
              {name}
            </span>
          ))}
        </div>
        {names.map((name, i) => (
          <span
            key={`${name}-${i}`}
            style={(i + 1) % 2 === 1 ? styles.odd : styles.even}
          >
            {name}
          </span>
        ))}
      </div>
      {!isMobile && <span style={styles.sideText}>LINE UP</span>}
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
  // Mobile header: horizontal, centred, non-rotated.
  header: {
    display: "block",
    boxSizing: "border-box",
    width: "80%",
    maxWidth: "1280px",
    margin: "0 auto",
    padding: 0,
    textAlign: "center",
    fontFamily: "Roboto Mono, monospace",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    fontSize: "clamp(2.5rem, 13vw, 6rem)",
    color: "black",
    WebkitTextStroke: "1px white",
    whiteSpace: "nowrap",
  },
  sideText: {
    // pinned to the screen's right edge; wrapper is full-width so 24px is
    // measured straight from the screen edge. absolute -> names can overlap it.
    position: "absolute",
    right: "24px",
    // vertically centred within the section
    top: "50%",
    // vertical text box (real layout box -> no pre-rotation overflow). rotate
    // 180 flips it to read bottom-to-top, matching the earlier -90deg look;
    // translateY(-50%) centres it on the section's vertical axis.
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
  container: {
    boxSizing: "border-box",
    // names block: 80% of the viewport, capped at 1280px, centred
    width: "80%",
    maxWidth: "1280px",
    margin: "0 auto",
    color: "white",
    padding: "8vh 3vw",
    fontFamily: "Roboto Mono, monospace",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    textAlign: "center",
    gap: "0.5rem 1.5rem",
  },
  // Highlighted couple row: full-width so it takes its own centred line above
  // the guest list; noticeably bigger than the individual names.
  headlineRow: {
    flexBasis: "100%",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "baseline",
    gap: "0.4rem 0.75rem",
    marginBottom: "clamp(1rem, 3vh, 2.5rem)",
    fontWeight: 700,
    textTransform: "uppercase",
    lineHeight: 1,
    // slightly bigger than before, but always kept below the "LINE UP" header
    // (clamp min 2rem / max 6rem) so it never rivals it.
    fontSize: "clamp(2rem, 9vw, 5.4rem)",
  },
  // Parents row: fixed order, centred, sized between the couple headline
  // (~5.4rem) and the guest list (~1.2rem).
  parentsRow: {
    flexBasis: "100%",
    width: "100%",
    display: "flex",
    // keep the four names on a single centred row
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "baseline",
    gap: "0.5rem 0.7rem",
    marginBottom: "clamp(1rem, 3vh, 2.5rem)",
    textTransform: "uppercase",
    lineHeight: 1,
    whiteSpace: "nowrap",
    fontSize: "clamp(1.5rem, 5.5vw, 3.8rem)",
  },
  // odd position -> white (matches the guest list's odd style)
  parentOdd: {
    fontWeight: 700,
    color: "#ffffff",
  },
  // even position -> medium grey (matches the guest list's even style)
  parentEven: {
    fontWeight: 500,
    color: "#7c7c7c",
  },
  // MJ: white fill + white outline (same look as the app's whiteH1).
  hlMj: {
    color: "white",
    WebkitTextStroke: "1px white",
  },
  // B2B: same medium grey as the guest list.
  hlB2b: {
    color: "#7c7c7c",
  },
  // RODRIGO: black fill + white outline (same as the other app headers).
  hlRodrigo: {
    color: "black",
    WebkitTextStroke: "1px white",
  },
  // even index -> weight 500, medium grey
  even: {
    fontSize: "clamp(0.8rem, 1.5vw, 1.2rem)",
    textTransform: "uppercase",
    fontWeight: 500,
    color: "#7c7c7c",
  },
  // odd index -> weight 700, pure white
  odd: {
    fontSize: "clamp(0.8rem, 1.5vw, 1.2rem)",
    textTransform: "uppercase",
    fontWeight: 700,
    color: "#ffffff",
  },
};

export default LineUp;
