#!/usr/bin/env node
/**
 * Build script for the facts extractor bundle
 * Bundles src/factsExtractor into a self-contained ESM program the agent runs
 * from its own shell: `node <plugin>/bridge/filid-facts.mjs --root <dir> --out <file> ...`.
 *
 * Output: bridge/filid-facts.mjs
 *
 * Isolation guard: the program shares only the ECMAScript adapter's parsing
 * code, types and constants with the plugin. The MCP server, its validation
 * runtime and the MCP SDK must never be pulled in — the server does not import
 * this program either — so the guard in scripts/factsExtractorBundle.mjs fails
 * the build right after bundling, as scripts/buildHooks.mjs does for the hook
 * bundles; a unit test applies the same guard to an in-memory build.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { portableResolve } from '@ogham/cross-platform';
import * as esbuild from 'esbuild';
import { mkdir, readFile, stat } from 'fs/promises';

import {
  FACTS_EXTRACTOR_MAX_BYTES,
  factsExtractorBuildOptions,
  findFactsBundleViolations,
} from './factsExtractorBundle.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = portableResolve(__dirname, '..');
const BRIDGE_DIRECTORY = portableResolve(ROOT, 'bridge');
const BUNDLE_NAME = 'filid-facts.mjs';
const OUTFILE = portableResolve(BRIDGE_DIRECTORY, BUNDLE_NAME);

await mkdir(BRIDGE_DIRECTORY, { recursive: true });
await esbuild.build({ ...factsExtractorBuildOptions(ROOT), outfile: OUTFILE });
console.log(`  Facts extractor -> bridge/${BUNDLE_NAME}`);

const { size } = await stat(OUTFILE);
const violations = findFactsBundleViolations(
  await readFile(OUTFILE, 'utf8'),
  size,
);
if (violations.length > 0) {
  console.error('\nFacts extractor bundle isolation violation:');
  for (const violation of violations)
    console.error(`  ${BUNDLE_NAME}: ${violation}`);
  console.error(
    '\nThe extractor may share only the ECMAScript adapter parsing code, types and constants.\n' +
      'Server code, zod, the MCP SDK and process spawning beyond the one git call belong elsewhere.',
  );
  process.exit(1);
}

console.log(
  `  Facts extractor guard passed (<= ${FACTS_EXTRACTOR_MAX_BYTES} bytes, no forbidden modules, one spawnSync)`,
);
