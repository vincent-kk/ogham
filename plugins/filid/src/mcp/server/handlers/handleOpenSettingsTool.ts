import { projectRoot } from '@ogham/cross-platform/host-paths';

import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { handleOpenSettings } from '../../tools/index.js';

interface OpenSettingsToolInput {
  path?: string;
  waitSeconds?: number;
}

interface OpenSettingsToolExtra {
  signal?: AbortSignal;
}

type OpenSettingsSummary = Awaited<
  ReturnType<typeof handleOpenSettings>
>;

const EMPTY_DIAGNOSTICS: [] = [];

export async function handleOpenSettingsTool(
  input: OpenSettingsToolInput,
  extra?: OpenSettingsToolExtra,
): Promise<ToolPayload<OpenSettingsSummary, never>> {
  const root = projectRoot(input.path);
  const output = await handleOpenSettings(
    { ...input, path: root },
    extra,
  );

  return {
    projectRoot: root,
    status: TOOL_STATUSES.OK,
    summary: output,
    diagnostics: EMPTY_DIAGNOSTICS,
  };
}
