#!/usr/bin/env node
/**
 * Build script for hook entry point bundles
 * Bundles each hook into a self-contained ESM file for plugin distribution
 *
 * Output: bridge/<name>.mjs
 *
 * One bundle per Claude Code event: each bridge is a dispatcher that folds that
 * event's concern handlers into a single process (see src/hooks/eventDispatch).
 *
 * Hook isolation guards: hooks must remain thin scripts (Node builtins only).
 * Pulling external runtimes (zod, fast-glob, MCP SDK) into a hook bundle breaks
 * per-event cold-start budget. Per-event size caps + FORBIDDEN_PATTERNS enforce
 * this at build time. session-start carries an inlined meta-skill-body.md
 * payload so it gets the highest cap.
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

// Per-event dispatcher bundles: each bridge folds that event's concern handlers
// (+ the lifecycle dispatcher) into one process. Caps reflect the union of those
// concerns' code; the FORBIDDEN_PATTERNS guard below still holds — combining
// clean concerns must not pull zod / fast-glob / MCP SDK.
//   session-start      — sessionStart (selfProbe + inlined meta-skill-body.md
//                        + claudeMd merge + insight stats + full L1 core reader
//                        buildL1CoreBlock) + lifecycle.
//   user-prompt-submit — contextInjector + insightInjector + lifecycle +
//                        vaultCommitter (spawnCli/git). Includes the companion
//                        identity v2 turn renderer + graceful v1→v2 normalize
//                        (normalizeToV2) reached via buildTurnContext — pure
//                        Node-builtin functions, no external runtime.
//   session-end        — sessionEnd (recap + digest) + lifecycle +
//                        vaultCommitter (spawnCli/git).
//   stop               — changelogGate (spawnCli/git) + lifecycle.
//   post-tool-use      — activityRecorder + lifecycle.
//   pre-tool-use       — layerGuard + vaultRedirector + lifecycle (all light).
// 48 -> 52 KB: buildL1CoreBlock injects the full L1 core documents once at
// session start (pure Node-builtin fs reads + frontmatter strip, no external
// runtime). FORBIDDEN_PATTERNS below still enforces the real isolation guard.
const SESSION_START_BYTES = 52 * 1024;
// 32 -> 34 KB: companion identity v2 added the per-turn binding renderer plus
// graceful v1->v2 normalization to the turn path (buildTurnContext). All added
// bytes are pure Node-builtin functions; the isolation guarantee (no zod /
// fast-glob / MCP SDK) is still enforced by FORBIDDEN_PATTERNS below.
const USER_PROMPT_SUBMIT_BYTES = 36 * 1024;
const SESSION_END_BYTES = 32 * 1024;
const STOP_BYTES = 24 * 1024;
const POST_TOOL_USE_BYTES = 12 * 1024;
const PRE_TOOL_USE_BYTES = 12 * 1024;

// `name` is the bridge output basename (kebab — referenced by hooks.json and
// kept stable). `entryPath` is the esbuild entry relative to src/hooks.
const hookEntries = [
  {
    name: 'session-start',
    entryPath: 'sessionStart/sessionStart.entry.ts',
    maxBytes: SESSION_START_BYTES,
  },
  {
    name: 'user-prompt-submit',
    entryPath: 'userPromptSubmit/userPromptSubmit.entry.ts',
    maxBytes: USER_PROMPT_SUBMIT_BYTES,
  },
  {
    name: 'pre-tool-use',
    entryPath: 'preToolUse/preToolUse.entry.ts',
    maxBytes: PRE_TOOL_USE_BYTES,
  },
  {
    name: 'post-tool-use',
    entryPath: 'postToolUse/postToolUse.entry.ts',
    maxBytes: POST_TOOL_USE_BYTES,
  },
  {
    name: 'stop',
    entryPath: 'stop/stop.entry.ts',
    maxBytes: STOP_BYTES,
  },
  {
    name: 'session-end',
    entryPath: 'sessionEnd/sessionEnd.entry.ts',
    maxBytes: SESSION_END_BYTES,
  },
];

// esbuild's ESM output wraps `require` in a throwing shim ("Dynamic require
// of X is not supported"). cross-spawn (CJS) calls require('child_process') at
// load time, so without this banner the bundle crashes on import. createRequire
// from node:module restores a working require for CJS deps inlined into ESM.
const ESM_CJS_REQUIRE_BANNER =
  "import { createRequire as __cpCreateRequire } from 'node:module';\n" +
  'const require = __cpCreateRequire(import.meta.url);\n';

await Promise.all(
  hookEntries.map(({ name, entryPath }) =>
    esbuild.build({
      entryPoints: [resolve(root, 'src/hooks', entryPath)],
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
  `  Hook bundle guards passed (per-event caps: session-start <= ${SESSION_START_BYTES}, user-prompt-submit <= ${USER_PROMPT_SUBMIT_BYTES}, session-end <= ${SESSION_END_BYTES}, stop <= ${STOP_BYTES}, post-tool-use <= ${POST_TOOL_USE_BYTES}, pre-tool-use <= ${PRE_TOOL_USE_BYTES} bytes, no forbidden modules)`,
);
