#!/usr/bin/env node
/**
 * Build script for hook entry point bundles
 * Bundles each hook into a self-contained ESM file for plugin distribution
 *
 * Output: bridge/<name>.mjs
 *
 * Hook isolation guards: hooks must remain thin scripts (Node builtins only).
 * Pulling external runtimes (zod, fast-glob, MCP SDK) into a hook bundle breaks
 * per-event cold-start budget. Per-hook size caps + FORBIDDEN_PATTERNS enforce
 * this at build time. session-start carries an inlined meta-skill-body.md
 * payload so it gets a higher cap; other heavy hooks (session-end /
 * insight-injector) cap at 20 KB; light hooks cap at 10 KB.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateWindowsCmd } from '@ogham/cross-platform';
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

// Windows .cmd shim — invoked from hooks.json on win32 when PATH lacks node.
// Routes through libs/run.cjs (which uses process.execPath via spawnSync) so
// the actual hook bundle still executes via the same node binary.
generateWindowsCmd({
  outputPath: resolve(root, 'bridge/run-hook.cmd'),
  scriptRelativePath: '../libs/run.cjs',
});
console.log('  Windows hook shim -> bridge/run-hook.cmd');

// Tiers reflect what each hook pulls from @ogham/cross-platform:
//   LIGHT    — logHookFailure only (error-log entry; no spawn).
//   MEDIUM   — spawnCli from cross-platform/spawn — adds cross-spawn (~5 KB).
//   HEAVY    — session-end / insight-injector run pure orchestration but carry
//              extra src code (recap composer, insight stats).
//   SESSION_START — selfProbe (spawn-dependent) + inlined meta-skill-body.md.
const SESSION_START_HOOK_BYTES = 40 * 1024;
const HEAVY_HOOK_BYTES = 20 * 1024;
const MEDIUM_HOOK_BYTES = 15 * 1024;
const LIGHT_HOOK_BYTES = 10 * 1024;

// `name` is the bridge output basename (kebab — referenced by hooks.json and
// kept stable). `entry` is the camelCase src module/dir basename.
const hookEntries = [
  {
    name: 'session-start',
    entry: 'sessionStart',
    maxBytes: SESSION_START_HOOK_BYTES,
  },
  { name: 'session-end', entry: 'sessionEnd', maxBytes: HEAVY_HOOK_BYTES },
  {
    name: 'insight-injector',
    entry: 'insightInjector',
    maxBytes: HEAVY_HOOK_BYTES,
  },
  {
    name: 'context-injector',
    entry: 'contextInjector',
    maxBytes: HEAVY_HOOK_BYTES,
  },
  {
    name: 'activity-recorder',
    entry: 'activityRecorder',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  // spawnCli (git) callers — cross-spawn inlined
  {
    name: 'vault-committer',
    entry: 'vaultCommitter',
    maxBytes: HEAVY_HOOK_BYTES,
  },
  {
    name: 'changelog-gate',
    entry: 'changelogGate',
    maxBytes: HEAVY_HOOK_BYTES,
  },
  // logHookFailure only
  {
    name: 'lifecycle-dispatcher',
    entry: 'lifecycleDispatcher',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  {
    name: 'vault-redirector',
    entry: 'vaultRedirector',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  { name: 'layer-guard', entry: 'layerGuard', maxBytes: LIGHT_HOOK_BYTES },
];

// esbuild's ESM output wraps `require` in a throwing shim ("Dynamic require
// of X is not supported"). cross-spawn (CJS) calls require('child_process') at
// load time, so without this banner the bundle crashes on import. createRequire
// from node:module restores a working require for CJS deps inlined into ESM.
const ESM_CJS_REQUIRE_BANNER =
  "import { createRequire as __cpCreateRequire } from 'node:module';\n" +
  'const require = __cpCreateRequire(import.meta.url);\n';

await Promise.all(
  hookEntries.map(({ name, entry }) =>
    esbuild.build({
      entryPoints: [resolve(root, `src/hooks/${entry}/${entry}.entry.ts`)],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: resolve(root, `bridge/${name}.mjs`),
      minify: true,
      sourcemap: false,
      treeShaking: true,
      loader: { '.md': 'text' },
      banner: { js: ESM_CJS_REQUIRE_BANNER },
    }),
  ),
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
// NOTE: the `Dynamic require of ...` esbuild CJS-shim string is intentionally
// allowed because @ogham/cross-platform pulls in cross-spawn (CJS) into the
// session-start bundle. The filid 0.4.0 module-init crash signature was a
// different failure mode (require at module-init evaluation time, not the
// lazy require shim). If a future regression revisits the crash, gate on a
// more specific stack-frame pattern, not the generic shim message.

const violations = [];

for (const { name, maxBytes } of hookEntries) {
  const file = resolve(root, `bridge/${name}.mjs`);
  const { size } = await stat(file);
  if (size > maxBytes) {
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${maxBytes} (${(size / 1024).toFixed(1)} KB > ${(maxBytes / 1024).toFixed(0)} KB)`,
    );
  }
  const content = await readFile(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(`  ${name}.mjs: forbidden pattern ${pattern} matched`);
    }
  }
}

if (violations.length > 0) {
  console.error('\nHook bundle isolation violation:');
  for (const v of violations) console.error(v);
  console.error(
    '\nHooks must stay thin (Node builtins only). External runtimes (zod,\n' +
      'fast-glob, MCP SDK, AST tooling) belong in mcp-server.cjs / skill paths,\n' +
      'not in hook bundles. See plugins/maencof/src/types/dialogueConfigGuard.ts\n' +
      'and insightGuard.ts for the zod-free guard pattern.',
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (session-start <= ${SESSION_START_HOOK_BYTES}, heavy <= ${HEAVY_HOOK_BYTES}, medium <= ${MEDIUM_HOOK_BYTES}, light <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules)`,
);
