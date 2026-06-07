import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/e2e/**/*.test.ts'],
    exclude: ['**/fixtures/**', '**/node_modules/**'],
    globals: true,
    setupFiles: ['./vitest.e2e.setup.ts'],
    globalSetup: ['./vitest.e2e.globalSetup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
