import "@fontsource/roboto-mono";
import { useState } from "preact/hooks";
import preactLogo from "./assets/preact.svg";
import viteLogo from "/vite.svg";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import Grid from "@mui/joy/Grid";
import Typography from "@mui/joy/Typography";
import { style } from "./styles";
import { theme } from "./theme";

export const App = () => {
  const [count, setCount] = useState(0);

  return (
    <CssVarsProvider theme={theme}>
      <CssBaseline />
      <Grid container direction="column" sx={style.mainContainer}>
        <Grid container direction="row">
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
            <div>
              <a href="https://vite.dev" target="_blank">
                <img src={viteLogo} class="logo" alt="Vite logo" />
              </a>
              <a href="https://preactjs.com" target="_blank">
                <img src={preactLogo} class="logo preact" alt="Preact logo" />
              </a>
            </div>
            <h1>Vite + Preact</h1>
            <div class="card">
              <button onClick={() => setCount((count) => count + 1)}>
                count is {count}
              </button>
              <p>
                Edit <code>src/app.tsx</code> and save to test HMR
              </p>
            </div>
            <p>
              Check out{" "}
              <a
                href="https://preactjs.com/guide/v10/getting-started#create-a-vite-powered-preact-app"
                target="_blank"
              >
                create-preact
              </a>
              , the official Preact + Vite starter
            </p>
            <p class="read-the-docs">
              Click on the Vite and Preact logos to learn more
            </p>
          </Grid>
        </Grid>
      </Grid>
    </CssVarsProvider>
  );
};
