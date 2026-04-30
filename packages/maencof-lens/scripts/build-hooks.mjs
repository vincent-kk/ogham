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
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

const MAX_HOOK_BYTES = 20 * 1024;

const hookEntries = ['session-start'];

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
      alias: {
        '@ogham/maencof': resolve(root, '../maencof/src'),
      },
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

// Alias whitelist (Option A): no maencof modules should land in the hook
// bundle. detectStale was switched to node:fs builtins so the hook is now
// alias-clean. Update this list (and remove from here) only when a deliberate
// hook-safe maencof export is introduced and reviewed.
const FORBIDDEN_ALIAS_PATTERNS = [
  /@ogham\/maencof\b/,
  /\bscanVault\b/,
];

const violations = [];

for (const name of hookEntries) {
  const file = resolve(root, `bridge/${name}.mjs`);
  const { size } = await stat(file);
  if (size > MAX_HOOK_BYTES) {
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${MAX_HOOK_BYTES} (${(size / 1024).toFixed(1)} KB > ${(MAX_HOOK_BYTES / 1024).toFixed(0)} KB)`,
    );
  }
  const content = await readFile(file, 'utf8');
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
  console.error('\nHook bundle isolation violation:');
  for (const v of violations) console.error(v);
  console.error(
    '\nHooks must stay thin (Node builtins only). External runtimes and\n' +
      'maencof modules belong in mcp-server.cjs / skill paths, not in hook\n' +
      'bundles. See packages/maencof/src/types/dialogue-config-guard.ts and\n' +
      'maencof-lens/src/config/config-schema/guard/config-guard.ts for the\n' +
      'zod-free guard pattern.',
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (<= ${MAX_HOOK_BYTES} bytes, no forbidden modules, alias whitelist clean)`,
);
