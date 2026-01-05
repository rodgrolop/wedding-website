import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Grid from "@mui/joy/Grid";
import { style } from "./styles";
import { theme } from "./theme";
import FirstSection from "./components/firstSection/FirstSection";

const App = () => {
  return (
    <CssVarsProvider theme={theme}>
      <CssBaseline />
      <Grid container direction="column" sx={style.mainContainer}>
        <FirstSection />
      </Grid>
    </CssVarsProvider>
  );
};

export default App;
