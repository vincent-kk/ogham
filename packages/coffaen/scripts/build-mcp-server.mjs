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

// NODE_PATH auto-injection banner for MCP server bundle
// Resolves global npm modules so native packages like @ast-grep/napi can be found
// Uses process.execPath (current Node.js binary) to derive the global modules path,
// which is reliable in non-interactive shells where nvm/fnm are not initialized.
const banner = `
// Resolve global npm modules for native package imports
try {
  var _path = require('path');
  var _Module = require('module');
  var _fs = require('fs');
  // Method 1: derive from process.execPath (most reliable, no child process needed)
  // Standard layout: <prefix>/bin/node -> <prefix>/lib/node_modules
  var _nodeDir = _path.dirname(process.execPath);
  var _globalRoot = _path.resolve(_nodeDir, '..', 'lib', 'node_modules');
  if (!_fs.existsSync(_globalRoot)) {
    // Method 2: npm root -g fallback (depends on npm being in PATH)
    var _cp = require('child_process');
    _globalRoot = _cp.execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
  }
  if (_globalRoot && _fs.existsSync(_globalRoot)) {
    var _sep = process.platform === 'win32' ? ';' : ':';
    process.env.NODE_PATH = _globalRoot + (process.env.NODE_PATH ? _sep + process.env.NODE_PATH : '');
    _Module._initPaths();
  }
} catch (_e) { /* npm not available - native modules will gracefully degrade */ }
`;

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
  // Externalize native modules that can't be bundled
  external: ['@ast-grep/napi'],
});

console.log(`  MCP server  -> bridge/mcp-server.cjs`);
