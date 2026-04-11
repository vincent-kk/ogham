import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReviewContentHash } from '../../../../types/review.js';
import type { ReviewManageInput } from '../review-manage.js';
import { computeContentHash, gitExec } from '../utils/content-hash.js';
import { normalizeBranch } from '../utils/review-utils.js';

export async function handleContentHash(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for content-hash action');
  }
  if (!input.baseRef) {
    throw new Error('baseRef is required for content-hash action');
  }

  const baseCommit = await gitExec(input.projectRoot, [
    'merge-base',
    input.baseRef,
    'HEAD',
  ]);

  const diffOutput = await gitExec(input.projectRoot, [
    'diff',
    '--name-only',
    `${baseCommit}..HEAD`,
  ]);
  const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

  const { sessionHash, fileHashes } = await computeContentHash(
    input.projectRoot,
    baseCommit,
    changedFiles,
  );

  const contentHash: ReviewContentHash = {
    sessionHash,
    baseCommit,
    fileHashes,
    computedAt: new Date().toISOString(),
  };

  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );
  await fs.mkdir(reviewDir, { recursive: true });
  await fs.writeFile(
    path.join(reviewDir, 'content-hash.json'),
    JSON.stringify(contentHash, null, 2),
  );

  return contentHash as unknown as Record<string, unknown>;
}
