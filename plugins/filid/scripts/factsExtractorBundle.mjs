/**
 * Build options and isolation guard of the facts extractor bundle.
 *
 * Shared by scripts/buildFactsExtractor.mjs, which writes bridge/filid-facts.mjs,
 * and by the unit test that builds the same bundle in memory, so the guard the
 * test exercises is the one the build enforces.
 */
import { portableResolve } from '@ogham/cross-platform';

/** Byte cap: the adapter parsing code, a JSON writer and argument handling measured about 40 KiB minified. */
export const FACTS_EXTRACTOR_MAX_BYTES = 64 * 1024;

/** Text that must not occur in the bundle; each survives minification. */
const FORBIDDEN_PATTERNS = [
  // Validation runtimes, by the error names they set as string literals
  /\bZodError\b/,
  /\bZodObject\b/,
  /\bZodType\b/,
  /\bsafeParse\b/,
  /\bAjv\b/,
  // The MCP SDK, by a protocol method literal its types module always carries
  /notifications\/initialized/,
  /@modelcontextprotocol\/sdk/,
  // The MCP tool surface
  /\breview_state\b/,
  /\bfractal_inspect\b/,
  // Glob family and heavy utility libs
  /\bfast-glob\b/,
  /\bmicromatch\b/,
  /\bpicomatch\b/,
  /\blodash\b/,
  // Process starts other than --all's one git call
  /detached:/,
  /\bexecFileSync\b/,
  /\bexecSync\(/,
  /\bspawnDetached\b/,
  /\bfork\(/,
  /\bexecFile\(/,
  // A bare call only: `x.exec(` is spelled like RegExp.prototype.exec, which the adapter uses
  /(?<![\w$.])exec\(/,
];

/**
 * Process-start calls the bundle holds exactly once, by the text that is counted.
 *
 * `spawnSync(` is cross-spawn's call behind the one fixed git invocation.
 * `spawn(` is cross-spawn's asynchronous export: CommonJS is not tree-shaken,
 * so it rides along, and the program never calls it.
 */
const SINGLE_CALLS = [
  ['spawnSync(', /spawnSync\(/g],
  ['spawn(', /\bspawn\(/g],
];

/**
 * The esbuild options of the bundle, without an output target.
 * @param root Absolute package root holding `src/`.
 * @returns Options for a minified self-contained ESM program for Node 20.
 */
export function factsExtractorBuildOptions(root) {
  return {
    entryPoints: [
      portableResolve(root, 'src', 'factsExtractor', 'factsExtractor.entry.ts'),
    ],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    minify: true,
    sourcemap: false,
    treeShaking: true,
  };
}

/**
 * Check a built bundle against the isolation guard.
 *
 * `--all` selects the server's file set with git's ignore semantics, so the
 * bundle holds each of `SINGLE_CALLS` exactly once — what cross-spawn brings
 * behind the one fixed git invocation — and no other way to start a process.
 * @param content Bundle text.
 * @param size Bundle size in bytes.
 * @returns One line per violation; empty when the bundle passes.
 */
export function findFactsBundleViolations(content, size) {
  const violations = [];
  if (size > FACTS_EXTRACTOR_MAX_BYTES)
    violations.push(
      `${size} bytes > ${FACTS_EXTRACTOR_MAX_BYTES} (${(size / 1024).toFixed(1)} KB > ${(FACTS_EXTRACTOR_MAX_BYTES / 1024).toFixed(0)} KB)`,
    );
  for (const pattern of FORBIDDEN_PATTERNS)
    if (pattern.test(content))
      violations.push(`forbidden pattern ${pattern} matched`);
  for (const [call, pattern] of SINGLE_CALLS) {
    const calls = (content.match(pattern) ?? []).length;
    if (calls !== 1)
      violations.push(`${call} occurs ${calls} times, expected 1`);
  }
  return violations;
}
