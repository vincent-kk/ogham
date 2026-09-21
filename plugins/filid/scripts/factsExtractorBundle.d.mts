import type { BuildOptions } from 'esbuild';

/** Byte cap of the facts extractor bundle. */
export declare const FACTS_EXTRACTOR_MAX_BYTES: number;

/**
 * The esbuild options of the bundle, without an output target.
 * @param root Absolute package root holding `src/`.
 */
export declare function factsExtractorBuildOptions(root: string): BuildOptions;

/**
 * Check a built bundle against the isolation guard.
 * @param content Bundle text.
 * @param size Bundle size in bytes.
 * @returns One line per violation; empty when the bundle passes.
 */
export declare function findFactsBundleViolations(
  content: string,
  size: number,
): string[];
