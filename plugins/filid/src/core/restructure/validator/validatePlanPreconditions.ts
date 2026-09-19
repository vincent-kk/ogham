import { samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  PlanValidationFinding,
  PlanValidationResult,
  RestructurePlan,
} from '../../../types/restructure.js';
import { computePlanReadHash } from '../planner/computePlanReadHash.js';
import { isDirectoryReadError } from '../planner/isDirectoryReadError.js';
import { isMissingPathError } from '../planner/isMissingPathError.js';

/**
 * Whether what the plan read differs from the project now.
 * @param plan - Plan whose `readPaths` and `probePaths` lie inside its project root
 * @returns True when the recomputed hash differs, a read path's ancestor is no
 * longer a directory, or a read path became a directory
 * @throws Any filesystem error other than a missing path or a directory read
 */
function readHashDrifted(plan: RestructurePlan): boolean {
  try {
    return (
      computePlanReadHash(plan.projectRoot, plan.readPaths, plan.probePaths) !==
      plan.readHash
    );
  } catch (error) {
    if (isMissingPathError(error) || isDirectoryReadError(error)) return true;
    throw error;
  }
}

/**
 * Check that the plan still describes the project before execution.
 *
 * Only what the plan read decides drift — the bytes of its read set (move
 * sources, their consumers and the files they import) and the state of its
 * probe set (each target and the documents of every source and target
 * ancestor) — so an unrelated edit does not stale the plan.
 * @param snapshot - Snapshot taken just before execution
 * @param plan - Plan about to run
 * @returns A different project root alone — nothing is read for a plan of
 * another root — or findings for drift in `readPaths` or `probePaths`, and unresolved requests
 */
export function validatePlanPreconditions(
  snapshot: ProjectSnapshot,
  plan: RestructurePlan,
): PlanValidationResult {
  if (!samePath(snapshot.projectRoot, plan.projectRoot))
    return {
      valid: false,
      findings: [
        {
          code: RESTRUCTURE_VALIDATION_CODES.PROJECT_ROOT_MISMATCH,
          message: `The plan was made for ${plan.projectRoot}, but this validation ran on ${snapshot.projectRoot}.`,
          nextAction: `Run the validation with path set to ${plan.projectRoot}, or create a new plan for ${snapshot.projectRoot}.`,
          path: plan.projectRoot,
        },
      ],
    };
  const findings: PlanValidationFinding[] = [];
  if (readHashDrifted(plan))
    findings.push({
      code: RESTRUCTURE_VALIDATION_CODES.SNAPSHOT_HASH_MISMATCH,
      message:
        'Something the plan read changed after the plan was made: a move source, one of its consumers, a file it imports, what exists at a target path, or an INTENT.md or DETAIL.md in a directory above a source or target.',
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
