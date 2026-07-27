import { samePath } from '@ogham/cross-platform/paths';

import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
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
      message: RESTRUCTURE_VALIDATION_MESSAGES.PROJECT_ROOT_MISMATCH,
      path: plan.projectRoot,
    });
  if (snapshot.snapshotHash !== plan.snapshotHash)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SNAPSHOT_HASH_MISMATCH,
      message: RESTRUCTURE_VALIDATION_MESSAGES.SNAPSHOT_HASH_MISMATCH,
      path: snapshot.projectRoot,
    });
  if (plan.unresolved.length > 0)
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.UNRESOLVED_DECISIONS,
      message: RESTRUCTURE_VALIDATION_MESSAGES.UNRESOLVED_DECISIONS,
      path: plan.projectRoot,
    });
  return { valid: findings.length === 0, findings };
}
