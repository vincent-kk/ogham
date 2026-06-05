#!/usr/bin/env node
/**
 * Bundle src/hooks/<name>/build/<name>.entry.ts -> bridge/<name>.mjs
 *
 * Hooks stay thin (Node builtins only) so the per-event cold start is cheap.
 * A 10 KB per-bundle cap + a FORBIDDEN_PATTERNS list block heavy imports
 * (zod, MCP SDK, glob, lodash) at build time.
 */
import { mkdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await mkdir(resolve(root, 'bridge'), { recursive: true });

const LIGHT_HOOK_BYTES = 10 * 1024;

const hookEntries = [{ name: 'injectStatic', maxBytes: LIGHT_HOOK_BYTES }];

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
  /\bfast-glob\b/,
  /@nodelib\b/,
  /\bmicromatch\b/,
  /\bminimatch\b/,
  /\bZodError\b/,
  /\bZodObject\b/,
  /\bsafeParse\b/,
  /@ast-grep\/napi/,
  /\blodash\b/,
  /\bmoment\b/,
  /\bdate-fns\b/,
  /@modelcontextprotocol\/sdk/,
  /\bcross-spawn\b/,
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
    `\nHooks must stay thin (Node builtins only). LIGHT cap = ${LIGHT_HOOK_BYTES / 1024} KB.`,
  );
  process.exit(1);
}

console.log(
  `  Hook bundle guards passed (LIGHT <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules)`,
);
