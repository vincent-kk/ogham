import { DOCUMENT_ONLY_SNAPSHOT_AXES } from '../../../../constants/snapshotAxes.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type {
  ContextResolveData,
  ContextResolveSummary,
} from '../../../../types/report.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';

import { buildContextResolveSummary } from './utils/buildContextResolveSummary.js';
import { collectContextResolveDiagnostics } from './utils/collectContextResolveDiagnostics.js';
import { resolveContextRequest } from './utils/resolveContextRequest.js';

/** One target and its optional placement comparison paths. */
export interface ContextResolveRequest {
  /** Path whose owner-to-root document chain to resolve. */
  targetPath: string;
  /** Paths whose lowest common fractal to resolve beside this target. */
  comparePaths?: string[];
}

/** Input accepted by the `fractal_inspect` resolve action. */
export interface ContextResolveInput {
  /** Absolute project root shared by the whole batch. */
  path: string;
  /** One or more ordered requests resolved from one snapshot. */
  requests: ContextResolveRequest[];
}

/**
 * Resolve ordered target chains from one shared document-only snapshot.
 * @param input Project root and one or more target requests.
 * @returns Bounded aggregate plus an ordered result for every request.
 */
export async function handleContextResolve(
  input: ContextResolveInput,
): Promise<ToolPayload<ContextResolveSummary, ContextResolveData>> {
  // Owner resolution reads the tree and documents only. Collecting the other
  // axes would dominate the call: on a large repository the dependency graph
  // alone costs more than everything this tool actually reads.
  const context = await createToolSnapshot(input.path, {
    axes: DOCUMENT_ONLY_SNAPSHOT_AXES,
  });
  const results = input.requests.map((request, index) =>
    resolveContextRequest(
      context.snapshot,
      context.diagnostics,
      request,
      index,
    ),
  );
  const isIndeterminate = results.some(
    (result) => result.status !== TOOL_STATUSES.OK,
  );
  return {
    projectRoot: context.snapshot.projectRoot,
    status: isIndeterminate ? TOOL_STATUSES.INDETERMINATE : TOOL_STATUSES.OK,
    summary: buildContextResolveSummary(context.snapshot.projectRoot, results),
    data: { results },
    diagnostics: collectContextResolveDiagnostics(results),
  };
}
