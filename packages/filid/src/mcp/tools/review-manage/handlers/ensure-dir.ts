import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReviewManageInput } from '../review-manage.js';
import { normalizeBranch } from '../utils/review-utils.js';

export async function handleEnsureDir(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for ensure-dir action');
  }
  const normalized = normalizeBranch(input.branchName);
  const dirPath = path.join(input.projectRoot, '.filid', 'review', normalized);

  let created = false;
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    created = true;
  }

  return { path: dirPath, created };
}
