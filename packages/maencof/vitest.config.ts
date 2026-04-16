import { readFileSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // Mirrors the esbuild `.md -> text` loader used by scripts/build-hooks.mjs,
      // so source modules can `import body from './file.md'` in both test and production.
      name: 'md-as-text',
      enforce: 'pre',
      load(id) {
        if (id.endsWith('.md')) {
          const content = readFileSync(id, 'utf-8');
          return `export default ${JSON.stringify(content)};`;
        }
        return null;
      },
    },
  ],
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/fixtures/**'],
    globals: true,
    benchmark: {
      include: ['src/**/__tests__/bench/**/*.bench.ts'],
      exclude: ['**/fixtures/**'],
    },
  },
});
