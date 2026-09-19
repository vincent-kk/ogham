import { samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationFinding,
  PlanValidationResult,
  RestructurePlan,
} from '../../../types/restructure.js';

export function validatePlanPreconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): PlanValidationResult {
  const findings: PlanValidationFinding[] = [];
  if (!samePath(snapshot.projectRoot, plan.projectRoot))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.PROJECT_ROOT_MISMATCH,
      message: `The plan was made for ${plan.projectRoot}, but this validation ran on ${snapshot.projectRoot}.`,
      nextAction: `Run the validation with path set to ${plan.projectRoot}, or create a new plan for ${snapshot.projectRoot}.`,
      path: plan.projectRoot,
    });
  if (snapshot.snapshotHash !== plan.snapshotHash)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SNAPSHOT_HASH_MISMATCH,
      message:
        "The project changed after the plan was made: the current snapshot hash differs from the plan's.",
      nextAction:
        'Create a new plan and validate that one; never execute a stale plan.',
      path: snapshot.projectRoot,
    });
  if (plan.unresolved.length > 0)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.UNRESOLVED_DECISIONS,
      message: `The plan holds ${plan.unresolved.length} unresolved request(s): ${plan.unresolved.map(({ sourcePath }) => sourcePath).join(', ')}.`,
      nextAction:
        'Settle each unresolved entry by its decisions[].nextAction, then create a new plan. A plan with unresolved requests never executes.',
      path: plan.projectRoot,
    });
  return { valid: findings.length === 0, findings };
}
