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

import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

// session-start carries an inlined meta-skill-body.md (~2.5 KB intentional
// payload via .md text loader), so it gets +5 KB headroom over the other
// heavy hooks. session-end/insight-injector run pure orchestration logic.
const SESSION_START_HOOK_BYTES = 25 * 1024;
const HEAVY_HOOK_BYTES = 20 * 1024;
const LIGHT_HOOK_BYTES = 10 * 1024;

const hookEntries = [
  { name: 'session-start', maxBytes: SESSION_START_HOOK_BYTES },
  { name: 'session-end', maxBytes: HEAVY_HOOK_BYTES },
  { name: 'insight-injector', maxBytes: HEAVY_HOOK_BYTES },
  { name: 'context-injector', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'dailynote-recorder', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'vault-committer', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'changelog-gate', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'lifecycle-dispatcher', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'vault-redirector', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'layer-guard', maxBytes: LIGHT_HOOK_BYTES },
];

await Promise.all(
  hookEntries.map(({ name }) =>
    esbuild.build({
      entryPoints: [resolve(root, `src/hooks/${name}/${name}.entry.ts`)],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: resolve(root, `bridge/${name}.mjs`),
      minify: true,
      sourcemap: false,
      treeShaking: true,
      loader: { '.md': 'text' },
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
  // CJS dynamic-require shim (filid 0.4.0 module-init crash signature)
  /Dynamic require of/,
];

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
      'not in hook bundles. See packages/maencof/src/types/dialogue-config-guard.ts\n' +
      'and insight-guard.ts for the zod-free guard pattern.',
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (session-start <= ${SESSION_START_HOOK_BYTES} bytes, heavy <= ${HEAVY_HOOK_BYTES} bytes, light <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules)`,
);
