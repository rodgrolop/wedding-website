import "@fontsource/roboto-mono/100";
import "@fontsource/roboto-mono/200";
import "@fontsource/roboto-mono/300";
import "@fontsource/roboto-mono/400";
import "@fontsource/roboto-mono/500";
import "@fontsource/roboto-mono/600";
import "@fontsource/roboto-mono/700";

import { extendTheme } from "@mui/joy/styles";

export const theme = extendTheme({
  fontFamily: {
    body: 'Roboto Mono, var(--joy-fontFamily-fallback, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol")',
    display:
      'Roboto Mono, var(--joy-fontFamily-fallback, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol")',
    code: "Source Code Pro,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace",
    fallback:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
});
