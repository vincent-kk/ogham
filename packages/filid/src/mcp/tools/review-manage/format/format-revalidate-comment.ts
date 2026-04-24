import path from 'node:path';

import type { ReviewManageInput } from '../review-manage.js';
import {
  extractRevalidateVerdict,
  normalizeBranch,
  tryReadFile,
} from '../utils/review-utils.js';
import { collapsible } from './collapsible.js';

const MAX_COMMENT_SIZE = 50_000;

export async function formatRevalidateComment(
  args: unknown,
): Promise<Record<string, unknown>> {
  const input = args as ReviewManageInput;

  if (!input.branchName) {
    throw new Error(
      'branchName is required for format-revalidate-comment action',
    );
  }
  if (!input.projectRoot) {
    throw new Error(
      'projectRoot is required for format-revalidate-comment action',
    );
  }

  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  const revalidateContent = await tryReadFile(
    path.join(reviewDir, 're-validate.md'),
  );
  if (!revalidateContent) {
    throw new Error(
      `Re-validation not complete: re-validate.md not found in ${reviewDir}`,
    );
  }

  const verdict = extractRevalidateVerdict(revalidateContent);
  const section = collapsible('Re-validation Details', revalidateContent);

  const verdictEmoji = verdict === 'PASS' ? '✅' : '❌';
  const header = `## Re-validation — ${verdictEmoji} ${verdict}\n`;
  const footer = `\n\n> Full report: \`.filid/review/${normalized}/re-validate.md\``;

  let markdown = header + '\n' + section + footer;

  if (markdown.length > MAX_COMMENT_SIZE) {
    markdown =
      `## Re-validation — ${verdictEmoji} ${verdict}\n\n` +
      `Re-validation content exceeds GitHub comment size limit.\n\n` +
      `> Full report: \`.filid/review/${normalized}/re-validate.md\``;
  }

  return { markdown, verdict, normalized };
}
