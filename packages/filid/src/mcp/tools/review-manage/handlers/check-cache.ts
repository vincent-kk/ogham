import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReviewCacheResult, ReviewContentHash } from '../../../../types/review.js';
import type { ReviewManageInput } from '../review-manage.js';
import { computeContentHash, gitExec } from '../utils/content-hash.js';
import { normalizeBranch } from '../utils/review-utils.js';

export async function handleCheckCache(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (!input.branchName) {
    throw new Error('branchName is required for check-cache action');
  }
  if (!input.baseRef) {
    throw new Error('baseRef is required for check-cache action');
  }

  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );
  const hashFilePath = path.join(reviewDir, 'content-hash.json');

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
  const { sessionHash: currentHash } = await computeContentHash(
    input.projectRoot,
    baseCommit,
    changedFiles,
  );

  let cachedHash: string | undefined;
  try {
    const raw = await fs.readFile(hashFilePath, 'utf-8');
    const cached = JSON.parse(raw) as ReviewContentHash;
    cachedHash = cached.sessionHash;
  } catch {
    const result: ReviewCacheResult = {
      cacheHit: false,
      action: 'proceed-full-review',
      currentHash,
      cachedHash: null,
      existingReportPath: null,
      existingFixRequestsPath: null,
      message: 'No prior review cache found. Proceeding with full review.',
    };
    return result as unknown as Record<string, unknown>;
  }

  if (currentHash !== cachedHash) {
    const result: ReviewCacheResult = {
      cacheHit: false,
      action: 'proceed-full-review',
      currentHash,
      cachedHash,
      existingReportPath: null,
      existingFixRequestsPath: null,
      message:
        'Content changed since last review. Proceeding with full review.',
    };
    return result as unknown as Record<string, unknown>;
  }

  // Hash matches — confirm review-report.md still exists before serving cache.
  const reportPath = path.join(reviewDir, 'review-report.md');
  try {
    await fs.access(reportPath);
  } catch {
    const result: ReviewCacheResult = {
      cacheHit: false,
      action: 'proceed-full-review',
      currentHash,
      cachedHash,
      existingReportPath: null,
      existingFixRequestsPath: null,
      message:
        'Hash matches but prior review is incomplete. Proceeding with full review.',
    };
    return result as unknown as Record<string, unknown>;
  }

  const fixRequestsPath = path.join(reviewDir, 'fix-requests.md');
  let fixRequestsExists = false;
  try {
    await fs.access(fixRequestsPath);
    fixRequestsExists = true;
  } catch {
    // optional
  }

  const result: ReviewCacheResult = {
    cacheHit: true,
    action: 'skip-to-existing-results',
    currentHash,
    cachedHash,
    existingReportPath: reportPath,
    existingFixRequestsPath: fixRequestsExists ? fixRequestsPath : null,
    message: 'Review cache hit — content unchanged since last review.',
  };
  return result as unknown as Record<string, unknown>;
}
