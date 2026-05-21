import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/fixtures/**', 'src/__tests__/e2e/**'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
