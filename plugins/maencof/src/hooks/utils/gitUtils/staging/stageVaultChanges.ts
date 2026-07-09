/**
 * @file stageVaultChanges.ts
 * @description Stage the scope entries that exist on disk in a single `git add`, always
 * carrying the sensitive-file exclude pathspecs.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { SENSITIVE_EXCLUDE_PATH_SPECS } from '../../../../constants/vaultCommitter.js';
import { runGit } from '../runner/runGit.js';

export async function stageVaultChanges(
  cwd: string,
  scope: readonly string[],
): Promise<void> {
  const present = scope.filter((entry) => existsSync(join(cwd, entry)));
  if (present.length === 0) return;
  const add = await runGit(cwd, [
    'add',
    '--',
    ...present,
    ...SENSITIVE_EXCLUDE_PATH_SPECS,
  ]);
  if (add.code !== 0 || add.spawnError)
    throw new Error(
      `git add failed: ${add.stderr.trim() || add.spawnError?.message || `exit ${add.code}`}`,
    );
}
