import type { ContextResolution } from '../../../../types/context.js';
import type { ContextResolveSummary } from '../../../../types/report.js';

/** Inputs the inline summary is projected from. */
export interface ContextResolveSummaryInput {
  projectRoot: string;
  resolution: ContextResolution;
  diagnosticsOutOfScope: number;
  /** Omit entirely when the caller requested no path comparison. */
  lowestCommonFractalPath?: string | null;
}

/**
 * Project a resolution into the inline summary. The chain paths belong here
 * rather than in `data` because the summary survives an overflowing payload.
 * @param input Resolution, project root and the counts computed beside them.
 * @returns Summary carrying the owner-to-root chain inline.
 */
export function buildContextResolveSummary(
  input: ContextResolveSummaryInput,
): ContextResolveSummary {
  const { projectRoot, resolution, diagnosticsOutOfScope } = input;
  return {
    projectRoot,
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
