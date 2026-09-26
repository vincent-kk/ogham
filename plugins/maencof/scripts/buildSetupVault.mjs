#!/usr/bin/env node
/** Loaded by build:setup; produces the standalone project connection command. */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(root, 'bridge/setup-vault.cjs');
const result = await build({
  entryPoints: [resolve(root, 'setupVault.entry/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  write: false,
  minify: true,
  mainFields: ['module', 'main'],
  banner: {
    js: "const __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: { 'import.meta.url': '__import_meta_url' },
});
const expected = result.outputFiles[0].contents;
if (process.argv.includes('--check')) {
  const actual = await readFile(outfile);
  if (!actual.equals(Buffer.from(expected)))
    throw new Error('Stale setup-vault.cjs; run build:setup');
  console.log('Setup vault bundle verified');
} else {
  await mkdir(dirname(outfile), { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outfile, expected);
  console.log('Setup vault -> bridge/setup-vault.cjs');
}
