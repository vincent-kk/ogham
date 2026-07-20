#!/usr/bin/env node
/**
 * Build public/settings.html from pages/settings/ source files.
 * Inlines CSS/JS, removes mock-api.js, and writes a single static HTML file.
 *
 * The page is served at runtime by mcp/tools/setup by reading this file from
 * disk (shipped via package.json:files) — it is NOT inlined into the MCP bundle,
 * keeping bridge/mcp-server.cjs small and avoiding a duplicated copy of the
 * markup inside the TypeScript sources.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pagesDir = join(root, "src", "mcp", "pages", "settings");
const outputDir = join(root, "public");
const outputPath = join(outputDir, "settings.html");

async function readPageFile(...segments) {
  return readFile(join(pagesDir, ...segments), "utf-8");
}

async function minifyAsset(source, loader) {
  const result = await transform(source, {
    loader,
    minify: true,
  });

  return result.code.trim();
}

let html = await readPageFile("index.html");
const css = await minifyAsset(
  await readPageFile("styles", "styles.css"),
  "css",
);
const appJs = await minifyAsset(await readPageFile("scripts", "app.js"), "js");
const jsonImportJs = await minifyAsset(
  await readPageFile("scripts", "json-import.js"),
  "js",
);

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
html = html.replace(
  /\s*<script\s+src="\.\/__mocks__\/mock-api\.js"\s*><\/script>/,
  "",
);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf-8");
console.log("  settings UI -> public/settings.html");
