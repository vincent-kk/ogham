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
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generateWindowsCmd,
  portableResolve,
  removeFileIfExistsSync,
} from '@ogham/cross-platform';
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = portableResolve(__dirname, '..');
const BRIDGE_DIRECTORY = portableResolve(ROOT, 'bridge');
const KILO_BYTE = 1024;
const HOOK_BUNDLE_NAME = Object.freeze({
  SETUP: 'setup',
  USER_PROMPT_SUBMIT: 'user-prompt-submit',
  PRE_TOOL_USE: 'pre-tool-use',
});
const HOOK_ENTRY_NAME = Object.freeze({
  SETUP: 'setup',
  USER_PROMPT_SUBMIT: 'userPromptSubmit',
  PRE_TOOL_USE: 'preToolUse',
});
const SHARED_RUNNER_NAME = Object.freeze({
  AGY: 'run-agy',
  HOST: 'run-hook.cmd',
});
const RETIRED_HOOK_BUNDLE_NAME = 'agent-enforcer.mjs';
const RETIRED_HOOK_BUNDLES = [
  portableResolve(BRIDGE_DIRECTORY, RETIRED_HOOK_BUNDLE_NAME),
];

await mkdir(BRIDGE_DIRECTORY, { recursive: true });
for (const retiredBundle of RETIRED_HOOK_BUNDLES)
  removeFileIfExistsSync(retiredBundle);

// Windows .cmd shim — invoked from hooks.json on win32 when PATH lacks node.
// Routes through libs/run.cjs (process.execPath via spawnSync) so the actual
// hook bundle still executes via the same node binary.
generateWindowsCmd({
  outputPath: portableResolve(BRIDGE_DIRECTORY, SHARED_RUNNER_NAME.HOST),
  scriptRelativePath: '../libs/run.cjs',
});
console.log('  Windows hook shim -> bridge/run-hook.cmd');

// Tiers reflect what each hook pulls from @ogham/cross-platform:
//   LIGHT         — logHookFailure only (no spawn-dependent helper inlined).
//                   user-prompt-submit additionally carries session context.
//   HEAVY         — guard-heavy orchestration with logHookFailure
//                   (delivery-state visit pipeline: commitVisit transaction
//                   + 3-state TTL soft delivery + scoped fmap
//                   + pre-tool-validator + structure-guard + FCA opt-in gate).
//                   36KB keeps a bounded cold-start budget while leaving room
//                   for guard state and conservative Move projection.
//   SESSION_START — selfProbeHook (Node builtin spawnSync) + logHookFailure.
//                   Output fingerprints reject cross-spawn/which even when the
//                   byte cap still fits.
// Caps sized for the merged bundle set (Codex read-tracking hooks + settings/
// project_setup settings action). #87 routed cwd hashing through portableResolve, pulled into the
// pre-tool-use path via cacheManager. Still Node builtins only — FORBIDDEN_PATTERNS
// below is the real isolation guard, not these caps.
const SESSION_START_HOOK_BYTES = 48 * KILO_BYTE;
const HEAVY_HOOK_BYTES = 36 * KILO_BYTE;
const LIGHT_HOOK_BYTES = 16 * KILO_BYTE;

// `name` is the bridge output basename (kebab — referenced by hooks.json and
// kept stable). `entry` is the camelCase src module/dir basename.
const HOOK_ENTRIES = [
  {
    name: HOOK_BUNDLE_NAME.SETUP,
    entry: HOOK_ENTRY_NAME.SETUP,
    maxBytes: SESSION_START_HOOK_BYTES,
  },
  {
    name: HOOK_BUNDLE_NAME.USER_PROMPT_SUBMIT,
    entry: HOOK_ENTRY_NAME.USER_PROMPT_SUBMIT,
    maxBytes: LIGHT_HOOK_BYTES,
  },
  {
    name: HOOK_BUNDLE_NAME.PRE_TOOL_USE,
    entry: HOOK_ENTRY_NAME.PRE_TOOL_USE,
    maxBytes: HEAVY_HOOK_BYTES,
  },
];

await Promise.all(
  HOOK_ENTRIES.map(async ({ name, entry }) =>
    esbuild.build({
      entryPoints: [
        portableResolve(ROOT, 'src', 'hooks', entry, `${entry}.entry.ts`),
      ],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: portableResolve(BRIDGE_DIRECTORY, `${name}.mjs`),
      minify: true,
      sourcemap: false,
      treeShaking: true,
    }),
  ),
);

console.log(`  Hook scripts (${HOOK_ENTRIES.length}) -> bridge/*.mjs`);

// `sideEffects: false` makes root-barrel-only inputs non-contributing; emitted bytes and patterns guard regressions.

// agy hook runner (shared — bundled from @ogham/cross-platform, not this
// plugin's src). The emitted agy hooks.json (plugin root, named-group format)
// routes each event through this runner, which translates agy's camelCase
// payload to the Claude contract, runs the same bridge/<event>.mjs handler, and
// translates the reply back. Bundling it here ships it in bridge/ so
// `agy plugin install` distributes it. Contract: tools/plugin-compiler
// buildAgyHooks emits `node bridge/run-agy.mjs <ClaudeEvent> bridge/<handler>.mjs`.
// It pulls only Node builtins (spawnSync + the pure agy-hooks translation), so
// it stays under the light cap and trips no FORBIDDEN_PATTERNS.
const RUN_AGY_HOOK_BYTES = 12 * 1024;
await esbuild.build({
  entryPoints: [
    fileURLToPath(import.meta.resolve('@ogham/cross-platform/agy-runner/main')),
  ],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: portableResolve(BRIDGE_DIRECTORY, `${SHARED_RUNNER_NAME.AGY}.mjs`),
  minify: true,
  sourcemap: false,
  treeShaking: true,
});
console.log('  agy hook runner -> bridge/run-agy.mjs');

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
  // cross-spawn/which fingerprints that survive minification
  /\bPATHEXT\b/,
  /\bisexe\b/,
];
const violations = [];

const guardedBundles = [
  ...HOOK_ENTRIES,
  { name: SHARED_RUNNER_NAME.AGY, maxBytes: RUN_AGY_HOOK_BYTES },
];

for (const { name, maxBytes } of guardedBundles) {
  const file = portableResolve(BRIDGE_DIRECTORY, `${name}.mjs`);
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
