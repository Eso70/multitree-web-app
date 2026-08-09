import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Vitest's defaults cover node_modules and dist but not the Next.js build
    // directory, so a production build left in the tree would otherwise be
    // scanned for test files.
    exclude: [...configDefaults.exclude, "**/.next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
