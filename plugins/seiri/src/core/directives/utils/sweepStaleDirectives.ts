import { lstatSync, rmSync } from 'node:fs';

import { canonicalizeTargetPathSync } from '@ogham/cross-platform';

import { IDLE_STATE_TTL } from '../../../constants/retention.js';
import { findRepoRoot } from '../../utils/findRepoRoot.js';

import { directiveDirectory } from './directiveDirectory.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';
import { listDirectiveSets } from './listDirectiveSets.js';
import { updateDirectiveBinding } from './updateDirectiveBinding.js';

/**
 * Retire sets that have no recent edits, bindings, or injections.
 * @param projectRoot Absolute workspace path within the checkout to sweep.
 * @param now Epoch milliseconds shared by the startup sweeps.
 * @returns Nothing. Busy sets remain for a later sweep.
 */
export function sweepStaleDirectives(projectRoot: string, now: number): void {
  const workspace = canonicalizeTargetPathSync(projectRoot, projectRoot);
  lstatSync(workspace);
  const root = findRepoRoot(workspace);
  for (const set of listDirectiveSets(root)) {
    const directory = directiveDirectory(root, set);
    if (!directory) continue;
    const directoryStat = lstatSync(directory, { throwIfNoEntry: false });
    if (!directoryStat?.isDirectory()) continue;
    updateDirectiveBinding(root, set, (current) => {
      const files = listDirectiveFiles(directory);
      const latest = files.reduce(
        (time, file) => Math.max(time, file.modifiedAt),
        Math.max(
          current?.boundAt ?? 0,
          current?.lastInjectedAt ?? 0,
          files.length ? 0 : directoryStat.mtimeMs,
        ),
      );
      if (now - latest <= IDLE_STATE_TTL) return current;
      rmSync(directory, { recursive: true, force: true });
      return undefined;
    });
  }
}
