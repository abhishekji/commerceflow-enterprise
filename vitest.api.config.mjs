import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    include: ["apps/api/tests/**/*.test.ts"],
    globalSetup: ["apps/api/tests/setup/global-mongo.ts"],
    setupFiles: ["apps/api/tests/setup/env.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html", "lcov"],
      reportsDirectory: "coverage/api",
      include: ["apps/api/src/**/*.ts"],
      exclude: [
        "apps/api/src/**/*.d.ts",
        "apps/api/src/server.ts",
        "apps/api/src/scripts/**",
        "apps/api/src/infrastructure/database/test-db.ts",
      ],
      thresholds: { statements: 80, lines: 80, functions: 75, branches: 65 },
    },
  },
});
