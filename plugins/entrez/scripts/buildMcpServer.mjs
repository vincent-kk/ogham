#!/usr/bin/env node
/**
 * Build script for the standalone entrez MCP server bundle.
 * Bundles src/mcp/serverEntry/serverEntry.ts into a single CJS file for
 * plugin distribution (deilen / atlassian build pattern).
 *
 * Output: bridge/mcp-server.cjs
 */

import * as esbuild from "esbuild";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const outfile = resolve(root, "bridge/mcp-server.cjs");

await mkdir(resolve(root, "bridge"), { recursive: true });

// Resolve zod from the MCP SDK's dependency tree — a single copy in the bundle.
const require = createRequire(
  resolve(root, "node_modules/@modelcontextprotocol/sdk/package.json"),
);
const zodPath = dirname(require.resolve("zod/package.json"));

await esbuild.build({
  entryPoints: [resolve(root, "src/mcp/serverEntry/serverEntry.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  minify: true,
  sourcemap: false,
  treeShaking: true,
  mainFields: ["module", "main"],
  external: [],
  alias: {
    zod: zodPath,
  },
  // esbuild empties bare `import.meta` in CJS output; shim `import.meta.url` to
  // the bundle file path so runtime asset resolution (public/settings.html) works.
  banner: {
    js: "const __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    "import.meta.url": "__import_meta_url",
  },
});

console.log("  MCP server  -> bridge/mcp-server.cjs");
