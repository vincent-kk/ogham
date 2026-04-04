/**
 * Shared utilities for review-manage and review-format handlers.
 * Extracted to eliminate duplication of normalizeBranch, tryReadFile,
 * and verdict extraction across review tool handlers.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Normalize a git branch name to a filesystem-safe string.
 *
 * Rules:
 * - `/` → `--`
 * - `#`, `@`, `~`, `^`, `:`, `?`, `*`, `[`, `]`, `\` → `_`
 * - Remove leading/trailing `.` and `-`
 * - Consecutive `--` are preserved (intentional for uniqueness)
 */
export function normalizeBranch(branchName: string): string {
  let result = branchName;
  result = result.replace(/\//g, '--');
  result = result.replace(/[#@~^:?*[\]\\]/g, '_');
  result = result.replace(/^[.-]+/, '');
  result = result.replace(/[.-]+$/, '');
  return result;
}

/**
 * Resolve the review directory path for a given branch.
 */
export function resolveReviewDir(
  projectRoot: string,
  branchName: string,
): string {
  const normalized = normalizeBranch(branchName);
  return path.join(projectRoot, '.filid', 'review', normalized);
}

/**
 * Try to read a file, returning null if it does not exist.
 */
export async function tryReadFile(filePath: string): Promise<string | null> {
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
export function extractVerdict(content: string): string {
  const match = content.match(
    /\*\*Verdict\*\*:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}

/**
 * Extract verdict from re-validate.md content.
 * Looks for ## Re-validation — PASS or FAIL pattern, or **Verdict**: PASS|FAIL
 */
export function extractRevalidateVerdict(content: string): string {
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
