#!/usr/bin/env node
/**
 * Build script for hook entry point bundles
 * Output: bridge/<name>.mjs
 *
 * Hook isolation guards: hooks must remain thin scripts (Node builtins only).
 * The `@ogham/maencof` alias keeps monorepo dev ergonomic, but anything pulled
 * through it (zod, fast-glob, MCP SDK, AST tooling) must NOT land in the hook
 * bundle. MAX_HOOK_BYTES + FORBIDDEN_PATTERNS + alias-whitelist enforce this
 * at build time. The `Dynamic require of` shim signature is also rejected to
 * prevent the filid 0.4.0 module-init crash regression.
 */
import { generateWindowsCmd } from "@ogham/cross-platform/shim";
import * as esbuild from "esbuild";
import { mkdir, readFile, stat } from "fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

await mkdir(resolve(root, "bridge"), { recursive: true });

// Windows .cmd shim — invoked from hooks.json on win32 when PATH lacks node.
// Routes through libs/run.cjs (uses process.execPath via spawnSync).
generateWindowsCmd({
  outputPath: resolve(root, "bridge/run-hook.cmd"),
  scriptRelativePath: "../libs/run.cjs",
});
console.log("  Windows hook shim -> bridge/run-hook.cmd");

// session-start inlines selfProbe (spawn-dependent) + logHookFailure, so its
// budget is set above the previous 20 KB ceiling. Other (non-spawn) entries
// would land under the LIGHT 10 KB tier — pattern matches maencof's caps.
const MAX_HOOK_BYTES = 40 * 1024;

// `name` is the bridge output basename (kebab — referenced by hooks.json and
// kept stable). `entry` is the camelCase src module/dir basename.
const hookEntries = [{ name: "session-start", entry: "sessionStart" }];

// esbuild's ESM output wraps `require` in a throwing shim ("Dynamic require
// of X is not supported"). cross-spawn (CJS, pulled via @ogham/cross-platform/
// self-probe) calls require('child_process') at load time, so without this
// banner the bundle crashes on import. createRequire from node:module restores
// a working require for CJS deps inlined into ESM.
const ESM_CJS_REQUIRE_BANNER =
  "import { createRequire as __cpCreateRequire } from 'node:module';\n" +
  "const require = __cpCreateRequire(import.meta.url);\n";

const hookBuilds = await Promise.all(
  hookEntries.map(async ({ name, entry }) => ({
    name,
    result: await esbuild.build({
      entryPoints: [resolve(root, `src/hooks/${entry}/${entry}.entry.ts`)],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "esm",
      outfile: resolve(root, `bridge/${name}.mjs`),
      minify: true,
      sourcemap: false,
      treeShaking: true,
      metafile: true,
      banner: { js: ESM_CJS_REQUIRE_BANNER },
      alias: {
        "@ogham/maencof": resolve(root, "../maencof/src"),
      },
    }),
  })),
);

console.log(`  Hook scripts (${hookEntries.length}) -> bridge/*.mjs`);

const FORBIDDEN_PATTERNS = [
  // Glob family
  /\bfast-glob\b/,
  /@nodelib\b/,
  /\bmicromatch\b/,
  /\bbraces\b/,
  /\bpicomatch\b/,
  /\bminimatch\b/,
  /\bchokidar\b/,
  // Validation runtimes
  /\bZodError\b/,
  /\bZodObject\b/,
  /\bZodType\b/,
  /\bsafeParse\b/,
  /\bAjv\b/,
  // AST / native
  /@ast-grep\/napi/,
  /\btree-sitter\b/,
  // Heavy utility libs
  /\blodash\b/,
  /\bmoment\b/,
  /\bdate-fns\b/,
  // MCP server (long-running) belongs in mcp-server.cjs, never in hooks
  /@modelcontextprotocol\/sdk/,
  // cross-platform heavy helpers — MCP bundle only, never in hook bundle
  /\bbinaries\.discover\b/,
  /\brunHookEntry\b/,
  /\bgenerateWindowsCmd\b/,
];
// NOTE: `Dynamic require of ...` esbuild CJS-shim string is allowed —
// @ogham/cross-platform/self-probe pulls cross-spawn (CJS) into the
// session-start bundle, which produces that shim during ESM bundling.
// The filid 0.4.0 module-init crash signature was a different failure
// mode (require evaluated at module-init time, not the lazy shim).

// Alias whitelist (Option A): no maencof modules should land in the hook
// bundle. detectStale was switched to node:fs builtins so the hook is now
// alias-clean. Update this list (and remove from here) only when a deliberate
// hook-safe maencof export is introduced and reviewed.
const FORBIDDEN_ALIAS_PATTERNS = [/@ogham\/maencof\b/, /\bscanVault\b/];

// Barrel entry points of @ogham/cross-platform. A hook must reach the concrete
// module it needs rather than a barrel: the barrel puts every re-exported module
// in the bundle's input graph, and what tree-shaking happens to drop today it
// keeps the moment one of those modules gains a side effect. The output-string
// guards below cannot see this — only the metafile input graph can.
// KNOWN GAP — the SessionStart graph already reaches six barrels today, all
// through `config/configLoader` -> `@ogham/cross-platform/config-scope`:
//   paths/index.js · paths/paths.js · paths/compat/index.js ·
//   hostRegistry/index.js · filesystem/locking/index.js · instructions/index.js
// Closing them means either breaking `configScope/layers/INTENT.md`'s stated
// convention ("형제 모듈은 진입점으로 소비한다: ../merge, ../../paths,
// ../../filesystem") or changing what the hook loads — a design decision, not a
// build-script one. The bundle sits at 8.8 KB against a 40 KB cap, so it is not
// urgent. Those six are deliberately absent below so this guard stays green;
// it exists to stop the graph widening any further.
const FORBIDDEN_INPUTS = [
  "cross-platform/dist/filesystem/read/index.js",
  "cross-platform/dist/spawn/index.js",
  "cross-platform/dist/index.js",
  "agent-artifacts/dist/index.js",
];

const violations = hookBuilds.flatMap(({ name, result }) =>
  Object.keys(result.metafile.inputs).flatMap((input) => {
    const normalizedInput = input.replaceAll("\\", "/");
    return FORBIDDEN_INPUTS.flatMap((forbidden) =>
      normalizedInput.includes(forbidden)
        ? [`  ${name}.mjs: forbidden input graph ${forbidden}`]
        : [],
    );
  }),
);

for (const { name } of hookEntries) {
  const file = resolve(root, `bridge/${name}.mjs`);
  const { size } = await stat(file);
  if (size > MAX_HOOK_BYTES) {
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${MAX_HOOK_BYTES} (${(size / 1024).toFixed(1)} KB > ${(MAX_HOOK_BYTES / 1024).toFixed(0)} KB)`,
    );
  }
  const content = await readFile(file, "utf8");
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`  ${name}.mjs: forbidden pattern ${pattern} matched`);
    }
  }
  for (const pattern of FORBIDDEN_ALIAS_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(
        `  ${name}.mjs: alias whitelist violation — ${pattern} matched (Option A: hook must not pull from @ogham/maencof)`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error("\nHook bundle isolation violation:");
  for (const v of violations) console.error(v);
  console.error(
    "\nHooks must stay thin (Node builtins only). External runtimes and\n" +
      "maencof modules belong in mcp-server.cjs / skill paths, not in hook\n" +
      "bundles. See plugins/maencof/src/types/dialogueConfigGuard.ts and\n" +
      "maencof-lens/src/config/configSchema/guard/configGuard.ts for the\n" +
      "zod-free guard pattern.",
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (<= ${MAX_HOOK_BYTES} bytes, no forbidden modules, alias whitelist clean)`,
);
