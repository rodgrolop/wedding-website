import Grid from "@mui/joy/Grid";
import Typography from "@mui/joy/Typography";
import SoundVisualizerScene from "../soundVisualizer/SoundVisualizerScene";
import { style } from "./styles";

const FirstSection = () => {
  return (
    <Grid container direction="row" sx={style.rowFullHeight}>
      <Grid
        xs={6}
        container
        justifyContent="space-between"
        direction="column"
        sx={style.headerFirstGrid}
      >
        <Grid
          xs={6}
          container
          justifyContent="start"
          direction="column"
          sx={style.headerFirstGridTop}
        >
          <Typography level="h1" sx={style.whiteH1Maria}>
            MJ
          </Typography>
          <Typography level="body-md" sx={style.whiteH1Fecha}>
            1 - 1000 - 11010
          </Typography>
          <Typography level="h1" sx={style.whiteH1Rodrigo}>
            RODRIGO
          </Typography>
          <Typography level="body-md" sx={style.whiteH1Lugar}>
            37.7698059,-3.9712233
          </Typography>
        </Grid>
        <Grid
          xs={8}
          container
          justifyContent="start"
          direction="column"
          sx={style.headerFirstGridBottom}
        >
          <Typography level="body-md" sx={style.whiteH1BottomFecha}>
            1 de agosto de 2026 - 20:00 h
          </Typography>
          <Typography level="body-md" sx={style.whiteH1BottomLugar}>
            Salones María Luisa - Torredonjimeno
          </Typography>
        </Grid>
      </Grid>
      <SoundVisualizerScene />
    </Grid>
  );
};
export default FirstSection;
