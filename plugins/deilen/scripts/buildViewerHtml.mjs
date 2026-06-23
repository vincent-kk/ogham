#!/usr/bin/env node
/**
 * Inline src/mcp/pages/viewer/{index.html, styles/styles.css, scripts/app.js}
 * into a single minified bridge/viewer.html. app.js is esbuild-bundled to an
 * IIFE; dynamic imports of /assets/* stay external (served at runtime as lazy
 * renderer chunks). The viewer HTML rides in bridge/ (package.json:files) and
 * is read at runtime by mcp/httpServer — it is NOT inlined into the MCP bundle.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pageDir = join(root, "src/mcp/pages/viewer");
const outDir = join(root, "bridge");
const outPath = join(outDir, "viewer.html");

const html = await readFile(join(pageDir, "index.html"), "utf8");

const cssSource = await readFile(join(pageDir, "styles/styles.css"), "utf8");
const css = (
  await esbuild.transform(cssSource, { loader: "css", minify: true })
).code.trim();

const bundled = await esbuild.build({
  entryPoints: [join(pageDir, "scripts/app.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  write: false,
  external: ["/assets/*"],
});
const js = bundled.outputFiles[0].text.trim();

const out = html
  .replace(
    /<link rel="stylesheet" href="\.\/styles\/styles\.css"\s*\/?>/,
    `<style>${css}</style>`,
  )
  .replace(
    /<script type="module" src="\.\/scripts\/app\.js"><\/script>/,
    `<script>${js}</script>`,
  );

await mkdir(outDir, { recursive: true });
await writeFile(outPath, out, "utf8");
console.log("  viewer UI   -> bridge/viewer.html");
