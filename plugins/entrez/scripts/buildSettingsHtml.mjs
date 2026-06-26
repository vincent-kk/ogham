#!/usr/bin/env node
/**
 * Build public/settings.html from src/mcp/pages/settings/ sources.
 * Inlines (minified) styles.css and app.js into a single static HTML file that
 * the setup tool reads from disk at runtime (shipped via package.json:files) —
 * it is NOT inlined into the MCP bundle. The `window.__ENTREZ_STATE__ = null;`
 * placeholder is preserved for server-side state injection.
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

async function read(...segments) {
  return readFile(join(pagesDir, ...segments), "utf-8");
}

async function minify(source, loader) {
  const result = await transform(source, { loader, minify: true });
  return result.code.trim();
}

let html = await read("index.html");
const css = await minify(await read("styles", "styles.css"), "css");
const appJs = await minify(await read("scripts", "app.js"), "js");

html = html.replace(
  /<link\s+href="\.\/styles\/styles\.css"\s+rel="stylesheet"\s*\/?>/,
  `<style>\n${css}\n</style>`,
);
html = html.replace(
  /<script\s+src="\.\/scripts\/app\.js"\s*><\/script>/,
  `<script>\n${appJs}\n</script>`,
);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf-8");
console.log("  settings UI -> public/settings.html");
