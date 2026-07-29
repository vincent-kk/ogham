import { DOCUMENT_ONLY_SNAPSHOT_AXES } from '../../../constants/snapshotAxes.js';
import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { resolveContext } from '../../../core/index.js';
import type {
  ContextResolveData,
  ContextResolveSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../utils/createToolSnapshot.js';

import { buildContextResolveSummary } from './utils/buildContextResolveSummary.js';
import { resolveComparedFractal } from './utils/resolveComparedFractal.js';
import { scopeDiagnosticsToChain } from './utils/scopeDiagnosticsToChain.js';

/** Input accepted by the `context_resolve` tool. */
export interface ContextResolveInput {
  path: string;
  targetPath: string;
  /** Paths whose lowest common fractal to resolve alongside the chain. */
  comparePaths?: string[];
}

/**
 * Resolve a target's owning fractal and its owner-to-root document chain.
 * @param input Project root, the target to resolve and optional paths to compare.
 * @returns Payload whose summary carries the chain inline, whose diagnostics are
 * narrowed to that chain, and whose status reflects only in-scope evidence.
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
  const resolution = resolveContext(context.snapshot, input.targetPath);
  const diagnostics = scopeDiagnosticsToChain(context.diagnostics, resolution);
  return {
    projectRoot: context.snapshot.projectRoot,
    status:
      diagnostics.scoped.length > 0
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK,
    summary: buildContextResolveSummary({
      projectRoot: context.snapshot.projectRoot,
      resolution,
      diagnosticsOutOfScope: diagnostics.outOfScope,
      ...(input.comparePaths === undefined
        ? {}
        : {
            lowestCommonFractalPath: resolveComparedFractal(
              context.snapshot,
              input.comparePaths,
            ),
          }),
    }),
    data: resolution,
    diagnostics: diagnostics.scoped,
  };
}
