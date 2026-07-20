#!/usr/bin/env node
/**
 * Build the heavy browser renderers as standalone ESM chunks served from
 * public/assets/ (lazy-loaded by enhance.js, never imported by the MCP server).
 * One independent entry per renderer keeps file names deterministic. No fonts or
 * CSS are bundled: KaTeX emits MathML (browser math font), highlight.js is
 * themed by the page CSS, and mermaid draws SVG with the page font.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entryDir = join(root, "src/mcp/pages/viewer/renderers");
const assetsDir = join(root, "public/assets");
await mkdir(assetsDir, { recursive: true });

const ENTRIES = ["highlight", "mermaid", "katex"];
for (const name of ENTRIES) {
  await esbuild.build({
    entryPoints: [join(entryDir, `${name}.entry.ts`)],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    minify: true,
    legalComments: "none",
    outfile: join(assetsDir, `${name}.js`),
  });
}

console.log("  renderers   -> public/assets/{highlight,mermaid,katex}.js");
