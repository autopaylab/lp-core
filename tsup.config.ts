import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "config/index": "src/config/index.ts",
    "server/index": "src/server/index.ts",
    "react/index": "src/react/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Peer dependencies stay external so the consuming landing page provides
  // exactly one copy of React, Next and the design system.
  external: ["react", "react-dom", "next", /^next\//, /^@autopaylab\/landing-design-system/],
});
