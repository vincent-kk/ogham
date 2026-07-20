#!/usr/bin/env node
/**
 * Inline src/mcp/pages/settings/{index.html, styles/styles.css, scripts/app.js}
 * into a single minified HTML file and emit public/settings.html.
 *
 * The page is served at runtime by mcp/tools/openSettings by reading this file
 * from disk (shipped via package.json:files) — it is NOT inlined into the MCP
 * bundle, keeping bridge/mcp-server.cjs small.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { transform } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pagesDir = join(root, 'src', 'mcp', 'pages', 'settings');
const outputDir = join(root, 'public');
const outputPath = join(outputDir, 'settings.html');

async function readPage(...segments) {
  return readFile(join(pagesDir, ...segments), 'utf-8');
}

async function minifyAsset(source, loader) {
  const result = await transform(source, { loader, minify: true });
  return result.code.trim();
}

let html = await readPage('index.html');
const css = await minifyAsset(await readPage('styles', 'styles.css'), 'css');
const appJs = await minifyAsset(await readPage('scripts', 'app.js'), 'js');

html = html.replace(
  /<link\s+rel="stylesheet"\s+href="\.\/styles\/styles\.css"\s*\/?>/,
  `<style>${css}</style>`,
);

html = html.replace(
  /<script\s+src="\.\/scripts\/app\.js"\s*><\/script>/,
  `<script>${appJs}</script>`,
);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, 'utf-8');
console.log('  settings UI -> public/settings.html');
