import fs from 'node:fs/promises';
import path from 'node:path';

import { assertUnder } from '../../utils/fsGuard.js';
import type { ReviewManageInput } from '../reviewManage.js';
import { normalizeBranch } from '../utils/reviewUtils.js';

export async function handleCleanup(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName)
    throw new Error('branchName is required for cleanup action');

  const normalized = normalizeBranch(input.branchName);
  if (!normalized)
    throw new Error(
      'branchName normalizes to an empty string; refusing to clean the review root',
    );
  const reviewRoot = path.join(input.projectRoot, '.filid', 'review');
  const reviewDir = path.join(reviewRoot, normalized);

  // Guard against path traversal: reviewDir MUST stay under projectRoot/.filid/review/.
  assertUnder(reviewRoot, reviewDir);

  await fs.rm(reviewDir, { recursive: true, force: true });

  return { deleted: true };
}
