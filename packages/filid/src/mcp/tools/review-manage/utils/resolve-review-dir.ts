import path from 'node:path';
import { normalizeBranch } from './normalize-branch.js';

export function resolveReviewDir(
  projectRoot: string,
  branchName: string,
): string {
  return path.join(
    projectRoot,
    '.filid',
    'review',
    normalizeBranch(branchName),
  );
}
