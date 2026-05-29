#!/usr/bin/env node
/**
 * Bundle src/mcp/serverEntry/serverEntry.ts -> bridge/mcp-server.cjs
 *
 * cogair does not depend on @ast-grep/napi or any native module, so the
 * filid NODE_PATH banner is omitted. zod is bundled in directly via the
 * resolved path from the MCP SDK's dependency tree (single copy).
 */
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outfile = resolve(root, 'bridge/mcp-server.cjs');

await mkdir(resolve(root, 'bridge'), { recursive: true });

const sdkPkgPath = resolve(
  root,
  'node_modules/@modelcontextprotocol/sdk/package.json',
);
const require = createRequire(sdkPkgPath);
const zodPath = dirname(require.resolve('zod/package.json'));

await esbuild.build({
  entryPoints: [resolve(root, 'src/mcp/serverEntry/serverEntry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  minify: true,
  sourcemap: false,
  treeShaking: true,
  mainFields: ['module', 'main'],
  alias: {
    zod: zodPath,
  },
  // esbuild empties bare `import.meta` in CJS output; shim `import.meta.url` to
  // the bundle file path so runtime asset resolution (public/settings.html) works.
  banner: {
    js: "const __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '__import_meta_url',
  },
});

console.log('  MCP server  -> bridge/mcp-server.cjs');
