import {
  type InstructionSectionManager,
  createInstructionSectionManager,
  resolveProjectInstructionTarget,
} from '@ogham/agent-artifacts';
import { resolveRuntimeHost } from '@ogham/cross-platform';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../../constants/markers.js';

export function createProjectInstructionManager(
  projectRoot: string,
): InstructionSectionManager {
  const runtimeHost = resolveRuntimeHost(process.env);
  // Agy and unknown markers retain Maencof's established Claude-channel adapter.
  const host = runtimeHost === 'codex' ? 'codex' : 'claude';
  const target = resolveProjectInstructionTarget({ host, projectRoot });

  return createInstructionSectionManager({
    owner: 'maencof',
    target,
    markers: {
      start: MAENCOF_START_MARKER,
      end: MAENCOF_END_MARKER,
    },
  });
}
