import { defineConfig } from "vitest/config";

// Live smoke tests (test/live/**) hit the real NCBI E-utilities endpoints and
// are excluded by default — opt in with RUN_LIVE=1 (see package.json test:live).
const includeLive = process.env.RUN_LIVE === "1";

export default defineConfig({
  test: {
    include: [
      "src/**/__tests__/**/*.test.ts",
      "test/e2e/**/*.test.ts",
      "test/calibration/**/*.test.ts",
      ...(includeLive ? ["test/live/**/*.test.ts"] : []),
    ],
    exclude: ["**/fixtures/**", "**/node_modules/**", "**/dist/**"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/index.ts",
        "src/version.ts",
        "src/mcp/serverEntry/**",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        "src/core/**/*.ts": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        "src/adapters/**/*.ts": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
    },
  },
});
