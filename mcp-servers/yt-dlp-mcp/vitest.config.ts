import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/fixtures/**', '**/node_modules/**', '**/dist/**'],
    globals: true,
    testTimeout: 30_000,
  },
});
