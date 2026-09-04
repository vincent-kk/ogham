import { projectRoot } from '@ogham/cross-platform';

import { PROJECT_SETUP_ACTIONS } from '../../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { handleProjectInit } from '../projectInit/index.js';
import type {
  ProjectInitSummary,
  ProjectSetupInput,
} from '../projectSetupTypes.js';

type ProjectInitActionInput = Extract<
  ProjectSetupInput,
  { action: typeof PROJECT_SETUP_ACTIONS.INIT }
>;

const EMPTY_DIAGNOSTICS: [] = [];

/**
 * Normalizes the project root and adapts initialization output to a payload.
 *
 * @param input - Validated initialization action input.
 * @returns The existing created/config-path initialization summary.
 */
export function initProject(
  input: ProjectInitActionInput,
): ToolPayload<ProjectInitSummary, never> {
  const root = projectRoot(input.path);
  const output = handleProjectInit({
    path: root,
    language: input.language,
    adapterIds: input.adapterIds,
  });

  return {
    projectRoot: root,
    status: TOOL_STATUSES.OK,
    summary: {
      created: output.configCreated,
      configPath: output.filePath.config,
    },
    diagnostics: EMPTY_DIAGNOSTICS,
  };
}
