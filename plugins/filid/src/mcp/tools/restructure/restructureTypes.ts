import type { RESTRUCTURE_ACTIONS } from '../../../constants/mcpContracts.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
  StructureValidateSummary,
} from '../../../types/report.js';
import type {
  PlanValidationResult,
  RestructurePlanInput,
} from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';

/** Action-discriminated input accepted by the public restructure tool. */
export type RestructureInput =
  | ({ action: typeof RESTRUCTURE_ACTIONS.PLAN } & RestructurePlanInput)
  | {
      action: typeof RESTRUCTURE_ACTIONS.PRECONDITION;
      path: string;
      planPath: string;
    }
  | {
      action: typeof RESTRUCTURE_ACTIONS.POSTCONDITION;
      path: string;
      planPath: string;
    };

/** Existing child payload variants returned by restructure actions. */
export type RestructureResult =
  | ToolPayload<RestructurePlanSummary, RestructurePlanData>
  | ToolPayload<StructureValidateSummary, PlanValidationResult>;
