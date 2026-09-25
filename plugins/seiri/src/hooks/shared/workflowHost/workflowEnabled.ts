import { realpathSync } from 'node:fs';

import { loadIntervention } from '../../../core/infra/configLoader/loaders/loadIntervention.js';
import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';

/**
 * Both enabled dial positions use explicit participation, never global election.
 * @param root Workspace path to resolve the repository root from; a path that cannot be resolved yields `false`.
 * @returns Whether the effective intervention dial is `standard` or `strict`.
 */
export function workflowEnabled(root: string): boolean {
  try {
    return ['standard', 'strict'].includes(
      loadIntervention(findRepoRoot(realpathSync(root))).effective,
    );
  } catch {
    return false;
  }
}
