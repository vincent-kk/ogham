import { PROJECT_SETUP_ACTIONS } from '../../../constants/mcpContracts.js';
import type { HandlerExtra } from '../../../types/toolEnvelope.js';

import { initProject } from './handlers/initProject.js';
import { openSettingsSession } from './handlers/openSettingsSession.js';
import { syncRuleDocs } from './handlers/syncRuleDocs.js';
import type {
  ProjectSetupInput,
  ProjectSetupResult,
} from './projectSetupTypes.js';

/**
 * Dispatches one project-setup action to its focused child adapter.
 *
 * @param input - Validated action-specific setup input.
 * @param extra - Optional MCP cancellation signal used by settings sessions.
 * @returns The unchanged child payload for the selected action.
 */
export async function handleProjectSetup(
  input: ProjectSetupInput,
  extra?: HandlerExtra,
): Promise<ProjectSetupResult> {
  switch (input.action) {
    case PROJECT_SETUP_ACTIONS.INIT:
      return initProject(input);
    case PROJECT_SETUP_ACTIONS.RULES_STATUS:
    case PROJECT_SETUP_ACTIONS.RULES_MANIFEST:
    case PROJECT_SETUP_ACTIONS.RULES_SYNC:
      return syncRuleDocs(input);
    case PROJECT_SETUP_ACTIONS.SETTINGS:
      return openSettingsSession(input, extra);
  }
}
