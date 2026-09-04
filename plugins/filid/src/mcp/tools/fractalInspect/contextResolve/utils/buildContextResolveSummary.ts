import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import type {
  ContextResolveResult,
  ContextResolveSummary,
} from '../../../../../types/report.js';

/**
 * Build bounded counts for an ordered context-resolution batch.
 * @param projectRoot Absolute root shared by the batch.
 * @param results Ordered per-request outcomes.
 * @returns Aggregate counts whose size is independent of batch cardinality.
 */
export function buildContextResolveSummary(
  projectRoot: string,
  results: ContextResolveResult[],
): ContextResolveSummary {
  return {
    projectRoot,
    requestCount: results.length,
    resolvedCount: results.filter((result) => result.resolved).length,
    failedCount: results.filter((result) => !result.resolved).length,
    indeterminateCount: results.filter(
      (result) => result.status === TOOL_STATUSES.INDETERMINATE,
    ).length,
  };
}
