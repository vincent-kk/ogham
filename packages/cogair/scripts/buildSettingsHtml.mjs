#!/usr/bin/env node
/**
 * Inline src/mcp/pages/settings/{index.html, styles/styles.css, scripts/app.js}
 * into a single minified HTML string and emit
 * src/mcp/tools/openSettings/__generated__/settingsHtml.ts.
 *
 * Adapted from atlassian's build-setup-html.mjs.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { transform } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pagesDir = join(root, 'src', 'mcp', 'pages', 'settings');
const outputDir = join(
  root,
  'src',
  'mcp',
  'tools',
  'openSettings',
  '__generated__',
);
const outputPath = join(outputDir, 'settingsHtml.ts');

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

const serialized = JSON.stringify(html);

const moduleSource = `// GENERATED FILE — do not edit manually.
// Source: src/mcp/pages/settings/
// Regenerate: node scripts/buildSettingsHtml.mjs

export const SETTINGS_HTML = ${serialized};
`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, moduleSource, 'utf-8');
console.log(
  '  settings UI -> src/mcp/tools/openSettings/__generated__/settingsHtml.ts',
);
