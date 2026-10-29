import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server-side code by default; browser-only modules opt into jsdom with
    // a `// @vitest-environment jsdom` comment at the top of their test file.
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
