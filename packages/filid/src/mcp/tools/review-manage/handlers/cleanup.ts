import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReviewManageInput } from '../review-manage.js';
import { normalizeBranch } from '../utils/review-utils.js';

export async function handleCleanup(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for cleanup action');
  }
  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  // Guard against path traversal: reviewDir MUST stay under projectRoot/.filid/review/.
  const resolvedReview = path.resolve(reviewDir);
  const expectedPrefix = path.resolve(
    path.join(input.projectRoot, '.filid', 'review'),
  );
  if (!resolvedReview.startsWith(expectedPrefix)) {
    throw new Error('Invalid cleanup target: path traversal detected');
  }

  await fs.rm(reviewDir, { recursive: true, force: true });

  return { deleted: true };
}
