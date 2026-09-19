import {
  RESTRUCTURE_ACTIONS,
  RESTRUCTURE_VALIDATION_MODE_BY_ACTION,
  STRUCTURE_VALIDATION_SCOPE_VALUES,
} from '../../../../constants/mcpContracts.js';
import {
  RESTRUCTURE_ANALYSIS_AXES,
  RESTRUCTURE_VALIDATION_NEXT_ACTIONS,
} from '../../../../constants/restructure.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  validatePlanPostconditions,
  validatePlanPreconditions,
} from '../../../../core/index.js';
import type { RestructureValidationSummary } from '../../../../types/report.js';
import type { PlanValidationResult } from '../../../../types/restructure.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { affectsAnalysisAxis } from '../../utils/affectsAnalysisAxis.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { isAttributedToUnknownFile } from '../../utils/isAttributedToUnknownFile.js';
import type { RestructureInput } from '../types/restructureTypes.js';
import { describeKnownEdgesPostcondition } from '../utils/describeKnownEdgesPostcondition.js';
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
 * @returns The canonical six-scope plan-validation result, with the caller's
 * next step chosen by action and status. Unknown files related to the plan,
 * or a restructure-axis diagnostic not explained by an unrelated unknown file,
 * make the status `indeterminate`. A passing postcondition beside unrelated
 * unknown files says it holds on the known edges only.
 */
export async function validateRestructurePlan(
  input: RestructureValidationInput,
): Promise<ToolPayload<RestructureValidationSummary, PlanValidationResult>> {
  const context = await createToolSnapshot(input.path);
  const plan = readRestructurePlan(input.planPath);
  const mode = RESTRUCTURE_VALIDATION_MODE_BY_ACTION[input.action];
  const result =
    input.action === RESTRUCTURE_ACTIONS.PRECONDITION
      ? validatePlanPreconditions(context.snapshot, plan)
      : validatePlanPostconditions(context.snapshot, plan);
  const status =
    result.unknownFiles.relevant.length > 0 ||
    context.diagnostics.some(
      (diagnostic) =>
        affectsAnalysisAxis(diagnostic, RESTRUCTURE_ANALYSIS_AXES) &&
        !isAttributedToUnknownFile(
          diagnostic,
          result.unknownFiles.other,
          context.snapshot.projectRoot,
        ),
    )
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
      nextAction:
        input.action === RESTRUCTURE_ACTIONS.POSTCONDITION &&
        status === TOOL_STATUSES.OK &&
        result.unknownFiles.other.length > 0
          ? describeKnownEdgesPostcondition(result.unknownFiles.other.length)
          : RESTRUCTURE_VALIDATION_NEXT_ACTIONS[input.action][status],
    },
    data: result,
    diagnostics: context.diagnostics,
  };
}
