import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Regex form so only `@/` is rewritten; a bare `@` string alias would also
    // capture scoped deps such as `@modelcontextprotocol/sdk`.
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/fixtures/**', '**/node_modules/**', '**/dist/**'],
    globals: true,
    testTimeout: 30_000,
  },
});
