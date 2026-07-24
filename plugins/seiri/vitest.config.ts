import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/fixtures/**'],
    globals: true,
    // Integration tests shell out to real git many times per case; on slow
    // Windows CI runners each spawn is costly (PATH scan + process create),
    // so the aggregate can exceed Vitest's 5s test / 10s hook defaults.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    benchmark: {
      include: ['src/**/__tests__/bench/**/*.bench.ts'],
      exclude: ['**/fixtures/**'],
    },
  },
});
