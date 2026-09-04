import { FRACTAL_SCAN_DETAILS } from '../../../../constants/mcpContracts.js';
import type { ProjectSnapshot } from '../../../../types/fractal.js';
import type {
  FractalScanData,
  FractalScanSummary,
  ValidationReport,
} from '../../../../types/report.js';
import type {
  ToolDiagnostic,
  ToolPayload,
} from '../../../../types/toolEnvelope.js';
import { resolveFractalScanCertainty } from '../../utils/resolveFractalScanCertainty.js';
import { resolveFractalScanStatus } from '../../utils/resolveFractalScanStatus.js';
import { scopeDiagnosticsToPaths } from '../../utils/scopeDiagnosticsToPaths.js';

import { buildFractalScanFullData } from './buildFractalScanFullData.js';
import { buildFractalScanPathsData } from './buildFractalScanPathsData.js';
import { buildFractalScanSummary } from './buildFractalScanSummary.js';

/**
 * Assemble the scan payload for one detail level.
 * @param snapshot Snapshot the projection reads.
 * @param validation Structure validation run against the same snapshot.
 * @param detail Projection level requested by the caller.
 * @param diagnostics Snapshot diagnostics for the whole project. A name filter
 * narrows them to the surviving nodes — otherwise the answer to a small query
 * arrives behind a project-sized payload.
 * @param nameFilter Node name filter; applies to the `paths` projection only,
 * so summary counts keep describing the whole tree.
 * @returns Payload whose summary is bounded and whose data follows `detail`.
 */
export function buildScanResult(
  snapshot: ProjectSnapshot,
  validation: ValidationReport,
  detail: (typeof FRACTAL_SCAN_DETAILS)[keyof typeof FRACTAL_SCAN_DETAILS],
  diagnostics: ToolDiagnostic[],
  nameFilter?: string,
): ToolPayload<FractalScanSummary, FractalScanData> {
  const certainty = resolveFractalScanCertainty(snapshot, diagnostics);
  const violationCount = validation.result.violations.length;
  const summary = buildFractalScanSummary(snapshot, validation, certainty);
  const data =
    detail === FRACTAL_SCAN_DETAILS.PATHS
      ? buildFractalScanPathsData(snapshot, nameFilter)
      : detail === FRACTAL_SCAN_DETAILS.FULL
        ? buildFractalScanFullData(snapshot, validation)
        : undefined;
  const scoped =
    nameFilter !== undefined && data && 'nodes' in data
      ? scopeDiagnosticsToPaths(
          diagnostics,
          data.nodes.map((node) => node.path),
        )
      : undefined;
  return {
    projectRoot: snapshot.projectRoot,
    status: resolveFractalScanStatus(certainty, violationCount),
    summary: scoped
      ? { ...summary, diagnosticsOutOfScope: scoped.outOfScope }
      : summary,
    ...(data ? { data } : {}),
    diagnostics: scoped ? scoped.scoped : diagnostics,
  };
}
