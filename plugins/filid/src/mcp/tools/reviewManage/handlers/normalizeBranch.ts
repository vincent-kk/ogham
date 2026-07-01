import type { ReviewManageInput } from '../reviewManage.js';
import { normalizeBranch } from '../utils/reviewUtils.js';

export async function handleNormalizeBranch(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName)
    throw new Error('branchName is required for normalize-branch action');

  const normalized = normalizeBranch(input.branchName);
  return { normalized };
}
