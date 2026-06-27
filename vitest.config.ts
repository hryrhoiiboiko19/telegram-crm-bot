import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/database/migrations/**",
        "src/database/seed.ts",
        "src/database/migrate.ts",
        "src/config/index.ts",
        "src/bot/conversations/index.ts",
        "src/bot/handlers/index.ts",
        "src/bot/middlewares/index.ts",
        "src/bot/types/index.ts",
        "src/bot/interfaces/index.ts",
        "src/types/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});