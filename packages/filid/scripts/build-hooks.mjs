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
 * regression). MAX_HOOK_BYTES + FORBIDDEN_PATTERNS enforce this at build time.
 */

import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

const hookEntries = [
  'pre-tool-use',
  'agent-enforcer',
  'user-prompt-submit',
  'session-cleanup',
  'setup',
];

await Promise.all(
  hookEntries.map((name) =>
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
    }),
  ),
);

console.log(`  Hook scripts (${hookEntries.length}) -> bridge/*.mjs`);

const MAX_HOOK_BYTES = 15 * 1024;
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
];

const violations = [];

for (const name of hookEntries) {
  const file = resolve(root, `bridge/${name}.mjs`);
  const { size } = await stat(file);
  if (size > MAX_HOOK_BYTES) {
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${MAX_HOOK_BYTES} (${(size / 1024).toFixed(1)} KB)`,
    );
  }
  const content = await readFile(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      violations.push(
        `  ${name}.mjs: forbidden pattern ${pattern} matched`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error('\nHook bundle isolation violation:');
  for (const v of violations) console.error(v);
  console.error(
    '\nHooks must stay thin (Node builtins only, <= 15 KB). External modules\n' +
      'belong in MCP/Skill paths, not hook bundles.',
  );
  process.exit(1);
}

console.log(`  Hook bundle guards passed (<= ${MAX_HOOK_BYTES} bytes, no forbidden modules)`);
