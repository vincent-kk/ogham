import { inspectHookInstructionSection } from '@ogham/agent-artifacts/instructions/hook/status';
import { resolveProjectInstructionTarget } from '@ogham/agent-artifacts/targets/project/instructions';
import { resolveHostDescriptor } from '@ogham/cross-platform/host-registry/descriptor';

import {
  MAENCOF_END_MARKER,
  MAENCOF_START_MARKER,
} from '../../constants/markers.js';

/**
 * The instruction file this vault's maencof section lives in.
 *
 * This hook-reachable helper deliberately uses purpose-specific entry points:
 * importing the full project manager would pull its transaction/lock engine
 * into every SessionStart bundle.
 */
export function instructionsPath(cwd: string): string {
  const host =
    resolveHostDescriptor(process.env).stateRootDir === '.codex'
      ? 'codex'
      : 'claude';
  const target = resolveProjectInstructionTarget({
    host,
    projectRoot: cwd,
  });
  return inspectHookInstructionSection({
    target,
    markers: {
      start: MAENCOF_START_MARKER,
      end: MAENCOF_END_MARKER,
    },
  }).target;
}
