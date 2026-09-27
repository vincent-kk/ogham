import { portableResolve } from '@ogham/cross-platform';

import {
  CONTEXT_RESOLVE_DIAGNOSTIC_CODES,
  CONTEXT_RESOLVE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../../../constants/toolEnvelope.js';
import { resolveContext } from '../../../../../core/index.js';
import { matchingIgnoredPattern } from '../../../../../lib/matchesPathPattern.js';
import { toProjectRelativePath } from '../../../../../lib/toProjectRelativePath.js';
import type { ProjectSnapshot } from '../../../../../types/fractal.js';
import type { ContextResolveResult } from '../../../../../types/report.js';
import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';
import type { ContextResolveRequest } from '../contextResolve.js';

import { buildContextResolveItemSummary } from './buildContextResolveItemSummary.js';
import { resolveComparedFractal } from './resolveComparedFractal.js';
import { scopeDiagnosticsToChain } from './scopeDiagnosticsToChain.js';

/**
 * Resolve one request without allowing target errors to abort its siblings.
 * @param snapshot Immutable snapshot shared by the whole batch.
 * @param snapshotDiagnostics Diagnostics collected with that snapshot.
 * @param request Target and optional comparison paths.
 * @param index Stable request position in the batch.
 * @returns One resolved or failed outcome at the same position.
 */
export function resolveContextRequest(
  snapshot: ProjectSnapshot,
  snapshotDiagnostics: ToolDiagnostic[],
  request: ContextResolveRequest,
  index: number,
  ignore: readonly string[] = [],
): ContextResolveResult {
  const targetPath = portableResolve(snapshot.projectRoot, request.targetPath);
  const relativePath = toProjectRelativePath(snapshot.projectRoot, targetPath);
  const matchingPattern =
    relativePath === '..' ||
    relativePath.startsWith('../') ||
    relativePath.startsWith('/')
      ? undefined
      : matchingIgnoredPattern({ ignore }, relativePath);
  if (matchingPattern !== undefined) {
    const diagnostic: ToolDiagnostic = {
      code: CONTEXT_RESOLVE_DIAGNOSTIC_CODES.TARGET_IGNORED,
      message: `Context target ${targetPath} is ignored by config pattern "${matchingPattern}".`,
      path: targetPath,
      affects: [],
      nextAction: CONTEXT_RESOLVE_DIAGNOSTIC_NEXT_ACTIONS.TARGET_IGNORED,
    };
    return {
      index,
      resolved: false,
      targetPath,
      status: TOOL_STATUSES.INDETERMINATE,
      diagnostics: [diagnostic],
    };
  }
  let resolution;
  try {
    resolution = resolveContext(snapshot, targetPath);
  } catch (error) {
    const diagnostic: ToolDiagnostic = {
      code: CONTEXT_RESOLVE_DIAGNOSTIC_CODES.TARGET_UNRESOLVED,
      message:
        error instanceof Error
          ? error.message
          : `Context target could not be resolved: ${targetPath}`,
      path: targetPath,
      affects: [],
      nextAction: CONTEXT_RESOLVE_DIAGNOSTIC_NEXT_ACTIONS.TARGET_UNRESOLVED,
    };
    return {
      index,
      resolved: false,
      targetPath,
      status: TOOL_STATUSES.INDETERMINATE,
      diagnostics: [diagnostic],
    };
  }

  const diagnostics = scopeDiagnosticsToChain(snapshotDiagnostics, resolution);
  const status =
    diagnostics.scoped.length > 0
      ? TOOL_STATUSES.INDETERMINATE
      : TOOL_STATUSES.OK;
  return {
    index,
    resolved: true,
    targetPath: resolution.targetPath,
    status,
    summary: buildContextResolveItemSummary({
      resolution,
      diagnosticsOutOfScope: diagnostics.outOfScope,
      ...(request.comparePaths === undefined
        ? {}
        : {
            lowestCommonFractalPath: resolveComparedFractal(
              snapshot,
              request.comparePaths,
            ),
          }),
    }),
    resolution,
    diagnostics: diagnostics.scoped,
  };
}
