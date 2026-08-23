#!/usr/bin/env node
/**
 * Bundle src/hooks/<name>/build/<name>.entry.ts -> bridge/<name>.mjs
 *
 * Hooks must remain thin scripts (Node builtins only). Pulling external
 * runtimes into a hook bundle breaks the per-event cold-start budget. A
 * 10 KB per-bundle cap + a FORBIDDEN_PATTERNS list block known offenders at
 * build time.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const check = args.includes('--check');
const outputDirIndex = args.indexOf('--output-dir');
if (outputDirIndex >= 0 && !args[outputDirIndex + 1])
  throw new Error('--output-dir requires a path');
const outputDir =
  outputDirIndex >= 0
    ? resolve(root, args[outputDirIndex + 1])
    : resolve(root, 'bridge');

if (!check) await mkdir(outputDir, { recursive: true });

const LIGHT_HOOK_BYTES = 10 * 1024;

const hookEntries = [
  { name: 'injectStatic', maxBytes: LIGHT_HOOK_BYTES },
  { name: 'injectDynamic', maxBytes: LIGHT_HOOK_BYTES },
];

const buildResults = await Promise.all(
  hookEntries.map(async ({ name }) => ({
    name,
    result: await esbuild.build({
      entryPoints: [resolve(root, `src/hooks/${name}/build/${name}.entry.ts`)],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: resolve(outputDir, `${name}.mjs`),
      minify: true,
      sourcemap: false,
      treeShaking: true,
      write: !check,
    }),
  })),
);

console.log(
  check
    ? `  Hook scripts (${hookEntries.length}) checked -> ${outputDir}`
    : `  Hook scripts (${hookEntries.length}) -> ${outputDir}`,
);

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
  // cross-platform heavy helpers — MCP bundle only, never in LIGHT hook bundle
  /\bbinaries\.discover\b/,
  /\brunHookEntry\b/,
  /\bselfProbe\b/,
  /\blogHookFailure\b/,
  /\bgenerateWindowsCmd\b/,
  // cross-spawn is heavy; hooks must not pull a spawn wrapper into LIGHT bundle
  /\bcross-spawn\b/,
];

// `sideEffects: false` lets root-barrel-only inputs shake out; emitted bytes and patterns remain the regression guards.
const violations = [];

for (const { name, maxBytes } of hookEntries) {
  const file = resolve(outputDir, `${name}.mjs`);
  const buildResult = buildResults.find((entry) => entry.name === name).result;
  let content;
  if (check) {
    content = Buffer.from(buildResult.outputFiles[0].contents);
    let existing = null;
    try {
      existing = await readFile(file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (existing === null || !content.equals(existing))
      violations.push(`  ${name}.mjs: generated output is out of sync`);
  } else content = await readFile(file);

  const size = content.byteLength;
  if (size > maxBytes) {
    violations.push(
      `  ${name}.mjs: ${size} bytes > ${maxBytes} (${(size / 1024).toFixed(1)} KB > ${(maxBytes / 1024).toFixed(0)} KB)`,
    );
  }
  const source = content.toString('utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
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
  `  Hook bundle guards passed (LIGHT <= ${LIGHT_HOOK_BYTES} bytes, no forbidden modules${check ? ', generated output in sync' : ''})`,
);
