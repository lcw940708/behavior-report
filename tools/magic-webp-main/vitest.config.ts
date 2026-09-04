import { defineConfig } from "vitest/config";
import { readFileSync } from "fs";
import { resolve } from "path";

export default defineConfig({
  test: {
    // happy-dom даёт нам ImageData, Blob, FileReader, URL, fetch и т.д.
    environment: "happy-dom",
    globals: true,
    include: ["src-js/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src-js/**/*.ts"],
      exclude: ["src-js/**/*.test.ts"],
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});

