import type { ContextResolution } from '../../../../../types/context.js';
import type { ContextResolveItemSummary } from '../../../../../types/report.js';

/** Values projected into one successful result's summary. */
export interface ContextResolveItemSummaryInput {
  /** Resolved target and owner-to-root chain. */
  resolution: ContextResolution;
  /** Snapshot diagnostics excluded from this chain. */
  diagnosticsOutOfScope: number;
  /** Omit entirely when the request asked for no comparison. */
  lowestCommonFractalPath?: string | null;
}

/**
 * Project one resolution into its result-local summary.
 * @param input Resolution, scoped diagnostic count and optional comparison.
 * @returns Summary for one successful request.
 */
export function buildContextResolveItemSummary(
  input: ContextResolveItemSummaryInput,
): ContextResolveItemSummary {
  const { resolution, diagnosticsOutOfScope } = input;
  return {
    targetPath: resolution.targetPath,
    ownerFractalPath: resolution.ownerFractalPath,
    chainLength: resolution.chain.length,
    chainPaths: resolution.chain.map((document) => document.fractalPath),
    nearestDetailPath: resolution.nearestDetailPath,
    outputLanguage: resolution.outputLanguage,
    diagnosticsOutOfScope,
    ...(input.lowestCommonFractalPath === undefined
      ? {}
      : { lowestCommonFractalPath: input.lowestCommonFractalPath }),
  };
}
