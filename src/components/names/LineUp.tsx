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
  "Elvira",
  "Papá",
  "mamá",
  "Abuela",
  "abuelo",
  "Tita Dori",
  "tito Jesús",
  "Tita Paqui",
  "tito Manolo",
  "Fran",
  "Mari (Rocío)",
  "Rosa",
  "Edu",
  "Andrea",
  "Marina",
  "Agustín",
  "Paloma",
  "Trini",
  "Jose",
  "Rosi",
  "Loli",
  "Francis",
  "Chari",
  "Paco",
  "Esperanci",
  "Cosme",
  "Mari",
  "Felipe",
  "Juani",
  "Pablo",
  "Inés",
  "Paco",
  "Pablito",
  "Blanca",
  "Fernandito",
  "Juanito",
  "Julita",
  "Bea",
  "Guille",
  "Laura",
  "Mamá",
  "Gonzalo",
  "Papá",
  "Marina",
  "Belén",
  "Juanjo",
  "Ana",
  "marido",
  "Martita",
  "María",
  "María",
  "Juan Carlos",
  "Pedro padrino",
  "Salomé",
  "Álvaro",
  "Javi cántabro",
  "Quique",
  "Stéphanie",
  "Sergio",
  "Rocío",
  "Lea",
  "Ángel",
  "Lidia",
  "Javi",
  "Inma Tena",
  "Alba",
  "Andrés",
  "Julio",
  "Laura",
  "Mamen",
  "Lolo",
  "Alba",
  "Rafa",
  "Anna",
  "Manuel",
  "Lucía",
  "Benja",
  "Blanca",
  "Gema",
  "Lolo",
  "Cristina",
  "Chiqui",
  "Marta",
  "Jesús",
  "Rocío",
  "Jose",
  "Cristina",
  "Antonio",
  "Carmen",
  "Susana",
  "Mari Carmen",
  "Dami",
  "Monti",
  "Pitufo",
  "Rosi",
  "Judit",
  "Tete",
  "Ali",
  "Bárbara",
  "Loida",
  "Martínez",
  "Juan (moro)",
  "Gilete",
  "Álex",
  "Dani Máquina",
  "Pilar",
  "marido",
  "Cristina",
  "Rubén",
  "Chelsey",
  "Ayose",
  "Pablo",
  "Zoraida",
  "Rafa",
  "Andrea",
  "Quisco",
  "Elisa",
  "Camila",
  "Joselito",
  "Andrés",
  "Masto",
  "Car",
  "Ivor",
  "Dani",
  "Almu",
  "Raquel",
  "Javi",
  "Carol",
  "Marta",
  "Luci",
  "Magda",
  "Pier",
  "Alber",
  "novia",
  "Jesús",
  "Vane",
  "Raquel",
  "Román",
  "Rober",
  "Lisa",
  "Pedro Vera",
  "Víctor García",
  "Antonia",
  "José (Higuera)",
  "Miriam",
  "Sandra",
  "Jose",
  "Antonia",
  "Mari Paz",
  "Cristina",
  "Juan",
  "Ana",
  "Juan Antonio",
  "Tita Jose",
  "Manolín",
  "Tito Joselín",
  "Mari",
  "Chelo",
  "Jorge",
  "José Antonio",
  "Candy",
  "Meli",
  "Pedro",
  "Juan José",
  "Noelia",
  "Tita Dolores",
  "Juanito",
  "César",
  "Juani",
  "Antonio",
  "Meli",
  "Manolo",
  "Caty",
  "Manolo",
  "Juan Ángel",
  "Juani",
  "José Amador",
  "Alicia",
  "Isabel",
  "Ángel",
  "Tita Juani",
  "tito Julián",
  "Lola",
  "Deivid",
  "Utrilla",
  "Loli",
  "Miguel",
  "Inma",
  "Paco",
  "Chapista",
  "mujer",
];

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
  // Mobile header: horizontal, right-aligned, non-rotated. Shares the names
  // block's box so its right edge lines up with the list.
  header: {
    display: "block",
    boxSizing: "border-box",
    width: "80%",
    maxWidth: "1280px",
    margin: "0 12px 0 auto",
    padding: "0 0 0 3vw",
    textAlign: "right",
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
