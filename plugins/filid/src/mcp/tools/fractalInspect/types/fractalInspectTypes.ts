import type { FRACTAL_INSPECT_ACTIONS } from '../../../../constants/mcpContracts.js';
import type {
  ContextResolveData,
  ContextResolveSummary,
  FractalScanData,
  FractalScanSummary,
  StructureValidateSummary,
  ValidationReport,
  VerificationScanData,
  VerificationScanSummary,
} from '../../../../types/report.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import type { ContextResolveInput } from '../contextResolve/index.js';
import type { FractalScanInput } from '../fractalScan/index.js';
import type { StructureValidateInput } from '../structureValidate/index.js';
import type { VerificationScanInput } from '../verificationScan/index.js';

/** Action-discriminated input accepted by the public inspection tool. */
export type FractalInspectInput =
  | ({ action: typeof FRACTAL_INSPECT_ACTIONS.SCAN } & FractalScanInput)
  | ({
      action: typeof FRACTAL_INSPECT_ACTIONS.VALIDATE;
    } & StructureValidateInput)
  | ({
      action: typeof FRACTAL_INSPECT_ACTIONS.VERIFICATION;
    } & VerificationScanInput)
  | ({ action: typeof FRACTAL_INSPECT_ACTIONS.RESOLVE } & ContextResolveInput);

/** Existing child payload variants returned by inspection actions. */
export type FractalInspectResult =
  | ToolPayload<FractalScanSummary, FractalScanData>
  | ToolPayload<StructureValidateSummary, ValidationReport>
  | ToolPayload<VerificationScanSummary, VerificationScanData>
  | ToolPayload<ContextResolveSummary, ContextResolveData>;
