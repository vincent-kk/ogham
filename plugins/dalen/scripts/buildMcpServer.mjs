#!/usr/bin/env node
/**
 * Bundle src/mcp/serverEntry/serverEntry.ts -> bridge/mcp-server.cjs (CJS).
 * zod is resolved through the MCP SDK's dependency tree (single copy). The
 * import.meta.url banner/define shim keeps runtime asset resolution working in
 * the emptied CJS import.meta. A size + signature guard fails the build if a
 * heavy browser renderer (mermaid/katex/highlight) leaks into the runtime.
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

// Heavy browser renderers belong in bridge/assets/*, never in the MCP runtime.
// Use library-specific signatures that never appear in dalen's own server code
// (which legitimately contains the strings "mermaid" and "highlight"), plus a
// size ceiling as a backstop against any heavy dependency leaking in.
const MAX_BYTES = 2_000_000;
const FORBIDDEN = [
  { name: "katex", re: /\bkatex\b/i },
  { name: "highlight.js", re: /\bhljs\b/ },
  { name: "mermaid", re: /sequenceDiagram|flowchart-elk|mermaid-config/i },
];

const bundle = await readFile(outfile, "utf8");
const leaks = FORBIDDEN.filter((f) => f.re.test(bundle)).map((f) => f.name);
if (leaks.length > 0) {
  throw new Error(
    `[dalen] mcp-server.cjs must not bundle heavy renderers: ${leaks.join(", ")}`,
  );
}

const { size } = await stat(outfile);
if (size > MAX_BYTES) {
  throw new Error(
    `[dalen] mcp-server.cjs is ${size} bytes (> ${MAX_BYTES}); a heavy renderer likely leaked in`,
  );
}

console.log(
  `  MCP server  -> bridge/mcp-server.cjs (${Math.round(size / 1024)} KB)`,
);
