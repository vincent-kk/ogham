import { projectRoot } from '@ogham/cross-platform/host-paths';

import { TOOL_STATUSES } from '../../../constants/toolEnvelope.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { handleProjectInit } from '../../tools/index.js';

interface ProjectInitToolInput {
  path?: string;
  language?: string;
  adapterIds?: string[];
}

interface ProjectInitSummary {
  created: boolean;
  configPath: string;
}

const EMPTY_DIAGNOSTICS: [] = [];

export function handleProjectInitTool(
  input: ProjectInitToolInput,
): ToolPayload<ProjectInitSummary, never> {
  const root = projectRoot(input.path);
  const output = handleProjectInit({ ...input, path: root });

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
