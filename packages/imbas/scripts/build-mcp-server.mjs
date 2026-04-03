#!/usr/bin/env node
/**
 * Build script for standalone MCP server bundle
 * Bundles the MCP server into a standalone CJS file for plugin distribution
 *
 * Output: bridge/mcp-server.cjs
 */

import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outfile = resolve(root, 'bridge/mcp-server.cjs');

// Ensure output directory exists
await mkdir(resolve(root, 'bridge'), { recursive: true });

// Resolve zod from MCP SDK's dependency tree — single copy in the bundle
const require = createRequire(resolve(root, 'node_modules/@modelcontextprotocol/sdk/package.json'));
const zodPath = dirname(require.resolve('zod/package.json'));

await esbuild.build({
  entryPoints: [resolve(root, 'src/mcp/server-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  minify: true,
  sourcemap: false,
  treeShaking: true,
  mainFields: ['module', 'main'],
  external: [],
  alias: {
    'zod': zodPath,
  },
});

console.log(`  MCP server  -> bridge/mcp-server.cjs`);
