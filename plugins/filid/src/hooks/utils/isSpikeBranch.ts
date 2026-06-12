import { SPIKE_BRANCH_PREFIX } from '../../constants/spikeMode.js';

/**
 * Spike mode authority is the branch name alone (`spike/*`): worktree-safe,
 * and checkout is the mode boundary. Config-level mode switches are
 * deliberately not consulted (a project-global flag would leak one
 * worktree's spike exemption into another's deny path).
 */
export function isSpikeBranch(branch: string | null): boolean {
  return branch !== null && branch.startsWith(SPIKE_BRANCH_PREFIX);
}
