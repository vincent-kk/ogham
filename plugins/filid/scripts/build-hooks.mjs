#!/usr/bin/env node
/**
 * Build script for hook entry point bundles
 * Bundles each hook into a self-contained ESM file for plugin distribution
 *
 * Output: bridge/<name>.mjs
 *
 * Hook isolation guards: hooks must remain thin scripts (Node builtins only).
 * Pulling external runtimes into a hook bundle breaks per-event cold-start
 * budget and has caused production crashes (e.g. v0.4.0 zod / fast-glob
 * regression). Tiered per-hook byte caps + FORBIDDEN_PATTERNS enforce this at
 * build time.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateWindowsCmd } from '@ogham/cross-platform/shim';
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

// Windows .cmd shim — invoked from hooks.json on win32 when PATH lacks node.
// Routes through libs/run.cjs (process.execPath via spawnSync) so the actual
// hook bundle still executes via the same node binary.
generateWindowsCmd({
  outputPath: resolve(root, 'bridge/run-hook.cmd'),
  scriptRelativePath: '../libs/run.cjs',
});
console.log('  Windows hook shim -> bridge/run-hook.cmd');

// Tiers reflect what each hook pulls from @ogham/cross-platform:
//   LIGHT         — logHookFailure only (no spawn-dependent helper inlined).
//                   user-prompt-submit additionally carries the per-prompt
//                   spike banner (fs-only git meta readers, no spawn).
//   HEAVY         — guard-heavy orchestration with logHookFailure
//                   (intent-injector + pre-tool-validator + structure-guard
//                   + spike mode gate + criteria-ledger lint + mode audit
//                   + FCA opt-in gate + write-visit recording + fmap file
//                   lock).
//   SESSION_START — selfProbe (spawn-dependent → cross-spawn inlined) + logHookFailure.
const SESSION_START_HOOK_BYTES = 40 * 1024;
const HEAVY_HOOK_BYTES = 24 * 1024;
const LIGHT_HOOK_BYTES = 12 * 1024;

// `name` is the bridge output basename (kebab — referenced by hooks.json and
// kept stable). `entry` is the camelCase src module/dir basename.
const hookEntries = [
  { name: 'pre-tool-use', entry: 'preToolUse', maxBytes: HEAVY_HOOK_BYTES },
  {
    name: 'agent-enforcer',
    entry: 'agentEnforcer',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  {
    name: 'user-prompt-submit',
    entry: 'userPromptSubmit',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  {
    name: 'session-cleanup',
    entry: 'sessionCleanup',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  { name: 'setup', entry: 'setup', maxBytes: SESSION_START_HOOK_BYTES },
];

// esbuild's ESM output wraps `require` in a throwing shim ("Dynamic require
// of X is not supported"). cross-spawn (CJS, pulled via @ogham/cross-platform/
// self-probe) calls require('child_process') at load time, so without this
// banner the bundle crashes on import. createRequire from node:module restores
// a working require for CJS deps inlined into ESM.
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
// NOTE: `Dynamic require of ...` esbuild CJS-shim string is intentionally
// allowed — @ogham/cross-platform/self-probe pulls cross-spawn (CJS) into the
// setup (SessionStart) bundle, which produces that shim during ESM bundling.
// The filid 0.4.0 module-init crash signature was a different failure mode
// (require evaluated at module-init time, not the lazy shim).

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
    '\nHooks must stay thin (Node builtins + @ogham/cross-platform light helpers).\n' +
      `Per-hook caps: session-start <= ${SESSION_START_HOOK_BYTES} bytes,\n` +
      `heavy <= ${HEAVY_HOOK_BYTES} bytes, light <= ${LIGHT_HOOK_BYTES} bytes.\n` +
      'External modules and cross-platform heavy helpers (binaries.discover,\n' +
      'runHookEntry, generateWindowsCmd) belong in MCP / Skill paths.',
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (session-start <= ${SESSION_START_HOOK_BYTES}, heavy <= ${HEAVY_HOOK_BYTES}, light <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules)`,
);
