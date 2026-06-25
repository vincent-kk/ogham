#!/usr/bin/env node
/**
 * Bundle src/mcp/serverEntry/serverEntry.ts -> bridge/mcp-server.cjs (CJS).
 * zod is resolved through the MCP SDK's dependency tree (single copy). The
 * import.meta.url banner/define shim keeps runtime asset resolution working in
 * the emptied CJS import.meta. A size guard fails the build if an unexpected
 * heavy dependency leaks into the deterministic execution-layer runtime.
 */
import { mkdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "bridge/mcp-server.cjs");

await mkdir(resolve(root, "bridge"), { recursive: true });

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
  alias: { zod: zodPath },
  banner: {
    js: "const __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: { "import.meta.url": "__import_meta_url" },
});

// The MCP runtime is the deterministic execution layer only: no statistics
// libraries, no R, no browser renderers. A size ceiling backstops against any
// heavy dependency accidentally leaking into the bundle.
const MAX_BYTES = 2_000_000;

const { size } = await stat(outfile);
if (size > MAX_BYTES) {
  throw new Error(
    `[r-statistics] mcp-server.cjs is ${size} bytes (> ${MAX_BYTES}); an unexpected dependency likely leaked in`,
  );
}

// Sanity check: the bundle must contain the four tool names it registers.
const bundle = await readFile(outfile, "utf8");
for (const tool of [
  "run_r",
  "get_r_job",
  "cancel_r_job",
  "assert_analysis_plan",
]) {
  if (!bundle.includes(tool)) {
    throw new Error(`[r-statistics] mcp-server.cjs is missing tool: ${tool}`);
  }
}

console.log(
  `  MCP server  -> bridge/mcp-server.cjs (${Math.round(size / 1024)} KB)`,
);
