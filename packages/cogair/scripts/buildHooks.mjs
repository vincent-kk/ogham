#!/usr/bin/env node
/**
 * Bundle src/hooks/<name>/build/<name>.entry.ts -> bridge/<name>.mjs
 *
 * Hooks must remain thin scripts (Node builtins only). Pulling external
 * runtimes into a hook bundle breaks the per-event cold-start budget. A
 * 10 KB per-bundle cap + a FORBIDDEN_PATTERNS list block known offenders at
 * build time.
 */
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

const LIGHT_HOOK_BYTES = 10 * 1024;

const hookEntries = [
  { name: 'injectStatic', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'injectDynamic', maxBytes: LIGHT_HOOK_BYTES },
];

await Promise.all(
  hookEntries.map(({ name }) =>
    esbuild.build({
      entryPoints: [resolve(root, `src/hooks/${name}/build/${name}.entry.ts`)],
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
    `\nHooks must stay thin (Node builtins only). LIGHT cap = ${LIGHT_HOOK_BYTES / 1024} KB.\n` +
      'External modules belong in the MCP path, not hook bundles.',
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (LIGHT <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules)`,
);
