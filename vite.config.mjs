import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "apps/web",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    css: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx", "src/**/index.ts", "src/**/*.d.ts", "src/common/types/**", "src/common/enums/**"],
      reporter: ["text-summary", "text", "html", "lcov"],
      reportsDirectory: "../../coverage/web",
    },
  },
});
