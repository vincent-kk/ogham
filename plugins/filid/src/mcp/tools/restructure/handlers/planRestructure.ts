import { ANALYSIS_CERTAINTIES } from '../../../../constants/analysisCertainties.js';
import {
  RESTRUCTURE_ANALYSIS_AXES,
  RESTRUCTURE_PLAN_NEXT_ACTIONS,
} from '../../../../constants/restructure.js';
import {
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../../constants/toolEnvelope.js';
import { createRestructurePlan } from '../../../../core/index.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
} from '../../../../types/report.js';
import type { RestructurePlanInput } from '../../../../types/restructure.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { affectsAnalysisAxis } from '../../utils/affectsAnalysisAxis.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';

/**
 * Builds and persists a read-only placement plan from one project snapshot.
 *
 * @param input - Project root and placement requests to evaluate.
 * @returns The bounded summary with the caller's next step, and the
 * artifact-eligible restructure plan; an unsupported dependency graph makes the
 * status `unsupported` before any other evidence is weighed.
 */
export async function planRestructure(
  input: RestructurePlanInput,
): Promise<ToolPayload<RestructurePlanSummary, RestructurePlanData>> {
  const context = await createToolSnapshot(input.path);
  const plan = createRestructurePlan(context.snapshot, input);
  const certainty = context.snapshot.dependencyGraph.certainty;
  const status =
    certainty === ANALYSIS_CERTAINTIES.UNSUPPORTED
      ? TOOL_STATUSES.UNSUPPORTED
      : plan.unresolved.length > 0 ||
          certainty === ANALYSIS_CERTAINTIES.INDETERMINATE ||
          context.diagnostics.some((diagnostic) =>
            affectsAnalysisAxis(diagnostic, RESTRUCTURE_ANALYSIS_AXES),
          )
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK;
  const nextAction =
    status === TOOL_STATUSES.UNSUPPORTED
      ? RESTRUCTURE_PLAN_NEXT_ACTIONS.UNSUPPORTED
      : plan.unresolved.length > 0
        ? RESTRUCTURE_PLAN_NEXT_ACTIONS.UNRESOLVED
        : status !== TOOL_STATUSES.OK
          ? RESTRUCTURE_PLAN_NEXT_ACTIONS.DIAGNOSTICS
          : plan.summary.moveCount === 0
            ? RESTRUCTURE_PLAN_NEXT_ACTIONS.NOTHING_TO_MOVE
            : RESTRUCTURE_PLAN_NEXT_ACTIONS.READY;
  return {
    projectRoot: context.snapshot.projectRoot,
    status,
    summary: {
      projectRoot: context.snapshot.projectRoot,
      planId: plan.planId,
      snapshotHash: plan.snapshotHash,
      ...plan.summary,
      nextAction,
    },
    data: plan,
    diagnostics: context.diagnostics,
    persistence: TOOL_PERSISTENCE.ALWAYS,
  };
}
