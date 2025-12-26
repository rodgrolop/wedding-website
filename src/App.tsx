import "@fontsource/roboto-mono";

import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Grid from "@mui/joy/Grid";
import Typography from "@mui/joy/Typography";
import { style } from "./styles";
import { theme } from "./theme";
import  SoundVisualizer  from "./components/soundVisualizer/SoundVisualizer";

const App = () => {
  return (
    <CssVarsProvider theme={theme}>
      <CssBaseline />
      <Grid container direction="column" sx={style.mainContainer}>
        <Grid container direction="row" sx={style.rowFullHeight}>
          <Grid
            xs={6}
            container
            justifyContent="space-between"
            direction="column"
            sx={style.headerFirstGrid}
          >
            <Typography level="h1" sx={style.whiteH1}>
              M
            </Typography>
            <Typography level="body-md" sx={style.whiteH1}>
              1 - 1000 - 11010
            </Typography>{" "}
            <Typography level="h1" sx={style.whiteH1}>
              R
            </Typography>
          </Grid>
          <Grid xs={6}>
            <SoundVisualizer />
          </Grid>
        </Grid>
      </Grid>
    </CssVarsProvider>
  );
};

export default App;
