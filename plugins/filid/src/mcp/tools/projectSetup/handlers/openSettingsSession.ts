import { projectRoot } from '@ogham/cross-platform';

import { PROJECT_SETUP_ACTIONS } from '../../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type {
  HandlerExtra,
  ToolPayload,
} from '../../../../types/toolEnvelope.js';
import { handleOpenSettings } from '../openSettings/index.js';
import type {
  OpenSettingsSummary,
  ProjectSetupInput,
} from '../projectSetupTypes.js';

type OpenSettingsActionInput = Extract<
  ProjectSetupInput,
  { action: typeof PROJECT_SETUP_ACTIONS.SETTINGS }
>;

const EMPTY_DIAGNOSTICS: [] = [];

/**
 * Normalizes the project root and forwards abort state to the settings child.
 *
 * @param input - Validated settings-session action input.
 * @param extra - Optional MCP cancellation signal.
 * @returns The existing saved, closed, or pending settings summary.
 */
export async function openSettingsSession(
  input: OpenSettingsActionInput,
  extra?: HandlerExtra,
): Promise<ToolPayload<OpenSettingsSummary, never>> {
  const root = projectRoot(input.path);
  const output = await handleOpenSettings(
    { path: root, waitSeconds: input.waitSeconds },
    extra,
  );

  return {
    projectRoot: root,
    status: TOOL_STATUSES.OK,
    summary: output,
    diagnostics: EMPTY_DIAGNOSTICS,
  };
}
