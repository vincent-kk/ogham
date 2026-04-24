import path from 'node:path';

import type { ReviewManageInput } from '../review-manage.js';
import {
  normalizeBranch,
  tryReadFile,
} from '../utils/review-utils.js';

export async function handleGenerateHumanSummary(
  args: unknown,
): Promise<Record<string, unknown>> {
  const { generateHumanSummary } =
    await import('../../../../core/pr-summary/index.js');

  const input = args as ReviewManageInput;

  if (!input.branchName) {
    throw new Error('branchName is required for generate-human-summary action');
  }
  if (!input.projectRoot) {
    throw new Error(
      'projectRoot is required for generate-human-summary action',
    );
  }

  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  const structureCheckContent = await tryReadFile(
    path.join(reviewDir, 'structure-check.md'),
  );
  const fixRequestsContent = await tryReadFile(
    path.join(reviewDir, 'fix-requests.md'),
  );
  const reviewReportContent = await tryReadFile(
    path.join(reviewDir, 'review-report.md'),
  );
  const revalidateContent = await tryReadFile(
    path.join(reviewDir, 're-validate.md'),
  );

  const summary = generateHumanSummary({
    structureCheckContent,
    fixRequestsContent,
    reviewReportContent,
    revalidateContent,
    branch: input.branchName,
  });

  return summary as unknown as Record<string, unknown>;
}
