#!/usr/bin/env node
/**
 * Build setup-html.ts from pages/setup/ source files.
 * Inlines CSS/JS, removes mock-api.js, outputs TS module.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pagesDir = join(root, 'src', 'mcp', 'pages', 'setup');
const outputPath = join(root, 'src', 'mcp', 'tools', 'setup', '__generated__', 'setup-html.ts');

async function readPageFile(...segments) {
  return readFile(join(pagesDir, ...segments), 'utf-8');
}

async function minifyAsset(source, loader) {
  const result = await transform(source, {
    loader,
    minify: true,
  });

  return result.code.trim();
}

let html = await readPageFile('index.html');
const css = await minifyAsset(await readPageFile('styles', 'styles.css'), 'css');
const appJs = await minifyAsset(await readPageFile('scripts', 'app.js'), 'js');
const jsonImportJs = await minifyAsset(await readPageFile('scripts', 'json-import.js'), 'js');

// Inline CSS
html = html.replace(
  /<link\s+href="\.\/styles\/styles\.css"\s+rel="stylesheet"\s*\/?>/,
  `<style>\n${css}\n</style>`,
);

// Inline app.js
html = html.replace(
  /<script\s+src="\.\/scripts\/app\.js"\s*><\/script>/,
  `<script>\n${appJs}\n</script>`,
);

// Inline json-import.js
html = html.replace(
  /<script\s+src="\.\/scripts\/json-import\.js"\s*><\/script>/,
  `<script>\n${jsonImportJs}\n</script>`,
);

// Remove mock-api.js
html = html.replace(/\s*<script\s+src="\.\/__mocks__\/mock-api\.js"\s*><\/script>/, '');

const serializedHtml = JSON.stringify(html);

const moduleContent = `// GENERATED FILE — do not edit manually.
// Run: node scripts/build-setup-html.mjs

export const SETUP_HTML = ${serializedHtml};
`;

await writeFile(outputPath, moduleContent, 'utf-8');
console.log('  setup-html.ts generated');
