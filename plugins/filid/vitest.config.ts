import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.{test,spec}.ts'],
    exclude: ['**/fixtures/**'],
    globals: true,
    // Runs in the main process around the whole run; it owns the one temporary
    // directory this run removes at the end, because nothing inside a worker
    // gets to run at teardown.
    globalSetup: ['./vitest.globalSetup.ts'],
    setupFiles: ['./vitest.setup.ts'],
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
