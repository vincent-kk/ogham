#!/usr/bin/env node
/**
 * Bundle each hook into a self-contained ESM file for plugin distribution.
 *
 * Output: bridge/<name>.mjs
 *
 * Hooks must stay thin scripts — Node builtins plus the light
 * cross-platform helpers. A hook pays its cold start on every event, and
 * pulling a validation runtime or a glob engine into one has caused
 * production crashes before. The byte caps and FORBIDDEN_PATTERNS below
 * are what enforce that, because typecheck cannot see it: importing a
 * barrel that happens to re-export a heavy module is invisible in source
 * and obvious in the bundle.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateWindowsCmd } from '@ogham/cross-platform/shim';
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const KILO_BYTE = 1024;

await mkdir(resolve(root, 'bridge'), { recursive: true });

// Windows .cmd shim — invoked from hooks.json on win32 when PATH lacks
// node. Routes through libs/run.cjs so the hook still runs under the same
// node binary.
generateWindowsCmd({
  outputPath: resolve(root, 'bridge/run-hook.cmd'),
  scriptRelativePath: '../libs/run.cjs',
});
console.log('  Windows hook shim -> bridge/run-hook.cmd');

// Every hook is light: none probes for external binaries, so none pulls a
// spawn implementation into its bundle.
const LIGHT_HOOK_BYTES = 16 * KILO_BYTE;

// `name` is the bridge output basename, referenced by hooks.json and kept
// stable. `entry` is the camelCase source directory.
const hookEntries = [
  { name: 'setup', entry: 'setup', maxBytes: LIGHT_HOOK_BYTES },
  {
    name: 'user-prompt-submit',
    entry: 'userPromptSubmit',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  { name: 'post-tool-use', entry: 'postToolUse', maxBytes: LIGHT_HOOK_BYTES },
  {
    name: 'subagent-start',
    entry: 'subagentStart',
    maxBytes: LIGHT_HOOK_BYTES,
  },
  {
    name: 'instructions-loaded',
    entry: 'instructionsLoaded',
    maxBytes: LIGHT_HOOK_BYTES,
  },
];

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
    }),
  ),
);

console.log(`  Hook scripts (${hookEntries.length}) -> bridge/*.mjs`);

const FORBIDDEN_PATTERNS = [
  // Glob family
  /\bfast-glob\b/,
  /@nodelib\b/,
  /\bmicromatch\b/,
  /\bpicomatch\b/,
  /\bminimatch\b/,
  // Validation runtimes — the dial is narrowed by a hand-written
  // predicate precisely so none of these reach a hook.
  /\bZodError\b/,
  /\bZodObject\b/,
  /\bZodType\b/,
  /\bsafeParse\b/,
  // MCP server (long-running) belongs in mcp-server.cjs, never in a hook
  /@modelcontextprotocol\/sdk/,
  // env-paths arrives with `paths.configDir` / `paths.cacheDir`. Hooks
  // only need `pluginCache`, which uses node builtins, so a match here
  // means tree-shaking stopped working and the whole module came along.
  //
  // Matched by a string from inside env-paths rather than by its package
  // name: bundling erases module names, so a `/env-paths/` pattern would
  // pass whether or not the module was actually inlined. Every pattern
  // in this list has to survive minification or it guards nothing.
  /\bXDG_CONFIG_HOME\b/,
  // cross-platform heavy helpers — MCP and build paths only
  /\bcross-spawn\b/,
  /\bbinaries\.discover\b/,
  /\bgenerateWindowsCmd\b/,
];

const violations = [];

for (const { name, maxBytes } of hookEntries) {
  const file = resolve(root, `bridge/${name}.mjs`);
  const { size } = await stat(file);
  if (size > maxBytes)
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${maxBytes} (${(size / KILO_BYTE).toFixed(1)} KB > ${(maxBytes / KILO_BYTE).toFixed(0)} KB)`,
    );

  const content = await readFile(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS)
    if (pattern.test(content))
      violations.push(`  ${name}.mjs: forbidden pattern ${pattern} matched`);
}

if (violations.length > 0) {
  console.error('\nHook bundle isolation violation:');
  for (const violation of violations) console.error(violation);
  console.error(
    `\nHooks must stay thin (Node builtins + light cross-platform helpers).\n` +
      `Per-hook cap: ${LIGHT_HOOK_BYTES} bytes. External runtimes belong in\n` +
      `the MCP or skill paths, which pay their cost once per session.`,
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (each <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules)`,
);
