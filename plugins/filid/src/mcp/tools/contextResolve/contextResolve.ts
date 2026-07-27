import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import { resolveContext } from '../../../core/index.js';
import type {
  ContextResolveData,
  ContextResolveSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../utils/createToolSnapshot.js';

export interface ContextResolveInput {
  path: string;
  targetPath: string;
}

export async function handleContextResolve(
  input: ContextResolveInput,
): Promise<ToolPayload<ContextResolveSummary, ContextResolveData>> {
  const context = await createToolSnapshot(input.path);
  const resolution = resolveContext(context.snapshot, input.targetPath);
  return {
    projectRoot: context.snapshot.projectRoot,
    status:
      context.diagnostics.length > 0
        ? TOOL_STATUSES.INDETERMINATE
        : TOOL_STATUSES.OK,
    summary: {
      projectRoot: context.snapshot.projectRoot,
      targetPath: resolution.targetPath,
      ownerFractalPath: resolution.ownerFractalPath,
      chainLength: resolution.chain.length,
      nearestDetailPath: resolution.nearestDetailPath,
      outputLanguage: resolution.outputLanguage,
    },
    data: resolution,
    diagnostics: context.diagnostics,
  };
}
