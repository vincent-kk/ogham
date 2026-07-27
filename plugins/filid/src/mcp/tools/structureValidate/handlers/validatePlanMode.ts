import { STRUCTURE_VALIDATION_MODES } from '../../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  validatePlanPostconditions,
  validatePlanPreconditions,
} from '../../../../core/index.js';
import type {
  StructureValidateData,
  StructureValidateSummary,
} from '../../../../types/report.js';
import type { RuleScope } from '../../../../types/rules.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { readRestructurePlan } from '../utils/readRestructurePlan.js';

type PlanValidationMode =
  | typeof STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION
  | typeof STRUCTURE_VALIDATION_MODES.PLAN_POSTCONDITION;

export async function validatePlanMode(
  path: string,
  planPath: string,
  mode: PlanValidationMode,
  scopes: RuleScope[],
): Promise<ToolPayload<StructureValidateSummary, StructureValidateData>> {
  const context = await createToolSnapshot(path);
  const plan = readRestructurePlan(planPath);
  const result =
    mode === STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION
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
      scopes,
      findingCount: result.findings.length,
      passed: result.valid ? 1 : 0,
      failed: result.valid ? 0 : 1,
      skipped: 0,
    },
    data: result,
    diagnostics: context.diagnostics,
  };
}
