import { portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, TASKS_DIR } from '../../../constants/files.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

/**
 * Resolve the session-independent task directory for a project.
 *
 * @param projectRoot Any path inside the owning repository.
 * @returns Absolute `<repoRoot>/.seiri/tasks` path.
 */
export function resolveTasksDir(projectRoot: string): string {
  return portableJoin(findRepoRoot(projectRoot), CONFIG_DIR, TASKS_DIR);
}
