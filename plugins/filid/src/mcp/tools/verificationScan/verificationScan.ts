import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { VERIFICATION_SCAN_DETAILS } from '../../../constants/mcpContracts.js';
import type {
  VerificationScanData,
  VerificationScanSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../utils/createToolSnapshot.js';
import { resolveVerificationScanStatus } from '../utils/resolveVerificationScanStatus.js';
import { selectVerificationEvidence } from '../utils/selectVerificationEvidence.js';

import { buildVerificationDiagnostics } from './utils/buildVerificationDiagnostics.js';
import { buildVerificationScanSummary } from './utils/buildVerificationScanSummary.js';

export interface VerificationScanInput {
  path: string;
  filePaths?: string[];
  detail?: (typeof VERIFICATION_SCAN_DETAILS)[keyof typeof VERIFICATION_SCAN_DETAILS];
}

export async function handleVerificationScan(
  input: VerificationScanInput,
): Promise<ToolPayload<VerificationScanSummary, VerificationScanData>> {
  const context = await createToolSnapshot(input.path);
  const selection = selectVerificationEvidence(
    context.snapshot.projectRoot,
    context.snapshot.verification,
    input.filePaths,
  );
  const diagnostics = buildVerificationDiagnostics(
    context.diagnostics,
    selection.missingPaths,
  );
  const certainty =
    selection.missingPaths.length > 0
      ? ANALYSIS_CERTAINTIES.INDETERMINATE
      : context.snapshot.verification.certainty;
  const summary = buildVerificationScanSummary(
    context.snapshot.projectRoot,
    context.snapshot.snapshotHash,
    selection.files,
    selection.violations,
    certainty,
  );
  const detail = input.detail ?? VERIFICATION_SCAN_DETAILS.SUMMARY;
  return {
    projectRoot: context.snapshot.projectRoot,
    status: resolveVerificationScanStatus(
      certainty,
      selection.violations.length,
      diagnostics,
    ),
    summary,
    ...(detail === VERIFICATION_SCAN_DETAILS.FILES
      ? {
          data: {
            files: selection.files,
            violations: selection.violations,
            certainty,
          },
        }
      : {}),
    diagnostics,
  };
}
