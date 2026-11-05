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
// The source page's stylesheet order determines the cascade in the inline build.
for (const match of html.matchAll(
  /<link\s+href="\.\/(styles\/[^"<>]+\.css)"\s+rel="stylesheet"\s*\/?>/g,
)) {
  const css = await minifyAsset(await readPageFile(match[1]), "css");
  html = html.replace(match[0], () => `<style>\n${css}\n</style>`);
}

// The source page orders dependencies before app.js; preserve that order inline.
for (const match of html.matchAll(
  /<script\s+src="\.\/(scripts\/[^"<>]+\.js)"\s*><\/script>/g,
)) {
  const script = await minifyAsset(await readPageFile(match[1]), "js");
  html = html.replace(match[0], () => `<script>\n${script}\n</script>`);
}

// Remove mock-api.js
html = html.replace(
  /\s*<script\s+src="\.\/__mocks__\/mock-api\.js"\s*><\/script>/,
  "",
);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, html, "utf-8");
console.log("  settings UI -> public/settings.html");
