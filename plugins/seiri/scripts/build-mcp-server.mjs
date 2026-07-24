#!/usr/bin/env node
/**
 * Bundle the MCP server into a standalone CJS file for plugin
 * distribution.
 *
 * Output: bridge/mcp-server.cjs
 *
 * Unlike filid's, this bundle needs no NODE_PATH banner and externalises
 * nothing: seiri has no native dependency to resolve from a global npm
 * root. The only shim is `import.meta.url`, which esbuild empties in CJS
 * output and which the settings-page loader uses to find public/.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

await esbuild.build({
  entryPoints: [resolve(root, 'src/mcp/serverEntry/serverEntry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: resolve(root, 'bridge/mcp-server.cjs'),
  banner: {
    js: "const __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '__import_meta_url',
  },
  minify: true,
  sourcemap: false,
  treeShaking: true,
  mainFields: ['module', 'main'],
});

console.log('  MCP server  -> bridge/mcp-server.cjs');
