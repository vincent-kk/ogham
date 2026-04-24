import path from 'node:path';

import type { ReviewManageInput } from '../review-manage.js';
import {
  extractVerdict,
  normalizeBranch,
  tryReadFile,
} from '../utils/review-utils.js';
import { collapsible } from './collapsible.js';
import { transformStructureContent } from './utils/transform-structure-content.js';

const MAX_COMMENT_SIZE = 50_000;

export async function formatPrComment(
  args: unknown,
): Promise<Record<string, unknown>> {
  const input = args as ReviewManageInput;

  if (!input.branchName) {
    throw new Error('branchName is required for format-pr-comment action');
  }
  if (!input.projectRoot) {
    throw new Error('projectRoot is required for format-pr-comment action');
  }

  const normalized = normalizeBranch(input.branchName);
  const reviewDir = path.join(
    input.projectRoot,
    '.filid',
    'review',
    normalized,
  );

  const reportContent = await tryReadFile(
    path.join(reviewDir, 'review-report.md'),
  );
  if (!reportContent) {
    throw new Error(
      `Review not complete: review-report.md not found in ${reviewDir}`,
    );
  }

  const structureContent = await tryReadFile(
    path.join(reviewDir, 'structure-check.md'),
  );
  const fixRequestsContent = await tryReadFile(
    path.join(reviewDir, 'fix-requests.md'),
  );

  const verdict = extractVerdict(reportContent);

  const sections: string[] = [];

  if (structureContent) {
    sections.push(
      collapsible(
        'Phase A — Structure Compliance',
        transformStructureContent(structureContent),
      ),
    );
  }

  sections.push(collapsible('Review Report (Phase B~D)', reportContent));

  if (fixRequestsContent) {
    sections.push(collapsible('Fix Requests', fixRequestsContent));
  }

  const header = `## Code Review Governance — ${verdict}\n`;
  const body = sections.join('\n\n');
  const footer = `\n\n> Full report: \`.filid/review/${normalized}/review-report.md\``;

  let markdown = header + '\n' + body + footer;

  if (markdown.length > MAX_COMMENT_SIZE) {
    markdown =
      `## Code Review Governance — ${verdict}\n\n` +
      `Review content exceeds GitHub comment size limit.\n\n` +
      `> Full report: \`.filid/review/${normalized}/review-report.md\``;
  }

  return { markdown, verdict, normalized };
}
