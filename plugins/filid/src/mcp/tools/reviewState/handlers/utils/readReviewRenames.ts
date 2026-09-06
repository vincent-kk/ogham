import { executeReviewGit } from '../../hash/executeReviewGit.js';

/**
 * Read Git's unambiguous committed rename pairs without examining the worktree.
 * @param projectRoot Git repository containing both revisions.
 * @param previousCommit Previous prepared committed tree, absent on bootstrap.
 * @returns Previous paths mapped to current paths; copies are not renames.
 * @throws When Git cannot compare the committed trees.
 */
export async function readReviewRenames(
  projectRoot: string,
  previousCommit?: string,
): Promise<Map<string, string>> {
  if (!previousCommit) return new Map();
  const records = (
    await executeReviewGit(projectRoot, [
      'diff',
      '--name-status',
      '-z',
      '--find-renames',
      previousCommit,
      'HEAD',
      '--',
    ])
  ).split('\0');
  const renames = new Map<string, string>();
  for (let index = 0; index < records.length && records[index];) {
    const status = records[index++];
    const path = records[index++];
    if (status.startsWith('R')) renames.set(path, records[index++]);
    else if (status.startsWith('C')) index++;
  }
  return renames;
}
