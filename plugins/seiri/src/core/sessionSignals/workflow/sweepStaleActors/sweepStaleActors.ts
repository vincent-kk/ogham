import { lstatSync, readdirSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, SESSIONS_DIR } from '../../../../constants/files.js';
import { findRepoRoot } from '../../../utils/findRepoRoot.js';

import { sweepActorGroup } from './utils/sweepActorGroup.js';

/**
 * Retire stale actor groups without interrupting server startup.
 * @param projectRoot Absolute path inside the owning repository.
 * @param now Epoch milliseconds used for every mtime comparison.
 * @returns Nothing; inaccessible directories and failed groups are left alone.
 */
export function sweepStaleActors(projectRoot: string, now: number): void {
  try {
    const repoRoot = findRepoRoot(projectRoot);
    const dir = portableJoin(repoRoot, CONFIG_DIR, SESSIONS_DIR);
    if (!lstatSync(dir).isDirectory()) return;
    const groups = new Map<string, string[]>();
    for (const name of readdirSync(dir)) {
      const end = name.indexOf('.json');
      const key = end < 0 ? name : name.slice(0, end + 5);
      const members = groups.get(key) ?? [];
      members.push(name);
      groups.set(key, members);
    }
    for (const [key, members] of groups)
      try {
        sweepActorGroup(dir, key, members, now);
      } catch {
        // One inaccessible group must not prevent the remaining groups' sweep.
      }
  } catch {
    // Startup does not depend on optional runtime-state cleanup.
  }
}
