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

import { buildFractalScanFullData } from './buildFractalScanFullData.js';
import { buildFractalScanPathsData } from './buildFractalScanPathsData.js';
import { buildFractalScanSummary } from './buildFractalScanSummary.js';
import { resolveFractalScanCertainty } from './resolveFractalScanCertainty.js';
import { resolveFractalScanStatus } from './resolveFractalScanStatus.js';

export function buildScanResult(
  snapshot: ProjectSnapshot,
  validation: ValidationReport,
  detail: (typeof FRACTAL_SCAN_DETAILS)[keyof typeof FRACTAL_SCAN_DETAILS],
  diagnostics: ToolDiagnostic[],
): ToolPayload<FractalScanSummary, FractalScanData> {
  const certainty = resolveFractalScanCertainty(snapshot, diagnostics);
  const violationCount = validation.result.violations.length;
  const summary = buildFractalScanSummary(snapshot, validation, certainty);
  const data =
    detail === FRACTAL_SCAN_DETAILS.PATHS
      ? buildFractalScanPathsData(snapshot)
      : detail === FRACTAL_SCAN_DETAILS.FULL
        ? buildFractalScanFullData(snapshot, validation)
        : undefined;
  return {
    projectRoot: snapshot.projectRoot,
    status: resolveFractalScanStatus(certainty, violationCount),
    summary,
    ...(data ? { data } : {}),
    diagnostics,
  };
}
