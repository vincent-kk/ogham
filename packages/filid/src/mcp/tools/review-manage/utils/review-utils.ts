import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Normalize a git branch name to a filesystem-safe string.
 * `/` → `--`; `#@~^:?*[]\` → `_`; trims leading/trailing `.` and `-`.
 */
export function normalizeBranch(branchName: string): string {
  return branchName
    .replace(/\//g, '--')
    .replace(/[#@~^:?*[\]\\]/g, '_')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '');
}

export function resolveReviewDir(
  projectRoot: string,
  branchName: string,
): string {
  return path.join(
    projectRoot,
    '.filid',
    'review',
    normalizeBranch(branchName),
  );
}

export async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function extractVerdict(content: string): string {
  const match = content.match(
    /\*\*Verdict\*\*:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}

/**
 * Extract verdict from re-validate.md content, checking header
 * (`— PASS/FAIL`), `**Verdict**:`, then `**Final Verdict**:`.
 */
export function extractRevalidateVerdict(content: string): string {
  const patterns = [
    /—\s*(PASS|FAIL)/,
    /\*\*Verdict\*\*:\s*(PASS|FAIL)/,
    /\*\*Final Verdict\*\*:\s*(PASS|FAIL)/,
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1];
  }
  return 'UNKNOWN';
}
