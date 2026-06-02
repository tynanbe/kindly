import { defineConfig } from "tsdown";

export default defineConfig({
  outputOptions: {
    comments: {
      annotation: true,
      jsdoc: true,
      // See `NOTICE`
      legal: false,
    },
  },
});
