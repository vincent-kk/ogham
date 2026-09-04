import {
  RESTRUCTURE_ACTIONS,
  RESTRUCTURE_VALIDATION_MODE_BY_ACTION,
  STRUCTURE_VALIDATION_SCOPE_VALUES,
} from '../../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  validatePlanPostconditions,
  validatePlanPreconditions,
} from '../../../../core/index.js';
import type { StructureValidateSummary } from '../../../../types/report.js';
import type { PlanValidationResult } from '../../../../types/restructure.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import type { RestructureInput } from '../types/restructureTypes.js';
import { readRestructurePlan } from '../utils/readRestructurePlan.js';

type RestructureValidationInput = Extract<
  RestructureInput,
  {
    action:
      | typeof RESTRUCTURE_ACTIONS.PRECONDITION
      | typeof RESTRUCTURE_ACTIONS.POSTCONDITION;
  }
>;

/**
 * Checks a persisted move plan immediately before or after external execution.
 *
 * @param input - Validation action, project root, and absolute plan path.
 * @returns The canonical six-scope plan-validation result.
 */
export async function validateRestructurePlan(
  input: RestructureValidationInput,
): Promise<ToolPayload<StructureValidateSummary, PlanValidationResult>> {
  const context = await createToolSnapshot(input.path);
  const plan = readRestructurePlan(input.planPath);
  const mode = RESTRUCTURE_VALIDATION_MODE_BY_ACTION[input.action];
  const result =
    input.action === RESTRUCTURE_ACTIONS.PRECONDITION
      ? validatePlanPreconditions(context.snapshot, plan)
      : validatePlanPostconditions(context.snapshot, plan);
  const status =
    context.diagnostics.length > 0
      ? TOOL_STATUSES.INDETERMINATE
      : result.valid
        ? TOOL_STATUSES.OK
        : TOOL_STATUSES.VIOLATIONS;
  return {
    projectRoot: context.snapshot.projectRoot,
    status,
    summary: {
      projectRoot: context.snapshot.projectRoot,
      snapshotHash: context.snapshot.snapshotHash,
      mode,
      scopes: STRUCTURE_VALIDATION_SCOPE_VALUES,
      findingCount: result.findings.length,
      passed: result.valid ? 1 : 0,
      failed: result.valid ? 0 : 1,
      skipped: 0,
    },
    data: result,
    diagnostics: context.diagnostics,
  };
}
