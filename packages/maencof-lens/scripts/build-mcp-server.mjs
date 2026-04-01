#!/usr/bin/env node
/**
 * Build script for standalone MCP server bundle
 * Output: bridge/mcp-server.cjs
 */
import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const outfile = resolve(root, 'bridge/mcp-server.cjs');

await mkdir(resolve(root, 'bridge'), { recursive: true });

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
    '@maencof': resolve(root, '../maencof/src'),
  },
});

console.log(`  MCP server  -> bridge/mcp-server.cjs`);
