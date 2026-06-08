import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'dist/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: true,
  sourcemap: false,
  treeShaking: true,
  // Bundle only our own source into the single file; every node_modules package
  // stays external and is resolved at runtime from the installed dependency tree
  // (standard npm layout — deps install alongside the package via npx).
  packages: 'external',
  logLevel: 'info',
});
