#!/usr/bin/env node
/**
 * Build setup-html.ts from pages/setup/ source files.
 * Inlines CSS/JS, removes mock-api.js, outputs TS module.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pagesDir = join(root, 'src', 'mcp', 'pages', 'setup');
const outputPath = join(root, 'src', 'mcp', 'tools', 'setup', '__generated__', 'setup-html.ts');

async function readPageFile(...segments) {
  return readFile(join(pagesDir, ...segments), 'utf-8');
}

let html = await readPageFile('index.html');
const css = await readPageFile('styles', 'styles.css');
const appJs = await readPageFile('scripts', 'app.js');
const jsonImportJs = await readPageFile('scripts', 'json-import.js');

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

// Escape for template literal
const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

const moduleContent = `// GENERATED FILE — do not edit manually.
// Run: node scripts/build-setup-html.mjs

export const SETUP_HTML = \`
${escaped}
\`;
`;

await writeFile(outputPath, moduleContent, 'utf-8');
console.log('  setup-html.ts generated');
