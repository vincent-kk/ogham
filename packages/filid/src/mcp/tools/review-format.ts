/**
 * MCP tool handler: review-format
 * Formats review output files into collapsible GitHub PR comment markdown.
 * Used by fca-review (format-pr-comment) and fca-revalidate (format-revalidate-comment).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReviewManageInput } from './review-manage.js';

/** Maximum PR comment size before falling back to summary-only */
const MAX_COMMENT_SIZE = 50_000;

/**
 * Normalize a git branch name to a filesystem-safe string.
 * Duplicated from review-manage.ts to avoid circular coupling;
 * both modules are leaf handlers under the same MCP tool.
 */
function normalizeBranch(branchName: string): string {
  let result = branchName;
  result = result.replace(/\//g, '--');
  result = result.replace(/[#@~^:?*[\]\\]/g, '_');
  result = result.replace(/^[.-]+/, '');
  result = result.replace(/[.-]+$/, '');
  return result;
}

/**
 * Try to read a file, returning null if it does not exist.
 */
async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Extract verdict from review-report.md content.
 * Looks for **Verdict**: APPROVED | REQUEST_CHANGES | INCONCLUSIVE
 */
function extractVerdict(content: string): string {
  const match = content.match(
    /\*\*Verdict\*\*:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}

/**
 * Extract verdict from re-validate.md content.
 * Looks for ## Re-validation — PASS or FAIL pattern, or **Verdict**: PASS|FAIL
 */
function extractRevalidateVerdict(content: string): string {
  // Try header pattern first: # ... — PASS/FAIL
  const headerMatch = content.match(/—\s*(PASS|FAIL)/);
  if (headerMatch) return headerMatch[1];

  // Try **Verdict**: pattern
  const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(PASS|FAIL)/);
  if (verdictMatch) return verdictMatch[1];

  // Try **Final Verdict**: pattern
  const finalMatch = content.match(/\*\*Final Verdict\*\*:\s*(PASS|FAIL)/);
  if (finalMatch) return finalMatch[1];

  return 'UNKNOWN';
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
      collapsible('Phase A — Structure Compliance', structureContent),
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
