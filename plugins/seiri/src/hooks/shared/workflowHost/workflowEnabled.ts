import { realpathSync } from 'node:fs';

import { loadIntervention } from '../../../core/infra/configLoader/loaders/loadIntervention.js';
import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';

/** Both enabled dial positions use explicit participation, never global election. */
export function workflowEnabled(root: string): boolean {
  try {
    return ['standard', 'strict'].includes(
      loadIntervention(findRepoRoot(realpathSync(root))).effective,
    );
  } catch {
    return false;
  }
}
