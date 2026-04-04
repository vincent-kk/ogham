/**
 * MCP tool handler: review-format
 * Formats review output files into collapsible GitHub PR comment markdown.
 * Used by fca-review (format-pr-comment) and fca-revalidate (format-revalidate-comment).
 */
import path from 'node:path';

import { parseStructureCheckFrontmatter } from '../../../core/utils/pr-summary-generator.js';
import type { HumanSummary } from '../../../types/summary.js';

import type { ReviewManageInput } from '../review-manage/review-manage.js';
import {
  extractRevalidateVerdict,
  extractVerdict,
  normalizeBranch,
  tryReadFile,
} from '../review-utils/review-utils.js';

/** Maximum PR comment size before falling back to summary-only */
const MAX_COMMENT_SIZE = 50_000;

/** Stage key → display name mapping */
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

/**
 * Transform structure-check.md content: replace YAML frontmatter with a
 * human-readable summary table while keeping the markdown body intact.
 */
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

/**
 * Wrap content in a collapsible <details> block.
 */
function collapsible(summary: string, content: string): string {
  return `<details><summary>${summary}</summary>\n\n${content}\n\n</details>`;
}

/**
 * Format review results into a collapsible PR comment markdown.
 * Reads review-report.md (required), structure-check.md (optional), fix-requests.md (optional).
 */
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

  // Read required file
  const reportContent = await tryReadFile(
    path.join(reviewDir, 'review-report.md'),
  );
  if (!reportContent) {
    throw new Error(
      `Review not complete: review-report.md not found in ${reviewDir}`,
    );
  }

  // Read optional files
  const structureContent = await tryReadFile(
    path.join(reviewDir, 'structure-check.md'),
  );
  const fixRequestsContent = await tryReadFile(
    path.join(reviewDir, 'fix-requests.md'),
  );

  const verdict = extractVerdict(reportContent);

  // Build collapsible sections
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

  // Assemble full comment
  const header = `## Code Review Governance — ${verdict}\n`;
  const body = sections.join('\n\n');
  const footer = `\n\n> Full report: \`.filid/review/${normalized}/review-report.md\``;

  let markdown = header + '\n' + body + footer;

  // Size guard
  if (markdown.length > MAX_COMMENT_SIZE) {
    markdown =
      `## Code Review Governance — ${verdict}\n\n` +
      `Review content exceeds GitHub comment size limit.\n\n` +
      `> Full report: \`.filid/review/${normalized}/review-report.md\``;
  }

  return { markdown, verdict, normalized };
}

/**
 * Format re-validation results into a collapsible PR comment markdown.
 * Reads re-validate.md (required).
 */
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

  // Build collapsible section
  const section = collapsible('Re-validation Details', revalidateContent);

  const verdictEmoji = verdict === 'PASS' ? '✅' : '❌';
  const header = `## Re-validation — ${verdictEmoji} ${verdict}\n`;
  const footer = `\n\n> Full report: \`.filid/review/${normalized}/re-validate.md\``;

  let markdown = header + '\n' + section + footer;

  // Size guard
  if (markdown.length > MAX_COMMENT_SIZE) {
    markdown =
      `## Re-validation — ${verdictEmoji} ${verdict}\n\n` +
      `Re-validation content exceeds GitHub comment size limit.\n\n` +
      `> Full report: \`.filid/review/${normalized}/re-validate.md\``;
  }

  return { markdown, verdict, normalized };
}

/**
 * Format a HumanSummary into markdown string.
 * The summary is pre-rendered by generateHumanSummary(), but this function
 * can be used when a standalone markdown rendering is needed.
 */
export function formatHumanSummary(summary: HumanSummary): string {
  return summary.markdown;
}

/**
 * Handle generate-human-summary action.
 * Reads review session files and delegates to generateHumanSummary() from core.
 */
export async function handleGenerateHumanSummary(
  args: unknown,
): Promise<Record<string, unknown>> {
  const { generateHumanSummary } =
    await import('../../../core/utils/pr-summary-generator.js');

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
