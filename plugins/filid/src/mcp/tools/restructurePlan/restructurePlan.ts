import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import {
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../constants/toolEnvelope.js';
import { createRestructurePlan } from '../../../core/index.js';
import type {
  RestructurePlanData,
  RestructurePlanSummary,
} from '../../../types/report.js';
import type { RestructurePlanInput } from '../../../types/restructure.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../utils/createToolSnapshot.js';

export async function handleRestructurePlan(
  input: RestructurePlanInput,
): Promise<ToolPayload<RestructurePlanSummary, RestructurePlanData>> {
  const context = await createToolSnapshot(input.path);
  const plan = createRestructurePlan(context.snapshot, input);
  const status =
    plan.unresolved.length > 0 ||
    context.snapshot.dependencyGraph.certainty ===
      ANALYSIS_CERTAINTIES.INDETERMINATE ||
    context.diagnostics.length > 0
      ? TOOL_STATUSES.INDETERMINATE
      : context.snapshot.dependencyGraph.certainty ===
          ANALYSIS_CERTAINTIES.UNSUPPORTED
        ? TOOL_STATUSES.UNSUPPORTED
        : TOOL_STATUSES.OK;
  return {
    projectRoot: context.snapshot.projectRoot,
    status,
    summary: {
      projectRoot: context.snapshot.projectRoot,
      planId: plan.planId,
      snapshotHash: plan.snapshotHash,
      ...plan.summary,
    },
    data: plan,
    diagnostics: context.diagnostics,
    persistence: TOOL_PERSISTENCE.ALWAYS,
  };
}
