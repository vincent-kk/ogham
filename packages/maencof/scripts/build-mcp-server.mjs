#!/usr/bin/env node
/**
 * Build script for standalone MCP server bundle
 * Bundles the MCP server into a standalone CJS file for plugin distribution
 *
 * Output: bridge/mcp-server.cjs
 */

import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outfile = resolve(root, 'bridge/mcp-server.cjs');

// Ensure output directory exists
await mkdir(resolve(root, 'bridge'), { recursive: true });

const banner = '';

await esbuild.build({
  entryPoints: [resolve(root, 'src/mcp/server-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  banner: { js: banner },
  minify: true,
  sourcemap: false,
  treeShaking: true,
  // Prefer ESM entry points so UMD packages get properly bundled
  mainFields: ['module', 'main'],
  external: [],
});

console.log(`  MCP server  -> bridge/mcp-server.cjs`);
