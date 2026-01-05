export const style = {
  rowFullHeight: { flexGrow: 1 },
  headerFirstGrid: {},
  headerFirstGridTop: {
    padding: "16px",
    zIndex: 9,
  },
  headerFirstGridBottom: {
    padding: "16px",
    backgroundColor: "#7a7a7a",
    position: "relative",
    "&:after": {
      content: "''",
      position: "absolute",
      backgroundColor: "black",
      width: "150px",
      height: "100px",
      right: "-60px",
      top: "-50px",
      transform: "rotate(53deg)",
    },
  },
  whiteH1Maria: { fontSize: "4rem", color: "white" },
  whiteH1Fecha: { fontWeight: 200, color: "white", letterSpacing: "0.75em" },
  whiteH1Lugar: { fontWeight: 100, color: "white", letterSpacing: "0.42em" },
  whiteH1Rodrigo: {
    fontSize: "4rem",
    color: "white",
    letterSpacing: "0.175em",
  },
  whiteH1BottomFecha: {
    fontWeight: 300,
    color: "black",
    letterSpacing: "0.1em",
    fontSize: "0.75rem",
  },
  whiteH1BottomLugar: {
    fontWeight: 300,
    color: "white",
    letterSpacing: "0em",
    fontSize: "0.75rem",
  },
  headerSecondGrid: {},
};
