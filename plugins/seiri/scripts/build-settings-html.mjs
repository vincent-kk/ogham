#!/usr/bin/env node
/**
 * Inline src/mcp/pages/settings/{index.html, styles/styles.css,
 * scripts/app.js} into one minified file and emit public/settings.html.
 *
 * The page is served at runtime by reading that file from disk rather than
 * being bundled into the MCP server, which keeps bridge/mcp-server.cjs
 * small. It ships via package.json:files.
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
  return readFile(join(pagesDir, ...segments), 'utf8');
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

// The state slot must survive minification — the server rewrites it per
// request. If minification ever collapsed it, every page load would render
// the literal placeholder instead of the project's state.
if (!/["']__SEIRI_STATE__["']/.test(html)) {
  console.error(
    '[build-settings-html] state placeholder missing from output — the server has nothing to inject into.',
  );
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, 'utf8');
console.log('  settings UI -> public/settings.html');
