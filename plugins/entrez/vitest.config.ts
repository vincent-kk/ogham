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
      // Per PLAN DoD: core/adapters 90%+, overall 85%+ (line-based). Branch
      // coverage uses a single modest floor — defensive `??` fallbacks are
      // largely unreachable, so a high per-dir branch gate would be noise.
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 80,
        branches: 70,
        "src/core/**/*.ts": {
          lines: 90,
          statements: 90,
          functions: 88,
        },
        "src/adapters/**/*.ts": {
          lines: 90,
          statements: 90,
          functions: 90,
        },
      },
    },
  },
});
