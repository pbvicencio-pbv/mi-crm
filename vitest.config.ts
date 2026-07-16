import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Dos proyectos (Vitest ≥3.2 `test.projects`):
 *  - `convex`: funciones Convex + helpers, en `edge-runtime` (con convex-test).
 *  - `ui`: componentes React, en `jsdom` (Testing Library) + plugin-react para JSX.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "convex",
          environment: "edge-runtime",
          include: ["convex/**/*.test.ts"],
          server: { deps: { inline: ["convex-test"] } },
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
