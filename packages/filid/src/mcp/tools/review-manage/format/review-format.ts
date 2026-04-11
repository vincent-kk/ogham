import path from 'node:path';

import { parseStructureCheckFrontmatter } from '../../../../core/pr-summary/index.js';
import type { HumanSummary } from '../../../../types/summary.js';
import type { ReviewManageInput } from '../review-manage.js';
import {
  extractRevalidateVerdict,
  extractVerdict,
  normalizeBranch,
  tryReadFile,
} from '../utils/review-utils.js';

const MAX_COMMENT_SIZE = 50_000;

const STAGE_DISPLAY_NAMES: Record<string, string> = {
  structure: 'Structure',
  documents: 'Documents',
  tests: 'Tests',
  metrics: 'Metrics',
  dependencies: 'Dependencies',
};

function resultEmoji(result: string): string {
  if (result === 'PASS') return '✅';
  if (result === 'FAIL') return '❌';
  return '⏭️';
}

function transformStructureContent(content: string): string {
  const fm = parseStructureCheckFrontmatter(content);
  if (!fm) return content;

  const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n*/, '');

  const lines: string[] = [];
  lines.push('| Stage | Result |');
  lines.push('| :--- | :---: |');
  for (const [key, result] of Object.entries(fm.stageResults)) {
    const name = STAGE_DISPLAY_NAMES[key] ?? key;
    lines.push(`| ${name} | ${resultEmoji(result)} ${result} |`);
  }
  const overallEmoji = resultEmoji(fm.overall);
  lines.push(`| **Overall** | ${overallEmoji} **${fm.overall}** |`);

  if (fm.criticalCount > 0) {
    lines.push('');
    lines.push(`> ⚠️ Critical issues: **${fm.criticalCount}**`);
  }

  const summaryTable = lines.join('\n');
  return summaryTable + (bodyContent ? '\n\n' + bodyContent : '');
}

function collapsible(summary: string, content: string): string {
  return `<details><summary>${summary}</summary>\n\n${content}\n\n</details>`;
}

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

export function formatHumanSummary(summary: HumanSummary): string {
  return summary.markdown;
}

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
