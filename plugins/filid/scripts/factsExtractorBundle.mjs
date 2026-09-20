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
  // Any way to start a process, and any path to one
  /node:child_process/,
  /require\(["']child_process["']\)/,
  /from\s*["']child_process["']/,
  /import\s*\(\s*["'](?:node:)?child_process["']\s*\)/,
  /\bspawnSync\(/,
  /\bspawn\(/,
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
 * The server owns the scope, so the extractor reads a file list and starts no
 * process: the bundle carries no `child_process` import and no call that could
 * start one.
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
  return violations;
}
